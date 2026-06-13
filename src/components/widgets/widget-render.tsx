"use client";

import { CalendarMonthGridWidget } from "@/components/widgets/calendar-month-grid-widget";
import { CalendarTodayAgendaWidget } from "@/components/widgets/calendar-today-agenda-widget";
import { CalendarUpcomingWeekWidget } from "@/components/widgets/calendar-upcoming-week-widget";
import { GmailWidget } from "@/components/widgets/gmail-widget";
import { GoogleTasksWidget } from "@/components/widgets/google-tasks-widget";
import { LinearWidget } from "@/components/widgets/linear-widget";
import { NotionPageWidget } from "@/components/widgets/notion-page-widget";
import { NotionRecentPagesWidget } from "@/components/widgets/notion-recent-pages-widget";
import { CATALOG_BY_ID, type SlotId } from "@/components/widgets/widget-catalog";
import { type Provider, type WidgetPayload, type WidgetProps } from "@/features/integrations/types";

/** The config key each configurable slot reads/writes on its instance. */
export const CONFIG_KEY: Partial<Record<SlotId, string>> = {
  gmail: "gmail-view",
  google_tasks: "tasks-view",
  linear: "linear-project",
  notion_page: "notion-page-id",
};

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

export async function fetchWidget(
  provider: Provider,
  view?: string,
  accountId?: string | null,
  // Free-form per-instance config (today: the Notion Page widget's pinned page id).
  config?: string | null,
) {
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  if (accountId) params.set("accountId", accountId);
  if (config) params.set("config", config);
  const qs = params.toString();
  const url = `/api/widgets/${provider}${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${provider}.`);
  return (await response.json()) as WidgetPayload;
}

/** Resolve the payload to render, falling back to loading/error placeholders. */
export function getWidgetPayload(
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

/** The TanStack Query key for a slot's data, keyed by slot + view/config where it matters. */
export function widgetQueryKey(
  slotId: SlotId,
  gmailView?: string,
  accountId?: string | null,
  config?: string | null,
) {
  const provider = CATALOG_BY_ID[slotId].provider;
  const acct = accountId ?? "__default__";
  if (slotId === "gmail") return ["integrations", "gmail", "emails", gmailView, acct] as const;
  if (provider === "google_calendar") return ["integrations", "calendar", "events", acct] as const;
  if (provider === "google_tasks") return ["integrations", "tasks", acct] as const;
  // Notion: the Page widget keys by its pinned page id so two pinned pages cache
  // apart; Recent pages has no config and keys by account only.
  if (slotId === "notion_recent") return ["integrations", "notion", "recent", acct] as const;
  if (slotId === "notion_page")
    return ["integrations", "notion", "page", config ?? "__unset__", acct] as const;
  return ["integrations", "linear", "issues", acct] as const;
}

/** Per-provider staleTime, shared so the grid and the preview cache consistently. */
export function widgetStaleTime(provider: Provider) {
  return provider === "linear" || provider === "notion"
    ? 5 * 60_000
    : provider === "google_tasks"
      ? 2 * 60_000
      : 60_000;
}

const WIDGET_TITLE: Record<SlotId, string> = {
  linear: "Linear",
  gmail: "Gmail",
  google_tasks: "Tasks",
  calendar_today: "Calendar",
  calendar_upcoming: "Upcoming week",
  calendar_month: "Calendar",
  notion_recent: "Recent pages",
  notion_page: "Notion",
};

/**
 * Renders the widget component for a slot from a resolved payload. Single source
 * of truth for slot → component, shared by the dashboard grid and the catalog
 * preview so the preview is always the real widget.
 */
export function renderWidget(
  slotId: SlotId,
  payload: WidgetPayload,
  shared: Omit<WidgetProps, "payload">,
) {
  switch (slotId) {
    case "linear":
      return <LinearWidget payload={payload} {...shared} />;
    case "gmail":
      return <GmailWidget payload={payload} {...shared} />;
    case "google_tasks":
      return <GoogleTasksWidget payload={payload} {...shared} />;
    case "calendar_today":
      return <CalendarTodayAgendaWidget payload={payload} {...shared} />;
    case "calendar_upcoming":
      return <CalendarUpcomingWeekWidget payload={payload} {...shared} />;
    case "calendar_month":
      return <CalendarMonthGridWidget payload={payload} {...shared} />;
    case "notion_recent":
      return <NotionRecentPagesWidget payload={payload} {...shared} />;
    case "notion_page":
      return <NotionPageWidget payload={payload} {...shared} />;
  }
  return null;
}

export { WIDGET_TITLE };
