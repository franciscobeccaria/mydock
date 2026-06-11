import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { encryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  allGoogleWorkspaceScopes,
  googleCapabilityProviders,
  googleProviderScopes,
} from "@/features/integrations/providers/google/types";
import type { Database } from "@/types/supabase";

function toScopeSet(scopeValue: string | string[] | null | undefined) {
  if (!scopeValue) {
    return new Set<string>();
  }

  const scopeList = Array.isArray(scopeValue)
    ? scopeValue
    : scopeValue.split(/\s+/).filter(Boolean);

  return new Set(scopeList);
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

async function fetchGoogleGrantedScopes(accessToken: string) {
  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    scope?: string;
    expires_in?: string;
  };

  return {
    scopes: payload.scope?.split(/\s+/).filter(Boolean) ?? null,
    expiresIn: payload.expires_in ? Number(payload.expires_in) : null,
  };
}

function getFallbackGoogleIdentity(session: Session) {
  return {
    accountId:
      session.user.identities?.find((identity) => identity.provider === "google")?.id ??
      session.user.id,
    email: session.user.email ?? null,
  };
}

export async function syncGoogleWorkspaceFromSession({
  sessionClient,
  session,
}: {
  sessionClient: SupabaseClient<Database>;
  session: Session;
}) {
  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;
  const fallbackIdentity = getFallbackGoogleIdentity(session);

  const [profileResult, grantedScopeResult] = providerToken
    ? await Promise.allSettled([
        fetchGoogleProfile(providerToken),
        fetchGoogleGrantedScopes(providerToken),
      ])
    : [
        { status: "fulfilled", value: null } as const,
        { status: "fulfilled", value: null } as const,
      ];

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const scopeSnapshot =
    grantedScopeResult.status === "fulfilled" ? grantedScopeResult.value : null;

  const grantedScopes = scopeSnapshot?.scopes ?? (providerToken ? [...allGoogleWorkspaceScopes] : []);
  const grantedScopeSet = toScopeSet(grantedScopes);
  const tokenExpiresAt = scopeSnapshot?.expiresIn
    ? new Date(Date.now() + scopeSnapshot.expiresIn * 1000).toISOString()
    : session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : null;

  const providerAccountEmail = profile?.email ?? fallbackIdentity.email;
  const providerAccountId = profile?.sub ?? fallbackIdentity.accountId;
  const now = new Date().toISOString();
  const serviceClient = createServiceRoleClient();

  let accountId: string | null = null;

  if (serviceClient) {
    // Scope the lookup to this specific account (multi-account: there can be
    // more than one google row per user, so filter by provider_account_id, not
    // just provider, to avoid maybeSingle throwing on multiple rows).
    const existingAccount = (
      await serviceClient
        .from("integration_accounts")
        .select("id, refresh_token_encrypted")
        .eq("user_id", session.user.id)
        .eq("provider", "google")
        .eq("provider_account_id", providerAccountId)
        .maybeSingle()
    ).data;

    const accountPayload = {
      user_id: session.user.id,
      provider: "google",
      // The Google login account is the user's identity and the default
      // connection (non-removable). Sign-in always re-asserts that.
      is_default: true,
      provider_account_id: providerAccountId,
      provider_account_email: providerAccountEmail,
      scopes: grantedScopes,
      token_expires_at: tokenExpiresAt,
      access_token_encrypted: encryptSecret(providerToken),
      refresh_token_encrypted:
        encryptSecret(providerRefreshToken) ?? existingAccount?.refresh_token_encrypted ?? null,
    };

    const accountResult = await serviceClient
      .from("integration_accounts")
      .upsert(accountPayload, {
        onConflict: "user_id,provider,provider_account_id",
      })
      .select("id")
      .single();

    if (accountResult.error) {
      console.error("Failed to store Google account", accountResult.error);
    } else {
      accountId = accountResult.data.id;
    }
  }

  const integrationWriter = serviceClient ?? sessionClient;

  const rows = googleCapabilityProviders.map((provider) => {
    const requiredScopes = [...googleProviderScopes[provider]];
    const grantedForProvider = requiredScopes.filter((scope) => grantedScopeSet.has(scope));
    const missingScopes = requiredScopes.filter((scope) => !grantedScopeSet.has(scope));

    return {
      user_id: session.user.id,
      provider,
      status: missingScopes.length === 0 ? "connected" : "pending",
      provider_account_id: providerAccountId,
      provider_account_email: providerAccountEmail,
      scopes: grantedForProvider,
      last_sync_at: missingScopes.length === 0 ? now : null,
      account_id: accountId,
    };
  });

  const integrationResult = await integrationWriter
    .from("integrations")
    .upsert(rows, { onConflict: "user_id,provider" });

  if (integrationResult.error) {
    console.error("Failed to upsert Google integrations", integrationResult.error);
  }
}
