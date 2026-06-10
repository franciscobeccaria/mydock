"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useDashboardMode } from "@/components/dashboard/dashboard-mode-context";
import { ShortcutsRow } from "@/components/dashboard/shortcuts-row";
import { useDashboardLayout } from "@/components/dashboard/use-dashboard-layout";
import { useWidgetPreference } from "@/components/dashboard/use-widget-preference";
import { CalendarMonthGridWidget } from "@/components/widgets/calendar-month-grid-widget";
import { CalendarTodayAgendaWidget } from "@/components/widgets/calendar-today-agenda-widget";
import { CalendarUpcomingWeekWidget } from "@/components/widgets/calendar-upcoming-week-widget";
import { GmailWidget } from "@/components/widgets/gmail-widget";
import { GoogleTasksWidget } from "@/components/widgets/google-tasks-widget";
import { deriveLinearAssignedUrl, LinearWidget } from "@/components/widgets/linear-widget";
import { WidgetCatalogDialog } from "@/components/widgets/widget-catalog-dialog";
import { CATALOG_BY_ID, type SlotId } from "@/components/widgets/widget-catalog";
import { cn } from "@/lib/utils";
import { type Provider, type WidgetPayload } from "@/features/integrations/types";

function makeLoadingPayload(provider: Provider, title: string): WidgetPayload {
  return {
    provider,
    title,
    state: "loading",
    items: [],
    isMock: provider === "linear",
    connectionStatus: "disconnected",
    lastUpdatedAt: new Date().toISOString(),
    requiredScopes: [],
    grantedScopes: [],
    missingScopes: [],
    needsConsent: false,
    accountEmail: null,
  };
}

async function fetchWidget(provider: Provider, view?: string) {
  const url = view
    ? `/api/widgets/${provider}?view=${encodeURIComponent(view)}`
    : `/api/widgets/${provider}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${provider}.`);
  return (await response.json()) as WidgetPayload;
}

function getWidgetPayload(
  provider: Provider,
  title: string,
  data: WidgetPayload | undefined,
  error: Error | null,
): WidgetPayload {
  if (data) return data;
  if (error) {
    return {
      ...makeLoadingPayload(provider, title),
      state: "error" as const,
      error: `We couldn't load ${title} right now.`,
    };
  }
  return makeLoadingPayload(provider, title);
}

const INTERACTIVE =
  'a,button,input,textarea,select,[role="button"],[role="option"],[role="listbox"],[data-slot="select-trigger"],[data-interactive="true"]';

