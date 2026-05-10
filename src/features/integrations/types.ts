export const providers = [
  "linear",
  "gmail",
  "google_tasks",
  "google_calendar",
] as const;

export type Provider = (typeof providers)[number];

export type WidgetViewState =
  | "loading"
  | "empty"
  | "error"
  | "not_connected"
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

export type WidgetPayload = {
  provider: Provider;
  title: string;
  state: WidgetViewState;
  items: WidgetItem[];
  isMock: boolean;
  connectionStatus: IntegrationStatus;
  lastUpdatedAt: string;
  error?: string;
  emptyMessage?: string;
};

export type TodaySummary = {
  generatedAt: string;
  headline: string;
  bullets: string[];
};

export type IntegrationStatusRecord = {
  provider: Provider;
  label: string;
  description: string;
  status: IntegrationStatus;
  scopes: string[];
  providerAccountEmail: string | null;
  providerAccountId: string | null;
  lastSyncAt: string | null;
  connectPath: string;
  isAvailable: boolean;
  missingEnv: string[];
};

export type WidgetsResponse = {
  generatedAt: string;
  widgets: Record<Provider, WidgetPayload>;
  todaySummary: TodaySummary;
};
