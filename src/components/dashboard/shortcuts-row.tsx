"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AddShortcutDialog } from "@/components/dashboard/add-shortcut-dialog";
import { ShortcutFavicon } from "@/components/dashboard/shortcut-favicon";
import { useShortcuts, type Shortcut } from "@/components/dashboard/use-shortcuts";
import { ControlAwarePointerSensor } from "@/components/widgets/widget-grid";
import { cn } from "@/lib/utils";

const CHIP = "flex size-11 items-center justify-center rounded-[14px] border bg-white";

function openShortcut(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function ShortcutsRow({ isEditing }: { isEditing: boolean }) {
  const { shortcuts, addShortcut, removeShortcut, reorder } = useShortcuts();
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(ControlAwarePointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(active.id as string, over.id as string);
  }

  // View mode with nothing to show: render nothing above the grid.
  if (!isEditing && shortcuts.length === 0) return null;

  if (!isEditing) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.id}
            type="button"
            title={shortcut.name}
            aria-label={`Open ${shortcut.name}`}
            onClick={() => openShortcut(shortcut.url)}
            className={cn(CHIP, "cursor-pointer border-[#E7E7EA] transition-shadow hover:shadow-sm")}
          >
            <ShortcutFavicon
              url={shortcut.url}
              name={shortcut.name}
              iconUrl={shortcut.iconUrl}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* The "+" chip is deliberately NOT part of `items`, so dnd-kit never
            treats it as sortable or a drop target. */}
        <SortableContext
          items={shortcuts.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            {shortcuts.map((shortcut, index) => (
              <SortableShortcut
                key={shortcut.id}
                shortcut={shortcut}
                index={index}
                onRemove={() => removeShortcut(shortcut.id)}
              />
            ))}
            <AddShortcutChip onClick={() => setAddOpen(true)} />
          </div>
        </SortableContext>
      </DndContext>

      <AddShortcutDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingUrls={shortcuts.map((s) => s.url)}
        onAdd={addShortcut}
      />
    </>
  );
}

function SortableShortcut({
  shortcut,
  index,
  onRemove,
}: {
  shortcut: Shortcut;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: shortcut.id,
  });

  // Mirrors SortableWidget: dnd-kit drives the layout transform on the OUTER
  // element; the jiggle animation lives on an INNER element so its rotate()
  // keyframes aren't clobbered by the inline drag transform.
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "relative touch-none cursor-grab active:cursor-grabbing",
        isDragging && "z-10",
      )}
    >
      {/* Remove control. Sibling of the jiggle wrapper so it escapes the
          `[&_*]:pointer-events-none` rule. stopPropagation on pointerdown keeps
          the dnd-kit sensor from turning the click into a drag. */}
      {!isDragging ? (
        <button
          type="button"
          data-no-drag
          aria-label={`Remove ${shortcut.name}`}
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
        // Stagger each chip's jiggle so they don't move in unison, like iOS.
        style={{ animationDelay: `${(index % 4) * -0.09}s` }}
        className={cn(
          "select-none [&_*]:pointer-events-none [&_[data-no-drag]]:pointer-events-auto",
          // Jiggle at rest; while dragging, lift slightly.
          isDragging ? "scale-[1.08] opacity-95" : "shortcut-jiggle",
        )}
      >
        {/* The shadow lives on the rounded chip itself so it follows the corners
            instead of casting a square halo around the wrapper. */}
        <div
          className={cn(
            CHIP,
            "border-[#E7E7EA] transition-shadow duration-150",
            isDragging && "shadow-[0_12px_28px_rgba(17,24,39,0.18)]",
          )}
        >
          <ShortcutFavicon
            url={shortcut.url}
            name={shortcut.name}
            iconUrl={shortcut.iconUrl}
          />
        </div>
      </div>
    </div>
  );
}

function AddShortcutChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Add shortcut"
      onClick={onClick}
      className="flex size-11 cursor-pointer items-center justify-center rounded-[14px] border-2 border-dashed border-[#E7E7EA] text-[#A1A1AA] transition-colors hover:border-[#D4D4D8] hover:text-[#71717A]"
    >
      <Plus className="size-5" />
    </button>
  );
}
