# Widget instances + Supabase persistence — Design

**Linear:** FRA-139 (Widget↔account binding + duplicate widgets) + FRA-141 (Persist dashboard layout, widget config & shortcuts in Supabase)
**Date:** 2026-06-11
**Status:** Approved

## Why

Two coupled problems, specced together because FRA-141's persisted shape is defined by FRA-139's instance model:

1. **FRA-139** — the dashboard layout is a flat `SlotId[]`. You can't have two of the same widget (e.g. two Linear widgets on different projects), and per-widget preferences are global per widget *type*, not per *instance*.
2. **FRA-141** — all dashboard state lives in `localStorage`, so it's machine-bound. Open MyDock on another device and your layout, widgets, and shortcuts are gone.

The fix: introduce a **widget instance** model (FRA-139) and persist it **per user in Supabase** (FRA-141), with localStorage demoted to a fast cache / optimistic layer.

## Scope

**In scope**
- Widget instance data model (`{ instanceId, slotId, accountId, config }`).
- Add-widget flow with account dropdown + "Add & choose another" (duplicate instances).
- Per-instance config (absorbs today's `mydock:widget-pref:*`).
- `dashboard_state` Supabase table (per-user, RLS) holding layout + shortcuts as jsonb.
- `GET`/`PUT` route handler, client data layer, soft-migration from localStorage.

**Out of scope (separate tickets)**
- **FRA-138** — full multi-account connect flow / Settings OAuth. Here, the account dropdown lists only the single login account; `accountId` is schema-ready but always the default.
- **FRA-137** — iOS-style reusable widget components (visual layer).
- **FRA-140** — multiple dashboard pages / carousel.

## Decisions

| Topic | Decision |
|---|---|
| Layout shape | `WidgetInstance[]`, replacing `SlotId[]` |
| Account reference | `accountId: string \| null`; `null` = default (login) account. FRA-138-ready, no rework when real accounts land. |
| Account picker UI | Built as in the confirmed mock, but lists only the single login account until FRA-138. |
| Per-widget prefs | Folded into each instance's `config` (no more global `mydock:widget-pref:*`). |
| Storage shape | One `dashboard_state` row per user (PK `user_id`), jsonb `layout` + `shortcuts` + `version`. |
| Blob validation | Zod in the route handler, not DB constraints (shapes evolve with FRA-138/140). |
| localStorage role | Cache / optimistic layer + offline-in-session fallback; Supabase is source of truth. |
| Conflict resolution | Last-write-wins (single-user; matches current behavior). |

## Data model

```ts
type WidgetInstance = {
  instanceId: string;              // crypto.randomUUID()
  slotId: SlotId;                  // existing catalog slot; widget-catalog.ts stays the slot registry
  accountId: string | null;        // null = default (login) account
  config: Record<string, string>;  // per-instance prefs, e.g. { "gmail-view": "unread" }
};
```

- `slotId` references a catalog entry — instances do not duplicate catalog metadata.
- `config` absorbs `gmail-view`, `tasks-view`, `linear-project`. This is what enables "two Linear widgets, different projects."
- Duplicate = two instances, same `slotId`, distinct `instanceId`.

`Shortcut` is unchanged:

```ts
type Shortcut = { id: string; name: string; url: string; iconUrl?: string };
```

## Supabase schema

New migration `supabase/migrations/<ts>_dashboard_state.sql`, following the `integrations` convention:

```sql
create table if not exists public.dashboard_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version int not null default 1,
  layout jsonb not null default '[]'::jsonb,      -- WidgetInstance[]
  shortcuts jsonb not null default '[]'::jsonb,   -- Shortcut[]
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.dashboard_state enable row level security;

create policy "dashboard_state_select_own" on public.dashboard_state
  for select using (auth.uid() = user_id);
create policy "dashboard_state_insert_own" on public.dashboard_state
  for insert with check (auth.uid() = user_id);
create policy "dashboard_state_update_own" on public.dashboard_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dashboard_state_delete_own" on public.dashboard_state
  for delete using (auth.uid() = user_id);

create or replace trigger dashboard_state_set_updated_at
  before update on public.dashboard_state
  for each row execute procedure public.set_updated_at();
```

After applying: `pnpm supabase:reset` (local) → `pnpm supabase:types` (regenerate `src/types/supabase.ts`).

## Persistence flow & client layer

**Route handler** `app/api/dashboard-state/route.ts` (matches `app/api/integrations/status` convention):
- `GET` → user's `dashboard_state` row, or `null` if none.
- `PUT` → Zod-validate `{ layout, shortcuts }`, upsert for `auth.getUser().id`. `401` no user, `503` Supabase unconfigured.

**Client data layer** — a `useDashboardState` hook (TanStack Query, consistent with widget queries):

1. **Load** — on mount, fetch the server row.
2. **Soft-migration** — if server returns `null`: read existing localStorage (`mydock:dashboard:v2` SlotId[], `mydock:widget-pref:*`, `mydock:shortcuts:v1`), convert each SlotId → one `WidgetInstance` on the default account (folding its widget-pref into `config`), `PUT` it up, use as initial state.
3. **Write-through** — every mutation updates local state immediately (optimistic) and fires a debounced `PUT`. localStorage still written as fast cache + offline fallback (same `try/catch` the current hooks use).
4. **Offline** — `PUT` failure keeps state working in-session from cache; next successful change re-syncs. Last-write-wins.

Refactors:
- `useDashboardLayout` / `useShortcuts` read/write through `useDashboardState` instead of localStorage directly.
- `useWidgetPreference` replaced by reading/writing `instance.config[key]`.

## Components touched

| Component | Change |
|---|---|
| `widget-grid.tsx` | Queries become per-instance (keyed by `instanceId` + `config`) instead of per-SlotId. Gmail view / Linear project read from `instance.config`. |
| `widget-catalog-dialog.tsx` | Add **account dropdown** (single login account for now), **"Add & choose another"** (adds instance, keeps dialog open), **"Add widget"**. Calendar's 3 variants already render as cards with page dots — no change. |
| Widget card | Per-card **gear** to edit an instance's config (minimal version of FRA-139 "editable later"). |
| `shortcuts-row.tsx` | Behavior unchanged; now backed by server state. |

## Confirmed mocks

Confirmed during brainstorming (2026-06-10); the source images are local mockups
not checked into the repo. Described here so the spec stands alone:

- **Add-widget catalog** — grouped by app; Calendar variants shown as cards with page dots.
- **Widget detail** — account dropdown (Personal/Work) with Cancel / Add & choose another / Add widget.

## Testing

- **Migration / RLS** — apply locally; two users, confirm one cannot read the other's row.
- **Soft-migration** — seed old localStorage (`SlotId[]` + widget-prefs + shortcuts) → load → server row created with instances and config folded in correctly.
- **Round-trip** — add/remove/reorder/duplicate instances + edit config + add shortcut → reload AND fresh client ("other device") → identical state.
- **Offline** — simulate `PUT` failure → state still mutates in-session; recovers on next success.
- **Build gate** — `pnpm` typecheck + `next build --webpack` clean (known prod gate for `/dashboard`).

## Done when

A user's dashboard layout (as widget instances), per-instance config, and shortcuts persist in Supabase and load identically on any machine, with localStorage acting only as a fast cache; the add-widget flow supports duplicate instances and an account dropdown (single account for now).
