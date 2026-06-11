import { encryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";

const LINEAR_GRAPHQL = "https://api.linear.app/graphql";

type LinearIdentity = {
  userId: string; // Linear viewer id
  email: string | null;
  workspaceName: string | null;
};

/**
 * Validates a pasted Linear personal API key by querying the viewer + org.
 * Personal API keys are sent as the raw key in the Authorization header.
 * Returns identity used to label the connection, or null if the key is invalid.
 */
export async function validateLinearKey(apiKey: string): Promise<LinearIdentity | null> {
  const response = await fetch(LINEAR_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: `query { viewer { id email } organization { name } }`,
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    data?: { viewer?: { id?: string; email?: string }; organization?: { name?: string } };
    errors?: unknown[];
  };

  if (payload.errors?.length || !payload.data?.viewer?.id) return null;

  return {
    userId: payload.data.viewer.id,
    email: payload.data.viewer.email ?? null,
    workspaceName: payload.data.organization?.name ?? null,
  };
}

/**
 * Stores a validated Linear key as an integration_accounts row (one per
 * workspace) and ensures a matching `integrations` row exists for status.
 * Returns the integration_accounts id of the new/updated connection.
 */
export async function storeLinearConnection({
  userId,
  apiKey,
  identity,
}: {
  userId: string;
  apiKey: string;
  identity: LinearIdentity;
}): Promise<string> {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) throw new Error("Connection storage is unavailable on the server.");

  const encryptedKey = encryptSecret(apiKey);
  if (!encryptedKey) {
    throw new Error("Token encryption is not configured on the server.");
  }

  // First connection for this provider becomes the default (so token resolution
  // always has a default to fall back to). Subsequent connections don't.
  const existing = await serviceClient
    .from("integration_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "linear")
    .limit(1);
  const isFirst = !existing.data || existing.data.length === 0;

  const now = new Date().toISOString();

  const accountResult = await serviceClient
    .from("integration_accounts")
    .upsert(
      {
        user_id: userId,
        provider: "linear",
        is_default: isFirst,
        provider_account_id: identity.userId,
        provider_account_email: identity.email,
        scopes: ["read"],
        access_token_encrypted: encryptedKey,
        refresh_token_encrypted: null,
        token_expires_at: null,
        updated_at: now,
      },
      { onConflict: "user_id,provider,provider_account_id" },
    )
    .select("id")
    .single();

  if (accountResult.error) {
    throw new Error(`Unable to store Linear connection: ${accountResult.error.message}`);
  }

  const accountId = accountResult.data.id;

  const integrationResult = await serviceClient.from("integrations").upsert(
    {
      user_id: userId,
      provider: "linear",
      status: "connected",
      provider_account_id: identity.userId,
      provider_account_email: identity.email,
      scopes: ["read"],
      last_sync_at: now,
      account_id: accountId,
    },
    { onConflict: "user_id,provider" },
  );

  if (integrationResult.error) {
    throw new Error(`Unable to store Linear integration: ${integrationResult.error.message}`);
  }

  return accountId;
}
