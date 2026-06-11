"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { DashboardStateProvider } from "@/components/dashboard/use-dashboard-state";
import { type WidgetInstance } from "@/components/dashboard/widget-instance";
import { deriveLinearAssignedUrl } from "@/components/widgets/linear-widget";
import { WidgetCatalogDialog, type WidgetAccount } from "@/components/widgets/widget-catalog-dialog";
import { CATALOG_BY_ID } from "@/components/widgets/widget-catalog";
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
import { type WidgetPayload } from "@/features/integrations/types";

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

/** Edit mode: the widget jiggles and is draggable; clicks do not open it. */
function SortableWidget({
  id,
  index,
  children,
  onRemove,
}: {
  id: string;
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
  const setConfig = configKey ? (value: string) => onConfigChange(configKey, value) : undefined;

  // Gmail's view is a server-side query param; key it so All/Unread fetch apart.
  const gmailView = slotId === "gmail" ? configValue ?? "all" : undefined;

  // Keyed by accountId so two instances on different connections cache apart.
  const query = useQuery({
    queryKey: widgetQueryKey(slotId, gmailView, instance.accountId),
    queryFn: () => fetchWidget(provider, gmailView, instance.accountId),
    staleTime: widgetStaleTime(provider),
    gcTime: 15 * 60_000,
  });

  useEffect(() => {
    onLoaded?.(query.data);
  }, [onLoaded, query.data]);

  return renderWidget(slotId, getWidgetPayload(provider, WIDGET_TITLE[slotId], query.data, query.error), {
    onRetry: () => query.refetch(),
    isRetrying: query.isFetching,
    configValue,
    onConfigChange: setConfig,
  });
}

function WidgetGrid({
  accountEmail,
  accountName,
  accountAvatarUrl,
}: {
  accountEmail: string | null;
  accountName: string | null;
  accountAvatarUrl: string | null;
}) {
  const router = useRouter();
  const { isEditing } = useDashboardMode();

  // Until FRA-138's multi-account connect flow lands, the only account is the
  // login account, recorded as the default (accountId `null`).
  const accounts: WidgetAccount[] = [
    {
      id: null,
      label: accountEmail ?? "Default account",
      name: accountName ?? accountEmail,
      avatarUrl: accountAvatarUrl,
    },
  ];

  // Active instances, order, add/remove/config all live in the layout hook, now
  // backed by per-user Supabase state (with a localStorage cache).
  const { layout, addWidget, removeWidget, reorder, updateConfig } = useDashboardLayout();
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Linear's catalog destination is the generic https://linear.app/; when issues
  // have loaded we resolve the user's own assigned-issues view from their URLs.
  // The latest loaded Linear payload is captured so a click can use it.
  const linearItemsRef = useRef<WidgetPayload["items"]>([]);
  const handleLinearLoaded = useCallback((payload: WidgetPayload | undefined) => {
    if (payload) linearItemsRef.current = payload.items;
  }, []);

  const sensors = useSensors(
    useSensor(ControlAwarePointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(active.id as string, over.id as string);
  }

  function openWidget(instance: WidgetInstance) {
    const { slotId, config } = instance;
    const destination =
      slotId === "gmail" && config["gmail-view"] === "unread"
        ? "https://mail.google.com/mail/u/0/#search/is%3Aunread+category%3Aprimary"
        : slotId === "linear"
          ? deriveLinearAssignedUrl(linearItemsRef.current) ?? CATALOG_BY_ID[slotId].destination
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
        onConfigChange={(key, value) => updateConfig(instance.instanceId, key, value)}
        onLoaded={instance.slotId === "linear" ? handleLinearLoaded : undefined}
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
            {layout.map((instance) => (
              <WidgetSlot key={instance.instanceId} onOpen={() => openWidget(instance)}>
                {renderInstance(instance)}
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
        <SortableContext items={layout.map((i) => i.instanceId)} strategy={rectSortingStrategy}>
          <div className={gridClassName}>
            {layout.map((instance, index) => (
              <SortableWidget
                key={instance.instanceId}
                id={instance.instanceId}
                index={index}
                onRemove={() => removeWidget(instance.instanceId)}
              >
                {renderInstance(instance)}
              </SortableWidget>
            ))}
            <AddWidgetTile onClick={() => setCatalogOpen(true)} />
          </div>
        </SortableContext>
      </DndContext>

      <WidgetCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        accounts={accounts}
        addedByApp={addedByApp}
        onAdd={addWidget}
      />
    </>
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
}: {
  accountEmail: string | null;
  accountName: string | null;
  accountAvatarUrl: string | null;
  userId: string | null;
}) {
  return (
    <DashboardStateProvider userId={userId}>
      <WidgetGrid
        accountEmail={accountEmail}
        accountName={accountName}
        accountAvatarUrl={accountAvatarUrl}
      />
    </DashboardStateProvider>
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
