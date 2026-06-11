import { getGoogleCalendarItems } from "@/features/integrations/providers/google/calendar.adapter";
import { getGmailItems, type GmailView } from "@/features/integrations/providers/google/gmail.adapter";
import { getRequiredGoogleScopes } from "@/features/integrations/providers/google/types";
import { getGoogleTaskItems } from "@/features/integrations/providers/google/tasks.adapter";
import { getLinearItems } from "@/features/integrations/providers/linear/adapter";
import { linearScopes } from "@/features/integrations/providers/linear/types";
import { buildTodaySummary } from "@/features/widgets/summary";
import { CONNECT_PATH } from "@/features/integrations/connect-paths";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import type {
  IntegrationStatusRecord,
  IntegrationStatus,
  Provider,
  WidgetPayload,
  WidgetViewState,
  WidgetsResponse,
} from "@/features/integrations/types";

const providerMeta = {
  linear: {
    label: "Linear",
    description: "Follow your assigned issues and the work that needs attention.",
    requiredScopes: [...linearScopes],
    connectPath: CONNECT_PATH.linear,
  },
  gmail: {
    label: "Gmail",
    description: "See the messages that matter most without leaving your dashboard.",
    requiredScopes: getRequiredGoogleScopes("gmail"),
    connectPath: CONNECT_PATH.gmail,
  },
  google_tasks: {
    label: "Google Tasks",
    description: "Keep your top tasks in view while you work.",
    requiredScopes: getRequiredGoogleScopes("google_tasks"),
    connectPath: CONNECT_PATH.google_tasks,
  },
  google_calendar: {
    label: "Google Calendar",
    description: "Track the next events shaping your day.",
    requiredScopes: getRequiredGoogleScopes("google_calendar"),
    connectPath: CONNECT_PATH.google_calendar,
  },
} satisfies Record<
  Provider,
  Pick<IntegrationStatusRecord, "label" | "description" | "requiredScopes" | "connectPath">
>;

function buildScopeStatus(provider: Provider, grantedScopes: string[] | null | undefined) {
  const requiredScopes = providerMeta[provider].requiredScopes;
  const granted = requiredScopes.filter((scope) => grantedScopes?.includes(scope));
  const missing = requiredScopes.filter((scope) => !granted.includes(scope));

  return {
    requiredScopes,
    grantedScopes: granted,
    missingScopes: missing,
    needsConsent: missing.length > 0 && provider !== "linear",
  };
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
              "account_id,provider,status,provider_account_email,provider_account_id,last_sync_at,scopes",
            )
            .eq("user_id", userId)
        ).data ?? [])
      : [];

  return (Object.keys(providerMeta) as Provider[]).map((provider) => {
    const match = rows.find((row) => row.provider === provider);
    const scopeStatus = buildScopeStatus(provider, match?.scopes);
    const status = (match?.status as IntegrationStatus | undefined) ?? "disconnected";

    return {
      provider,
      ...providerMeta[provider],
      ...scopeStatus,
      status,
      providerAccountEmail: match?.provider_account_email ?? null,
      providerAccountId: match?.provider_account_id ?? null,
      lastSyncAt: match?.last_sync_at ?? null,
      accountId: match?.account_id ?? null,
    };
  });
}

function getDefaultScopeStatus(provider: Provider) {
  return {
    requiredScopes: [...providerMeta[provider].requiredScopes],
    grantedScopes: [],
    missingScopes: [...providerMeta[provider].requiredScopes],
    needsConsent: provider !== "linear",
  };
}

function getDerivedWidgetState(
  provider: Provider,
  statusRecord: IntegrationStatusRecord | undefined,
  items: WidgetPayload["items"],
): WidgetViewState {
  if (!statusRecord || statusRecord.status === "disconnected") {
    return "not_connected";
  }

  if (provider !== "linear" && statusRecord.needsConsent) {
    return "permission_required";
  }

  if (statusRecord.status === "error") {
    return "error";
  }

  return items.length === 0 ? "empty" : "connected";
}

function shouldSkipProviderLoad(
  provider: Provider,
  statusRecord: IntegrationStatusRecord | undefined,
  previewState?: WidgetViewState,
) {
  if (previewState) {
    return false;
  }

  if (!statusRecord || statusRecord.status === "disconnected") {
    return true;
  }

  if (provider !== "linear" && statusRecord.needsConsent) {
    return true;
  }

  return statusRecord.status === "error";
}

