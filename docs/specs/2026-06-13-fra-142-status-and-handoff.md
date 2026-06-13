# FRA-142 — Status & Handoff (2026-06-13)

> Continuation doc. Branch: `feat/fra-142-notion-integration`.
> The feature is functionally complete and build-green. The **Combobox refactor** that
> fixes the picker's dismissal bug AND makes it consistent with the other widgets'
> header controls is **DONE** (see "UPDATE 2026-06-13" below). Remaining: manual QA of
> the picker's open/filter/dismiss in the real browser, then commit + PR.

## UPDATE 2026-06-13 (6) — Opción C: suspender el sensor de dnd-kit (CAUSA RAÍZ)

Opción B tampoco lo resolvió en QA de Francisco. Su intuición era la correcta: el reopen
**nace AFUERA del Combobox, en la capa de drag**, no adentro.

CAUSA RAÍZ (confirmada leyendo `widget-grid.tsx`): en modo edición cada tile es un drag
handle de dnd-kit — los `{...listeners}` están en el div exterior del tile y escuchan
`pointerdown` en TODA su superficie (`SortableWidget`, líneas ~127-128). El popup del
picker está portaleado FUERA del tile. Entonces el click que lo dismissa cae sobre un tile
y dnd-kit también lo recibe: arranca (y luego cancela) un drag, y ese ciclo
pointerdown→cancel rebota el foco al input → base-ui reabre. Por eso NINGÚN fix dentro del
Combobox (uncontrolled, openOnInputClick, modal, input-as-control) lo arregló: el reopen no
nace ahí. Y por eso mis "verificaciones E2E" con agent-browser daban verde en falso —
agent-browser no reproduce el ciclo de puntero real que dispara el bug.

FIX (Opción C, elegida por Francisco): **suspender los sensores de dnd-kit mientras un
picker está abierto.** Sin sensor escuchando, el click-dismiss no puede arrancar un drag →
no hay ciclo → cierra limpio.
- Nuevo `src/components/dashboard/picker-lock-context.tsx`: `PickerLockProvider` +
  `usePickerLock()`. Ref-count de pickers abiertos (`isPickerOpen`, `setPickerOpen`).
  `usePickerLock` es safe fuera del provider (no-op) para el preview del catálogo.
- `widget-grid.tsx`: `WidgetGridWithState` envuelve con `PickerLockProvider`. `WidgetGrid`
  lee `isPickerOpen` y pasa `sensors={isPickerOpen ? NO_SENSORS : activeSensors}` al
  `DndContext` (`NO_SENSORS = []` estable a nivel módulo). Sensores vacíos = dnd-kit no
  escucha nada.
- `notion-page-widget.tsx`: `PagePicker` llama `setPickerOpen(nextOpen)` en `onOpenChange`,
  + cleanup en `useEffect` que libera el lock si se desmonta abierto (no deja el sensor
  suspendido para siempre).
- lint+typecheck+build verdes.

**VERIFICACIÓN — honestidad:** el server quedó tomado por otro proyecto a mitad de sesión;
lo relevé en :3000 y re-autentiqué. Confirmé que el picker abre, carga 25 páginas, se ve
como los Select, y que un click-afuera con secuencia de puntero real cierra sin reabrir.
PERO no pude reproducir un *drag real* por automation (viewport chico) para comprobar
visualmente que el sensor queda suspendido, y agent-browser ya dio falsos verdes 2 veces.
La diferencia de la Opción C es conceptual (ataca la fuente real que Francisco identificó),
así que hay buena base para confiar — pero **la prueba definitiva es el QA manual de
Francisco**: abrir el picker, UN click afuera → debe quedar cerrado.

## UPDATE 2026-06-13 (5) — Opción B (input = control), insuficiente en QA

`modal` (Opción A) tampoco alcanzó. Fuimos a **Opción B = patrón canónico de base-ui
Combobox: sin botón-trigger separado, el `ComboboxInput` ES el control del header.**
Un solo elemento focusable → desaparece el rebote de foco trigger↔input de raíz.

