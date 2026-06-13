# [FRA-142] — Notion integration (notes widgets)

## Context

Linear: https://linear.app/francisco-beccaria/issue/FRA-142/notion-integration-notes-widgets

Notes/journal is a real daily use case, but the project principle is *don't rebuild
what already exists*. Francisco keeps notes in Notion, so MyDock **integrates Notion**
rather than shipping a native journal / sticky-notes feature (both explicitly rejected).
Notion becomes another provider/app with widgets on the dashboard, exactly like
Gmail / Calendar / Tasks / Linear.

**Design:** not needed (backend/logic + reuse of existing widget shells). The widgets
reuse the normalized `WidgetItem[]` list rendering (Recent pages) and a small new
content-block render for the Page widget. No new Figma; follows existing widget styling.

## Goal

You can connect one or more Notion workspaces from `/connections` (paste a Notion token,
same flow as Linear), then add two Notion widgets to the dashboard:
**Recent pages** (recently-edited pages, quick-open + "Open in Notion") and
**Page** (a pinned page rendering its title + top-level content inline, "Open in Notion").

## Scope

- New provider `notion` across the integration stack: `providers` union, `Provider`
  type, `providerMeta`, `CONNECT_PATH`, widget catalog (`AppId`, `SlotId`, two entries),
  `widget-render` switch + titles + query keys + staleTime.
- **Auth = pasted secret, Linear pattern.** Use a Notion **Personal Access Token (PAT)**
  (sees everything the user can access; an internal-integration token only sees
  explicitly-shared pages — worse UX). Flow mirrors `linear/personal-key.ts`:
  `validateNotionToken` (calls `GET /v1/users/me`) → `storeNotionConnection`
  (encrypt → `integration_accounts` + `integrations` rows). Header
  `Authorization: Bearer <token>` + required `Notion-Version`.
- **Multi-workspace now** (aligned with FRA-138/139): expose "Connect another Notion
  workspace" on `/connections`; `listConnections` + `ConnectionsList` learn `notion`.
- DB migration: extend `integration_accounts` and `integrations` provider CHECK
  constraints to include `'notion'`. No new tables (schema already multi-account).
- **Recent pages widget** — `POST /v1/search` (default sort `last_edited_time` desc,
  `filter` object=page) → `WidgetItem[]` (title, icon, last-edited as `occurredAt`,
  `url`). Renders with the existing list widget shell; row click + footer open in Notion.
- **Page widget** — per-instance config (a pinned `page_id`, stored on the widget
  instance like `gmail-view`/`linear-project`). `GET /v1/pages/{id}` for title/icon/url +
  `GET /v1/blocks/{id}/children` for content. Render **top-level blocks, common types**
  (paragraph, h1–h3, to-do, bulleted/numbered list item, quote, callout) as compact text;
  footer "Open in Notion". A small picker (reusing the widget header-control pattern)
  lets you set which page.
- New files under `src/features/integrations/providers/notion/`:
  `types.ts`, `client.ts` (token resolve + `notionFetch`), `personal-key.ts`
  (validate + store), `recent-pages.adapter.ts`, `page.adapter.ts`.
- New widget components: `notion-recent-pages-widget.tsx`, `notion-page-widget.tsx`.
- New connect route `POST /api/connections/notion` + `NotionConnectDialog`.
- Wire both adapters into `registry.ts` (`getWidgetPayload` / `getWidgetsResponse`).

## Out of scope

- **Favorites widget** — Notion's public API exposes no sidebar-favorites/starred concept
  (iOS Favorites is internal-only). Dropped for v1; revisit if Notion adds an endpoint or
  we later add in-app pinning.
- Full Notion OAuth app (start/callback/redirect) — pasted token is sufficient for personal use.
- Deep/faithful block rendering (nested children, tables, columns, toggles, embeds).
- Writing to Notion, databases-as-tables, or page property views.
- Per-instance Notion account binding UI beyond what FRA-139 already covers.

## Acceptance criteria

- [ ] From `/connections`, "Connect a Notion workspace" opens a dialog; pasting a valid
      Notion PAT validates it, stores it encrypted, and the workspace appears as a
      connection row. A second workspace can be added.
- [ ] An invalid token shows the bad-key error (no row created); a server failure shows
      the server error. The token is never returned to the client or shown again.
- [ ] The widget catalog shows a "Notion" app group with **Recent pages** and **Page**.
- [ ] Recent pages widget, when connected, lists real recently-edited Notion pages
      (most-recent first) with title/icon; clicking a row and the footer both open the page
      in Notion. Disconnected → `not_connected` state with a connect affordance.
- [ ] Page widget lets you pick a page; once set it renders that page's title + top-level
      content (paragraphs, headings, to-dos, lists, quote, callout) and an "Open in Notion"
      footer. Unset → an empty/pick state.
- [ ] All five widget states render correctly for both widgets
      (`loading`/`empty`/`error`/`not_connected`/`connected`), matching the existing shells.

## Test cases / test intent

- **typecheck/build**: `Provider` union extension compiles across `providerMeta`,
  `CONNECT_PATH`, catalog `Record<AppId,...>`/`Record<SlotId,...>`, `widget-render` maps —
  these are exhaustive records, so a missing `notion` key fails the build (good guard).
