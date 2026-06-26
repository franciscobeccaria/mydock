"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Minus } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useDashboardMode } from "@/components/dashboard/dashboard-mode-context";
import {
  PickerLockProvider,
  usePickerLock,
} from "@/components/dashboard/picker-lock-context";
import { PageDots } from "@/components/dashboard/page-dots";
import { ShortcutsRow } from "@/components/dashboard/shortcuts-row";
import { useDashboardLayout } from "@/components/dashboard/use-dashboard-layout";
import {
  DashboardStateProvider,
  useDashboardState,
} from "@/components/dashboard/use-dashboard-state";
import { type WidgetInstance } from "@/components/dashboard/widget-instance";
import {
  computeMove,
  footprintFor,
  instanceSize,
  maxOccupiedRow,
} from "@/components/dashboard/grid-layout";
import { deriveLinearAssignedUrl } from "@/components/widgets/linear-widget";
import {
  WidgetCatalogDialog,
  type WidgetAccount,
} from "@/components/widgets/widget-catalog-dialog";
import {
  CATALOG_BY_ID,
  type WidgetSize,
} from "@/components/widgets/widget-catalog";
import {
  CONFIG_KEY,
  fetchWidget,
  getWidgetPayload,
  renderWidget,
  WIDGET_TITLE,
  widgetQueryKey,
  widgetStaleTime,
} from "@/components/widgets/widget-render";
import { cn } from "@/lib/utils";
import { type ConnectionsByProvider } from "@/features/connections/queries";
import { type WidgetPayload } from "@/features/integrations/types";

const INTERACTIVE =
  'a,button,input,textarea,select,[role="button"],[role="option"],[role="listbox"],[data-slot="select-trigger"],[data-interactive="true"]';

/** Stable empty sensor descriptor list — passed to DndContext to suspend dragging. */
const NO_SENSORS: ReturnType<typeof useSensors> = [];

/** CSS Grid explicit placement for a footprint at cell (x,y). Lines are 1-based. */
function cellStyle(
  x: number,
  y: number,
  size: WidgetSize,
  cols: number,
): React.CSSProperties {
  const { w, h } = footprintFor(size, cols);
  return {
    gridColumn: `${x + 1} / span ${w}`,
    gridRow: `${y + 1} / span ${h}`,
  };
}

/** Drop-target cell ids are "cell:cx:cy"; parse one back to coordinates. */
function parseCellId(id: string): { cx: number; cy: number } | null {
  const m = /^cell:(\d+):(\d+)$/.exec(id);
  return m ? { cx: Number(m[1]), cy: Number(m[2]) } : null;
}

/**
 * Resolve the drop target from the POINTER, not the dragged tile's box — so the
 * highlighted cell tracks the cursor (what the user is aiming at), and the final
 * drop matches the live preview. Falls back to closestCorners when the pointer is
 * outside every cell (e.g. dragging past the grid edge).
 */
const cellCollision: CollisionDetection = (args) => {
  const byPointer = pointerWithin(args);
  return byPointer.length > 0 ? byPointer : closestCorners(args);
};

/** View mode: clicking the widget opens its destination (unless an inner control was hit). */
function WidgetSlot({
  children,
  onOpen,
  style,
}: {
  children: React.ReactNode;
  onOpen: () => void;
  style?: React.CSSProperties;
}) {
  const pointerOnInteractive = useRef(false);
  return (
    <div
      style={style}
      onPointerDown={(event) => {
        pointerOnInteractive.current = !!(event.target as HTMLElement).closest(
          INTERACTIVE,
        );
      }}
      onClick={() => {
        if (pointerOnInteractive.current) return;
        onOpen();
      }}
      className="h-full cursor-pointer"
    >
      {children}
    </div>
  );
}

/**
 * Like dnd-kit's PointerSensor, but a pointerdown that lands inside a
 * `[data-no-drag]` subtree never starts a drag — so header controls (the
 * All/Unread select, etc.) stay clickable while the rest of the tile drags.
 */
export class ControlAwarePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (
        { nativeEvent: event }: React.PointerEvent,
        { onActivation }: PointerSensorOptions,
      ) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-no-drag]")) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

