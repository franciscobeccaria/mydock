# FRA-143 — App shell cleanup: flat routes, drop /settings

## Context

[FRA-143](https://linear.app/francisco-beccaria/issue/FRA-143/app-shell-cleanup-flat-routes-sidebar-nav-drop-settings). The shell drifted: `/` is a redirect shim, the dashboard lives at `/dashboard`, and `/settings` is a wrapper that only ever held `/settings/integrations` (superseded by `/connections` in FRA-138). Flatten the routes now that multi-account has landed.

**Design:** not needed — this is route/structure cleanup and dead-code removal, no new UI. Sidebar nav already shipped in FRA-138.

## Goal

The dashboard renders at `/`; `/dashboard`, `/settings`, `/preview/connections`, and the dead `integrations/` components no longer exist; no dangling `/settings/integrations` or `/dashboard` links remain; auth gating still protects the app.

## Scope

- Move the dashboard to `/`: render the dashboard at the root route and **delete** `src/app/(app)/dashboard/`. Replace the `src/app/page.tsx` redirect shim with the dashboard page (it moves into the `(app)` group so it keeps the app layout/sidebar).
- Sidebar (`app-sidebar.tsx`): Dashboard link `/dashboard` → `/`; update the active-state checks (`onDashboard`, `href`).
- Remove `/settings`: delete `src/app/(app)/settings/`.
- Delete dead components only used by that page: `src/components/integrations/{google-workspace-card,integration-card,integration-status-badge}.tsx` (verified: sole consumer is the deleted page + each other → the whole `components/integrations/` dir goes).
- Fix dangling refs:
  - `app-header.tsx`: account-menu "Integrations" item routes to `/settings/integrations` → point to `/connections`; "Dashboard" item and `isDashboard` check → `/`.
  - `widget-not-connected-state.tsx`: default `actionHref` `/settings/integrations` → `/connections`.
  - `google/start` + `google/callback` route handlers: `notice=google-unavailable` fallback redirects `/settings/integrations` → `/connections`.
  - `google/start` + `auth/callback`: `next` default `/dashboard` → `/`.
- Delete `src/app/(app)/preview/connections/page.tsx` (throwaway).
- **Auth gate (gap not in ticket):** `src/proxy.ts` only matches `/dashboard/*` + `/settings/*`. With the dashboard at `/`, switch to a **protect-by-default negative matcher** excluding public paths (`login`, `api`, `auth`, `_next/static`, `_next/image`, favicon/metadata). Update the in-function `pathname` guard to match.

## Out of scope

- Login redesign (FRA-144). Connections screen / multi-account (FRA-138).

## Acceptance criteria

- [ ] Visiting `/` shows the dashboard; `/dashboard` returns 404.
- [ ] No `/settings` route; the accounts screen is at `/connections`.
- [ ] No dangling `/settings/integrations` links (app-header menu, widget not-connected CTA, OAuth notice fallbacks).
- [ ] `/preview/connections` and the `components/integrations/` dead components are gone.
- [ ] Sidebar Dashboard link points at `/` and shows active on `/`.
- [ ] Auth still works: unauthenticated `/` redirects to `/login`; authenticated `/` shows the dashboard.

## Test cases / test intent

- typecheck/build: no dangling imports after the deletions; build route list shows `/` (no `/dashboard`, `/settings`, `/preview`).
- agent-browser (logged out): `/` → redirected to `/login`. `/dashboard` → 404.
- agent-browser (authed): `/` renders the dashboard; sidebar Dashboard active; account menu "Integrations" → `/connections`.
- OAuth notice fallback resolves to `/connections` (inspect redirect target).

## Plan

1. `proxy.ts`: negative matcher + guard (do first — auth correctness). Check matcher syntax against `node_modules/next/dist/docs/.../proxy.md` (done — this Next renamed middleware→proxy).
2. Move dashboard → `/`: new `src/app/(app)/page.tsx` from the old dashboard page; delete `(app)/dashboard/` and the old root `src/app/page.tsx`.
3. Update links: `app-sidebar.tsx`, `app-header.tsx`, `widget-not-connected-state.tsx`, `google/start`, `google/callback`, `auth/callback`.
4. Delete `(app)/settings/`, `(app)/preview/`, and `components/integrations/`.
5. Verify.

## Verification

- `pnpm lint && pnpm typecheck && pnpm build`
- agent-browser logged-out + authed passes per Test cases. Manual-QA checkpoint before PR (UI-visible: home route + nav).

## Risks / open questions

- **Auth gate** is the one real risk — protect-by-default must exclude `/login` and `/auth/*` or it loops. Verify the logged-out redirect explicitly.
- The old root `page.tsx` shim's "not configured → /login" behavior is now covered by proxy (`!isSupabaseConfigured` redirect) — confirm the configured-but-no-user path still redirects to `/login`.