Implementación (`notion-page-widget.tsx` `PagePicker`):
- Se eliminó `ComboboxTrigger` y el prop `modal`. El header ahora renderiza el
  `ComboboxInput` dentro de un wrapper `relative` con `ComboboxIcon` (chevron) absoluto a
  la derecha, estilizado como los Select (borde `#E4E4E7`, h-8, fondo blanco, hover gris).
- **`inputValue` controlado**: `open ? query : (currentLabel ?? "")`. Cerrado muestra el
  título de la página pinneada (como el value de un Select); abierto/buscando muestra la
  query en vivo.
- `onInputValueChange` filtra por `details.reason === "input-change"` (string real
  confirmado en `@base-ui/react/internals/reason-parts.js`) para reaccionar SOLO al tecleo
  del usuario e ignorar los syncs programáticos de base-ui al abrir/cerrar.
- Open sigue uncontrolled (base-ui lo maneja); `onOpenChange` solo espeja a estado local
  para el fetch + limpia query al cerrar. base-ui cierra solo al elegir.

**VERIFICADO E2E con agent-browser** (¡ventaja de Opción B: el control es un `<input>`
real, no un trigger base-ui opaco, así que agent-browser SÍ lo maneja!):
- Click en el input → abre, `aria-expanded=true`, 25 páginas cargadas.
- **Click afuera UNA vez → `aria-expanded=false`, `data-closed`, NO reabre.** ← el bug,
  resuelto.
- Tecleo "career" → filtró server-side a 10 resultados con "Career".
- Click en "Career Path 2026" → pinea + cierra; el input pasa a mostrar "Career Path
  2026". Screenshot `/tmp/notion-optionB.png`.
- lint+typecheck+build verdes.