function buildWidgetPayload(
  provider: Provider,
  statusRecord: IntegrationStatusRecord | undefined,
  items: WidgetPayload["items"],
  isMock: boolean,
  previewState?: WidgetViewState,
  extra?: { unreadCount?: number },
): WidgetPayload {
  const lastUpdatedAt = new Date().toISOString();
  const scopeStatus = statusRecord
    ? {
        requiredScopes: statusRecord.requiredScopes,
        grantedScopes: statusRecord.grantedScopes,
        missingScopes: statusRecord.missingScopes,
        needsConsent: statusRecord.needsConsent,
      }
    : getDefaultScopeStatus(provider);

  const state = previewState ?? getDerivedWidgetState(provider, statusRecord, items);

  if (state === "loading") {
    return {
      provider,
      title: providerMeta[provider].label,
      state,
      items: [],
      isMock,
      connectionStatus: statusRecord?.status ?? "disconnected",
      lastUpdatedAt,
      accountEmail: statusRecord?.providerAccountEmail ?? null,
      ...scopeStatus,
    };
  }

  if (state === "error") {
    return {
      provider,
      title: providerMeta[provider].label,
      state,
      items: [],
      isMock,
      connectionStatus: statusRecord?.status ?? "error",
      lastUpdatedAt,
      accountEmail: statusRecord?.providerAccountEmail ?? null,
      error: `We couldn't load ${providerMeta[provider].label} right now.`,
      ...scopeStatus,
    };
  }

  if (state === "not_connected") {
    return {
      provider,
      title: providerMeta[provider].label,
      state,
      items: [],
      isMock,
      connectionStatus: statusRecord?.status ?? "disconnected",
      lastUpdatedAt,
      accountEmail: statusRecord?.providerAccountEmail ?? null,
      emptyMessage: `Connect ${providerMeta[provider].label} to see it here.`,
      ...scopeStatus,
    };
  }

  if (state === "permission_required") {
    return {
      provider,
      title: providerMeta[provider].label,
      state,
      items: [],
      isMock,
      connectionStatus: "pending",
      lastUpdatedAt,
      accountEmail: statusRecord?.providerAccountEmail ?? null,
      emptyMessage: `Grant access to show your ${providerMeta[provider].label.toLowerCase()}.`,
      ...scopeStatus,
    };
  }

  if (state === "empty") {
    return {
      provider,
      title: providerMeta[provider].label,
      state,
      items: [],
      isMock,
      connectionStatus: statusRecord?.status ?? "connected",
      lastUpdatedAt,
      accountEmail: statusRecord?.providerAccountEmail ?? null,
      emptyMessage: `${providerMeta[provider].label} is up to date.`,
      ...scopeStatus,
    };
  }

  return {
    provider,
    title: providerMeta[provider].label,
    state,
    items,
    isMock,
    connectionStatus: statusRecord?.status ?? "disconnected",
    lastUpdatedAt,
    accountEmail: statusRecord?.providerAccountEmail ?? null,
    ...scopeStatus,
    ...(extra ?? {}),
  };
}

export async function getWidgetPayload(
  provider: Provider,
  userId: string,
  previewState?: WidgetViewState,
  view?: GmailView,
  accountId?: string | null,
): Promise<WidgetPayload> {
  const statusRecords = await getIntegrationStatusRecords(userId);
  const statusRecord = statusRecords.find((record) => record.provider === provider);

  if (shouldSkipProviderLoad(provider, statusRecord, previewState)) {
    return buildWidgetPayload(provider, statusRecord, [], provider === "linear", previewState);
  }

  try {
    if (provider === "gmail") {
      const { items, unreadCount } = await getGmailItems(userId, view, accountId);
      return buildWidgetPayload(provider, statusRecord, items, false, previewState, {
        unreadCount,
      });
    }

    const items =
      provider === "linear"
        ? await getLinearItems(userId, accountId)
        : provider === "google_tasks"
          ? await getGoogleTaskItems(userId, accountId)
          : await getGoogleCalendarItems(userId, accountId);

    return buildWidgetPayload(
      provider,
      statusRecord,
      items,
      false,
      previewState,
    );
  } catch {
    return buildWidgetPayload(provider, statusRecord, [], provider === "linear", "error");
  }
}

export async function getWidgetsResponse(
  userId: string,
  previewState?: WidgetViewState,
): Promise<WidgetsResponse> {
  const generatedAt = new Date().toISOString();
  const statusRecords = await getIntegrationStatusRecords(userId);
  const widgetsEntries = await Promise.all(
    (Object.keys(providerMeta) as Provider[]).map(async (provider) => {
      const statusRecord = statusRecords.find((record) => record.provider === provider);

      if (shouldSkipProviderLoad(provider, statusRecord, previewState)) {
        return [
          provider,
          buildWidgetPayload(provider, statusRecord, [], provider === "linear", previewState),
        ] as const;
      }

      try {
        if (provider === "gmail") {
          const { items, unreadCount } = await getGmailItems(userId);
          return [
            provider,
            buildWidgetPayload(provider, statusRecord, items, false, previewState, {
              unreadCount,
            }),
          ] as const;
        }

        const items =
          provider === "linear"
            ? await getLinearItems(userId)
            : provider === "google_tasks"
              ? await getGoogleTaskItems(userId)
              : await getGoogleCalendarItems(userId);

        return [
          provider,
          buildWidgetPayload(provider, statusRecord, items, false, previewState),
        ] as const;
      } catch {
        return [
          provider,
          buildWidgetPayload(provider, statusRecord, [], provider === "linear", "error"),
        ] as const;
      }
    }),
  );

  const widgets = Object.fromEntries(widgetsEntries) as WidgetsResponse["widgets"];

  return {
    generatedAt,
    widgets,
    todaySummary: buildTodaySummary(Object.values(widgets), generatedAt),
  };
}
