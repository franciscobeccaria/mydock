import { getGoogleCalendarItems } from "@/features/integrations/providers/google/calendar.adapter";
import { getGmailItems } from "@/features/integrations/providers/google/gmail.adapter";
import { googleProviderScopes } from "@/features/integrations/providers/google/types";
import { getGoogleTaskItems } from "@/features/integrations/providers/google/tasks.adapter";
import { getLinearItems } from "@/features/integrations/providers/linear/adapter";
import { linearScopes } from "@/features/integrations/providers/linear/types";
import { buildTodaySummary } from "@/features/widgets/summary";
import {
  getMissingGoogleEnv,
  getMissingLinearEnv,
  isSupabaseConfigured,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import type {
  IntegrationStatusRecord,
  Provider,
  WidgetPayload,
  WidgetViewState,
  WidgetsResponse,
} from "@/features/integrations/types";

const providerMeta = {
  linear: {
    label: "Linear",
    description:
      "Assigned and high-priority issues from your Linear workspace.",
    scopes: [...linearScopes],
    connectPath: "/api/integrations/linear/start",
  },
  gmail: {
    label: "Gmail",
    description: "Important inbox summaries using metadata/snippets only.",
    scopes: [...googleProviderScopes.gmail],
    connectPath: "/api/integrations/google/start",
  },
  google_tasks: {
    label: "Google Tasks",
    description: "Top pending tasks from your Google task lists.",
    scopes: [...googleProviderScopes.google_tasks],
    connectPath: "/api/integrations/google/start",
  },
  google_calendar: {
    label: "Google Calendar",
    description: "Upcoming events for today and tomorrow.",
    scopes: [...googleProviderScopes.google_calendar],
    connectPath: "/api/integrations/google/start",
  },
} satisfies Record<
  Provider,
  Omit<
    IntegrationStatusRecord,
    | "provider"
    | "status"
    | "providerAccountEmail"
    | "providerAccountId"
    | "lastSyncAt"
    | "isAvailable"
    | "missingEnv"
  >
>;

const providerLoaders: Record<Provider, () => Promise<WidgetPayload["items"]>> =
  {
    linear: getLinearItems,
    gmail: getGmailItems,
    google_tasks: getGoogleTaskItems,
    google_calendar: getGoogleCalendarItems,
  };

function getMissingEnvForProvider(provider: Provider) {
  if (provider === "linear") {
    return getMissingLinearEnv();
  }

  return provider === "gmail" ||
    provider === "google_tasks" ||
    provider === "google_calendar"
    ? getMissingGoogleEnv()
    : [];
}

export async function getIntegrationStatusRecords(
  userId: string,
): Promise<IntegrationStatusRecord[]> {
  const supabase = await createClient();

  const rows =
    isSupabaseConfigured && supabase
      ? ((
          await supabase
            .from("integrations")
            .select(
              "provider,status,provider_account_email,provider_account_id,last_sync_at,scopes",
            )
            .eq("user_id", userId)
        ).data ?? [])
      : [];

  return (Object.keys(providerMeta) as Provider[]).map((provider) => {
    const match = rows.find((row) => row.provider === provider);
    const missingEnv = getMissingEnvForProvider(provider);

    return {
      provider,
      ...providerMeta[provider],
      status:
        (match?.status as IntegrationStatusRecord["status"]) ?? "disconnected",
      providerAccountEmail: match?.provider_account_email ?? null,
      providerAccountId: match?.provider_account_id ?? null,
      lastSyncAt: match?.last_sync_at ?? null,
      isAvailable: missingEnv.length === 0,
      missingEnv,
      scopes: match?.scopes ?? providerMeta[provider].scopes,
    };
  });
}

function buildWidgetPayload(
  provider: Provider,
  statusRecord: IntegrationStatusRecord | undefined,
  items: WidgetPayload["items"],
  previewState?: WidgetViewState,
): WidgetPayload {
  const lastUpdatedAt = new Date().toISOString();

  if (previewState === "loading") {
    return {
      provider,
      title: providerMeta[provider].label,
      state: "loading",
      items: [],
      isMock: true,
      connectionStatus: statusRecord?.status ?? "disconnected",
      lastUpdatedAt,
    };
  }

  if (previewState === "error") {
    return {
      provider,
      title: providerMeta[provider].label,
      state: "error",
      items: [],
      isMock: true,
      connectionStatus: statusRecord?.status ?? "error",
      lastUpdatedAt,
      error: `Unable to load ${providerMeta[provider].label} data right now.`,
    };
  }

  if (previewState === "not_connected") {
    return {
      provider,
      title: providerMeta[provider].label,
      state: "not_connected",
      items: [],
      isMock: true,
      connectionStatus: "disconnected",
      lastUpdatedAt,
      emptyMessage: `Connect ${providerMeta[provider].label} to replace mock data with a live feed.`,
    };
  }

  if (previewState === "empty") {
    return {
      provider,
      title: providerMeta[provider].label,
      state: "empty",
      items: [],
      isMock: true,
      connectionStatus: statusRecord?.status ?? "connected",
      lastUpdatedAt,
      emptyMessage: `${providerMeta[provider].label} is connected, but there is nothing new to show.`,
    };
  }

  return {
    provider,
    title: providerMeta[provider].label,
    state: "connected",
    items,
    isMock: true,
    connectionStatus: statusRecord?.status ?? "disconnected",
    lastUpdatedAt,
  };
}

export async function getWidgetPayload(
  provider: Provider,
  userId: string,
  previewState?: WidgetViewState,
): Promise<WidgetPayload> {
  const statusRecords = await getIntegrationStatusRecords(userId);
  const statusRecord = statusRecords.find(
    (record) => record.provider === provider,
  );
  const items = await providerLoaders[provider]();

  return buildWidgetPayload(provider, statusRecord, items, previewState);
}

export async function getWidgetsResponse(
  userId: string,
  previewState?: WidgetViewState,
): Promise<WidgetsResponse> {
  const generatedAt = new Date().toISOString();
  const statusRecords = await getIntegrationStatusRecords(userId);
  const widgetsEntries = await Promise.all(
    (Object.keys(providerMeta) as Provider[]).map(async (provider) => {
      const statusRecord = statusRecords.find(
        (record) => record.provider === provider,
      );
      const items = await providerLoaders[provider]();

      return [
        provider,
        buildWidgetPayload(provider, statusRecord, items, previewState),
      ] as const;
    }),
  );

  const widgets = Object.fromEntries(
    widgetsEntries,
  ) as WidgetsResponse["widgets"];

  return {
    generatedAt,
    widgets,
    todaySummary: buildTodaySummary(Object.values(widgets), generatedAt),
  };
}
