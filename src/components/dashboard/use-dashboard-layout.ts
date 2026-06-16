"use client";

import { useCallback, useMemo } from "react";

import { useDashboardState } from "@/components/dashboard/use-dashboard-state";
import { type WidgetInstance } from "@/components/dashboard/widget-instance";
import {
  computeMove,
  computeResize,
  findFirstFreeBlock,
  footprintFor,
  GRID_COLS,
  maxOccupiedRow,
  occupancyOf,
} from "@/components/dashboard/grid-layout";
import {
  CATALOG_BY_ID,
  defaultSizeFor,
  WIDGET_CATALOG,
  type SlotId,
  type WidgetCatalogEntry,
  type WidgetSize,
} from "@/components/widgets/widget-catalog";

type UseDashboardLayout = {
  /** Placed widget instances; each carries its own (x,y) cell. */
  layout: WidgetInstance[];
  /** Catalog entries (duplicates allowed, so every entry is always available). */
  availableToAdd: WidgetCatalogEntry[];
  /** Whether a slot has at least one instance on the dashboard. */
  isActive: (slotId: SlotId) => boolean;
  /** Add a new instance of a slot, bound to an account (`null` = default),
   *  optionally seeded with initial per-instance config (e.g. a Notion page id
   *  chosen in the catalog preview). Placed at the first free cell that fits. */
  addWidget: (slotId: SlotId, accountId?: string | null, config?: Record<string, string>) => void;
  removeWidget: (instanceId: string) => void;
  /** Move a widget to grid cell (tx,ty); clamps in bounds and pushes overlaps down. */
  placeWidgetAt: (instanceId: string, tx: number, ty: number) => void;
  /** Set a single per-instance config value. */
  updateConfig: (instanceId: string, key: string, value: string) => void;
  /** Change a widget's size, then re-run collision resolution so the new
   *  footprint can't overlap neighbors or spill past the grid. */
  resizeWidget: (instanceId: string, size: WidgetSize) => void;
};

export function useDashboardLayout(): UseDashboardLayout {
  const { layout, setLayout } = useDashboardState();

  const addWidget = useCallback(
    (slotId: SlotId, accountId: string | null = null, config: Record<string, string> = {}) => {
      setLayout((current) => {
        const { w, h } = footprintFor(defaultSizeFor(CATALOG_BY_ID[slotId]));
        const cell =
          findFirstFreeBlock(occupancyOf(current), GRID_COLS, w, h) ??
          { x: 0, y: maxOccupiedRow(current) };
        return [
          ...current,
          { instanceId: crypto.randomUUID(), slotId, accountId, config, x: cell.x, y: cell.y },
        ];
      });
    },
    [setLayout],
  );

  const removeWidget = useCallback(
    (instanceId: string) => {
      // Filter only — the freed cells stay blank (iOS-18 style, no repack).
      setLayout((current) => current.filter((instance) => instance.instanceId !== instanceId));
    },
    [setLayout],
  );

  const placeWidgetAt = useCallback(
    (instanceId: string, tx: number, ty: number) => {
      setLayout((current) => {
        // Same math the live drag preview uses, so the drop matches the preview.
        const resolved = computeMove(current, instanceId, tx, ty);
        if (!resolved) return current; // unknown mover or no-op
        const byId = new Map(resolved.map((p) => [p.instanceId, p]));
        // Map cells back onto instances; array order is preserved so React keys
        // and the jiggle stay stable.
        return current.map((inst) => {
          const p = byId.get(inst.instanceId);
          return p ? { ...inst, x: p.x, y: p.y } : inst;
        });
      });
    },
    [setLayout],
  );

  const updateConfig = useCallback(
    (instanceId: string, key: string, value: string) => {
      setLayout((current) =>
        current.map((instance) =>
          instance.instanceId === instanceId
            ? { ...instance, config: { ...instance.config, [key]: value } }
            : instance,
        ),
      );
    },
    [setLayout],
  );

  const resizeWidget = useCallback(
    (instanceId: string, size: WidgetSize) => {
      setLayout((current) => {
        // Stamp the new size first so computeResize reads the new footprint, then
        // push down whatever the larger footprint now overlaps.
        const sized = current.map((inst) =>
          inst.instanceId === instanceId
            ? { ...inst, config: { ...inst.config, size } }
            : inst,
        );
        const resolved = computeResize(sized, instanceId, size);
        if (!resolved) return sized;
        const byId = new Map(resolved.map((p) => [p.instanceId, p]));
        return sized.map((inst) => {
          const p = byId.get(inst.instanceId);
          return p ? { ...inst, x: p.x, y: p.y } : inst;
        });
      });
    },
    [setLayout],
  );

  // Duplicates are allowed, so the catalog never disables an entry.
  const availableToAdd = useMemo(() => [...WIDGET_CATALOG], []);

  const activeSlots = useMemo(
    () => new Set(layout.map((instance) => instance.slotId)),
    [layout],
  );
  const isActive = useCallback((slotId: SlotId) => activeSlots.has(slotId), [activeSlots]);

  return { layout, availableToAdd, isActive, addWidget, removeWidget, placeWidgetAt, updateConfig, resizeWidget };
}
