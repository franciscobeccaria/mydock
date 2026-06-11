# FRA-138 — Multi-account: data model + Connections connect flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user connect multiple accounts per provider from a top-level `/connections` page — Google via OAuth ("connect another"), Linear via a pasted personal API key — with the login Google account as a non-removable default, and per-connection encrypted tokens threaded into widget data fetches.

**Architecture:** Unify all connections (Google + Linear) as rows in `integration_accounts`, each holding its own encrypted token; retire the Linear-only `integration_tokens` table and the entire Linear OAuth flow (replaced by a static personal-API-key paste). Thread `accountId` from the widget query key → fetch → API route → adapters → token resolvers so two connections never collapse into one cache entry. Build the Connections UI (provider-grouped list + Linear paste-key dialog) and a locked-widget CTA in the Add-widget dialog.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, Supabase (Postgres + RLS, service-role client server-side), TanStack Query, base-ui components, Tailwind, AES-256-GCM via `src/lib/crypto.ts`.

**Verification model (no test framework):** This project has no unit-test runner. Each task verifies with `pnpm typecheck` and, where a route/page changed, `pnpm build`. End-to-end behavior is verified with the **agent-browser authed checklist** (see "Test plan" at the end) — `agent-browser` against the running local app, signed in by minting a Supabase session (recipe in the Test plan).

**Decisions locked (2026-06-11 brainstorming):**
- User-facing word = **"Connection"**; the screen is the top-level route **`/connections`** (no `/settings`). The route move + sidebar nav + deleting the throwaway `/preview/connections` live in **FRA-143** (separate), NOT here — but this plan creates `/connections` itself.
- Linear OAuth is **replaced** by a pasted personal API key (static: no refresh/expiry/secret). Remove the OAuth routes + `integration_tokens` usage.
- Tokens **unify on `integration_accounts`** for both providers.
- **Fresh start** — no data backfill; reconnect Linear once via paste-key after the migration.
- Locked widget = **disabled + "Connect <provider> →" CTA** now; a single config flag flips to hidden later.

---

## File Structure

**Created:**
- `supabase/migrations/20260611140000_multi_account_connections.sql` — schema changes.
- `src/features/integrations/providers/linear/personal-key.ts` — validate a pasted key + discover workspace identity; store as an `integration_accounts` row.
- `src/features/connections/queries.ts` — `listConnections(userId)` returning connections grouped per provider for the UI + the catalog account list.
- `src/app/api/connections/linear/route.ts` — `POST` (add a Linear connection by key) and `DELETE` (disconnect).
- `src/app/api/connections/[id]/route.ts` — `DELETE` (disconnect a connection) + `PATCH` (set default).
- `src/app/(app)/connections/page.tsx` — the Connections page (server component).
- `src/components/connections/connections-list.tsx` — provider-grouped list (client).
- `src/components/connections/linear-connect-dialog.tsx` — paste-key dialog (client).
- `src/components/connections/connection-row.tsx` — one connection row with the `⋯` menu.

