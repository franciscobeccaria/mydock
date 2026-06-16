# [FRA-140] — Multi-page dashboard (iOS-style pages + page dots)

## Context

Linear: [FRA-140](https://linear.app/francisco-beccaria/issue/FRA-140) — "Carousel / multiple dashboard pages (iOS-style)". Backlog/Medium. Ships in the **same PR #8** (branch `feat/fra-149-widget-sizes-weather`), on top of FRA-149 (widget sizes + weather + free grid).

Resolved via `/grill` 2026-06-16 (engram #808). Framing decided by Francisco **before** the grill: plain numbered pages (Page 1, 2, 3…) with iOS page dots — **not** named workspaces. Does not wait for FRA-139 (widget instances already exist). No new design needed — navigation/layout over existing components.

This spec also folds in a **persistence cleanup** Francisco asked for in the same breath: the dashboard state is the source of truth in Supabase (`dashboard_state` table), but `use-dashboard-state.tsx` *also* mirrors layout+shortcuts to `localStorage` as a read cache. Francisco wants localStorage gone — Supabase only. Audit (this session): localStorage is used **only** in `use-dashboard-state.tsx`; no `sessionStorage`/IndexedDB; the only cookies are Supabase auth + sidebar open/closed; widget prefs live in each instance's `config` (inside `layout` → Supabase). So this cleanup is self-contained to one hook + the grid's loading gate.

**Design:** not needed (navigation/layout over existing components; page dots are a small new primitive).

## Goal

The dashboard supports multiple swipeable pages of widgets with iOS-style page dots. Each page has its own free-coordinate grid; the dock (shortcuts) is shared across pages. Dashboard state persists **only** in Supabase — the localStorage cache is removed and the grid shows a skeleton until the server row loads.

## Scope

- **Schema → pages.** `dashboard_state` payload becomes `{ pages: [{ id, layout: WidgetInstance[] }], shortcuts: Shortcut[], version }`. Add a `pages jsonb` column; the existing flat `layout` is wrapped into `pages: [{ id, layout: <existing> }]` (page 1) by a SQL migration + a client-side soft-migration (a row read in the old `{layout, shortcuts}` shape is normalized to one page).
- **Shortcuts shared.** The dock stays at the root of the payload, identical on every page (iOS Dock). Not per-page.
- **Navigation (all four):** click a page dot; keyboard ←/→ (ignored when focus is in an input/textarea/contenteditable); trackpad horizontal swipe / shift+scroll; on-screen ‹ › arrows at the sides of the dashboard area.
- **Page management — edit mode only.** A `+` dot at the end of the dots creates a page; a delete affordance removes a page in edit mode. Page 1 always exists (can never drop to zero pages).
- **Per-page grid.** The existing free-coordinate grid (drag, reflow, collision, size picker, add/remove widget) operates on the **current page's** layout. `addWidget`/`removeWidget`/`placeWidgetAt`/`updateConfig` target the active page.
- **Persistence cleanup.** Remove the localStorage read cache (`writeCache`/`readCache`, keys `mydock:dashboard:v2:<userId>` and `mydock:shortcuts:v1:<userId>`). Supabase is the sole source. The grid gates render on `isLoading` and shows a **grid skeleton** until the server row resolves (no default-layout flash).
- Desktop-only (v1), consistent with FRA-149.

## Out of scope

- Named workspaces (Work/Personal) — pages are numbered only.
- Dragging a widget between pages (edge-flip). Drag stays within the current page; the FRA-149 collision/reflow logic is untouched.
- Per-page default account (FRA-138/FRA-139 synergy).
- Mobile / touch swipe on phones.
- Hard page limit (none in v1).

## Acceptance criteria

- [ ] With one page, the dashboard looks/behaves exactly as today (single page, dots may hide or show one dot).
- [ ] In edit mode, the `+` dot creates a new empty page and navigates to it.
- [ ] Clicking a page dot navigates to that page; the active dot is highlighted.
- [ ] ←/→ change pages when focus is not in a text input; they do nothing while typing in a field.
- [ ] Horizontal trackpad swipe / shift+scroll changes pages.
- [ ] On-screen ‹ › arrows change pages and are disabled/hidden at the first/last page edge.
- [ ] Each page keeps its own widget layout (x,y); adding/removing/moving a widget affects only the current page.
- [ ] The dock (shortcuts) is identical on every page.
- [ ] A page can be deleted in edit mode; page 1 cannot be deleted to zero pages.
- [ ] State persists in Supabase across reload and across devices; an existing single-page row is migrated to `pages` with no data loss.
- [ ] No `localStorage` reads/writes remain for dashboard state; on load the grid shows a skeleton until Supabase responds, with no flash of the default layout.

## Test cases / test intent

- **typecheck/build:** `pnpm lint && pnpm typecheck && pnpm build` — schema + hook signature changes ripple through `use-dashboard-state`, `use-dashboard-layout`, `widget-grid`, the API route.
- **Supabase migration:** apply the `pages` column migration; verify an existing `dashboard_state` row with a non-empty `layout` reads back as one page via GET; verify PUT round-trips `pages`.
- **agent-browser (authed, real app):** create a 2nd page via `+`, add a widget to it, reload → widget persists on page 2 and page 1 is unchanged. Navigate with dots, arrows, keyboard. Confirm the dock is identical across pages. (Caveat from engram `mydock-agent-browser-auth-recipe`: dnd-kit / base-ui synthetic interactions aren't fully drivable — page nav via dots/arrows/keyboard is; drag-between-pages is out of scope anyway.)
- **localStorage check:** `agent-browser eval` `Object.keys(localStorage)` after edits → no `mydock:dashboard:*` / `mydock:shortcuts:*` keys.
- **manual visual:** Francisco's QA checkpoint — page transition feel, dots, skeleton-on-load.

## Plan

1. **Schema & migration.** Update `widget-instance.ts`: add `pageSchema = { id, layout: WidgetInstance[] }`, change `dashboardStateSchema` to `{ pages: [pageSchema], shortcuts, version? }`. Keep a `legacyDashboardStateSchema` (`{ layout, shortcuts }`) and a `normalizeToPages()` that wraps a legacy/empty payload into one page. SQL migration: `alter table dashboard_state add column pages jsonb not null default '[]'`; backfill `pages = jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'layout', layout))` where layout is non-empty. Leave `layout` column in place (read-compat) but stop writing it.
2. **API route.** `route.ts` GET selects `pages, shortcuts, version` (fallback: if `pages` empty but `layout` present, wrap). PUT validates the new schema and upserts `pages`.
3. **State hook.** `use-dashboard-state.tsx`: state shape → `{ pages, shortcuts }`; add `activePageId` + `setActivePage`, `addPage`, `removePage`. **Remove** `writeCache`/`readCache`/`LAYOUT_KEY`/`SHORTCUTS_KEY`; initial state is empty (`{ pages: [defaultPage()], shortcuts: [] }`), real state arrives from the server. Keep the once-only server reconcile + debounced PUT. Expose `isLoading`.
4. **Layout hook.** `use-dashboard-layout.ts`: operate on the active page's `layout` (read active page, mutate its layout, write the whole `pages` array back through `setLayout`-equivalent). Signatures unchanged for callers.
5. **Page dots primitive.** New `src/components/dashboard/page-dots.tsx`: dots row, active highlight, click-to-nav, `+` dot in edit mode, per-dot delete affordance in edit mode.
6. **Carousel/page container.** Wrap the grid (both `!isEditing` and edit branches in `widget-grid.tsx`) so it renders the **active page's** layout; add the page-change handlers (dots, keyboard, wheel/swipe, ‹ ›). Skeleton when `isLoading`.
7. **Verify** + manual QA checkpoint.

**Risk points:** the once-only reconcile guard (`reconciledRef`) assumes cache-then-server; with no cache, ensure the first paint is the skeleton, not the default page, to avoid a flash. The drag context lives inside the grid — keep it scoped to the active page so dnd-kit never sees other pages' items.

## Verification

- `pnpm lint && pnpm typecheck && pnpm build`
- Supabase migration applied + GET/PUT round-trip checked (MCP `execute_sql` or local).
- agent-browser authed session: multi-page create/add/reload/navigate + dock-shared + no-localStorage-keys, screenshots for the ACs.
- Manual QA checkpoint before releasing the PR.

## Risks / open questions

- Migration column strategy (`add pages` vs reuse `layout`) — chosen: add `pages`, keep `layout` read-only for one release. Revisit dropping `layout` later.
- Page transition animation — RESOLVED in QA: view mode slides via a translateX track (all pages mounted side-by-side, `translateX(-activeIndex*100%)`, 300ms ease-out). Edit mode keeps an instant swap (only the active page is mounted — it owns the dnd surface; you reorganize widgets there, not swipe). No cross-page drag.
