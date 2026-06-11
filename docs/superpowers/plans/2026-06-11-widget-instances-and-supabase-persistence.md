# Widget instances + Supabase persistence — Implementation Plan

**Linear:** FRA-139 + FRA-141
**Spec:** `docs/superpowers/specs/2026-06-11-widget-instances-and-supabase-persistence-design.md`
**Branch:** `fbeccaria24/fra-139-141-widget-instances-and-supabase-persistence`
**Goal:** Replace the `SlotId[]` dashboard layout with a per-user, Supabase-persisted `WidgetInstance[]` model (instances, per-instance config, duplicates, account dropdown), with localStorage demoted to a cache.

**Verification model (per user):** No unit-test framework. Verification is `pnpm typecheck` + `pnpm build` (the known `/dashboard` prod gate) plus a **Vercel preview browser checklist** run by the agent browser. See "Test plan" at the end.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/<ts>_dashboard_state.sql` | create | `dashboard_state` table + RLS + trigger |
| `src/types/supabase.ts` | regenerate | typed `dashboard_state` row |
| `src/components/dashboard/widget-instance.ts` | create | `WidgetInstance` type, Zod schemas, `slotIdsToInstances()` migration helper |
| `src/app/api/dashboard-state/route.ts` | create | `GET`/`PUT` per-user state |
| `src/components/dashboard/use-dashboard-state.ts` | create | client data layer: load, soft-migrate, optimistic write-through, localStorage cache |
| `src/components/dashboard/use-dashboard-layout.ts` | modify | back layout by instances via `useDashboardState` |
| `src/components/dashboard/use-shortcuts.ts` | modify | back shortcuts via `useDashboardState`, keep normalize/favicon helpers |
| `src/components/dashboard/use-widget-preference.ts` | delete | replaced by per-instance `config` |
| `src/components/widgets/widget-grid.tsx` | modify | render + query per instance; read view from `instance.config` |
| `src/components/widgets/widget-catalog-dialog.tsx` | modify | account dropdown + "Add & choose another" + "Add widget" |

---

## Task 1 — Supabase table + types

**Files:** create `supabase/migrations/<ts>_dashboard_state.sql`; regenerate `src/types/supabase.ts`.

1. Create the migration file (timestamp prefix, e.g. `20260611120000_dashboard_state.sql`) with the exact SQL from the spec's "Supabase schema" section (`dashboard_state` table, PK `user_id`, jsonb `layout`/`shortcuts`, `version`, RLS own-row policies, `set_updated_at` trigger).
2. Apply locally: `pnpm supabase:start` then `pnpm supabase:reset`. Expected: reset runs clean, lists the new migration.
3. Regenerate types: `pnpm supabase:types`. Expected: `src/types/supabase.ts` now contains a `dashboard_state` Row/Insert/Update with `layout`/`shortcuts` typed as `Json`.
4. `git add` migration + types, commit: `feat(db): add dashboard_state table with RLS (FRA-141)`.

---

## Task 2 — Instance type, schemas, migration helper

**Files:** create `src/components/dashboard/widget-instance.ts`.

Define and export:

```ts
import { z } from "zod";
import { DEFAULT_LAYOUT, isSlotId, type SlotId } from "@/components/widgets/widget-catalog";
import { type Shortcut } from "@/components/dashboard/use-shortcuts";

export type WidgetInstance = {
  instanceId: string;
  slotId: SlotId;
  accountId: string | null;
  config: Record<string, string>;
};

export const widgetInstanceSchema = z.object({
  instanceId: z.string().min(1),
  slotId: z.string().refine(isSlotId, "unknown slotId"),
  accountId: z.string().nullable(),
  config: z.record(z.string(), z.string()).default({}),
});

export const dashboardStateSchema = z.object({
  layout: z.array(widgetInstanceSchema).default([]),
  shortcuts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    iconUrl: z.string().optional(),
  })).default([]),
});

export type DashboardStatePayload = z.infer<typeof dashboardStateSchema>;

