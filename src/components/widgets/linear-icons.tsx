import { cn } from "@/lib/utils";

// Linear's priority glyph: four ascending bars where the active level is dark
// and the rest are muted. Priority value follows Linear's API (1 urgent … 4 low,
// 0 = no priority).
export function LinearPriorityIcon({
  priority,
  className,
}: {
  priority: number;
  className?: string;
}) {
  if (priority === 1) {
    // Urgent — filled warning square.
    return (
      <svg
        viewBox="0 0 16 16"
        className={cn("size-4 shrink-0", className)}
        aria-label="Urgent priority"
      >
        <rect width="16" height="16" rx="3" fill="#F2994A" />
        <rect x="7" y="3" width="2" height="6" rx="1" fill="white" />
        <rect x="7" y="11" width="2" height="2" rx="1" fill="white" />
      </svg>
    );
  }

  // Bars: index 0 = lowest. Active count grows with priority.
  // high(2) → 3 bars, medium(3) → 2 bars, low(4) → 1 bar, none(0) → 0.
  const activeBars = priority === 2 ? 3 : priority === 3 ? 2 : priority === 4 ? 1 : 0;
  const heights = [5, 9, 13];

  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-4 shrink-0", className)}
      aria-label="Priority"
    >
      {heights.map((height, index) => (
        <rect
          key={index}
          x={2 + index * 4}
          y={14 - height}
          width="2.5"
          height={height}
          rx="0.75"
          fill={index < activeBars ? "#6B6F76" : "#D4D5D8"}
        />
      ))}
    </svg>
  );
}

// Linear's workflow status glyph: a ring whose fill reflects progress.
// stateType: backlog | unstarted | started | completed | canceled | triage.
export function LinearStatusIcon({
  stateType,
  color,
  className,
}: {
  stateType?: string;
  color?: string;
  className?: string;
}) {
  const stroke = color ?? "#9CA0A8";

  if (stateType === "completed") {
    return (
      <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-label="Done">
        <circle cx="7" cy="7" r="6" fill={color ?? "#5E6AD2"} />
        <path
          d="M4.3 7.1l1.8 1.8 3.4-3.6"
          fill="none"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (stateType === "canceled") {
    return (
      <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-label="Cancelled">
        <circle cx="7" cy="7" r="6" fill="#C2C5CB" />
        <path
          d="M5 5l4 4M9 5l-4 4"
          stroke="white"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (stateType === "started") {
    // Half-filled progress ring.
    return (
      <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-label="In progress">
        <circle cx="7" cy="7" r="5.5" fill="none" stroke={stroke} strokeWidth="1.5" />
        <path d="M7 7 L7 2 A5 5 0 0 1 12 7 Z" fill={stroke} />
      </svg>
    );
  }

  // backlog / unstarted / triage / unknown — dashed or hollow ring.
  return (
    <svg viewBox="0 0 14 14" className={cn("size-3.5 shrink-0", className)} aria-label="Todo">
      <circle
        cx="7"
        cy="7"
        r="5.5"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeDasharray={stateType === "backlog" ? "2 2" : undefined}
      />
    </svg>
  );
}
