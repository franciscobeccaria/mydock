"use client";

import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * iOS-style page dots (FRA-140). One dot per dashboard page; the active page's
 * dot is filled and wider. In edit mode a trailing `+` dot adds a page, and each
 * dot (except when only one page remains) gets a small remove affordance.
 *
 * Pure presentational + click navigation — the page list and the active page
 * live in the dashboard state store.
 */
export function PageDots({
  pages,
  activePageId,
  isEditing,
  onSelect,
  onAdd,
  onRemove,
}: {
  pages: { id: string }[];
  activePageId: string;
  isEditing: boolean;
  onSelect: (pageId: string) => void;
  onAdd: () => void;
  onRemove: (pageId: string) => void;
}) {
  // A single page with no edit affordances has nothing to show — hide entirely,
  // just like iOS hides the dots when there's only one home screen.
  if (pages.length <= 1 && !isEditing) return null;

  const canRemove = isEditing && pages.length > 1;

  return (
    <div
      className="flex items-center justify-center gap-2 py-3"
      role="tablist"
      aria-label="Dashboard pages"
    >
      {pages.map((page, index) => {
        const active = page.id === activePageId;
        return (
          <div key={page.id} className="group relative flex items-center">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Page ${index + 1}`}
              onClick={() => onSelect(page.id)}
              className={cn(
                "h-2 rounded-full transition-all",
                active ? "w-5 bg-[#18181B]" : "w-2 bg-[#C7C7CC] hover:bg-[#A1A1AA]",
              )}
            />
            {canRemove ? (
              <button
                type="button"
                aria-label={`Remove page ${index + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(page.id);
                }}
                className={cn(
                  "absolute -right-1 -top-2 hidden h-3.5 w-3.5 items-center justify-center",
                  "rounded-full bg-[#18181B] text-white shadow-sm",
                  "group-hover:flex",
                )}
              >
                <X className="h-2.5 w-2.5" strokeWidth={3} />
              </button>
            ) : null}
          </div>
        );
      })}

      {isEditing ? (
        <button
          type="button"
          aria-label="Add page"
          onClick={onAdd}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full",
            "border border-dashed border-[#C7C7CC] text-[#71717A] transition-colors",
            "hover:border-[#A1A1AA] hover:text-[#18181B]",
          )}
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}