**Modified:**
- `src/features/integrations/providers/linear/client.ts` — `resolveLinearAccessToken` reads the static key from `integration_accounts` keyed by `accountId`; drop refresh logic; `linearGraphqlFetch` takes `accountId`.
- `src/features/integrations/providers/linear/adapter.ts` — `getLinearItems(userId, accountId)`.
- `src/features/integrations/providers/google/client.ts` — token resolvers accept an optional `accountId` (default = the user's default Google connection).
- `src/features/integrations/providers/google/gmail.adapter.ts`, `tasks.adapter.ts`, `calendar.adapter.ts` — thread `accountId`.
- `src/features/integrations/registry.ts` — `getWidgetPayload`/`getWidgetsResponse` accept + forward `accountId`; `providerMeta.connectPath` → `/connections`.
- `src/app/api/widgets/[provider]/route.ts` — read `accountId` from query, forward it.
- `src/components/widgets/widget-render.tsx` — `widgetQueryKey` + `fetchWidget` take `accountId`.
- `src/components/widgets/widget-catalog-dialog.tsx` — locked-widget tile + CTA; real connection list.
- `src/components/widgets/widget-grid.tsx` — build the real `WidgetAccount[]` from `listConnections`.

**Deleted (Linear OAuth retirement):**
- `src/app/api/integrations/linear/start/route.ts`, `src/app/api/integrations/linear/callback/route.ts`
- `src/features/integrations/providers/linear/oauth.ts`
- Linear branches in `src/features/integrations/providers/linear/account.ts` (OAuth exchange) and the refresh logic in `client.ts`.
- `integration_tokens` table (dropped in the migration).

---

## Task 1: Schema migration — multi-account `integration_accounts`

**Files:**
- Create: `supabase/migrations/20260611140000_multi_account_connections.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260611140000_multi_account_connections.sql`:

```sql
-- FRA-138: multi-account connections. One row per real connected account in
-- integration_accounts, for BOTH google and linear. Retire integration_tokens.

-- 1. Allow many accounts per provider: drop the single-account unique key.
alter table public.integration_accounts
  drop constraint if exists integration_accounts_user_provider_key;

-- 2. One row per real connected account (provider_account_id is the natural key).
alter table public.integration_accounts
  add constraint integration_accounts_user_provider_account_key
  unique (user_id, provider, provider_account_id);

-- 3. Allow linear connections (previously google-only).
alter table public.integration_accounts
  drop constraint if exists integration_accounts_provider_check;
alter table public.integration_accounts
  add constraint integration_accounts_provider_check
  check (provider in ('google', 'linear'));

-- 4. Default-connection marker. The login Google account is the default and is
--    not removable (enforced in app logic). Row flag, not a profile pointer.
alter table public.integration_accounts
  add column if not exists is_default boolean not null default false;

-- 5. widget_cache is now per-account, not per-provider.
alter table public.widget_cache
  drop constraint if exists widget_cache_user_provider_widget_key;
alter table public.widget_cache
  add column if not exists account_id uuid
  references public.integration_accounts(id) on delete cascade;
alter table public.widget_cache
  add constraint widget_cache_user_account_widget_key
  unique (user_id, account_id, widget_key);

-- 6. Retire the Linear-only token table (fresh start; no backfill).
drop table if exists public.integration_tokens;
```

- [ ] **Step 2: Apply the migration locally**

Run: `pnpm supabase:reset`
Expected: reset completes, all migrations apply with no error. (Reset is acceptable — fresh-start decision, no data to preserve.)

- [ ] **Step 3: Regenerate Supabase types**

Run: `pnpm supabase:types`
Expected: `src/types/supabase.ts` regenerates; `integration_accounts` now has `is_default`, `widget_cache` has `account_id`, and `integration_tokens` is gone.

- [ ] **Step 4: Verify typecheck surfaces the now-broken Linear token code**

Run: `pnpm typecheck`
Expected: errors in `src/features/integrations/providers/linear/client.ts` and `account.ts` referencing `integration_tokens` (these are fixed in Task 2). This confirms the type regen took effect. Do NOT fix yet — Task 2 owns it.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260611140000_multi_account_connections.sql src/types/supabase.ts
git commit -m "feat(db): multi-account integration_accounts + per-account widget_cache (FRA-138)"
```

---

## Task 2: Linear personal-API-key — validate, discover, store

Replaces the Linear OAuth exchange. A personal key (`lin_api_...`) is sent as the `Authorization` header directly (no `Bearer` prefix for personal keys — Linear accepts the raw key). We validate it by querying `viewer` + `organization`, then store it as an `integration_accounts` row.

**Files:**
- Create: `src/features/integrations/providers/linear/personal-key.ts`

- [ ] **Step 1: Write the personal-key module**

Create `src/features/integrations/providers/linear/personal-key.ts`:

```ts
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

  const now = new Date().toISOString();

  const accountResult = await serviceClient
    .from("integration_accounts")
    .upsert(
      {
        user_id: userId,
        provider: "linear",
        provider_account_id: identity.userId,
        provider_account_email: identity.email,
        scopes: ["read"],
        access_token_encrypted: encryptSecret(apiKey),
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
```

> **Note on the workspace label:** `identity.workspaceName` is returned for the UI (the connection sublabel) but is not a column today. The UI derives the label from `provider_account_email` + a fetched workspace name; storing the workspace name is out of scope (YAGNI) — the email is enough to disambiguate.

- [ ] **Step 2: Run typecheck on the new module**

Run: `pnpm typecheck 2>&1 | grep personal-key || echo "personal-key clean"`
Expected: `personal-key clean` (the file itself has no type errors; the pre-existing `client.ts`/`account.ts` errors from Task 1 remain until Step 3).

- [ ] **Step 3: Gut the Linear OAuth client — read the static key per account**

Replace the entire contents of `src/features/integrations/providers/linear/client.ts` with:

```ts
import { decryptSecret } from "@/lib/crypto";
import { createServiceRoleClient } from "@/lib/supabase/service";

const LINEAR_GRAPHQL = "https://api.linear.app/graphql";

/**
 * Resolves the pasted Linear personal API key for a specific connection.
 * If accountId is omitted, falls back to the user's first linear connection.
 * Personal keys are static — no refresh.
 */
async function resolveLinearKey(userId: string, accountId?: string | null): Promise<string> {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) throw new Error("Linear is unavailable on the server.");

  let query = serviceClient
    .from("integration_accounts")
    .select("id,access_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", "linear");

  query = accountId ? query.eq("id", accountId) : query.order("created_at", { ascending: true });

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
```

- [ ] **Step 4: Delete the OAuth-only Linear files**

```bash
git rm src/app/api/integrations/linear/start/route.ts \
       src/app/api/integrations/linear/callback/route.ts \
       src/features/integrations/providers/linear/oauth.ts \
       src/features/integrations/providers/linear/account.ts \
       src/features/integrations/providers/linear/tokens.ts
```

> `account.ts` (OAuth exchange + `integration_tokens` writes) and `tokens.ts` (expiry helper) are obsolete. `personal-key.ts` is their replacement.

- [ ] **Step 5: Update the Linear adapter to thread accountId**

In `src/features/integrations/providers/linear/adapter.ts`, change the `getLinearItems` signature and its `linearGraphqlFetch` call. Read the file first; the change is:

```ts
// before: export async function getLinearItems(userId: string) {
//   ... linearGraphqlFetch<T>(userId, QUERY)
export async function getLinearItems(userId: string, accountId?: string | null) {
  // ... pass accountId as the 4th arg:
  // const data = await linearGraphqlFetch<T>(userId, QUERY, undefined, accountId);
}
```

- [ ] **Step 6: Verify typecheck is clean across Linear**

Run: `pnpm typecheck`
Expected: no errors referencing `integration_tokens`, `oauth.ts`, `account.ts`, `tokens.ts`, `refreshLinearAccessToken`, or `LINEAR_CLIENT_ID/SECRET`. If `env.ts` still declares those env vars, that's fine (unused) — leave for Task 8 cleanup.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(linear): replace OAuth with personal API key in integration_accounts (FRA-138)"
```

---

## Task 3: Google token resolvers accept an explicit `accountId`

Today `resolveGoogleToken(userId)` finds the single Google `integration_accounts` row. With multiple Google connections, the caller must say which one. Default to the row with `is_default = true` when `accountId` is omitted.

**Files:**
- Modify: `src/features/integrations/providers/google/client.ts`
- Modify: `src/features/integrations/providers/google/gmail.adapter.ts`, `tasks.adapter.ts`, `calendar.adapter.ts`

- [ ] **Step 1: Add `accountId` to `resolveGoogleAccessToken`/`resolveGoogleToken`**

Read `src/features/integrations/providers/google/client.ts`. In the `integration_accounts` query inside `resolveGoogleAccessToken`, change the row selection so it accepts an optional `accountId` and otherwise prefers the default:

```ts
// signature change:
export async function resolveGoogleToken(userId: string, accountId?: string | null) { ... }
// inside resolveGoogleAccessToken's query against integration_accounts:
//   .eq("user_id", userId).eq("provider", "google")
//   then: accountId ? .eq("id", accountId)
//                    : .order("is_default", { ascending: false }).order("created_at", { ascending: true })
//   .limit(1).maybeSingle()
```

Thread `accountId` from `googleApiFetch(userId, ...)` → add an optional `accountId` param → pass to `resolveGoogleToken`.

- [ ] **Step 2: Thread `accountId` through the three Google adapters**

In each of `gmail.adapter.ts`, `tasks.adapter.ts`, `calendar.adapter.ts`, add an optional `accountId` param to the exported `getX Items` function and forward it to `googleApiFetch`. Example for gmail:

```ts
export async function getGmailItems(userId: string, view?: GmailView, accountId?: string | null) {
  // ... googleApiFetch(userId, url, init, accountId)
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: clean (registry still calls the adapters without `accountId` — the param is optional, so this compiles; Task 4 wires the real value).

- [ ] **Step 4: Commit**

```bash
git add src/features/integrations/providers/google
git commit -m "feat(google): per-account token resolution (accountId) (FRA-138)"
```

---

## Task 4: Thread `accountId` through the registry + widgets API + client fetch

Closes the documented gap (`widget-grid.tsx` note): widget queries are keyed by slot + config but NOT by `accountId`, so two instances on different accounts collapse into one cache entry.

**Files:**
- Modify: `src/features/integrations/registry.ts:255-293` (`getWidgetPayload`)
- Modify: `src/app/api/widgets/[provider]/route.ts`
- Modify: `src/components/widgets/widget-render.tsx:36-70` (`fetchWidget`, `widgetQueryKey`)

- [ ] **Step 1: `getWidgetPayload` accepts + forwards `accountId`**

In `src/features/integrations/registry.ts`, change `getWidgetPayload`:

```ts
export async function getWidgetPayload(
  provider: Provider,
  userId: string,
  previewState?: WidgetViewState,
  view?: GmailView,
  accountId?: string | null,
): Promise<WidgetPayload> {
  // ... in the load branch, forward accountId:
  //   gmail:         await getGmailItems(userId, view, accountId)
  //   linear:        await getLinearItems(userId, accountId)
  //   google_tasks:  await getGoogleTaskItems(userId, accountId)
  //   google_calendar: await getGoogleCalendarItems(userId, accountId)
}
```

- [ ] **Step 2: Widgets API route reads `accountId` from the query string**

Read `src/app/api/widgets/[provider]/route.ts`. Where it parses `view`/`previewState` from `request.nextUrl.searchParams`, also read `accountId`:

```ts
const accountId = request.nextUrl.searchParams.get("accountId");
// pass to getWidgetPayload(provider, user.id, previewState, view, accountId)
```

- [ ] **Step 3: `fetchWidget` + `widgetQueryKey` carry `accountId`**

In `src/components/widgets/widget-render.tsx`:

```ts
export async function fetchWidget(provider: Provider, view?: string, accountId?: string | null) {
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  if (accountId) params.set("accountId", accountId);
  const qs = params.toString();
  const res = await fetch(`/api/widgets/${provider}${qs ? `?${qs}` : ""}`);
  // ... unchanged
}

export function widgetQueryKey(slotId: SlotId, gmailView?: string, accountId?: string | null) {
  return [...EXISTING_KEY_PARTS, accountId ?? "__default__"] as const;
}
```

Update every `widgetQueryKey(...)` / `fetchWidget(...)` call site (dashboard widget render + catalog preview) to pass the instance's `accountId`. Grep: `rg "widgetQueryKey\(|fetchWidget\(" src`.

- [ ] **Step 4: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: both clean. `/dashboard` (or `/` after FRA-143) builds — historic prod gate.

- [ ] **Step 5: Commit**

```bash
git add src/features/integrations/registry.ts src/app/api/widgets src/components/widgets/widget-render.tsx
git commit -m "feat(widgets): thread accountId through query key, fetch, API, registry (FRA-138)"
```

---

## Task 5: `listConnections` query + connection management API

**Files:**
- Create: `src/features/connections/queries.ts`
- Create: `src/app/api/connections/linear/route.ts`
- Create: `src/app/api/connections/[id]/route.ts`

- [ ] **Step 1: Write `listConnections`**

Create `src/features/connections/queries.ts`:

```ts
import { createServiceRoleClient } from "@/lib/supabase/service";

export type ConnectionRecord = {
  id: string;
  provider: "google" | "linear";
  email: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type ConnectionsByProvider = {
  google: ConnectionRecord[];
  linear: ConnectionRecord[];
};

/** All of a user's connections, grouped by provider, for the /connections page. */
export async function listConnections(userId: string): Promise<ConnectionsByProvider> {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) return { google: [], linear: [] };

  const result = await serviceClient
    .from("integration_accounts")
    .select("id,provider,provider_account_email,is_default,created_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  const rows = result.data ?? [];
  const map = (provider: "google" | "linear") =>
    rows
      .filter((r) => r.provider === provider)
      .map((r) => ({
        id: r.id,
        provider,
        email: r.provider_account_email,
        isDefault: r.is_default,
        createdAt: r.created_at,
      }));

  return { google: map("google"), linear: map("linear") };
}
```

- [ ] **Step 2: Write the Linear connect/disconnect route**

Create `src/app/api/connections/linear/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { validateLinearKey, storeLinearConnection } from "@/features/integrations/providers/linear/personal-key";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { apiKey?: string } | null;
  const apiKey = body?.apiKey?.trim();
  if (!apiKey) return NextResponse.json({ error: "missing_key" }, { status: 400 });

  const identity = await validateLinearKey(apiKey);
  if (!identity) return NextResponse.json({ error: "invalid_key" }, { status: 422 });

  await storeLinearConnection({ userId: user.id, apiKey, identity });
  return NextResponse.json({
    ok: true,
    email: identity.email,
    workspaceName: identity.workspaceName,
  });
}
```

- [ ] **Step 3: Write the disconnect / set-default route**

Create `src/app/api/connections/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return user?.id ?? null;
}

// Disconnect a connection. The default (login Google) connection cannot be removed.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const service = createServiceRoleClient();
  if (!service) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const row = await service
    .from("integration_accounts")
    .select("id,is_default")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (row.error || !row.data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.data.is_default)
    return NextResponse.json({ error: "default_not_removable" }, { status: 409 });

  const del = await service.from("integration_accounts").delete().eq("user_id", userId).eq("id", id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Set a connection as the default for its provider.
export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const service = createServiceRoleClient();
  if (!service) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const target = await service
    .from("integration_accounts")
    .select("id,provider")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (target.error || !target.data)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Clear the old default for this provider, set the new one.
  await service
    .from("integration_accounts")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("provider", target.data.provider);
  const set = await service
    .from("integration_accounts")
    .update({ is_default: true })
    .eq("user_id", userId)
    .eq("id", id);
  if (set.error) return NextResponse.json({ error: set.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: both clean; the three new route files compile.

> **Next.js 16 route signature check:** before relying on `ctx.params` being a Promise above, confirm against the installed docs: `rg -l "params" node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` and read the dynamic-params section. Adjust the handler signature to match the installed version if it differs.

- [ ] **Step 5: Commit**

```bash
git add src/features/connections src/app/api/connections
git commit -m "feat(connections): listConnections + connect/disconnect/set-default API (FRA-138)"
```

---

## Task 6: The `/connections` page + provider-grouped list

This adapts the throwaway preview (`src/app/(app)/preview/connections/page.tsx`) into the real, data-backed page. The preview file itself is deleted in FRA-143.

**Files:**
- Create: `src/app/(app)/connections/page.tsx`
- Create: `src/components/connections/connections-list.tsx`
- Create: `src/components/connections/connection-row.tsx`

- [ ] **Step 1: Read the installed Next 16 page conventions**

Run: `cat node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md | head -120`
Confirm the default-export `page.tsx` server-component pattern and how to read the session (mirror `src/app/(app)/settings/integrations/page.tsx`, which already does `createClient()` → `auth.getUser()`).

- [ ] **Step 2: Write the server page**

Create `src/app/(app)/connections/page.tsx`:

```tsx
import { PageContainer } from "@/components/layout/page-container";
import { ConnectionsList } from "@/components/connections/connections-list";
import { listConnections } from "@/features/connections/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const connections = user
    ? await listConnections(user.id)
    : { google: [], linear: [] };

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#18181B]">Connections</h1>
        <p className="mt-1 text-sm text-[#71717A]">
          Connect your accounts. Widgets use these connections to show your data.
        </p>
      </div>
      <ConnectionsList connections={connections} />
    </PageContainer>
  );
}
```

- [ ] **Step 3: Write the client list (port from the preview)**

Create `src/components/connections/connections-list.tsx` by porting the `ProviderGroup` + page body from `src/app/(app)/preview/connections/page.tsx`, but driven by the `ConnectionsByProvider` prop instead of mock arrays. Google's "Connect another" → `window.location.href = "/api/integrations/google/start?next=/connections"`. Linear's add → opens the dialog from Task 7. Render the `Default · Login` badge from `connection.isDefault`.

- [ ] **Step 4: Write `connection-row.tsx`**

Create `src/components/connections/connection-row.tsx` by porting `ConnectionRow` from the preview, wiring the `⋯` menu: **Set as default** → `PATCH /api/connections/{id}`; **Disconnect** → `DELETE /api/connections/{id}` (disabled when `isDefault`). On success, `router.refresh()`.

- [ ] **Step 5: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: clean; `/connections` appears in the route manifest.

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/connections src/components/connections
git commit -m "feat(connections): /connections page with provider-grouped list (FRA-138)"
```

---

## Task 7: Linear paste-key dialog (wired to the API)

**Files:**
- Create: `src/components/connections/linear-connect-dialog.tsx`

- [ ] **Step 1: Port + wire the dialog**

Create `src/components/connections/linear-connect-dialog.tsx` by porting `LinearConnectDialog` from the preview, replacing the mock `setTimeout` validation with a real call:

```tsx
async function submit() {
  if (!key.trim()) return;
  setState("verifying");
  const res = await fetch("/api/connections/linear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key.trim() }),
  });
  if (res.ok) {
    const data = (await res.json()) as { workspaceName?: string; email?: string };
    setResult(data);
    setState("ok");
    router.refresh(); // re-fetch the server page's connection list
  } else {
    setState("error");
  }
}
```

Keep the step-by-step instructions, the masked input with reveal toggle, and the verifying/ok/error states from the preview. The "Open Linear API settings" link → `https://linear.app/settings/api`.

- [ ] **Step 2: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: clean.

> **base-ui gotcha (do NOT use a `Select` here):** base-ui `Select` triggers aren't queryable by automation, which breaks the agent-browser checklist. The dialog uses `Input` + buttons only — keep it that way.

- [ ] **Step 3: Commit**

```bash
git add src/components/connections/linear-connect-dialog.tsx
git commit -m "feat(connections): Linear paste-key dialog wired to connect API (FRA-138)"
```

---

## Task 8: Locked-widget CTA + real account list in the catalog; connectPath cleanup

**Files:**
- Modify: `src/components/widgets/widget-catalog-dialog.tsx`
- Modify: `src/components/widgets/widget-grid.tsx:234-237` (the hardcoded `{id:null,...}` account)
- Modify: `src/features/integrations/registry.ts:25,31,37,43` (`connectPath`)
- Modify: `src/lib/env.ts` (drop unused `LINEAR_CLIENT_ID/SECRET/REDIRECT_URI`)

- [ ] **Step 1: Point connectPath at `/connections`**

In `src/features/integrations/registry.ts`, change every `connectPath` `next=/settings/integrations` → `next=/connections`. For `linear`, the connectPath is no longer an OAuth start route — set it to the page so the locked-widget CTA deep-links there:

```ts
linear:  { ..., connectPath: "/connections" },
gmail:   { ..., connectPath: "/api/integrations/google/start?next=/connections" },
google_tasks:    { ..., connectPath: "/api/integrations/google/start?next=/connections" },
google_calendar: { ..., connectPath: "/api/integrations/google/start?next=/connections" },
```

- [ ] **Step 2: Add the locked-widget tile to the catalog**

In `src/components/widgets/widget-catalog-dialog.tsx`, add a `LOCKED_WIDGETS_HIDDEN = false` module constant (the single flag). In `WidgetCardOption`/`AppSection`, when a provider is not connected: if `LOCKED_WIDGETS_HIDDEN` is true, skip the tile; otherwise render it disabled with a "Connect <provider> →" button linking to `connectPath`. Port the `LockedWidgetTile` visual from the preview. Determine "connected" from the connection list passed into the dialog (Step 3).

- [ ] **Step 3: Feed the real connection list into the catalog**

In `src/components/widgets/widget-grid.tsx` (lines ~234-237), replace the hardcoded single `{ id: null, ... }` `WidgetAccount[]` with the real list built from `listConnections` (passed down from the dashboard server component, or fetched client-side). The default Google connection keeps `id: null` semantics for the "default" sentinel OR uses its real `accountId` — match whatever `widgetQueryKey` expects from Task 4 (it uses `accountId ?? "__default__"`, so passing the real id is correct and the default connection's id is fine).

- [ ] **Step 4: Remove dead Linear OAuth env declarations**

In `src/lib/env.ts`, remove `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_REDIRECT_URI` (now unused after Task 2). Grep first to confirm no other references: `rg "LINEAR_CLIENT_ID|LINEAR_CLIENT_SECRET|LINEAR_REDIRECT_URI" src`.

- [ ] **Step 5: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/widgets src/features/integrations/registry.ts src/lib/env.ts
git commit -m "feat(widgets): locked-widget CTA + real connection list; retire Linear OAuth env (FRA-138)"
```

---

## Test plan — agent-browser authed checklist

No automated tests. After the branch builds, run the checklist against the running local app, signed in. Auth recipe (mint a Supabase session — no OAuth click; see engram `mydock-agent-browser-auth-recipe`):

1. Start dev: `pnpm dev`.
2. Mint a session: `POST {SUPABASE_URL}/auth/v1/admin/generate_link` (type `magiclink`, the dev user's email) with the service-role key → `hashed_token` → `POST /auth/v1/verify` with the anon key → real `access_token` + `refresh_token`.
3. Build the `@supabase/ssr` cookie `sb-<project-ref>-auth-token` = `"base64-"` + base64(JSON session), chunked at 3180 chars (`.0`/`.1` if needed).
4. `agent-browser cookies set sb-<ref>-auth-token <value> --url http://localhost:3000 --path / --sameSite Lax`, then `agent-browser open /connections`.
5. Scrub temp token/cookie files after.

**Checklist (against `/connections` and the dashboard):**

1. **Connections list renders** — `/connections` shows a Google group with the login account marked `Default · Login`, and a Linear group (empty or with a connection). No console errors.
2. **Login default is not removable** — the login Google connection's `⋯` menu shows Disconnect disabled (or returns 409 if forced via `agent-browser eval` fetch to `DELETE /api/connections/{id}`).
3. **Connect Linear via key** — open the Linear dialog, paste a real personal API key, submit. The verifying → connected transition fires; the row appears after refresh. (Because base-ui controls are scriptable here as plain inputs, drive the `Input` directly; if any control resists, exercise `POST /api/connections/linear` via `agent-browser eval` fetch — still hits the real route + RLS.)
4. **Invalid key rejected** — paste `lin_garbage`; the dialog shows the error state (422 from the API), no row added.
5. **Connect another Google account** — "Connect another Google account" starts the OAuth flow (`/api/integrations/google/start?next=/connections`). (May require a real Google account; confirm at least that the route redirects, not 500s.)
6. **Set default / disconnect** — set a non-login connection as default (`PATCH`), confirm the badge moves; disconnect a non-login connection (`DELETE`), confirm it disappears after `router.refresh()`.
7. **Per-account widget data** — add two widgets of the same Linear provider bound to two different connections (via the catalog account list). Confirm via `agent-browser eval` that `/api/widgets/linear?accountId=A` and `?accountId=B` return different payloads (proves accountId threading; two instances no longer collapse into one cache entry).
8. **Locked widget CTA** — with a provider disconnected, the Add-widget dialog shows its tile disabled with a "Connect <provider> →" button that deep-links to `/connections`.

**Build gate (local, before push):** `pnpm typecheck` and `pnpm build` both clean.

---

## Spec coverage check

- Drop `unique(user_id, provider)`; add `unique(user_id, provider, provider_account_id)` → Task 1.
- Relax check to allow `linear` → Task 1.
- `is_default` marker → Task 1; enforced non-removable → Task 5 (DELETE 409) + Task 6 (disabled menu item).
- `widget_cache` keyed by account → Task 1.
- Linear = manual API key, instructions + paste + validate + encrypted per-connection storage → Tasks 2, 5, 7.
- Google = OAuth "connect another" → Task 6 (Step 3) + existing `/api/integrations/google/start`.
- Per-connection token resolution (Google + Linear) → Tasks 2, 3.
- `accountId` threaded into `widgetQueryKey` + `fetchWidget` + API + adapters (the documented gap) → Task 4.
- Connections grouped by provider, connect/reconnect/set-default/disconnect → Tasks 5, 6.
- Locked-widget tile: disabled + CTA now, single flag to hide later → Task 8.
- Route is top-level `/connections` (page created here; route move/nav/preview-deletion = FRA-143) → Task 6.
- Retire Linear OAuth + `integration_tokens` + dead env → Tasks 2, 8.
- Fresh start, no backfill → Task 1 (Step 2 reset).
