import { encryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";

import { getLinearTokenExpiry } from "./tokens";

type LinearTokenExchange = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

type LinearViewer = {
  id?: string;
  email?: string;
  name?: string;
};

export async function exchangeLinearCodeForToken({
  code,
  redirectUri,
  clientId,
  clientSecret,
}: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linear token exchange failed: ${errorText}`);
  }

  const payload = (await response.json()) as LinearTokenExchange;

  if (!payload.access_token) {
    throw new Error("Linear token exchange did not return an access token.");
  }

  return payload;
}

export async function fetchLinearViewer(accessToken: string) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: `
        query LinearViewer {
          viewer {
            id
            name
            email
          }
        }
      `,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linear viewer lookup failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    data?: { viewer?: LinearViewer };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(
      payload.errors.map((error) => error.message).filter(Boolean).join("; ") ||
        "Linear viewer lookup failed.",
    );
  }

  return payload.data?.viewer ?? null;
}

export async function storeLinearConnection({
  userId,
  token,
  viewer,
}: {
  userId: string;
  token: LinearTokenExchange;
  viewer: LinearViewer | null;
}) {
  const serviceClient = createServiceRoleClient();

  if (!serviceClient) {
    throw new Error("Linear storage is unavailable on the server.");
  }

  const scopes = token.scope?.split(/\s+/).filter(Boolean) ?? ["read"];
  const expiresAt = getLinearTokenExpiry(token.expires_in);
  const now = new Date().toISOString();

  const integrationResult = await serviceClient
    .from("integrations")
    .upsert(
      {
        user_id: userId,
        provider: "linear",
        status: "connected",
        provider_account_id: viewer?.id ?? null,
        provider_account_email: viewer?.email ?? null,
        scopes,
        last_sync_at: now,
      },
      { onConflict: "user_id,provider" },
    )
    .select("id")
    .single();

  if (integrationResult.error) {
    throw new Error(`Unable to store Linear integration: ${integrationResult.error.message}`);
  }

  const existingTokenResult = await serviceClient
    .from("integration_tokens")
    .select("id")
    .eq("integration_id", integrationResult.data.id)
    .maybeSingle();

  if (existingTokenResult.error) {
    throw new Error(`Unable to load existing Linear token: ${existingTokenResult.error.message}`);
  }

  const tokenPayload = {
    integration_id: integrationResult.data.id,
    access_token_encrypted: encryptSecret(token.access_token),
    refresh_token_encrypted: encryptSecret(token.refresh_token),
    expires_at: expiresAt,
  };

  const tokenResult = existingTokenResult.data
    ? await serviceClient
        .from("integration_tokens")
        .update(tokenPayload)
        .eq("id", existingTokenResult.data.id)
    : await serviceClient.from("integration_tokens").insert(tokenPayload);

  if (tokenResult.error) {
    throw new Error(`Unable to store Linear token: ${tokenResult.error.message}`);
  }
}
