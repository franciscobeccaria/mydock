# [FRA-149 + FRA-137] — Widget size system (S/M/L) + Weather widget + unread badge

## Context

- FRA-149: https://linear.app/francisco-beccaria/issue/FRA-149 (size system + Weather as first widget)
- FRA-137: https://linear.app/francisco-beccaria/issue/FRA-137 (iOS design system — the unread badge primitive lives here)

**Design:** created in this workflow (lane: in-app mock at `/mock-sizes`, approved 2026-06-15 with Francisco). Three sizes + red corner badge + Weather in all three sizes, data shape from Open-Meteo.

## Goal

The widget grid gains iOS-style fixed sizes (Small / Medium / Large) chosen per widget instance. A red iOS-style unread badge appears in the top-right corner of any tile whose payload carries an unread count. Weather ships as the first widget built across all three sizes, backed by Open-Meteo (no API key, no Connections entry).

## Scope

- **Badge (FRA-137):** shared `UnreadBadge` primitive (red `#FF3B30`, white ring, `99+`), wired into `WidgetCard` as a corner badge sourced from `payload.unreadCount`. Gmail already populates it.
- **Size system (FRA-149):** size stored in per-instance `config.size` (`small | medium | large`, default `large`). Edit-mode size selector. Grid lays out mixed sizes via col-span/row-span. Each widget declares the sizes it supports (`supportedSizes` on the catalog entry); widgets that only support `large` render unchanged.
- **Weather (FRA-149):** new `weather` provider, no-auth / always-connected (never in Connections). Open-Meteo adapter (forecast + geocoding, no key). `WeatherWidget` renders Small/Medium/Large from one payload. City via per-instance config (default Buenos Aires); catalog entry + registry + API route wiring.

## Out of scope

- Free drag-resize (explicitly rejected — fixed sizes only).
- Unifying shortcuts with widgets (stays separate).
- Adding S/M variants to the existing Linear/Gmail/Calendar/Notion widgets — only Weather gets all three now; others stay `large` until designed per app.
- Geolocation ("use my location") — city is typed/picked; geolocation is a later nicety.
- °F unit toggle — default °C; deferred.

## Acceptance criteria