/** Soft-migration: each saved SlotId becomes one instance on the default account.
 *  `prefs` are the old mydock:widget-pref:* values, folded into each instance's config. */
export function slotIdsToInstances(
  slotIds: SlotId[],
  prefs: Record<string, string> = {},
): WidgetInstance[] {
  return slotIds.map((slotId) => ({
    instanceId: crypto.randomUUID(),
    slotId,
    accountId: null,
    config: prefForSlot(slotId, prefs),
  }));
}

/** Map old global prefs to the per-instance config keys each slot reads. */
function prefForSlot(slotId: SlotId, prefs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (slotId === "gmail" && prefs["gmail-view"]) out["gmail-view"] = prefs["gmail-view"];
  if (slotId === "google_tasks" && prefs["tasks-view"]) out["tasks-view"] = prefs["tasks-view"];
  if (slotId === "linear" && prefs["linear-project"]) out["linear-project"] = prefs["linear-project"];
  return out;
}

export function defaultInstances(): WidgetInstance[] {
  return slotIdsToInstances([...DEFAULT_LAYOUT]);
}
```

Commit: `feat(dashboard): add WidgetInstance model + migration helper (FRA-139)`.

---

## Task 3 — Route handler `GET`/`PUT`

**Files:** create `src/app/api/dashboard-state/route.ts`.

Follow the `app/api/integrations/status/route.ts` convention (server client with `writeCookies: true`, `auth.getUser()`, 401/503 guards).

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dashboardStateSchema } from "@/components/dashboard/widget-instance";

export async function GET() {
  const supabase = await createClient({ writeCookies: true });
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("dashboard_state")
    .select("layout, shortcuts, version")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(data ?? null);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient({ writeCookies: true });
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = dashboardStateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid dashboard state." }, { status: 400 });

  const { error } = await supabase
    .from("dashboard_state")
    .upsert({ user_id: user.id, layout: parsed.data.layout, shortcuts: parsed.data.shortcuts }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

Verify `pnpm typecheck` clean. Commit: `feat(api): dashboard-state GET/PUT route (FRA-141)`.

---

## Task 4 — Client data layer `useDashboardState`

**Files:** create `src/components/dashboard/use-dashboard-state.ts`.

Responsibilities (TanStack Query, matching the widget queries):
- `useQuery(["dashboard-state"])` → `GET /api/dashboard-state`.
- On `null` server row: read the three localStorage keys, build instances via `slotIdsToInstances(readLayout(), readPrefs())`, sanitize shortcuts via the existing `useShortcuts` reader, `PUT` the seeded state, use it as initial.
- Expose `{ layout, shortcuts, setLayout, setShortcuts }` where setters update an in-memory state, mirror to localStorage (`try/catch`), and fire a **debounced** (~500ms) `PUT` via `useMutation`. On `PUT` error: keep in-session state (cache already written), no throw.
- SSR guard: `typeof window` checks preserved in the localStorage readers.

Local cache key: keep writing `mydock:dashboard:v2` (now an instance array) and `mydock:shortcuts:v1` so an offline reload still restores. Drop `mydock:widget-pref:*` writes.

Verify `pnpm typecheck`. Commit: `feat(dashboard): server-backed useDashboardState with soft-migration (FRA-141)`.

---

## Task 5 — Refactor `useDashboardLayout` + `useShortcuts`, delete `useWidgetPreference`

**Files:** modify `use-dashboard-layout.ts`, `use-shortcuts.ts`; delete `use-widget-preference.ts`.

- `useDashboardLayout` now consumes `useDashboardState`: `layout: WidgetInstance[]`; `addWidget(slotId, accountId?)` pushes a new instance; `removeWidget(instanceId)`; `reorder(activeInstanceId, overInstanceId)`; `updateConfig(instanceId, key, value)`; `availableToAdd`/`isActive` operate on slotIds present. Update the `UseDashboardLayout` type accordingly.
- `useShortcuts` keeps `normalizeUrl`/`faviconUrl`/`sanitize` exports but its state comes from `useDashboardState.shortcuts`/`setShortcuts`.
- Delete `use-widget-preference.ts`.

Verify `pnpm typecheck` (will surface every consumer to fix in Task 6). Commit after Task 6 (they compile together).

---

## Task 6 — `widget-grid.tsx` per-instance render + queries

**Files:** modify `src/components/widgets/widget-grid.tsx`.

- Iterate `layout` (instances) instead of slotIds: `key={instance.instanceId}`, dnd `items={layout.map(i => i.instanceId)}`, `SortableWidget id={instance.instanceId}`.
- `slotContent` becomes a function of an instance: pick the component by `instance.slotId`, read view/project from `instance.config` (e.g. `instance.config["gmail-view"] ?? "all"`), write back via `updateConfig(instanceId, "gmail-view", v)`.
- Queries stay per *provider* but Gmail/Linear that depend on config must key by the instance's config value: `queryKey: ["integrations","gmail","emails", instanceId, view]`. Two Gmail instances with different views fetch independently.
- `removeWidget`/`reorder` now take `instanceId`. `openWidget` takes the instance (uses its `config` for the unread destination).
- Pass `addWidget` (slotId + accountId) and the account list (single login account for now) into the catalog dialog.

Verify `pnpm typecheck` + `pnpm build` clean. Commit: `feat(dashboard): render and query widgets per instance (FRA-139)`.

---

## Task 7 — `widget-catalog-dialog.tsx` account dropdown + duplicate

**Files:** modify `src/components/widgets/widget-catalog-dialog.tsx`.

- Add an **Account** dropdown (shadcn select) listing the single login account; selected value defaults to it. Wire to the add call so `addWidget(slotId, accountId)` records `accountId` (the login account's id, or `null` for default).
- Add **"Add & choose another"** (adds the instance, keeps the dialog open, optionally clears selection) and **"Add widget"** (adds + closes), per the mock.
- Remove the old "already added → disabled" gating that assumed one-per-slot; duplicates are allowed now.

Verify `pnpm typecheck` + `pnpm build` clean. Commit: `feat(dashboard): account dropdown + duplicate widgets in catalog (FRA-139)`.

---

## Test plan — Vercel agent browser

No automated tests. After the branch is pushed and Vercel builds a **preview deployment**, the agent browser runs this checklist against the preview URL (signed in as the login account):

1. **Fresh load / soft-migration** — open the dashboard. Existing widgets + shortcuts appear (seeded from localStorage on first load). Reload: identical.
2. **Cross-device** — open the preview in a second browser/incognito, sign in as the same user. Layout, widget config, and shortcuts match the first session (proves Supabase is the source of truth, not localStorage).
3. **Add + duplicate** — Edit → Add widget → pick a widget, "Add & choose another", add a second of the same widget (e.g. two Linear). Both appear as independent instances.
4. **Per-instance config** — set one Gmail instance to Unread and another to All (or two Linear instances to different projects). Each keeps its own view. Reload: views persist per instance.
5. **Account dropdown** — the dropdown shows the single login account and is selectable (no error); the chosen account is recorded.
6. **Reorder / remove** — drag to reorder, remove one instance. Reload and re-open second browser: order and removal persisted.
7. **Shortcuts** — add/reorder/remove a shortcut. Reload + second browser: persisted.
8. **Offline resilience** — with the tab offline, mutate layout; UI still updates in-session (cache). Back online, mutate again: server catches up (last-write-wins).

**Build gate (local, before push):** `pnpm typecheck` and `pnpm build` both clean — `/dashboard` must build (the historic prod blocker).

---

## Spec coverage check

- Instance model → Task 2. Supabase table + RLS → Task 1. GET/PUT → Task 3. localStorage-as-cache + soft-migration → Task 4. Hook refactor + per-instance config (absorbs widget-pref) → Tasks 5–6. Account dropdown + duplicates (mock) → Tasks 6–7. Cross-device/offline/last-write-wins → verified in Test plan. `accountId` nullable/default → Tasks 2, 6, 7.
