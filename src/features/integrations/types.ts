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
  /** Gmail: total unread messages in the inbox (not just among the fetched items). */
  unreadCount?: number;
};

export type WidgetProps = {
  payload: WidgetPayload;
  /** Re-fetch this widget's data — wired to the error state's "Try again" action. */
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Gmail: which list to show. Lifted to the grid so it can key the per-view fetch. */
  view?: "all" | "unread";
  onViewChange?: (view: string) => void;
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
