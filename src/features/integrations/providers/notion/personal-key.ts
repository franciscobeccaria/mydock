import { encryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NOTION_API_BASE, NOTION_VERSION } from "@/features/integrations/providers/notion/types";

type NotionIdentity = {
  botId: string; // the integration/bot user id — stable per token
  email: string | null; // owner email when the token is user-owned, else null
  workspaceName: string | null;
};

type NotionMeResponse = {
  id?: string;
  name?: string | null;
  bot?: {
    workspace_name?: string | null;
    owner?: {
      type?: string;
      user?: { person?: { email?: string | null } | null } | null;
    } | null;
  } | null;
};

/**
 * Validates a pasted Notion token by calling GET /v1/users/me. Notion tokens
 * are bearer tokens. Returns identity used to label the connection, or null if
 * the token is invalid. Mirrors validateLinearKey.
 */
export async function validateNotionToken(token: string): Promise<NotionIdentity | null> {
  const response = await fetch(`${NOTION_API_BASE}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as NotionMeResponse;
  if (!payload.id) return null;

  return {
    botId: payload.id,
    email: payload.bot?.owner?.user?.person?.email ?? null,
    // Fall back to the integration name when the workspace name isn't exposed
    // (user-owned tokens may omit workspace_name).
    workspaceName: payload.bot?.workspace_name ?? payload.name ?? null,
  };
}

/**
 * Stores a validated Notion token as an integration_accounts row (one per
 * workspace) and ensures a matching `integrations` row exists for status.
 * Returns the integration_accounts id. Mirrors storeLinearConnection.
 */
export async function storeNotionConnection({
  userId,
  token,
  identity,
}: {
  userId: string;
  token: string;
  identity: NotionIdentity;
}): Promise<string> {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) throw new Error("Connection storage is unavailable on the server.");

  const encryptedToken = encryptSecret(token);
  if (!encryptedToken) {
    throw new Error("Token encryption is not configured on the server.");
  }

  // First connection for this provider becomes the default (so token resolution
  // always has a default to fall back to). Subsequent connections don't.
  const existing = await serviceClient
    .from("integration_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .limit(1);
  const isFirst = !existing.data || existing.data.length === 0;

  const now = new Date().toISOString();

  // We label the connection row with the workspace name (Notion has no per-user
  // email like Google). provider_account_email carries the workspace name so the
  // existing connection UI, which renders `email`, shows something meaningful.
  const accountLabel = identity.workspaceName ?? identity.email ?? "Notion workspace";

  const accountResult = await serviceClient
    .from("integration_accounts")
    .upsert(
      {
        user_id: userId,
        provider: "notion",
        is_default: isFirst,
        provider_account_id: identity.botId,
        provider_account_email: accountLabel,
        scopes: [],
        access_token_encrypted: encryptedToken,
        refresh_token_encrypted: null,
        token_expires_at: null,
        updated_at: now,
      },
      { onConflict: "user_id,provider,provider_account_id" },
    )
    .select("id")
    .single();

  if (accountResult.error) {
    throw new Error(`Unable to store Notion connection: ${accountResult.error.message}`);
  }

  const accountId = accountResult.data.id;

  const integrationResult = await serviceClient.from("integrations").upsert(
    {
      user_id: userId,
      provider: "notion",
      status: "connected",
      provider_account_id: identity.botId,
      provider_account_email: accountLabel,
      scopes: [],
      last_sync_at: now,
      account_id: accountId,
    },
    { onConflict: "user_id,provider" },
  );

  if (integrationResult.error) {
    throw new Error(`Unable to store Notion integration: ${integrationResult.error.message}`);
  }

  return accountId;
}
