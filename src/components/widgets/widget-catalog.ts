import type { Provider } from "@/features/integrations/types";

// Each visible widget gets a stable slot id. Several slots can share a provider
// (the calendar appears three ways), so the slot id — not the provider — drives
// identity, order, and add/remove.
export type SlotId =
  | "linear"
  | "gmail"
  | "google_tasks"
  | "calendar_today"
  | "calendar_upcoming"
  | "calendar_month";

// An "app" groups the widgets a single integration offers. Today most apps
// expose one widget; the calendar exposes three. The catalog dialog is grouped
// by app, so this scales as we add more apps and more widgets per app.
export type AppId = "linear" | "gmail" | "google_calendar" | "google_tasks";

export type WidgetCatalogEntry = {
  id: SlotId;
  /** The app this widget belongs to (drives grouping). */
  appId: AppId;
  /** Provider backing the data + icon. */
  provider: Provider;
  /** Widget name within its app group (e.g. "Today's agenda"). */
  label: string;
  /** One-line description shown in the catalog. */
  description: string;
  /** External destination opened on click in view mode. */
  destination: string;
};

export type AppGroup = {
  id: AppId;
  label: string;
  provider: Provider;
  widgets: WidgetCatalogEntry[];
};

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";

const APP_LABELS: Record<AppId, string> = {
  linear: "Linear",
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  google_tasks: "Google Tasks",
};

// Single source of truth for addable widgets. Do NOT import the server-side
// registry here — this module is consumed by client components.
export const WIDGET_CATALOG: readonly WidgetCatalogEntry[] = [
  {
    id: "linear",
    appId: "linear",
    provider: "linear",
    label: "Assigned issues",
    description:
      "Issues assigned to you, ordered by priority. Filter by project or see them all.",
    destination: "https://linear.app/",
  },
  {
    id: "gmail",
    appId: "gmail",
    provider: "gmail",
    label: "Inbox",
    description: "The messages that matter most, without leaving your dashboard.",
    destination: "https://mail.google.com/mail/u/0/#inbox",
  },
  {
    id: "calendar_today",
    appId: "google_calendar",
    provider: "google_calendar",
    label: "Today's agenda",
    description: "Everything on your plate for today, in order.",
    destination: CALENDAR_URL,
  },
  {
    id: "calendar_upcoming",
    appId: "google_calendar",
    provider: "google_calendar",
    label: "Upcoming week",
    description: "The next seven days of events at a glance.",
    destination: CALENDAR_URL,
  },
  {
    id: "calendar_month",
    appId: "google_calendar",
    provider: "google_calendar",
    label: "Month grid",
    description: "A full month overview to spot busy stretches.",
    destination: CALENDAR_URL,
  },
  {
    id: "google_tasks",
    appId: "google_tasks",
    provider: "google_tasks",
    label: "Tasks",
    description: "Keep your top to-dos in view while you work.",
    destination: "https://tasks.google.com/tasks/",
  },
] as const;

export const DEFAULT_LAYOUT: SlotId[] = WIDGET_CATALOG.map((w) => w.id);

export const CATALOG_BY_ID: Record<SlotId, WidgetCatalogEntry> = Object.fromEntries(
  WIDGET_CATALOG.map((w) => [w.id, w]),
) as Record<SlotId, WidgetCatalogEntry>;

export function isSlotId(value: string): value is SlotId {
  return value in CATALOG_BY_ID;
}

// Catalog grouped by app, sorted alphabetically by app label. The dialog renders
// one section per group; widgets within a group keep their WIDGET_CATALOG order.
export const APP_GROUPS: AppGroup[] = (() => {
  const groups = new Map<AppId, AppGroup>();
  for (const widget of WIDGET_CATALOG) {
    let group = groups.get(widget.appId);
    if (!group) {
      group = {
        id: widget.appId,
        label: APP_LABELS[widget.appId],
        // All widgets in a group share the same backing provider.
        provider: widget.provider,
        widgets: [],
      };
      groups.set(widget.appId, group);
    }
    group.widgets.push(widget);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
})();