/** View mode: clicking the widget opens its destination (unless an inner control was hit). */
function WidgetSlot({
  children,
  onOpen,
}: {
  children: React.ReactNode;
  onOpen: () => void;
}) {
  const pointerOnInteractive = useRef(false);
  return (
    <div
      onPointerDown={(event) => {
        pointerOnInteractive.current = !!(event.target as HTMLElement).closest(INTERACTIVE);
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

/** Edit mode: the widget jiggles and is draggable; clicks do not open it. */
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

function SortableWidget({
  id,
  index,
  children,
  onRemove,
}: {
  id: SlotId;
  index: number;
  children: React.ReactNode;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  // The whole tile is the drag handle in edit mode — grabbing anywhere on the widget
  // moves it (iOS-style). Inner controls are non-interactive while editing.
  //
  // dnd-kit drives the layout transform on the OUTER element. The jiggle animation
  // lives on an INNER element so its `rotate()` keyframes don't get clobbered by the
  // inline drag transform (an element can only have one `transform`).
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        "relative h-full touch-none cursor-grab active:cursor-grabbing",
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
          className="absolute -left-2 -top-2 z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border border-[#E7E7EA] bg-white text-[#71717A] shadow-sm transition-colors hover:text-[#18181B]"
        >
          <Minus className="size-3.5" />
        </button>
      ) : null}

      <div
        // Stagger each widget's jiggle so they don't move in unison, like iOS.
        style={{ animationDelay: `${(index % 4) * -0.09}s` }}
        className={cn(
          // Inner controls are inert while editing so the whole surface drags —
          // except elements marked [data-no-drag] (header selects), which stay
          // interactive and (via ControlAwarePointerSensor) don't start a drag.
          "h-full select-none transition-shadow duration-150 [&_*]:pointer-events-none [&_[data-no-drag]]:pointer-events-auto [&_[data-no-drag]_*]:pointer-events-auto",
          // Jiggle at rest; while dragging, kill the animation so the lift transform applies.
          isDragging
            ? "scale-[1.03] opacity-90 shadow-[0_18px_40px_rgba(17,24,39,0.18)]"
            : "widget-jiggle",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default function WidgetGrid() {
  const router = useRouter();
  const { isEditing } = useDashboardMode();

  // Active widgets, order, and add/remove all live in the layout hook, which
  // reads/writes localStorage. The grid is client-only (ssr: false), so the
  // hook's lazy initializer reads storage without a hydration mismatch.
  const { layout, isActive, addWidget, removeWidget, reorder } = useDashboardLayout();
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Only fetch a provider's data when at least one of its widgets is on the
  // dashboard. Removed/never-added widgets cost no network requests. The
  // calendar provider feeds three slots, so it stays active if any are present.
  const activeProviders = useMemo(() => {
    const providers = new Set<Provider>();
    for (const id of layout) providers.add(CATALOG_BY_ID[id].provider);
    return providers;
  }, [layout]);

  const linearQuery = useQuery({
    queryKey: ["integrations", "linear", "issues"],
    queryFn: () => fetchWidget("linear"),
    enabled: activeProviders.has("linear"),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });

  // Gmail's view is lifted here so it keys the per-view fetch (All and Unread are
  // independent server-side queries, not a client-side filter of one list).
  const [gmailView, setGmailView] = useWidgetPreference("gmail-view", "all");
  const gmailQuery = useQuery({
    queryKey: ["integrations", "gmail", "emails", gmailView],
    queryFn: () => fetchWidget("gmail", gmailView),
    enabled: activeProviders.has("gmail"),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });

  const tasksQuery = useQuery({
    queryKey: ["integrations", "tasks"],
    queryFn: () => fetchWidget("google_tasks"),
    enabled: activeProviders.has("google_tasks"),
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
  });

  const calendarQuery = useQuery({
    queryKey: ["integrations", "calendar", "events"],
    queryFn: () => fetchWidget("google_calendar"),
    enabled: activeProviders.has("google_calendar"),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });

  const sensors = useSensors(
    useSensor(ControlAwarePointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(active.id as SlotId, over.id as SlotId);
  }

  function openWidget(id: SlotId) {
    // When Gmail is showing the Unread view, open Gmail's unread search instead of the
    // inbox so the user lands directly on their unread mail.
    //
    // Linear's catalog destination is the generic https://linear.app/; when we
    // have loaded issues we can resolve the user's own assigned-issues view from
    // their issue URLs and open that instead.
    const destination =
      id === "gmail" && gmailView === "unread"
        ? "https://mail.google.com/mail/u/0/#search/is%3Aunread+category%3Aprimary"
        : id === "linear"
          ? deriveLinearAssignedUrl(linearQuery.data?.items ?? []) ??
            CATALOG_BY_ID[id].destination
          : CATALOG_BY_ID[id].destination;
    if (destination.startsWith("http")) {
      window.open(destination, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(destination);
  }

  const slotContent = useMemo<Record<SlotId, React.ReactNode>>(
    () => ({
      linear: (
        <LinearWidget
          payload={getWidgetPayload("linear", "Linear", linearQuery.data, linearQuery.error)}
          onRetry={() => linearQuery.refetch()}
          isRetrying={linearQuery.isFetching}
        />
      ),
      gmail: (
        <GmailWidget
          payload={getWidgetPayload("gmail", "Gmail", gmailQuery.data, gmailQuery.error)}
          onRetry={() => gmailQuery.refetch()}
          isRetrying={gmailQuery.isFetching}
          view={gmailView as "all" | "unread"}
          onViewChange={setGmailView}
        />
      ),
      google_tasks: (
        <GoogleTasksWidget
          payload={getWidgetPayload("google_tasks", "Tasks", tasksQuery.data, tasksQuery.error)}
          onRetry={() => tasksQuery.refetch()}
          isRetrying={tasksQuery.isFetching}
        />
      ),
      calendar_today: (
        <CalendarTodayAgendaWidget
          payload={getWidgetPayload(
            "google_calendar",
            "Calendar",
            calendarQuery.data,
            calendarQuery.error,
          )}
          onRetry={() => calendarQuery.refetch()}
          isRetrying={calendarQuery.isFetching}
        />
      ),
      calendar_upcoming: (
        <CalendarUpcomingWeekWidget
          payload={getWidgetPayload(
            "google_calendar",
            "Upcoming week",
            calendarQuery.data,
            calendarQuery.error,
          )}
          onRetry={() => calendarQuery.refetch()}
          isRetrying={calendarQuery.isFetching}
        />
      ),
      calendar_month: (
        <CalendarMonthGridWidget
          payload={getWidgetPayload(
            "google_calendar",
            "Calendar",
            calendarQuery.data,
            calendarQuery.error,
          )}
          onRetry={() => calendarQuery.refetch()}
          isRetrying={calendarQuery.isFetching}
        />
      ),
    }),
    [linearQuery, gmailQuery, tasksQuery, calendarQuery, gmailView, setGmailView],
  );

  const gridClassName = "grid grid-cols-1 gap-4 lg:grid-cols-2";

  if (!isEditing) {
    return (
      <>
        <ShortcutsRow isEditing={false} />
        {layout.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-[20px] border border-dashed border-[#E7E7EA] text-sm text-[#71717A]">
            No widgets yet — switch to Edit to add some.
          </div>
        ) : (
          <div className={gridClassName}>
            {layout.map((id) => (
              <WidgetSlot key={id} onOpen={() => openWidget(id)}>
                {slotContent[id]}
              </WidgetSlot>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Shortcuts own an independent DndContext — kept a sibling, never nested
          in the widget grid's, so the two drag contexts can't share items. */}
      <ShortcutsRow isEditing />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* The "+" tile is deliberately NOT part of `items`, so dnd-kit never
            treats it as sortable or as a drop target. */}
        <SortableContext items={layout} strategy={rectSortingStrategy}>
          <div className={gridClassName}>
            {layout.map((id, index) => (
              <SortableWidget key={id} id={id} index={index} onRemove={() => removeWidget(id)}>
                {slotContent[id]}
              </SortableWidget>
            ))}
            <AddWidgetTile onClick={() => setCatalogOpen(true)} />
          </div>
        </SortableContext>
      </DndContext>

      <WidgetCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        isActive={isActive}
        onAdd={addWidget}
      />
    </>
  );
}

/** Edit-mode-only placeholder tile that opens the widget catalog. */
function AddWidgetTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[350px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-[#E7E7EA] bg-transparent text-[#A1A1AA] transition-colors hover:border-[#D4D4D8] hover:text-[#71717A]"
    >
      <Plus className="size-6" />
      <span className="text-sm font-medium">Add widget</span>
    </button>
  );
}
