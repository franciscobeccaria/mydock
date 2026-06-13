import type { Provider } from "@/features/integrations/types";

/**
 * Where the UI sends a user to connect each provider. Single source of truth,
 * importable from both the server-only registry and client components (the
 * registry can't be imported client-side — it pulls in adapters + the server
 * Supabase client). Linear deep-links to the Connections page (manual API-key
 * paste); Google providers kick off the OAuth start route, returning to it.
 */
export const CONNECT_PATH: Record<Provider, string> = {
  linear: "/connections",
  gmail: "/api/integrations/google/start?next=/connections",
  google_tasks: "/api/integrations/google/start?next=/connections",
  google_calendar: "/api/integrations/google/start?next=/connections",
  notion: "/connections",
};
