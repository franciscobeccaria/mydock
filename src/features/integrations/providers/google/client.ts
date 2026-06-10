import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { cookies } from "next/headers";

type GoogleAccountRow = {
  id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  provider_account_email: string | null;
  scopes: string[];
};

type RefreshedGoogleToken = {
  accessToken: string;
  expiresAt: string | null;
  scopes: string[];
  refreshToken?: string | null;
};

const GOOGLE_ACCESS_COOKIE = "mydock_google_access_token";
const GOOGLE_REFRESH_COOKIE = "mydock_google_refresh_token";

async function getGoogleTokensFromCookies() {
  const cookieStore = await cookies();

  return {
    accessToken: decryptSecret(cookieStore.get(GOOGLE_ACCESS_COOKIE)?.value),
    refreshToken: decryptSecret(cookieStore.get(GOOGLE_REFRESH_COOKIE)?.value),
  };
}

async function getGoogleAccountRow(userId: string) {
  const serviceClient = createServiceRoleClient();

  if (!serviceClient) {
    throw new Error("Google integrations are unavailable on the server.");
  }

  const { data, error } = await serviceClient
    .from("integration_accounts")
    .select(
      "id,access_token_encrypted,refresh_token_encrypted,token_expires_at,provider_account_email,scopes",
    )
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Google account: ${error.message}`);
  }

  if (!data) {
    throw new Error("No Google account is connected for this user.");
  }

  return {
    row: data as GoogleAccountRow,
    serviceClient,
  };
}

async function refreshGoogleAccessToken(
  accountId: string,
  refreshToken: string,
  existingScopes: string[],
) {
  const serviceClient = createServiceRoleClient();

  if (!serviceClient) {
    throw new Error("Google token refresh is unavailable on the server.");
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token refresh failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };

  if (!payload.access_token) {
    throw new Error("Google token refresh did not return an access token.");
  }

  const expiresAt = payload.expires_in
    ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
    : null;
  const scopes = payload.scope?.split(/\s+/).filter(Boolean) ?? existingScopes;
  const nextRefreshToken = payload.refresh_token ?? refreshToken;

  const { error } = await serviceClient
    .from("integration_accounts")
    .update({
      access_token_encrypted: encryptSecret(payload.access_token),
      refresh_token_encrypted: encryptSecret(nextRefreshToken),
      token_expires_at: expiresAt,
      scopes,
    })
    .eq("id", accountId);

  if (error) {
    throw new Error(`Unable to store refreshed Google token: ${error.message}`);
  }

  return {
    accessToken: payload.access_token,
    expiresAt,
    scopes,
    refreshToken: nextRefreshToken,
  } satisfies RefreshedGoogleToken;
}

async function resolveGoogleAccessToken(userId: string) {
  try {
    const { row } = await getGoogleAccountRow(userId);
    const accessToken = decryptSecret(row.access_token_encrypted);
    const refreshToken = decryptSecret(row.refresh_token_encrypted);
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : null;
    const isExpired = expiresAt ? expiresAt <= Date.now() + 60_000 : false;

    if (accessToken && !isExpired) {
      return {
        accessToken,
        accountEmail: row.provider_account_email,
        scopes: row.scopes,
        accountId: row.id,
        refreshToken,
      };
    }

    if (!refreshToken) {
      throw new Error("The Google connection no longer has a refresh token.");
    }

    const refreshed = await refreshGoogleAccessToken(row.id, refreshToken, row.scopes);

    return {
      accessToken: refreshed.accessToken,
      accountEmail: row.provider_account_email,
      scopes: refreshed.scopes,
      accountId: row.id,
      refreshToken: refreshed.refreshToken ?? refreshToken,
    };
  } catch {
    const cookieTokens = await getGoogleTokensFromCookies();

    if (cookieTokens.accessToken) {
      return {
        accessToken: cookieTokens.accessToken,
        accountEmail: null,
        scopes: [],
        accountId: "cookie-fallback",
        refreshToken: cookieTokens.refreshToken,
      };
    }

    throw new Error("No Google access token is available for this user.");
  }
}

type ResolvedGoogleToken = Awaited<ReturnType<typeof resolveGoogleAccessToken>>;

export async function resolveGoogleToken(userId: string): Promise<ResolvedGoogleToken> {
  return resolveGoogleAccessToken(userId);
}

export async function googleApiFetchWithToken<T>(
  account: ResolvedGoogleToken,
  input: string | URL,
  init?: RequestInit,
): Promise<T> {
  const performRequest = async (accessToken: string) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

  let response = await performRequest(account.accessToken);

  if (response.status === 401 && account.refreshToken) {
    const refreshed = await refreshGoogleAccessToken(
      account.accountId,
      account.refreshToken,
      account.scopes,
    );
    response = await performRequest(refreshed.accessToken);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

export async function googleApiFetch<T>(
  userId: string,
  input: string | URL,
  init?: RequestInit,
) {
  const account = await resolveGoogleAccessToken(userId);
  return googleApiFetchWithToken<T>(account, input, init);
}
