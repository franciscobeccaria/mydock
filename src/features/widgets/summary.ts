import { isToday, isTomorrow, parseISO } from "date-fns";

import type {
  TodaySummary,
  WidgetPayload,
} from "@/features/integrations/types";

export function buildTodaySummary(
  widgets: WidgetPayload[],
  generatedAt = new Date().toISOString(),
): TodaySummary {
  const linearCount =
    widgets.find((widget) => widget.provider === "linear")?.items.length ?? 0;
  const unreadEmails =
    widgets
      .find((widget) => widget.provider === "gmail")
      ?.items.filter((item) => item.metadata?.unread === true).length ?? 0;
  const taskCount =
    widgets.find((widget) => widget.provider === "google_tasks")?.items
      .length ?? 0;
  const nextEvent = widgets
    .find((widget) => widget.provider === "google_calendar")
    ?.items.find((item) => item.occurredAt);

  const bullets = [
    `${linearCount} focused Linear items are ready for review or execution.`,
    `${unreadEmails} recent emails look worth triaging before noon.`,
    `${taskCount} pending tasks are queued for the next few days.`,
  ];

  if (nextEvent?.occurredAt) {
    const nextEventDate = parseISO(nextEvent.occurredAt);
    const descriptor = isToday(nextEventDate)
      ? "today"
      : isTomorrow(nextEventDate)
        ? "tomorrow"
        : "soon";

    bullets.unshift(`Next calendar anchor: ${nextEvent.title} ${descriptor}.`);
  }

  return {
    generatedAt,
    headline: "Your workday is centralized and ready to scan.",
    bullets,
  };
}
