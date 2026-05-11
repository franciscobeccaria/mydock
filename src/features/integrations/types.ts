export const providers = [
  "linear",
  "gmail",
  "google_tasks",
  "google_calendar",
] as const;

export type Provider = (typeof providers)[number];
export type GoogleCapabilityProvider = Exclude<Provider, "linear">;

export type WidgetViewState =
  | "loading"
  | "empty"
  | "error"
  | "not_connected"
  | "permission_required"
  | "connected";

export type IntegrationStatus =
  | "disconnected"
  | "pending"
  | "connected"
  | "error";

export type WidgetPriority = "low" | "medium" | "high" | "urgent";

export type WidgetItem = {
  id: string;
  provider: Provider;
  title: string;
  subtitle?: string;
  status?: string;
  priority?: WidgetPriority;
  dueAt?: string;
  occurredAt?: string;
  url?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
};

export type ScopeStatus = {
  requiredScopes: string[];
  grantedScopes: string[];
  missingScopes: string[];
  needsConsent: boolean;
};

export type WidgetPayload = ScopeStatus & {
  provider: Provider;
  title: string;
  state: WidgetViewState;
  items: WidgetItem[];
  isMock: boolean;
  connectionStatus: IntegrationStatus;
  lastUpdatedAt: string;
  accountEmail?: string | null;
  error?: string;
  emptyMessage?: string;
};

export type TodaySummary = {
  generatedAt: string;
  headline: string;
  bullets: string[];
  readySourceCount: number;
  totalSourceCount: number;
};

export type IntegrationStatusRecord = ScopeStatus & {
  provider: Provider;
  label: string;
  description: string;
  status: IntegrationStatus;
  providerAccountEmail: string | null;
  providerAccountId: string | null;
  lastSyncAt: string | null;
  connectPath: string;
  accountId: string | null;
};

export type WidgetsResponse = {
  generatedAt: string;
  widgets: Record<Provider, WidgetPayload>;
  todaySummary: TodaySummary;
};
