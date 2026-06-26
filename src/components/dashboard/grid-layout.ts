import {
  type DashboardBreakpoint,
  type WidgetInstance,
} from "@/components/dashboard/widget-instance";
import {
  CATALOG_BY_ID,
  defaultSizeFor,
  isWidgetSize,
  type WidgetSize,
} from "@/components/widgets/widget-catalog";

/**
 * Pure layout math for the free coordinate widget grid (FRA-149, iOS-18 style).
 * No React. Each widget occupies an explicit (x,y) cell on a fixed-column grid;
 * blank cells are preserved (nothing auto-packs), and dropping onto an occupied
 * cell pushes the occupant down. These helpers are shared by the layout hook and
 * the state store, and are unit-testable in isolation.
 */

export const DASHBOARD_BREAKPOINTS: readonly DashboardBreakpoint[] = [
  "sm",
  "md",
  "lg",
  "xl",
] as const;

export const BREAKPOINT_COLS: Record<DashboardBreakpoint, number> = {
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
};

/** The maximum dashboard grid is 4 columns wide, even on ultra-wide screens. */
export const GRID_COLS = 4;

/** Cell footprint per size: Large 2×2, Medium 2×1, Small 1×1. */
const SIZE_FOOTPRINT: Record<WidgetSize, { w: number; h: number }> = {
  large: { w: 2, h: 2 },
  medium: { w: 2, h: 1 },
  small: { w: 1, h: 1 },
};

export function footprintFor(
  size: WidgetSize,
  cols: number = GRID_COLS,
): { w: number; h: number } {
  const footprint = SIZE_FOOTPRINT[size];
  return { ...footprint, w: Math.min(footprint.w, cols) };
}

/**
 * An instance's effective size. A valid, supported `config.size` wins; otherwise
 * we fall back to the widget's catalog default — NOT a hardcoded "large" — so the
 * footprint reserved at add time (`defaultSizeFor`) matches what we render. This
 * also clamps a stale config.size left over from a catalog change.
 */
export function instanceSize(instance: WidgetInstance): WidgetSize {
  const entry = CATALOG_BY_ID[instance.slotId];
  const size = instance.config["size"];
  return size && isWidgetSize(size) && entry.supportedSizes.includes(size)
    ? size
    : defaultSizeFor(entry);
}

/** A widget placed on the grid: its id, top-left cell, and footprint. */
export type Placed = {
  instanceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function coordsFor(
  inst: WidgetInstance,
  breakpoint?: DashboardBreakpoint,
): { x: number; y: number } {
  const placement = breakpoint ? inst.placements?.[breakpoint] : undefined;
  return {
    x: placement?.x ?? inst.x ?? 0,
    y: placement?.y ?? inst.y ?? 0,
  };
}

/** Project a layout to placements, using breakpoint placement, then legacy x/y. */
export function toPlaced(
  layout: WidgetInstance[],
  breakpoint?: DashboardBreakpoint,
  cols: number = breakpoint ? BREAKPOINT_COLS[breakpoint] : GRID_COLS,
): Placed[] {
  return layout.map((inst) => {
    const { w, h } = footprintFor(instanceSize(inst), cols);
    const { x, y } = coordsFor(inst, breakpoint);
    return {
      instanceId: inst.instanceId,
      x,
      y,
      w,
      h,
    };
  });
}

/** Axis-aligned bounding-box overlap test. */
export function rectsOverlap(a: Placed, b: Placed): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** Set of "x,y" cell keys covered by every placement's footprint. */
function occupancyOfPlaced(placed: Placed[], exclude?: string): Set<string> {
  const cells = new Set<string>();
  for (const p of placed) {
    if (p.instanceId === exclude) continue;
    for (let dx = 0; dx < p.w; dx++) {
      for (let dy = 0; dy < p.h; dy++) {
        cells.add(`${p.x + dx},${p.y + dy}`);
      }
    }
  }
  return cells;
}

/** Set of occupied "x,y" cell keys for a whole layout. */
export function occupancyOf(
  layout: WidgetInstance[],
  breakpoint?: DashboardBreakpoint,
  cols?: number,
): Set<string> {
  return occupancyOfPlaced(toPlaced(layout, breakpoint, cols));
}

/** True if a w×h block at (x,y) fits within `cols` and hits no occupied cell. */
function blockIsFree(
  occupied: Set<string>,
  cols: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (x < 0 || x + w > cols) return false;
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      if (occupied.has(`${x + dx},${y + dy}`)) return false;
    }
  }
  return true;
}