/** Edit mode: the widget jiggles and is draggable to any grid cell; clicks don't open it. */
function PositionedWidget({
  id,
  jiggleSeed,
  children,
  onRemove,
  style,
  sizeControl,
}: {
  id: string;
  /** Seeds the jiggle stagger so neighbors don't move in unison. */
  jiggleSeed: number;
  children: React.ReactNode;
  onRemove: () => void;
  /** Explicit grid placement (gridColumn/gridRow) for this tile's cell + size. */
  style?: React.CSSProperties;
  /** Optional size picker, rendered as a clickable corner control. */
  sizeControl?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  // The whole tile is the drag handle in edit mode — grabbing anywhere on the widget
  // moves it (iOS-style). Inner controls are non-interactive while editing.
  //
  // The OUTER element holds the explicit CSS-grid placement (gridColumn/gridRow) plus
  // the live drag translate; the jiggle animation lives on an INNER element so its
  // `rotate()` keyframes aren't clobbered by the translate (one `transform` per element).
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
      }}
      {...attributes}
      {...listeners}
      className={cn(
        "relative h-full cursor-grab touch-none active:cursor-grabbing",
        isDragging && "z-10",
      )}
    >
      {/* Remove control. Rendered as a sibling of the jiggle wrapper so it
          escapes the `[&_*]:pointer-events-none` rule below and stays clickable.
          stopPropagation on pointerdown keeps the dnd-kit PointerSensor (on the
          outer div) from turning a click into a drag. */}
      {!isDragging ? (
        <button
          type="button"
          aria-label="Remove widget"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -left-2 z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border border-[#E7E7EA] bg-white text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]"
        >
          <Minus className="size-3.5" />
        </button>
      ) : null}

      {/* Size picker, bottom-center. Sibling of the jiggle wrapper so it escapes
          the pointer-events-none rule. `data-no-drag` keeps clicks from dragging. */}
      {!isDragging && sizeControl ? (
        <div
          data-no-drag
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute -bottom-3 left-1/2 z-20 -translate-x-1/2"
        >
          {sizeControl}
        </div>
      ) : null}

      <div
        // Stagger each widget's jiggle so they don't move in unison, like iOS.
        style={{ animationDelay: `${(jiggleSeed % 4) * -0.09}s` }}
        className={cn(
          // Inner controls are inert while editing so the whole surface drags —
          // except elements marked [data-no-drag] (header selects), which stay
          // interactive and (via ControlAwarePointerSensor) don't start a drag.
          "h-full transition-shadow duration-150 select-none [&_*]:pointer-events-none [&_[data-no-drag]]:pointer-events-auto [&_[data-no-drag]_*]:pointer-events-auto",
          // Jiggle at rest; while dragging, kill the animation so the lift transform applies.
          // `rounded-[20px]` matches the card so the lift shadow follows the rounded
          // corners (otherwise the shadow casts a square halo at the bottom).
          isDragging
            ? "scale-[1.03] rounded-[20px] opacity-90 shadow-[0_18px_40px_rgba(17,24,39,0.18)]"
            : "widget-jiggle",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Renders one widget instance and owns its data query. Each instance queries
 * independently, keyed by its slot + config, so two instances of the same widget
 * (e.g. two Linear widgets on different projects) fetch the right data each.
 */
function InstanceWidget({
  instance,
  onConfigChange,
  onLoaded,
}: {
  instance: WidgetInstance;
  onConfigChange: (key: string, value: string) => void;
  /** Lets the grid resolve a click destination from loaded data (Linear). */
  onLoaded?: (payload: WidgetPayload | undefined) => void;
}) {
  const { slotId, config } = instance;
  const entry = CATALOG_BY_ID[slotId];
  const provider = entry.provider;
  const configKey = CONFIG_KEY[slotId];
  const configValue = configKey ? config[configKey] : undefined;
  const setConfig = configKey
    ? (value: string) => onConfigChange(configKey, value)
    : undefined;

  // Gmail's view is a server-side query param; key it so All/Unread fetch apart.
  const gmailView = slotId === "gmail" ? (configValue ?? "all") : undefined;

  // The Notion Page widget's config is its pinned page id, and the Weather
  // widget's is its city — both ride the generic `config` server param.
  const fetchConfig =
    slotId === "notion_page" || slotId === "weather" ? configValue : undefined;

  // The chosen iOS size (FRA-149), clamped to the widget's supported sizes.
  const size = instanceSize(instance);

  // Keyed by accountId so two instances on different connections cache apart.
  const query = useQuery({
    queryKey: widgetQueryKey(
      slotId,
      gmailView,
      instance.accountId,
      fetchConfig,
    ),
    queryFn: () =>
      fetchWidget(provider, gmailView, instance.accountId, fetchConfig),
    staleTime: widgetStaleTime(provider),
    gcTime: 15 * 60_000,
  });

  useEffect(() => {
    onLoaded?.(query.data);
  }, [onLoaded, query.data]);

  return renderWidget(
    slotId,
    getWidgetPayload(provider, WIDGET_TITLE[slotId], query.data, query.error),
    {
      onRetry: () => query.refetch(),
      isRetrying: query.isFetching,
      configValue,
      onConfigChange: setConfig,
      size,
    },
  );
}

function WidgetGrid({
  accountEmail,
  accountName,
  accountAvatarUrl,
  connections,
}: {
  accountEmail: string | null;
  accountName: string | null;
  accountAvatarUrl: string | null;
  connections: ConnectionsByProvider;
}) {
  const router = useRouter();
  const { isEditing, catalogOpen, setCatalogOpen } = useDashboardMode();
  // While a header picker popup is open, suspend the drag sensors. The popup is
  // portaled outside the tile, so the click that dismisses it lands on a tile
  // and is also seen by dnd-kit, which starts/cancels a drag whose pointer cycle
  // bounces focus back to the picker and reopens it. No sensors = no drag to
  // start = the outside-click just dismisses. See picker-lock-context.
  const { isPickerOpen } = usePickerLock();

  // The login account is the default (accountId `null`, sentinel "__default__"),
  // followed by every other real connection (non-default google + all linear).
  // Real connections carry their own id so per-account widget queries key apart.
  const accounts: WidgetAccount[] = [
    {
      id: null,
      label: accountEmail ?? "Default account",
      provider: "google",
      name: accountName ?? accountEmail,
      avatarUrl: accountAvatarUrl,
    },
    ...connections.google
      .filter((c) => !c.isDefault)
      .map((c) => ({
        id: c.id,
        label: c.email ?? "Google account",
        provider: "google" as const,
        name: c.email,
        avatarUrl: null,
      })),
    ...connections.linear.map((c) => ({
      id: c.id,
      label: c.email ?? "Linear account",
      provider: "linear" as const,
      name: c.email,
      avatarUrl: null,
    })),
    ...connections.notion.map((c) => ({
      id: c.id,
      label: c.email ?? "Notion workspace",
      provider: "notion" as const,
      name: c.email,
      avatarUrl: null,
    })),
  ];

  // Which catalog app groups have a backing connection. Google-derived apps
  // (gmail / tasks / calendar) share the single google connection list; linear
  // and notion map to their own connection lists. Weather needs no connection
  // (public Open-Meteo) so it's always available — never locked behind a CTA.
  const connectedByProvider: Record<string, boolean> = {
    linear: connections.linear.length > 0,
    gmail: connections.google.length > 0,
    google_tasks: connections.google.length > 0,
    google_calendar: connections.google.length > 0,
    notion: connections.notion.length > 0,
    weather: true,
  };

  // Active instances, order, add/remove/config all live in the layout hook,
  // backed by per-user Supabase state (no client cache; FRA-140). The layout is
  // already scoped to the active page by the store.
  const {
    layout,
    addWidget,
    removeWidget,
    placeWidgetAt,
    updateConfig,
    resizeWidget,
  } = useDashboardLayout();

  // Multi-page nav (FRA-140). `pages`/`activePageId` drive the dots; the grid
  // renders only the active page's `layout`. The dock (shortcuts) is shared.
  const {
    pages,
    activePageId,
    setActivePage,
    goToPage,
    addPage,
    removePage,
    isLoading,
    columnCount,
  } = useDashboardState();
  const activeIndex = pages.findIndex((p) => p.id === activePageId);

  // Linear's catalog destination is the generic https://linear.app/; when issues
  // have loaded we resolve the user's own assigned-issues view from their URLs.
  // The latest loaded Linear payload is captured so a click can use it.
  const [linearItems, setLinearItems] = useState<WidgetPayload["items"]>([]);
  const handleLinearLoaded = useCallback(
    (payload: WidgetPayload | undefined) => {
      if (payload) setLinearItems(payload.items);
    },
    [],
  );

  const activeSensors = useSensors(
    useSensor(ControlAwarePointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  // Empty sensor set while a picker is open → dnd-kit listens for nothing, so the
  // dismiss click can't start a drag (see isPickerOpen above).
  const sensors = isPickerOpen ? NO_SENSORS : activeSensors;

  // Live preview positions during a drag (instanceId → cell), so the OTHER widgets
  // reflow in real time as you hover — iOS-style — instead of only on drop. Null
  // when not dragging. The dragged tile itself isn't in here (dnd-kit translates it
  // under the cursor); it keeps its committed cell until the drop lands.
  const [preview, setPreview] = useState<Map<
    string,
    { x: number; y: number }
  > | null>(null);
  // The widget currently being dragged. It keeps its committed cell (dnd-kit
  // translates it under the cursor), so it's excluded from the live reflow.
  const [activeId, setActiveId] = useState<string | null>(null);
  // The last cell the drag hovered. We commit THIS on drop — not the final
  // `over` — because on release the dragged tile's translated rect can resolve
  // to a different (distant) cell than the one the live preview was showing.
  const lastTargetRef = useRef<{ cx: number; cy: number } | null>(null);

  // Keyboard ←/→ change pages, but never while typing in a field (or mid-drag).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing || activeId !== null) return;
      goToPage(e.key === "ArrowLeft" ? -1 : 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, goToPage]);

  // Horizontal trackpad swipe / shift+scroll changes pages. A cooldown collapses
  // one gesture (many wheel events) into a single page advance.
  const wheelCooldownRef = useRef(0);
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (Math.abs(dx) < 30 || activeId !== null) return;
      if (e.timeStamp - wheelCooldownRef.current < 400) return;
      wheelCooldownRef.current = e.timeStamp;
      goToPage(dx > 0 ? 1 : -1);
    },
    [goToPage, activeId],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    lastTargetRef.current = null;
  }

  // As the dragged widget hovers a cell, compute the would-be layout (mover placed
  // there + push-down) and stage it as the preview — exactly what the drop commits.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    // Also (re)assert the active id here: onDragStart is the canonical place, but
    // asserting on the first over makes the drag affordances robust regardless.
    setActiveId(String(active.id));
    if (!over) return; // off the grid entirely — keep the last preview
    const cell = parseCellId(String(over.id));
    if (!cell) return;
    const resolved = computeMove(
      layout,
      String(active.id),
      cell.cx,
      cell.cy,
      columnCount,
    );
    if (!resolved) {
      // Hovering the tile's own (clamped) home cell: a release here must CANCEL,
      // not re-commit the previous target — so clear the staged move outright.
      lastTargetRef.current = null;
      setPreview(null);
      return;
    }
    lastTargetRef.current = cell;
    setPreview(
      new Map(resolved.map((p) => [p.instanceId, { x: p.x, y: p.y }])),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const target = lastTargetRef.current;
    setPreview(null);
    setActiveId(null);
    lastTargetRef.current = null;
    // Commit the last previewed cell so the drop matches what the user saw.
    if (target) placeWidgetAt(String(event.active.id), target.cx, target.cy);
  }

  function handleDragCancel() {
    setPreview(null);
    setActiveId(null);
    lastTargetRef.current = null;
  }

  // The instance being dragged + where it will land (its preview cell). Drives
  // the destination placeholder so the user sees exactly which cell + footprint
  // the widget drops into, before releasing.
  const activeInstance = activeId
    ? (layout.find((i) => i.instanceId === activeId) ?? null)
    : null;
  const dropCell = activeId ? (preview?.get(activeId) ?? null) : null;

  /** The cell a tile should render at right now: its preview position mid-drag,
   *  else its committed (x,y). The dragged tile keeps its committed cell — dnd-kit
   *  moves it via transform, so it must not also jump to the preview cell. */
  function renderCell(instance: WidgetInstance): { x: number; y: number } {
    const committed = { x: instance.x ?? 0, y: instance.y ?? 0 };
    if (instance.instanceId === activeId) return committed;
    return preview?.get(instance.instanceId) ?? committed;
  }

  function openWidget(
    instance: WidgetInstance,
    linearItems: WidgetPayload["items"],
  ) {
    const { slotId, config } = instance;
    const destination =
      slotId === "gmail" && config["gmail-view"] === "unread"
        ? "https://mail.google.com/mail/u/0/#search/is%3Aunread+category%3Aprimary"
        : slotId === "linear"
          ? (deriveLinearAssignedUrl(linearItems) ??
            CATALOG_BY_ID[slotId].destination)
          : CATALOG_BY_ID[slotId].destination;
    if (destination.startsWith("http")) {
      window.open(destination, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(destination);
  }

  function renderInstance(instance: WidgetInstance) {
    return (
      <InstanceWidget
        instance={instance}
        onConfigChange={(key, value) =>
          updateConfig(instance.instanceId, key, value)
        }
        onLoaded={instance.slotId === "linear" ? handleLinearLoaded : undefined}
      />
    );
  }

  // Edit-mode size picker, shown only for widgets that support more than one
  // size (the rest are large-only, so there's nothing to choose).
  function renderSizeControl(instance: WidgetInstance) {
    const entry = CATALOG_BY_ID[instance.slotId];
    if (entry.supportedSizes.length < 2) return null;
    const current = instanceSize(instance);
    return (
      <SizeControl
        sizes={entry.supportedSizes}
        current={current}
        onSelect={(size) => resizeWidget(instance.instanceId, size)}
      />
    );
  }

  // How many widget instances each app currently has on the dashboard, so the
  // catalog can show a subtle "N added" badge per app section.
  const addedByApp = layout.reduce<Record<string, number>>((acc, instance) => {
    const appId = CATALOG_BY_ID[instance.slotId].appId;
    acc[appId] = (acc[appId] ?? 0) + 1;
    return acc;
  }, {});

  // Free coordinate grid (FRA-149): breakpoint columns, fixed-height rows, and NO
  // auto-flow — every tile is placed by explicit gridColumn/gridRow from its
  // (x,y), so blank cells stay blank (iOS-18 style). XL is capped at 4 columns.
  const gridClassName = "grid gap-4 auto-rows-[167px]";
  const gridStyle = {
    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
  } satisfies React.CSSProperties;

  // The grid is as tall as the lowest occupied row, plus spare rows so there's
  // always empty space to drop into (and to grow downward).
  const rowCount = maxOccupiedRow(layout, columnCount) + 2;

  // View-mode render of ONE page's grid (plain, clickable tiles — no drag). Used
  // for every page in the sliding track so the transition can animate between them.
  function renderViewPage(page: { id: string; layout: WidgetInstance[] }) {
    if (page.layout.length === 0) {
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-[20px] border border-dashed border-[#E7E7EA] text-sm text-[#71717A]">
          No widgets yet — switch to Edit to add some.
        </div>
      );
    }
    return (
      <div className={gridClassName} style={gridStyle}>
        {page.layout.map((instance) => (
          <WidgetSlot
            key={instance.instanceId}
            onOpen={() => openWidget(instance, linearItems)}
            style={cellStyle(
              instance.x ?? 0,
              instance.y ?? 0,
              instanceSize(instance),
              columnCount,
            )}
          >
            {renderInstance(instance)}
          </WidgetSlot>
        ))}
      </div>
    );
  }

  // The page area. View mode: all pages live side-by-side in a track that slides
  // with translateX — that's what makes paging fluid (iOS-style). Edit mode: only
  // the active page is mounted (it owns the dnd surface), so paging there is an
  // instant swap — you're reorganizing widgets, not swiping. No cross-page drag.
  const gridContent = !isEditing ? (
    // `overflow-hidden` clips the neighbour pages horizontally for the slide. It
    // would ALSO clip the unread badge, which overflows each tile's top-right
    // corner (-top-1.5/-right-1.5) — so the track carries vertical padding (and
    // each page carries side padding) to keep that corner overflow inside the
    // clip region. py-3 (12px) clears the badge's ~8px overhang (6px offset + ring).
    <div className="flex-1 overflow-hidden py-3">
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(-${Math.max(0, activeIndex) * 100}%)`,
        }}
      >
        {pages.map((page) => (
          // px-3 (not the page-wide px-4..lg:px-8): the carousel arrows already
          // inset the grid from the edges, so the page only needs enough side
          // padding to keep the right-column unread badge (-right-1.5 + ring,
          // ~8px) from being clipped by the track's overflow-hidden — matching
          // the py-3 that does the same vertically.
          <div key={page.id} className="w-full shrink-0 px-3">
            {renderViewPage(page)}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <DndContext
      sensors={sensors}
      collisionDetection={cellCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className={cn(gridClassName, "relative flex-1 px-3")}
        style={gridStyle}
        data-dragging={activeId ?? "none"}
      >
        {/* Empty drop-target cells behind the tiles: every (cx,cy) on the grid.
            `event.over` resolves straight to a cell, so no pixel measuring.
            While dragging, the cells show a faint 1×1 reference grid. */}
        <DropCells
          cols={columnCount}
          rows={rowCount}
          showGrid={activeId !== null}
        />

        {/* Destination placeholder: a filled highlight at the cell + exact
            footprint where the dragged widget will land, shown before release. */}
        {activeInstance && dropCell ? (
          <div
            aria-hidden
            style={{
              ...cellStyle(
                dropCell.x,
                dropCell.y,
                instanceSize(activeInstance),
                columnCount,
              ),
              zIndex: 1,
            }}
            className="border-primary/40 bg-primary/10 pointer-events-none rounded-[20px] border-2"
          />
        ) : null}

        {layout.map((instance, index) => {
          const cell = renderCell(instance);
          return (
            <PositionedWidget
              key={instance.instanceId}
              id={instance.instanceId}
              jiggleSeed={cell.x + cell.y + index}
              style={cellStyle(
                cell.x,
                cell.y,
                instanceSize(instance),
                columnCount,
              )}
              sizeControl={renderSizeControl(instance)}
              onRemove={() => removeWidget(instance.instanceId)}
            >
              {renderInstance(instance)}
            </PositionedWidget>
          );
        })}
      </div>
    </DndContext>
  );

  return (
    <>
      {isLoading ? (
        <GridSkeleton />
      ) : (
        <>
          {/* Page dots sit ABOVE the dock (unlike iOS' bottom dots): this is a
              scrollable web page, so the dots belong at the top with the
              shortcuts, not pinned to the bottom of a fixed home screen. */}
          <PageDots
            pages={pages}
            activePageId={activePageId}
            isEditing={isEditing}
            onSelect={setActivePage}
            onAdd={addPage}
            onRemove={removePage}
          />

          {/* Shortcuts own an independent DndContext — kept a sibling, never
              nested in the widget grid's, so the two drag contexts can't share
              items. The dock is shared across pages (FRA-140). */}
          <ShortcutsRow isEditing={isEditing} />

          {/* Page carousel (FRA-140): on-screen arrows flank the active page's
              grid; horizontal wheel/swipe also pages. Drag still moves widgets
              within the current page only — no cross-page drag in v1. The
              carousel owns the dashboard's side margin (the PageContainer zeroes
              its own), so the arrows sit INSIDE that margin instead of pinned to
              the viewport edge. */}
          <div
            className="flex items-stretch gap-3 px-2 sm:px-3 lg:px-4"
            onWheel={onWheel}
          >
            <PageArrow
              direction="left"
              disabled={activeIndex <= 0}
              onClick={() => goToPage(-1)}
            />
            {gridContent}
            <PageArrow
              direction="right"
              disabled={activeIndex >= pages.length - 1}
              onClick={() => goToPage(1)}
            />
          </div>
        </>
      )}

      <WidgetCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        accounts={accounts}
        addedByApp={addedByApp}
        connectedByProvider={connectedByProvider}
        onAdd={addWidget}
      />
    </>
  );
}

/** On-screen ‹ › page arrows, disabled at the first/last page edge (FRA-140). */
function PageArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "left" ? "Previous page" : "Next page"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full",
        "border border-[#E7E7EA] bg-white text-[#71717A] shadow-sm transition-opacity",
        disabled ? "pointer-events-none opacity-0" : "hover:text-[#18181B]",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Skeleton shown while the Supabase row loads (FRA-140 — no client cache, so the
 *  first paint must not flash the default layout). Mirrors the real carousel
 *  layout EXACTLY — same side margin and arrow-width spacers (w-9) + gap + inner
 *  px-3 — so the grid doesn't jump sideways when the real data swaps in. The
 *  pt-6 stands in for the dots + shortcuts row the real dashboard renders above
 *  the carousel (the PageContainer's top padding is zeroed), so the skeleton
 *  isn't flush against the top edge. */
function GridSkeleton() {
  return (
    <div
      className="flex items-stretch gap-3 px-2 pt-6 sm:px-3 lg:px-4"
      aria-hidden
    >
      {/* Spacers stand in for the ‹ › arrows so the grid lands at the same x. */}
      <div className="h-9 w-9 shrink-0" />
      <div className="grid flex-1 auto-rows-[167px] grid-cols-4 gap-4 px-3">
        <div className="col-span-2 row-span-2 animate-pulse rounded-[20px] bg-[#F1F1F4]" />
        <div className="col-span-2 row-span-1 animate-pulse rounded-[20px] bg-[#F1F1F4]" />
        <div className="col-span-1 row-span-1 animate-pulse rounded-[20px] bg-[#F1F1F4]" />
        <div className="col-span-1 row-span-1 animate-pulse rounded-[20px] bg-[#F1F1F4]" />
      </div>
      <div className="h-9 w-9 shrink-0" />
    </div>
  );
}

/**
 * Wraps the grid in the single dashboard-state store so the grid's widgets and
 * the shortcuts row share one source of truth (no cross-slice clobber).
 */
export default function WidgetGridWithState({
  accountEmail,
  accountName,
  accountAvatarUrl,
  userId,
  connections,
}: {
  accountEmail: string | null;
  accountName: string | null;
  accountAvatarUrl: string | null;
  userId: string | null;
  connections: ConnectionsByProvider;
}) {
  return (
    <DashboardStateProvider userId={userId}>
      <PickerLockProvider>
        <WidgetGrid
          accountEmail={accountEmail}
          accountName={accountName}
          accountAvatarUrl={accountAvatarUrl}
          connections={connections}
        />
      </PickerLockProvider>
    </DashboardStateProvider>
  );
}

/** One empty droppable grid cell at (cx,cy). Drop resolves `event.over` here.
 *  While dragging, it shows a faint 1×1 reference border so the user can see the
 *  grid and judge which cell the widget will land in (especially over empty space). */
function DropCell({
  cx,
  cy,
  showGrid,
}: {
  cx: number;
  cy: number;
  showGrid: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: `cell:${cx}:${cy}` });
  return (
    <div
      ref={setNodeRef}
      // Behind the tiles (z-0); placed on the same grid lines so each occupies
      // exactly one cell. Pointer-events stay on so dnd-kit can resolve the drop.
      style={{ gridColumn: `${cx + 1}`, gridRow: `${cy + 1}`, zIndex: 0 }}
      className={cn(
        "rounded-xl transition-colors",
        showGrid && "border border-dashed border-[#E7E7EA]",
      )}
      aria-hidden
    />
  );
}

/** The full layer of empty drop cells covering cols × rows, behind the tiles.
 *  `showGrid` reveals the 1×1 reference grid (only while dragging). */
function DropCells({
  cols,
  rows,
  showGrid,
}: {
  cols: number;
  rows: number;
  showGrid: boolean;
}) {
  const cells: React.ReactNode[] = [];
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      cells.push(
        <DropCell key={`${cx}:${cy}`} cx={cx} cy={cy} showGrid={showGrid} />,
      );
    }
  }
  return <>{cells}</>;
}

/** Compact S/M/L segmented picker shown under a widget in edit mode. */
function SizeControl({
  sizes,
  current,
  onSelect,
}: {
  sizes: readonly WidgetSize[];
  current: WidgetSize;
  onSelect: (size: WidgetSize) => void;
}) {
  const LETTER: Record<WidgetSize, string> = {
    small: "S",
    medium: "M",
    large: "L",
  };
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[#E7E7EA] bg-white p-0.5 shadow-sm">
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          aria-label={`Set ${size} size`}
          aria-pressed={size === current}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(size);
          }}
          className={cn(
            "flex size-6 cursor-pointer items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
            size === current
              ? "bg-[#18181B] text-white"
              : "text-[#71717A] hover:bg-[#F4F4F5]",
          )}
        >
          {LETTER[size]}
        </button>
      ))}
    </div>
  );
}