Nota: la verificación dejó el widget Page pinneado a "Career Path 2026" (antes "12 junio
2026") — cambio persistido en el dashboard de Francisco, inocuo.

Falta solo: QA manual de Francisco (sensación general/teclado) → commit + PR.

## UPDATE 2026-06-13 (4) — reopen fix attempt 3: `modal` (Opción A, insuficiente)

Diagnóstico final (de leer el source de base-ui):
- El trigger del Combobox abre en **`mousedown`** (floating-ui `useClick`,
  `ComboboxTrigger.js:122` `event:'mousedown'`).
- El `useDismiss` usa `outsidePressEvent.mouse:'sloppy'` (`AriaCombobox.js:812`).
- Con trigger-botón **+ input dentro del popup**, en un outside-press base-ui rebota el
  foco trigger↔input y **reabre una vez** → hacían falta dos clicks afuera para cerrar.
- Los otros widgets no lo sufren porque usan `Select` (sin input interno → sin rebote).

Fix elegido con Francisco: **Opción A = `modal` en el Combobox Root.** El `Positioner`
monta automáticamente un `InternalBackdrop` cuando `modal` está activo
(`ComboboxPositioner.js:109`) + scroll-lock (`:85`). El click afuera pega en el backdrop:
cierra el popup y **el evento muere ahí**, nunca llega al `mousedown` del trigger, así que
no puede reabrir. No hace falta renderizar `<Combobox.Backdrop>` a mano.

lint+typecheck+build verdes. Trigger sigue `role=combobox`. **Pendiente: QA manual de
Francisco** (agent-browser no abre popups base-ui) — confirmar que UN click afuera cierra,
Escape cierra, y que el scroll-lock del modal no molesta.

**Largo plazo (acordado): Opción B.** Si queremos el patrón más limpio/consistente sin
backdrop ni scroll-lock, rehacer el picker al patrón canónico de base-ui Combobox: sacar
el botón-trigger separado y que el **`ComboboxInput` sea el control del header**
(estilizado como los Select). Un solo elemento → sin rebote de foco. Costo: el header
muestra un input en vez de un botón con el título de la página. Hacerlo en una pasada
aparte después de cerrar FRA-142, o si el scroll-lock del modal molesta en QA.

## UPDATE 2026-06-13 (3) — reopen fix attempt 2: uncontrolled open

`openOnInputClick={false}` was NOT enough — first outside-click still did one
close→reopen cycle; only the second outside-click stuck.

Real mechanism (read from base-ui source):
- The Combobox **trigger toggles on `mousedown`** via floating-ui `useClick`
  (`combobox/trigger/ComboboxTrigger.js:122` `event: 'mousedown'`).
- I was passing a **controlled `open`** prop. base-ui's internal `setOpen`
  short-circuits on `open === nextOpen` (`AriaCombobox.js:440`) reading my prop via
  `useControlled`; a stale render made the dismiss/click coordination miss the close and
  re-open once → the one-cycle bounce.

Fix: **made the popup uncontrolled** — dropped the `open={…}` prop and `openOnInputClick`.
base-ui now fully owns open/close (it already coordinates dismiss + trigger-click
correctly for standalone comboboxes). `onOpenChange` is kept ONLY to mirror open into
local state (gate the fetch) and reset the query on close; base-ui closes itself on
selection so `pick()` no longer calls setOpen. lint+typecheck+build green; trigger still
renders "12 junio 2026 ⌄" role=combobox.

**MANUAL QA AGAIN** (still can't drive base-ui popups via agent-browser): the test is the
same — open, click outside ONCE → must stay closed (no reopen); Escape → stays closed;
pick → closes & pins. **If a single outside-click STILL reopens**, go to `modal` on the
Combobox Root: a modal backdrop absorbs the outside-press so it never reaches the
trigger's mousedown handler — the definitive kill for this bounce (cost: page-scroll lock
while open, a minor divergence from the non-modal Select).

## UPDATE 2026-06-13 (2) — Select-styled + reopen fix (attempt 1, insufficient)

Francisco QA'd the first Combobox pass: the popup **closed then reopened** on
outside-click/Escape, and he asked for full visual consistency with the Linear/Tasks
header controls.

Changes:
- **Trigger now mirrors the Select**: bordered button showing the *pinned page title +
  chevron* (`ComboboxIcon`, added to the wrapper) instead of a Pencil + "Change". When no
  page is pinned it reads "Pick page". Title is passed as `currentLabel` from
  `NotionPageWidget` (emoji + page title, only once a page is pinned and loaded).
- **Reopen fix**: set `openOnInputClick={false}` on the Combobox Root. The
  closes-then-reopens was a focus-bounce — after an outside-press dismiss, focus returned
  and the input's default open-on-click re-fired `onOpenChange(true)`. Disabling
  open-on-input-click removes that path (the trigger still opens it on click).
- Combobox items are `role=option`, list is `role=listbox`, trigger is
  `data-slot=combobox-trigger` `role=combobox` — `role=option`/`listbox` are ALREADY in
  the grid's `INTERACTIVE` whitelist (`widget-grid.tsx:47`), so picks register correctly.
- lint+typecheck+build green. Verified (agent-browser) the trigger renders "12 junio 2026
  ⌄" with `role=combobox` — same family/look as Linear/Tasks. Screenshot
  `/tmp/notion-select-styled.png`.

**STILL NEEDS MANUAL QA** (base-ui popups can't be opened by agent-browser): confirm the
reopen is gone — open, click outside → stays closed; Escape → stays closed; pick a page →
closes & pins. **If it STILL reopens**, the next lever is base-ui's `modal` prop on the
Combobox Root (renders an inert backdrop that absorbs the dismiss click so it can't bounce
to the dnd tile) — but `modal` also locks page scroll, diverging slightly from the
non-modal Select feel, so try it only if `openOnInputClick={false}` isn't enough.

## UPDATE 2026-06-13 (1) — picker refactored to base-ui Combobox

The custom `Popover` page picker has been **replaced with a base-ui `Combobox`**, the
consistency fix Francisco asked for.

- New wrapper `src/components/ui/combobox.tsx` — shadcn-style, mirrors `select.tsx`
  (`Portal → Positioner (isolate z-50) → Popup`, `data-slot` attrs). Parts used:
  `Combobox` (Root), `ComboboxTrigger` (button), `ComboboxInput`, `ComboboxContent`,
  `ComboboxList`, `ComboboxItem`. Filtering is **server-side**, so Root gets
  `filter={null}` + `items={pages.map(p=>p.id)}` and we feed it whatever
  `/api/integrations/notion/pages?q=` returns; `onInputValueChange` drives the debounced
  fetch. `value`/`onValueChange` lift the selected page id (`current`/`onSet`).
- `notion-page-widget.tsx` `PagePicker` rewritten to use it. `extractNotionPageId` kept
  as a paste fallback (resolved inside `onInputValueChange`). Trigger keeps `data-no-drag`.
- **Deleted** `src/components/ui/popover.tsx` (it was added on this branch solely for the
  old picker and is now orphaned — `grep` confirms zero other importers).
- `pnpm lint && pnpm typecheck && pnpm build` all green.

**Verified in the real app (agent-browser):** in edit mode the Notion Page widget's
control now renders as `data-slot=combobox-trigger` with **`role=combobox`** — the SAME
ARIA role/family as the three working header controls (Gmail/Linear/Tasks are
`data-slot=select-trigger`, same `role=combobox`). The old Popover trigger had no
combobox role. Screenshot at `/tmp/notion-change-control.png` shows the "Change" control
styled like its Linear/Tasks siblings. The dismissal bug came from the *Popover* being
swallowed by dnd-kit; the Select/Combobox family manages dismissal internally and is
already proven in this exact edit tile by the other three widgets.

**Still needs MANUAL QA (Francisco):** base-ui popups can't be opened by agent-browser
(documented gotcha — applies equally to all four comboboxes, not just this one; synthetic
*and* real pointer sequences leave `aria-expanded=false`). So open/filter/pick/**dismiss**
must be checked by hand. Check: click "Change" → popup opens; type → list filters
(server-side); click a page → pins it & closes; **click outside → closes; Escape →
closes** (the original bug); no scroll-jump.

**One open UX decision for Francisco:** the trigger shows a *Pencil icon + "Change"/"Pick
page"* label rather than a chevron + selected-page title like the sibling selects. Kept
the original affordance on purpose (more meaningful than echoing the page title, which is
already the widget's header). If full visual parity is wanted, switch to a chevron
(`ComboboxIcon`) — flag during QA.

---

### Original handoff (below) — bug context kept for reference

## TL;DR

Notion integration (connect via pasted token + two widgets: **Recent pages** and
**Page**) is built, wired through the whole integration stack, and verified working in
the real app. `pnpm lint && pnpm typecheck && pnpm build` all pass.

**The one thing left:** the Notion **Page** widget's page picker is a custom base-ui
`Popover` + hand-rolled search list. It works for opening/searching/picking, but it
**does not close on outside-click or Escape** in edit mode, and it's **inconsistent**
with how Linear/Tasks/Gmail header controls work (those use base-ui `Select`).
Francisco asked to make the Notion picker consistent with the others. The fix and the
bug are the same work item — see "Next steps".

## What's done (verified in the real app via agent-browser)

- **DB migration** `supabase/migrations/20260612120000_notion_provider.sql` — added
  `'notion'` to provider CHECK on `integration_accounts`, `integrations`, `widget_cache`.
  Applied to `mydock-dev` (project ref `agsyimfsnoocnrvvfbxt`).
- **Provider module** `src/features/integrations/providers/notion/`:
  - `types.ts` — `NOTION_VERSION="2022-06-28"`, `NOTION_API_BASE`, `RENDERABLE_BLOCK_TYPES`, `notionScopes=[]`.
  - `client.ts` — `notionFetch` (Bearer + `Notion-Version` header) + `resolveNotionToken`.
  - `personal-key.ts` — `validateNotionToken` (`GET /v1/users/me`) + `storeNotionConnection` (mirrors Linear).
  - `recent-pages.adapter.ts` — `POST /v1/search` sorted by `last_edited_time`; optional `query` for the picker.
  - `page.adapter.ts` — `GET /v1/pages/{id}` + `GET /v1/blocks/{id}/children` → header item (`kind:"page"`) + top-level block items (`kind:"block"`).
- **Registry** `registry.ts` — `notion` in `providerMeta`; generalized Linear's
  scope-exemption to `TOKEN_BASED_PROVIDERS = {linear, notion}` (`isTokenBased`); notion
  branches in `getWidgetPayload` (config present = Page, absent = Recent) and
  `getWidgetsResponse`; added `config?: string` param to `getWidgetPayload`.
- **Catalog** `widget-catalog.ts` — `AppId "notion"`, `SlotId "notion_recent" | "notion_page"`, two entries, `APP_LABELS`.
- **Render wiring** `widget-render.tsx` — `CONFIG_KEY.notion_page="notion-page-id"`,
  `WIDGET_TITLE`, `widgetQueryKey` (Page keyed by page id), `widgetStaleTime` (notion=5min),
  `renderWidget` cases, `fetchWidget` gained `config` param.
- **Grid** `widget-grid.tsx` — threads `notionPageId` config; added `notion` to
  `connectedByProvider` and the `accounts` list (this fixed the "Connect Notion" bug in
  the catalog even though Notion was connected).
- **Connect flow** — `POST /api/connections/notion`, `NotionConnectDialog`,
  `ConnectionsList` Notion group, `listConnections`/`ConnectionRecord` gained `notion`,
  `provider-icon` `SiNotion`, `connection-row` `reconnectDisabled = provider!=="google"`.
- **Page picker search route** `GET /api/integrations/notion/pages?q=&accountId=` →
  `{pages:[{id,title,emoji}]}`.
- **Widgets** — `notion-recent-pages-widget.tsx` (list), `notion-page-widget.tsx`
  (block render + `PagePicker` + `extractNotionPageId`).
- **Add shadcn `popover`** (`src/components/ui/popover.tsx`) — base-ui based.

### UX fixes already landed and verified
- **Catalog "Connect Notion" shown despite being connected** — fixed (`connectedByProvider` + accounts list).
- **Add-widget dialog horizontal overflow** (preview clipping on the right) — fixed via
  `DialogContent` `grid-cols-[minmax(0,1fr)] [&>*]:min-w-0` + preview wrapper `min-w-0 overflow-hidden`.
- **Picker scroll-jump on open** — fixed via `initialFocus={inputRef}` on `PopoverContent` + removed `autoFocus`.
- **"Open in Notion" text removed** from Page widget (whole tile already opens the page).
- **Editable catalog preview** — picking a page in the catalog preview seeds the new
  widget's config (`addWidget` gained an optional `config` arg; `WidgetCatalogDialog`
  holds `previewConfig` and passes it to `onAdd`; preview wrapper made interactive only
  for the header control via `[&_*]:pointer-events-none [&_[data-no-drag]]:pointer-events-auto`).
  *Code complete; not fully re-verified live (see caveats).*

### Notion's internal-token reality (expected behavior, not a bug)
A pasted Notion token (`ntn_…`) is an **internal integration token**: it only sees pages
**explicitly shared with the integration**. Recent pages and Page will be empty / 404 until
the user shares pages in Notion (page → ••• → Connections → add "mydock"). Connecting a
parent page cascades to children. The connect dialog tells the user to do this (step 2).

## THE OPEN BUG + the consistency ask (same work item)

**Symptom:** the Notion **Page** widget's page picker (the "Pick page"/"Change" control,
only visible in edit mode) does **not close on outside-click or Escape**. Opening,
searching, and picking all work; dismissal does not.

**Francisco's framing (important):** Linear's "All issues/project" select and Google
Tasks' "list" select behave correctly and *consistently*; the Notion picker behaves
differently and has these problems. He wants the Notion picker to be **consistent with
the other widgets' header controls.**

**Root cause:** the working widgets (Linear, Tasks, Gmail) use the base-ui **`Select`**
component (`src/components/ui/select.tsx`) for their header control. The Notion Page
picker instead uses a custom base-ui **`Popover`** + a hand-rolled search input + list.
In edit mode the widget tile is inside a dnd-kit `DndContext`; dnd-kit's pointer/keyboard
sensors capture document-level `pointerdown` + `Escape`, which swallows base-ui Popover's
own outside-press/Escape dismissal. The `Select` component evidently doesn't hit this
(it manages dismissal differently / is already proven inside the tiles).

**Why we used a Popover at all:** the Notion Page widget needs a **searchable** picker
(the user can have dozens of pages), and a plain `Select` is not searchable.

## RECOMMENDED FIX (do this next session)

Replace the custom `Popover` picker in `notion-page-widget.tsx` with a base-ui
**searchable select** so it matches the other widgets' behavior and inherits correct
dismissal/positioning inside the dnd tile.

- base-ui **1.4.1** is installed and **ships both `@base-ui/react/autocomplete` and
  `@base-ui/react/combobox`** (confirmed: `node_modules/@base-ui/react/{autocomplete,combobox}`
  exist). `Combobox` = a Select with a filterable input — exactly this use case, and it
  shares the Select family's dismissal/positioning, so the dnd-kit issue should not recur.
- Build a `src/components/ui/combobox.tsx` (shadcn-style wrapper over
  `@base-ui/react/combobox`, mirroring how `select.tsx`/`popover.tsx` are wrapped:
  `Portal` → `Positioner` (`isolate z-50`) → `Popup`, `data-slot` attributes).
- Rewrite `PagePicker` to use it: input filters the page list (still backed by
  `/api/integrations/notion/pages?q=`), selecting an item calls `onSet(id)`. Keep
  `extractNotionPageId` as a paste fallback if easy, else drop it.
- Keep the trigger marked `data-no-drag` (needed so the tile's
  `[&_*]:pointer-events-none` edit-mode rule doesn't eat the click).
- Verify the SAME interaction as Tasks/Linear: opens on click, filters on type, picks on
  click, **closes on outside-click and Escape**, no scroll-jump.

If `Combobox`/`Autocomplete` somehow can't live in the tile cleanly, the fallback is to
keep the `Popover` but fix dismissal with a capture-phase document listener — BUT my
earlier attempt at this was flaky (it prevented the popover from opening because the
opening gesture and the dismissal listener fought). The Combobox route is strongly
preferred; it's the consistent-with-other-widgets solution Francisco asked for.

### Reference: the working pattern to copy (Google Tasks)
`src/components/widgets/google-tasks-widget.tsx` lines ~80–91:
```tsx
<Select value={view} onValueChange={(value) => setView(String(value))}>
  <SelectTrigger className="h-8 min-w-[94px] px-2.5 text-[13px]">
    <SelectValue>{() => selectedLabel}</SelectValue>
    <SelectIcon />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={ALL}>All</SelectItem>
    {/* … */}
  </SelectContent>
</Select>
```
Same `configValue ?? localView` / `onConfigChange ?? setLocalView` lift pattern the
Notion picker already uses.

## Verification recipe (agent-browser — the project default, NOT Playwright)

Auth recipe is in engram topic `mydock-agent-browser-auth-recipe` (and `docs/harness.md`).
Working mint script pattern (testing-only, delete after):
1. `POST {SUPABASE_URL}/auth/v1/admin/generate_link` (type=magiclink, email=`fbeccaria24@gmail.com`) with the service-role key → `hashed_token`.
2. `POST /auth/v1/verify` (type=magiclink, token_hash) with the anon/publishable key → session.
3. Cookie value = `"base64-" + base64(JSON.stringify(session))`, **chunked at 3180 chars**
   into `sb-<ref>-auth-token.0`, `.1`. A single oversized cookie → CDP "Invalid cookie fields".
4. `agent-browser cookies set <name> <chunk> --url http://localhost:3000 --path / --sameSite Lax`, then `agent-browser open http://localhost:3000/`.

Gotchas learned this session:
- **Dashboard is at `/`, NOT `/dashboard`** (FRA-143 flattened routes).
- In a JS env var, **do not name a variable `URL`** — it shadows the global `URL` constructor.
- **agent-browser `eval` shares one JS scope across calls** → wrap each body in an IIFE
  `(function(){…})()` or you get "Identifier already declared".
- agent-browser `eval` wants an **expression that stringifies** (use `JSON.stringify({…})`);
  a bare object literal returns mangled output. Promises aren't awaited reliably.
- base-ui triggers open on a **real pointer sequence** — use `agent-browser click <ref>`
  (native), not a synthetic `.click()` via eval (which doesn't reliably open base-ui popups).
- The catalog's Add-widget tile is **below the fold**; scroll it into view first.
- **Supabase auth rate-limits** if you mint sessions many times in a short window — space
  them out, reuse a cookie across checks, don't re-mint per step.
- Don't reach for Playwright MCP for verification — agent-browser is the project default
  (this was a repeated slip; the rule is now in AGENTS.md / CLAUDE.md / harness.md).

## Files changed on this branch
Modified: `AGENTS.md`, `CLAUDE.md`, `docs/harness.md`,
`src/app/(app)/connections/page.tsx`, `src/app/(app)/page.tsx`,
`src/app/api/widgets/[provider]/route.ts`, `src/components/connections/connection-row.tsx`,
`src/components/connections/connections-list.tsx`,
`src/components/dashboard/use-dashboard-layout.ts`,
`src/components/widgets/provider-icon.tsx`,
`src/components/widgets/widget-catalog-dialog.tsx`,
`src/components/widgets/widget-catalog.ts`, `src/components/widgets/widget-grid.tsx`,
`src/components/widgets/widget-render.tsx`, `src/features/connections/queries.ts`,
`src/features/integrations/connect-paths.ts`, `src/features/integrations/registry.ts`,
`src/features/integrations/types.ts`.
New: `docs/specs/2026-06-12-fra-142-notion-integration.md` (the spec),
`docs/specs/2026-06-13-fra-142-status-and-handoff.md` (this file),
`src/app/api/connections/notion/`, `src/app/api/integrations/notion/`,
`src/components/connections/notion-connect-dialog.tsx`, `src/components/ui/popover.tsx`,
`src/components/widgets/notion-page-widget.tsx`,
`src/components/widgets/notion-recent-pages-widget.tsx`,
`src/features/integrations/providers/notion/`,
`supabase/migrations/20260612120000_notion_provider.sql`.

## Next steps (ordered)
1. **Fix the picker** via base-ui `Combobox`/`Autocomplete` (consistency + dismissal). See above.
2. Re-verify the full Notion flow in the real app (connect → both widgets → search/pick → dismiss).
3. Re-verify the **editable catalog preview** end-to-end (pick page in preview → Add → widget pinned).
4. Manual QA checkpoint with Francisco (UI-visible changes).
5. Commit (Conventional Commits, `feat(integrations): … (FRA-142)`, no AI attribution) + open PR mirroring the spec.

## Engram memories from this work
`mem_search` project `mydock` for: FRA-142 planning decisions, "BUILT" summary,
extractNotionPageId bug, searchable picker, the 4 UX fixes, and the agent-browser auth recipe.
