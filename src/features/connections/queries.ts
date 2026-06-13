import { createServiceRoleClient } from "@/lib/supabase/service";

export type ConnectionProvider = "google" | "linear" | "notion";

export type ConnectionRecord = {
  id: string;
  provider: ConnectionProvider;
  email: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type ConnectionsByProvider = {
  google: ConnectionRecord[];
  linear: ConnectionRecord[];
  notion: ConnectionRecord[];
};

/** All of a user's connections, grouped by provider, for the /connections page. */
export async function listConnections(userId: string): Promise<ConnectionsByProvider> {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) return { google: [], linear: [], notion: [] };

  const result = await serviceClient
    .from("integration_accounts")
    .select("id,provider,provider_account_email,is_default,created_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const rows = result.data ?? [];
  const map = (provider: ConnectionProvider) =>
    rows
      .filter((r) => r.provider === provider)
      .map((r) => ({
        id: r.id,
        provider,
        email: r.provider_account_email,
        isDefault: r.is_default,
        createdAt: r.created_at,
      }));

  return { google: map("google"), linear: map("linear"), notion: map("notion") };
}