/** Row-major first-fit: the first (x,y) where a w×h block fits, scanning down. */
export function findFirstFreeBlock(
  occupied: Set<string>,
  cols: number,
  w: number,
  h: number,
): { x: number; y: number } | null {
  // Bound the scan generously past the lowest occupied row so we always find a slot.
  let maxY = 0;
  for (const key of occupied) {
    const y = Number(key.split(",")[1]);
    if (y > maxY) maxY = y;
  }
  const limit = maxY + h + 1;
  for (let y = 0; y <= limit; y++) {
    for (let x = 0; x + w <= cols; x++) {
      if (blockIsFree(occupied, cols, x, y, w, h)) return { x, y };
    }
  }
  return null;
}

/** Lowest empty row index (the bottom edge of the tallest widget). */
export function maxOccupiedRow(
  layout: WidgetInstance[],
  cols: number = GRID_COLS,
): number {
  let max = 0;
  for (const p of toPlaced(layout, undefined, cols)) {
    if (p.y + p.h > max) max = p.y + p.h;
  }
  return max;
}

/** Return instances projected to the active breakpoint's persisted coordinates. */
export function projectLayoutForBreakpoint(
  layout: WidgetInstance[],
  breakpoint: DashboardBreakpoint,
): WidgetInstance[] {
  return layout.map((inst) => {
    const { x, y } = coordsFor(inst, breakpoint);
    return { ...inst, x, y };
  });
}

/**
 * Push-down collision resolution. The moved widget's cell is fixed; any widget
 * overlapping it is pushed straight down (keeping its x, so holes elsewhere are
 * preserved) and re-checked, cascading until nothing overlaps. Downward-only =
 * deterministic; the bound guards against pathological loops.
 */
export function resolveCollisions(placed: Placed[], movedId: string): Placed[] {
  const result = placed.map((p) => ({ ...p }));
  const byId = new Map(result.map((p) => [p.instanceId, p]));
  const queue: string[] = [movedId];
  let bound = result.length * 200;

  while (queue.length > 0 && bound-- > 0) {
    const curr = byId.get(queue.shift()!);
    if (!curr) continue;
    for (const other of result) {
      if (other.instanceId === curr.instanceId) continue;
      if (rectsOverlap(curr, other)) {
        other.y = curr.y + curr.h; // push below the mover; keep its x
        queue.push(other.instanceId);
      }
    }
  }
  return result;
}

/**
 * Resolve where every widget lands if `movedId` is dropped at cell (tx,ty):
 * clamp the mover into bounds, then push overlaps down. Shared by the live drag
 * preview (onDragOver) and the committed move (placeWidgetAt) so the preview is
 * exactly what the drop will produce. Returns null when the mover is unknown or
 * the move is a no-op (already at that cell).
 */
export function computeMove(
  layout: WidgetInstance[],
  movedId: string,
  tx: number,
  ty: number,
  cols: number = GRID_COLS,
): Placed[] | null {
  const placed = toPlaced(layout, undefined, cols);
  const mover = placed.find((p) => p.instanceId === movedId);
  if (!mover) return null;
  const x = Math.max(0, Math.min(tx, cols - mover.w));
  const y = Math.max(0, ty);
  if (mover.x === x && mover.y === y) return null;
  const next = placed.map((p) =>
    p.instanceId === movedId ? { ...p, x, y } : p,
  );
  return resolveCollisions(next, movedId);
}

