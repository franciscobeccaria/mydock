"use client";

import { useQuery } from "@tanstack/react-query";

import { GmailWidget } from "@/components/widgets/gmail-widget";
import { GoogleCalendarWidget } from "@/components/widgets/google-calendar-widget";
import { GoogleTasksWidget } from "@/components/widgets/google-tasks-widget";
import { LinearWidget } from "@/components/widgets/linear-widget";
import { TodaySummaryWidget } from "@/components/widgets/today-summary-widget";
import type {
  WidgetPayload,
  WidgetsResponse,
} from "@/features/integrations/types";

function makeLoadingPayload(
  provider: WidgetPayload["provider"],
  title: string,
): WidgetPayload {
  return {
    provider,
    title,
    state: "loading",
    items: [],
    isMock: true,
    connectionStatus: "disconnected",
    lastUpdatedAt: new Date().toISOString(),
  };
}

async function fetchWidgets() {
  const response = await fetch("/api/widgets", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load widgets.");
  }

  return (await response.json()) as WidgetsResponse;
}

export function WidgetGrid() {
  const { data } = useQuery({
    queryKey: ["widgets"],
    queryFn: fetchWidgets,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TodaySummaryWidget
        summary={
          data?.todaySummary ?? {
            generatedAt: new Date().toISOString(),
            headline: "Loading your workday…",
            bullets: [
              "Preparing widget snapshots.",
              "Checking provider states.",
              "Assembling your dashboard overview.",
            ],
          }
        }
      />
      <LinearWidget
        payload={data?.widgets.linear ?? makeLoadingPayload("linear", "Linear")}
      />
      <GmailWidget
        payload={data?.widgets.gmail ?? makeLoadingPayload("gmail", "Gmail")}
      />
      <GoogleTasksWidget
        payload={
          data?.widgets.google_tasks ??
          makeLoadingPayload("google_tasks", "Tasks")
        }
      />
      <GoogleCalendarWidget
        payload={
          data?.widgets.google_calendar ??
          makeLoadingPayload("google_calendar", "Calendar")
        }
      />
    </div>
  );
}
