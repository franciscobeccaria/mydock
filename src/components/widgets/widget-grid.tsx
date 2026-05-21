"use client";

import { useQuery } from "@tanstack/react-query";

import { GmailWidget } from "@/components/widgets/gmail-widget";
import { GoogleCalendarWidget } from "@/components/widgets/google-calendar-widget";
import { GoogleTasksWidget } from "@/components/widgets/google-tasks-widget";
import { LinearWidget } from "@/components/widgets/linear-widget";
import type { Provider, WidgetPayload } from "@/features/integrations/types";

function makeLoadingPayload(
  provider: Provider,
  title: string,
): WidgetPayload {
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

async function fetchWidget(provider: Provider) {
  const response = await fetch(`/api/widgets/${provider}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load ${provider}.`);
  }

  return (await response.json()) as WidgetPayload;
}

function getWidgetPayload(
  provider: Provider,
  title: string,
  data: WidgetPayload | undefined,
  error: Error | null,
) {
  if (data) {
    return data;
  }

  if (error) {
    return {
      ...makeLoadingPayload(provider, title),
      state: "error" as const,
      error: `We couldn't load ${title} right now.`,
    };
  }

  return makeLoadingPayload(provider, title);
}

export default function WidgetGrid() {
  const linearQuery = useQuery({
    queryKey: ["integrations", "linear", "issues"],
    queryFn: () => fetchWidget("linear"),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });

  const gmailQuery = useQuery({
    queryKey: ["integrations", "gmail", "emails"],
    queryFn: () => fetchWidget("gmail"),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });

  const tasksQuery = useQuery({
    queryKey: ["integrations", "tasks"],
    queryFn: () => fetchWidget("google_tasks"),
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
  });

  const calendarQuery = useQuery({
    queryKey: ["integrations", "calendar", "events"],
    queryFn: () => fetchWidget("google_calendar"),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 [&>*]:h-full">
      <LinearWidget
        payload={getWidgetPayload("linear", "Linear", linearQuery.data, linearQuery.error)}
      />
      <GmailWidget
        payload={getWidgetPayload("gmail", "Gmail", gmailQuery.data, gmailQuery.error)}
      />
      <GoogleTasksWidget
        payload={getWidgetPayload(
          "google_tasks",
          "Tasks",
          tasksQuery.data,
          tasksQuery.error,
        )}
      />
      <GoogleCalendarWidget
        payload={getWidgetPayload(
          "google_calendar",
          "Calendar",
          calendarQuery.data,
          calendarQuery.error,
        )}
      />
    </div>
  );
}
