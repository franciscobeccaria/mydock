import { decryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NOTION_API_BASE, NOTION_VERSION } from "@/features/integrations/providers/notion/types";

/**
 * Resolves the pasted Notion token for a specific connection. If accountId is
 * omitted, falls back to the user's default notion connection (is_default
 * first, then oldest by created_at). PATs are static — no refresh. Mirrors
 * resolveLinearKey.
 */
async function resolveNotionToken(userId: string, accountId?: string | null): Promise<string> {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) throw new Error("Notion is unavailable on the server.");

  let query = serviceClient
    .from("integration_accounts")
    .select("id,access_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", "notion");

  query = accountId
    ? query.eq("id", accountId)
    : query.order("is_default", { ascending: false }).order("created_at", { ascending: true });

  const result = await query.limit(1).maybeSingle();

  if (result.error) throw new Error(`Unable to load Notion connection: ${result.error.message}`);
  if (!result.data) throw new Error("No Notion connection is configured for this user.");

  const token = decryptSecret(result.data.access_token_encrypted);
  if (!token) throw new Error("The Notion connection has no stored token.");
  return token;
}

/**
 * Authenticated Notion REST fetch. `path` is relative to the API base
 * (e.g. "/search", "/pages/{id}"). Resolves the user's token, sets the required
 * Notion-Version header, and throws on non-2xx with the API error message.
 */
export async function notionFetch<T>(
  userId: string,
  path: string,
  init?: { method?: string; body?: unknown; accountId?: string | null },
): Promise<T> {
  const token = await resolveNotionToken(userId, init?.accountId);

  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}
