import { decryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";

const LINEAR_GRAPHQL = "https://api.linear.app/graphql";

/**
 * Resolves the pasted Linear personal API key for a specific connection.
 * If accountId is omitted, falls back to the user's default linear connection
 * (is_default first, then oldest by created_at). Personal keys are static — no refresh.
 */
async function resolveLinearKey(userId: string, accountId?: string | null): Promise<string> {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) throw new Error("Linear is unavailable on the server.");

  let query = serviceClient
    .from("integration_accounts")
    .select("id,access_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", "linear");

  query = accountId
    ? query.eq("id", accountId)
    : query.order("is_default", { ascending: false }).order("created_at", { ascending: true });

  const result = await query.limit(1).maybeSingle();

  if (result.error) throw new Error(`Unable to load Linear connection: ${result.error.message}`);
  if (!result.data) throw new Error("No Linear connection is configured for this user.");

  const key = decryptSecret(result.data.access_token_encrypted);
  if (!key) throw new Error("The Linear connection has no stored key.");
  return key;
}

export async function linearGraphqlFetch<T>(
  userId: string,
  query: string,
  variables?: Record<string, unknown>,
  accountId?: string | null,
): Promise<T> {
  const apiKey = await resolveLinearKey(userId, accountId);

  const response = await fetch(LINEAR_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linear API request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message?: string }> };

  if (payload.errors?.length) {
    throw new Error(
      payload.errors.map((e) => e.message).filter(Boolean).join("; ") ||
        "Linear returned an unknown GraphQL error.",
    );
  }
  if (!payload.data) throw new Error("Linear returned no data.");
  return payload.data;
}