- **Supabase**: apply the CHECK-constraint migration locally; insert a `notion`
  `integration_accounts` row succeeds, a bogus provider still fails.
- **agent-browser (real app)**: connect a real Notion PAT from `/connections`; add both
  Notion widgets; confirm Recent pages shows real pages and Page renders real content;
  confirm "Open in Notion" links resolve. (Auth recipe per `docs/harness.md`.)
- Adapter mapping unit-checks: a `/search` result with missing icon/title/url maps to a
  safe `WidgetItem`; an unsupported block type is skipped, not crashed.

## Plan

1. **Migration** — `supabase/migrations/<ts>_notion_provider.sql`: extend both provider
   CHECK constraints to include `'notion'`. Apply + verify via Supabase MCP.
2. **Types/registry plumbing** — add `notion` to `providers`/`Provider`, `providerMeta`
   (label/description/`requiredScopes: []`/`connectPath`), `CONNECT_PATH.notion =
   "/connections"`. Decide whether Notion (like Linear) is exempt from the
   `needsConsent`/scope machinery — yes, token-based, no OAuth scopes → treat like Linear
   in `buildScopeStatus`/`getDerivedWidgetState`/`shouldSkipProviderLoad`.
3. **Notion provider module** — `types.ts` (scopes=[], block-type allowlist),
   `client.ts` (`resolveNotionToken` + `notionFetch` with `Notion-Version` header, mirrors
   `linear/client.ts`), `personal-key.ts` (`validateNotionToken` via `/v1/users/me`,
   `storeNotionConnection` mirroring `storeLinearConnection`).
4. **Adapters** — `recent-pages.adapter.ts` (`POST /v1/search` → `WidgetItem[]`),
   `page.adapter.ts` (`GET /v1/pages/{id}` + `GET /v1/blocks/{id}/children` → title +
   rendered top-level blocks). Wire both into `registry.ts`.
5. **Connect flow** — `POST /api/connections/notion` route + `NotionConnectDialog`
   (clone `LinearConnectDialog`, Notion-specific instructions/link), and extend
   `listConnections` + `ConnectionRecord.provider` + `ConnectionsList` for `notion`.
6. **Catalog + render** — add `AppId "notion"`, `SlotId "notion_recent" | "notion_page"`,
   two `WIDGET_CATALOG` entries, `APP_LABELS`, `WIDGET_TITLE`, `CONFIG_KEY.notion_page =
   "notion-page-id"`, `widgetQueryKey`/`widgetStaleTime`, `renderWidget` cases.
7. **Widget components** — `notion-recent-pages-widget.tsx` (list shell like Linear),
   `notion-page-widget.tsx` (content render + page picker header control).
8. **Verify** — `pnpm lint && pnpm typecheck && pnpm build`; agent-browser evidence;
   **manual QA checkpoint** (UI-visible) before PR.

Risk points: the `Provider`/`SlotId`/`AppId` records are exhaustive (`satisfies Record<...>`),
so every map must gain `notion` keys or the build breaks — use that as a checklist.
The Page widget's per-instance `page_id` config reuses the existing instance-config
plumbing (`CONFIG_KEY`, `configValue`/`onConfigChange`, `accountId` threading); the picker
is the only genuinely new UI.

## Verification

- `pnpm lint && pnpm typecheck && pnpm build`
- agent-browser: connect Notion PAT → add both widgets → screenshot Recent pages with real
  pages and Page with real inline content → click through "Open in Notion".
- Manual QA checkpoint (UI-visible): dev server + authed agent-browser session prepared,
  checklist handed to Francisco; his go releases the PR.

## Risks / open questions

- **Token type, resolved during build**: a true Notion *Personal Access Token* is only
  minted through the OAuth-style flow, so for a pasted-token model the working equivalent
  is an **internal integration token** — which only sees pages explicitly connected to the
  integration. The connect dialog reflects this (step 2 = share pages with the integration).
  Recent pages therefore shows only shared pages; this is the honest limit of pasted-token
  auth without full OAuth. Both token forms (`ntn_…`, `secret_…`) are accepted.
- **Notion API version header** — pinned to `2022-06-28` (`NOTION_VERSION`); bump
  deliberately after checking the changelog.
- **Page picker UX** — simplest v1 is paste-a-page-URL/ID; a search-driven picker (reuse
  `/v1/search`) is nicer but more work. Default to paste; flag if a picker is wanted.
- **Block coverage** — "common types" is a judgment call; unsupported blocks are skipped
  silently. Confirm the chosen allowlist covers Francisco's journal blocks during QA.
- **Rate limits** — Notion is ~3 req/s; Page widget makes 2 calls (page + children). Fine
  for dashboard cadence with the existing staleTime caching.

## Research findings

Confirmed via Context7 (`/llmstxt/developers_notion_llms_txt`):
- `POST /v1/search`: `query`, `filter` (object = page|database), `sort` by
  `last_edited_time` (default desc) — backs Recent pages directly.
- `GET /v1/pages/{id}`: returns properties/title/icon/url, **not** content.
- `GET /v1/blocks/{id}/children`: returns block objects (`rich_text`, type) — the actual
  content for the Page widget.
- **No favorites endpoint** — the public API has no sidebar-favorites concept → Favorites
  widget dropped.
- **Token scope**: a Personal Access Token sees everything the user can access; an internal
  integration token only sees explicitly-connected pages → choose PAT.
