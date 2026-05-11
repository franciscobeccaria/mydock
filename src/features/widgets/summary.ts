import { isToday, isTomorrow, parseISO } from "date-fns";

import type { TodaySummary, WidgetPayload } from "@/features/integrations/types";

function describeNextEvent(widgets: WidgetPayload[]) {
  const nextEvent = widgets
    .find((widget) => widget.provider === "google_calendar")
    ?.items.find((item) => item.occurredAt);

  if (!nextEvent?.occurredAt) {
    return null;
  }

  const nextEventDate = parseISO(nextEvent.occurredAt);
  const descriptor = isToday(nextEventDate)
    ? "today"
    : isTomorrow(nextEventDate)
      ? "tomorrow"
      : "soon";

  return `Next up: ${nextEvent.title} ${descriptor}.`;
}

export function buildTodaySummary(
  widgets: WidgetPayload[],
  generatedAt = new Date().toISOString(),
): TodaySummary {
  const readySourceCount = widgets.filter(
    (widget) => widget.state === "connected" || widget.state === "empty",
  ).length;
  const totalSourceCount = widgets.length;

  const bullets: string[] = [];
  const nextEventBullet = describeNextEvent(widgets);

  if (nextEventBullet) {
    bullets.push(nextEventBullet);
  }

  const gmailWidget = widgets.find((widget) => widget.provider === "gmail");
  const taskWidget = widgets.find((widget) => widget.provider === "google_tasks");
  const linearWidget = widgets.find((widget) => widget.provider === "linear");

  if (gmailWidget?.state === "connected") {
    const unreadCount = gmailWidget.items.filter((item) => item.metadata?.unread === true).length;
    bullets.push(
      unreadCount > 0
        ? `${unreadCount} important emails are ready for a quick scan.`
        : "Your inbox looks calm right now.",
    );
  }

  if (taskWidget?.state === "connected") {
    bullets.push(`${taskWidget.items.length} tasks are lined up for your next block.`);
  }

  if (linearWidget?.state === "connected") {
    bullets.push(`${linearWidget.items.length} Linear issues are ready for review.`);
  }

  const providersNeedingAccess = widgets
    .filter((widget) => widget.state === "permission_required")
    .map((widget) => widget.title);

  if (providersNeedingAccess.length > 0) {
    bullets.push(`Review Google access to unlock ${providersNeedingAccess.join(", ")}.`);
  }

  if (bullets.length === 0) {
    bullets.push("Connect your tools to turn this into your daily brief.");
  }

  const headline =
    readySourceCount === totalSourceCount
      ? "Everything you need is ready in one calm view."
      : readySourceCount === 0
        ? "Get started by connecting the tools you use every day."
        : `${readySourceCount} of ${totalSourceCount} workspaces are ready for today.`;

  return {
    generatedAt,
    headline,
    bullets,
    readySourceCount,
    totalSourceCount,
  };
}