- [ ] A widget instance can be set to Small / Medium / Large in edit mode and the grid lays it out accordingly (Large = today's tile, Medium = half height, Small = quarter width).
- [ ] The Weather widget exists in all three sizes showing real Open-Meteo data, configurable by city.
- [ ] A red corner unread badge renders on a tile when its payload has an unread count > 0 (Gmail), styled per the approved mock.

## Test cases / test intent

- typecheck/build: new provider in the `providers` union typechecks across registry/types/route.
- agent-browser (authed app): add Weather widget, switch its size S→M→L, see layout change; set a city and see real temp; confirm Gmail shows the red corner badge.
- Open-Meteo endpoints already verified live (2026-06-15) — no key required.

## Plan

1. `UnreadBadge` primitive + wire into `WidgetCard` corner from `payload.unreadCount`.
2. `weather` provider: extend `types.ts` union; `NO_AUTH_PROVIDERS` set in `registry.ts`; weather branches in `getDerivedWidgetState` / `shouldSkipProviderLoad` / `buildScopeStatus`; Open-Meteo adapter under `providers/weather/`; route already passes `config` (city).
3. Catalog: add `weather` appId/provider + `weather` slot; add `supportedSizes` to entries (default `["large"]`, weather `["small","medium","large"]`).
4. Size: read/write `config.size`; edit-mode size selector (only sizes in `supportedSizes`); grid `col-span`/`row-span` per size; `WeatherWidget` switches layout on size.
5. Render wiring: `widget-render.tsx` (`renderWidget`, `WIDGET_TITLE`, `widgetQueryKey`, `widgetStaleTime`, `CONFIG_KEY`).

Surfaces: `src/features/integrations/{types,registry}.ts`, `src/features/integrations/providers/weather/*`, `src/app/api/widgets/[provider]/route.ts`, `src/components/widgets/{widget-catalog,widget-render,widget-card,weather-widget}.tsx`, `src/components/widgets/widget-grid.tsx`, `src/components/dashboard/unread-badge.tsx`.

Risk points: the registry assumes auth for every provider — the no-auth branch must not break the connected/empty/error derivation. Mixed-size grid layout (col-span/row-span in a CSS grid) needs the Small to be half a column → grid likely becomes 4 logical columns (Large=2, Medium=2 wide × 1 tall, Small=1).

## Verification

- ✅ `pnpm lint` clean · `pnpm typecheck` clean · `pnpm build` succeeds.
- ✅ agent-browser in the authed app (session-mint recipe): Weather widget renders live Open-Meteo data (Buenos Aires 8°, 3-day forecast, night moon glyph, "Weather by Open-Meteo"); size pill S/M/L switches the tile and the grid reflows; `/api/widgets/weather?config=Madrid` returns Madrid data with `state: connected` while `connectionStatus: disconnected` (no-auth provider working).
- Badge primitive built + wired (Gmail `unreadCount` → corner badge); a live count needs a connected Gmail account to display.
- STOP before PR → manual QA checkpoint (UI-visible change). Awaiting Francisco's go.

## Risks / open questions

- Grid math for mixed sizes: 4-column logical grid, Large 2×2, Medium 2×1, Small 1×1. Existing widgets (all Large) keep today's 2-up look.
- Open-Meteo attribution (CC BY 4.0) shown in the Large weather tile footer.

## Post-review reworks (2026-06-15, Francisco)

- **Badge**: was clipped by the Card's `overflow-hidden` → restructured `WidgetCard` so the badge is a sibling of the Card (unclipped). Label now supports 3 digits, caps at `999+`.
- **No-auth catalog**: Weather showed a "Connect Weather" lock → `connectedByProvider.weather = true` so it's always addable.
- **Add widget moved to the sidebar**: removed the in-grid `AddWidgetTile` (it reordered weirdly as a Large tile). Catalog open state lifted to `DashboardModeProvider`; the trigger is a sidebar button shown while editing.
- **Mixed-size drag** (first attempt): `grid-flow-row-dense` + `arrayMove` — but that AUTO-PACKS and can't leave blank cells.

## Pivot: free coordinate grid (iOS-18, blank cells preserved)

Francisco: iOS 18 lets you leave blank cells on purpose; auto-packing was the wrong model. Reworked the widget grid from a sortable list to an explicit **(x,y) coordinate layout**:

- `WidgetInstance` gains optional `x,y` (zod `.optional()`, jsonb → no DB migration). Legacy layouts pack once via `normalizeLayout` on load.
- New pure `grid-layout.ts`: `footprintFor`, `rectsOverlap`, `occupancyOf`, `findFirstFreeBlock`, `maxOccupiedRow`, `normalizeLayout`, `resolveCollisions` (push-down), plus extracted `instanceSize`/`sizeFromConfig`.
- Hook: `reorder` → `placeWidgetAt(id,tx,ty)` (clamp x in bounds, push overlaps down); `addWidget` places at first free cell; `removeWidget` leaves the hole.
- Grid: dropped `SortableContext`/`rectSortingStrategy` → `useDraggable` + a per-cell `useDroppable` layer; explicit `gridColumn/gridRow` placement; no `grid-flow-dense`. **Collision = `closestCorners`** (`pointerWithin` resolved drops to the wrong cell; `closestCorners` picks the right one).
- Scope: desktop-only (4 cols) for v1; mobile + keyboard arrow-move deferred.
- Verified in-app (agent-browser): drag to empty cell leaves a hole; drop onto occupied pushes it down (with cascade); remove leaves a hole (no repack); positions persist across reload; shortcuts row (shared sensor) still works.

## Live drag feedback (iOS-style real-time reflow)

Francisco: nothing moved until drop — wanted the other widgets to reflow live while dragging, like iOS, and the drop to match what's previewed.

- Shared `computeMove(layout, movedId, tx, ty)` in `grid-layout.ts` (clamp + push-down) used by BOTH the live preview and the committed `placeWidgetAt`, so preview == drop.
- `widget-grid.tsx`: `onDragStart/onDragOver/onDragEnd/onDragCancel`. `onDragOver` stages a `preview` map (instanceId → cell) of the would-be layout; tiles render from preview mid-drag (`renderCell`), except the dragged tile (dnd-kit translates it). Commit uses the last previewed cell (`lastTargetRef`), not the final `over`.
- Collision: custom `cellCollision` = `pointerWithin` (track the cursor) with `closestCorners` fallback. This fixed a drop-vs-preview mismatch (the dragged tile's translated rect resolved to a distant cell).
- Verified in-app: other widgets push down in real time while dragging; mid-drag layout === after-drop layout (no jump on release).

## Drag affordances (grid + destination placeholder)

Francisco: live reflow on push was good, but moving to empty space gave no sense of which cell the widget lands in (no visible grid). Added, only while dragging (edit mode):

- **Reference grid**: `DropCell` shows a faint dashed 1×1 border when `showGrid` (driven by `activeId !== null`), so the cell grid is visible during a drag and hidden otherwise.
- **Destination placeholder**: a filled highlight (`border-primary/40 bg-primary/10`) at the dragged widget's resolved cell with its exact footprint (`cellStyle(dropCell, instanceSize(active))`), so you see where + what size it drops before releasing. `dropCell = preview.get(activeId)` (the mover's cell from `computeMove`).
- `activeId` is set in both `onDragStart` and (defensively) `onDragOver`.
- Verified via dispatched `PointerEvent`s in agent-browser: mid-drag DOM shows 68 dashed grid cells + the placeholder; `data-dragging` carries the active id. NOTE: agent-browser's `mouse move/down/up` does NOT drive dnd-kit's PointerSensor reliably — use real `PointerEvent` dispatch via `eval` (or a real mouse) to test drag.

## Round-3 polish (2026-06-16, after Francisco approved the drag UX)

- **Dragged-tile corners**: the lifted tile showed a square-bottomed shadow halo. Added `rounded-[20px]` to the dragging inner element so the lift shadow follows the card's rounded corners.
- **Weather city picker**: replaced the plain text input with a searchable autocomplete (same UX as the Notion page picker) — `CityPicker` uses the `Combobox` UI + a new `/api/integrations/weather/cities?q=` route backed by `searchCities()` (Open-Meteo geocoding, returns `{value,label}` with region/country). Verified the route returns correct suggestions (e.g. "Madr" → "Madrid, Madrid, Spain"). NOTE: base-ui Combobox popups don't open via synthetic events — dropdown interaction needs a real pointer (manual QA).

## Follow-up (FRA-150)

Gravity layout experiment: allow gaps on X, not Y (push up so no hollow rows below content). Confirmed Francisco wants this tried (he likes X gaps, not Y gaps) but deferred — not applied yet. Compare against free placement.
