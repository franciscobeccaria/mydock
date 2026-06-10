import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";

import { getLinearTokenExpiry } from "./tokens";

type LinearTokenRow = {
  id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
};

type RefreshedLinearToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

async function getLinearIntegration(userId: string) {
  const serviceClient = createServiceRoleClient();

  if (!serviceClient) {
    throw new Error("Linear integrations are unavailable on the server.");
  }

  const integrationResult = await serviceClient
    .from("integrations")
    .select("id,provider_account_email,provider_account_id,scopes")
    .eq("user_id", userId)
    .eq("provider", "linear")
    .maybeSingle();

  if (integrationResult.error) {
    throw new Error(`Unable to load Linear integration: ${integrationResult.error.message}`);
  }

  if (!integrationResult.data) {
    throw new Error("No Linear integration is connected for this user.");
  }

  const tokenResult = await serviceClient
    .from("integration_tokens")
    .select("id,access_token_encrypted,refresh_token_encrypted,expires_at")
    .eq("integration_id", integrationResult.data.id)
    .maybeSingle();

  if (tokenResult.error) {
    throw new Error(`Unable to load Linear token: ${tokenResult.error.message}`);
  }

  if (!tokenResult.data) {
    throw new Error("No Linear token is stored for this integration.");
  }

  return {
    serviceClient,
    integration: integrationResult.data,
    token: tokenResult.data as LinearTokenRow,
  };
}

async function refreshLinearAccessToken(tokenRow: LinearTokenRow) {
  const serviceClient = createServiceRoleClient();

  if (!serviceClient) {
    throw new Error("Linear token refresh is unavailable on the server.");
  }

  const refreshToken = decryptSecret(tokenRow.refresh_token_encrypted);

  if (!refreshToken) {
    throw new Error("The Linear connection no longer has a refresh token.");
  }

  const body = new URLSearchParams({
    client_id: env.LINEAR_CLIENT_ID ?? "",
    client_secret: env.LINEAR_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
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
    throw new Error(`Linear token refresh failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("Linear token refresh did not return an access token.");
  }

  const nextRefreshToken = payload.refresh_token ?? refreshToken;
  const expiresAt = getLinearTokenExpiry(payload.expires_in);

  const updateResult = await serviceClient
    .from("integration_tokens")
    .update({
      access_token_encrypted: encryptSecret(payload.access_token),
      refresh_token_encrypted: encryptSecret(nextRefreshToken),
      expires_at: expiresAt,
    })
    .eq("id", tokenRow.id);

  if (updateResult.error) {
    throw new Error(`Unable to store refreshed Linear token: ${updateResult.error.message}`);
  }

  return {
    accessToken: payload.access_token,
    refreshToken: nextRefreshToken,
    expiresAt,
  } satisfies RefreshedLinearToken;
}

async function resolveLinearAccessToken(userId: string) {
  const { integration, token } = await getLinearIntegration(userId);
  const accessToken = decryptSecret(token.access_token_encrypted);
  const refreshToken = decryptSecret(token.refresh_token_encrypted);
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : null;
  const isExpired = expiresAt ? expiresAt <= Date.now() + 60_000 : false;

  if (accessToken && !isExpired) {
    return {
      accessToken,
      integrationId: integration.id,
      providerAccountEmail: integration.provider_account_email,
      providerAccountId: integration.provider_account_id,
      refreshToken,
      scopes: integration.scopes,
    };
  }

  const refreshed = await refreshLinearAccessToken(token);

  return {
    accessToken: refreshed.accessToken,
    integrationId: integration.id,
    providerAccountEmail: integration.provider_account_email,
    providerAccountId: integration.provider_account_id,
    refreshToken: refreshed.refreshToken,
    scopes: integration.scopes,
  };
}

export async function linearGraphqlFetch<T>(
  userId: string,
  query: string,
  variables?: Record<string, unknown>,
) {
  const account = await resolveLinearAccessToken(userId);

  const performRequest = async (accessToken: string) =>
    fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

  let response = await performRequest(account.accessToken);

  if (response.status === 401 && account.refreshToken) {
    const refreshed = await getLinearIntegration(userId).then(({ token }) =>
      refreshLinearAccessToken(token),
    );
    response = await performRequest(refreshed.accessToken);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linear API request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(
      payload.errors.map((error) => error.message).filter(Boolean).join("; ") ||
        "Linear returned an unknown GraphQL error.",
    );
  }

  if (!payload.data) {
    throw new Error("Linear returned no data.");
  }

  return payload.data;
}