/**
 * Resolve where every widget lands when `resizedId` changes footprint to
 * `nextSize`. The tile keeps its cell but is clamped so the wider/taller block
 * fits the grid (x into bounds), then overlaps the new footprint covers are
 * pushed down — the same collision path a move runs, so a resize can never leave
 * tiles overlapping or spill past the column count. The caller persists both the
 * new size and the resulting (x,y) of every instance. Returns null if unknown.
 */
export function computeResize(
  layout: WidgetInstance[],
  resizedId: string,
  nextSize: WidgetSize,
  cols: number = GRID_COLS,
): Placed[] | null {
  const { w, h } = footprintFor(nextSize, cols);
  const placed = toPlaced(layout, undefined, cols).map((p) =>
    p.instanceId === resizedId
      ? { ...p, w, h, x: Math.max(0, Math.min(p.x, cols - w)) }
      : p,
  );
  if (!placed.some((p) => p.instanceId === resizedId)) return null;
  return resolveCollisions(placed, resizedId);
}

/**
 * One-time migration: assign (x,y) to any instance missing it by first-fit
 * packing in array (reading) order, while respecting instances that already
 * have positions. Legacy layouts pack into a no-hole grid the first time; after
 * that every instance has explicit x,y, so user-made holes are preserved.
 */
export function normalizeLayout(
  layout: WidgetInstance[],
  cols: number = GRID_COLS,
): WidgetInstance[] {
  // Reserve cells for instances that already carry a position.
  const occupied = new Set<string>();
  for (const inst of layout) {
    if (inst.x == null || inst.y == null) continue;
    const { w, h } = footprintFor(instanceSize(inst), cols);
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++)
        occupied.add(`${inst.x + dx},${inst.y + dy}`);
    }
  }

  return layout.map((inst) => {
    if (inst.x != null && inst.y != null) return inst;
    const { w, h } = footprintFor(instanceSize(inst), cols);
    const cell = findFirstFreeBlock(occupied, cols, w, h) ?? { x: 0, y: 0 };
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++)
        occupied.add(`${cell.x + dx},${cell.y + dy}`);
    }
    return { ...inst, x: cell.x, y: cell.y };
  });
}

/** Ensure every widget has persisted coordinates for all S/M/L/XL breakpoints. */
export function normalizeBreakpointLayouts(
  layout: WidgetInstance[],
): WidgetInstance[] {
  let next = layout.map((inst) => ({
    ...inst,
    placements: { ...(inst.placements ?? {}) },
  }));

  for (const breakpoint of DASHBOARD_BREAKPOINTS) {
    const cols = BREAKPOINT_COLS[breakpoint];
    const projected = next.map((inst) => {
      const placement = inst.placements?.[breakpoint];
      return {
        ...inst,
        x: placement?.x ?? inst.x,
        y: placement?.y ?? inst.y,
      };
    });
    const normalized = normalizeLayout(projected, cols);
    const byId = new Map(normalized.map((inst) => [inst.instanceId, inst]));
    next = next.map((inst) => {
      const placed = byId.get(inst.instanceId);
      if (!placed) return inst;
      return {
        ...inst,
        x: inst.x ?? placed.x,
        y: inst.y ?? placed.y,
        placements: {
          ...(inst.placements ?? {}),
          [breakpoint]: { x: placed.x ?? 0, y: placed.y ?? 0 },
        },
      };
    });
  }

  return next;
}

/** Merge the edited breakpoint's x/y cells back into the persisted placements. */
export function mergeBreakpointLayout(
  previous: WidgetInstance[],
  edited: WidgetInstance[],
  breakpoint: DashboardBreakpoint,
): WidgetInstance[] {
  const previousById = new Map(previous.map((inst) => [inst.instanceId, inst]));
  return normalizeBreakpointLayouts(
    edited.map((inst) => {
      const prior = previousById.get(inst.instanceId);
      return {
        ...inst,
        placements: {
          ...(prior?.placements ?? inst.placements ?? {}),
          [breakpoint]: { x: inst.x ?? 0, y: inst.y ?? 0 },
        },
      };
    }),
  );
}
