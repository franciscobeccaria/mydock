import { cn } from "@/lib/utils";

/**
 * iOS app-icon-style unread badge: a red pill in the top-right corner of a tile.
 * Shared primitive (FRA-137) — any widget with a count renders it the same way.
 * Renders nothing when the count is 0 so it stays absent unless there's news.
 *
 * The parent must be `relative` for the absolute corner placement to anchor.
 * The white ring lifts it off the page surface (`#fafafa`) like iOS.
 */
export function UnreadBadge({
  count,
  className,
}: {
  count: number | undefined | null;
  className?: string;
}) {
  if (!count || count <= 0) return null;
  // Show the real count up to three digits; beyond 999 it caps at "999+".
  const label = count > 999 ? "999+" : String(count);
  return (
    <span
      aria-label={`${count} unread`}
      className={cn(
        "pointer-events-none absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[11px] font-semibold leading-none text-white shadow-[0_2px_6px_rgba(255,59,48,0.45)] ring-2 ring-[#fafafa]",
        className,
      )}
    >
      {label}
    </span>
  );
}
