import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { WidgetItem } from "@/features/integrations/types";

export type CalendarWidgetEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  location: string | null;
  hangoutLink: string | null;
  attendees: { name: string | null; email: string | null }[];
  colorId: string | null;
  source: "google";
  url: string | null;
  allDay: boolean;
};

// Google Calendar colorId → muted hex accent
const GOOGLE_COLOR_MAP: Record<string, string> = {
  "1": "#E67C73", // Tomato
  "2": "#F6BF26", // Banana
  "3": "#33B679", // Sage → Basil
  "4": "#0B8043", // Basil
  "5": "#039BE5", // Peacock
  "6": "#4285F4", // Blueberry
  "7": "#8E24AA", // Grape
  "8": "#616161", // Graphite
  "9": "#3F51B5", // Lavender → Blueberry
  "10": "#0B8043", // Sage
  "11": "#E67C73", // Flamingo
};

const DEFAULT_ACCENT = "#4285F4";

export function accentForEvent(event: CalendarWidgetEvent): string {
  return event.colorId ? (GOOGLE_COLOR_MAP[event.colorId] ?? DEFAULT_ACCENT) : DEFAULT_ACCENT;
}

export function toCalendarEvent(item: WidgetItem): CalendarWidgetEvent | null {
  if (!item.occurredAt) return null;

  const startRaw = item.occurredAt;
  const endRaw = item.metadata?.endAt as string | undefined;

  // All-day events come as YYYY-MM-DD (no time component)
  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(startRaw);

  const start = allDay
    ? new Date(`${startRaw}T00:00:00`)
    : new Date(startRaw);

  const end = endRaw
    ? allDay
      ? new Date(`${endRaw}T00:00:00`)
      : new Date(endRaw)
    : null;

  return {
    id: item.id,
    title: item.title,
    start,
    end,
    location: (item.metadata?.location as string | undefined) ?? null,
    hangoutLink: (item.metadata?.hangoutLink as string | undefined) ?? null,
    attendees: (item.metadata?.attendees as { name: string | null; email: string | null }[] | undefined) ?? [],
    colorId: (item.metadata?.colorId as string | undefined) ?? null,
    source: "google",
    url: item.url ?? null,
    allDay,
  };
}

export function formatTimeRange(event: CalendarWidgetEvent): string {
  if (event.allDay) return "All day";

  const startStr = format(event.start, "p");
  if (!event.end) return startStr;

  const endStr = format(event.end, "p");
  // Collapse if same period and save space
  return `${startStr} – ${endStr}`;
}

export function meetingPlatformLabel(event: CalendarWidgetEvent): string | null {
  if (event.hangoutLink) return "Meet";
  const loc = event.location?.toLowerCase() ?? "";
  if (loc.includes("zoom")) return "Zoom";
  if (loc.includes("teams")) return "Teams";
  if (loc.includes("webex")) return "Webex";
  if (loc.includes("room") || loc.includes("conference") || loc.includes("office")) return "Office";
  return null;
}

export function eventsOverlap(a: CalendarWidgetEvent, b: CalendarWidgetEvent): boolean {
  if (a.allDay || b.allDay) return false;
  const aEnd = a.end ?? a.start;
  const bEnd = b.end ?? b.start;
  return a.start < bEnd && aEnd > b.start;
}

export function hasConflict(event: CalendarWidgetEvent, all: CalendarWidgetEvent[]): boolean {
  return all.some((other) => other.id !== event.id && eventsOverlap(event, other));
}

export function getWeekDays(referenceDate: Date): Date[] {
  // Returns Mon–Sun of the week containing referenceDate
  const day = referenceDate.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() + diffToMon + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

export function hasDotForDay(day: Date, events: CalendarWidgetEvent[]): boolean {
  return events.some((e) => isSameDay(e.start, day));
}

// 42 days (6 rows × 7 cols, Sunday-first) covering the month containing `month`,
// including the leading/trailing days from adjacent months that fill the grid.
export function getMonthGridDays(month: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function eventsForDay(day: Date, events: CalendarWidgetEvent[]): CalendarWidgetEvent[] {
  return events
    .filter((e) => isSameDay(e.start, day))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
