-- FRA-140: multi-page dashboard. The dashboard goes from a single flat
-- `layout` (WidgetInstance[]) to a list of pages, each with its own layout.
-- `shortcuts` stays shared (the iOS dock). The old `layout` column is kept
-- read-only for one release (no data loss if a rollback is needed); the app
-- reads/writes `pages` from now on.

alter table public.dashboard_state
  add column if not exists pages jsonb not null default '[]'::jsonb; -- {id, layout}[]

-- Backfill: wrap each existing non-empty layout into a single page so returning
-- users keep their dashboard as "page 1". Empty layouts stay '[]' and are seeded
-- with a default page by the app on next load. Idempotent: only rows whose pages
-- haven't been populated yet.
update public.dashboard_state
set pages = jsonb_build_array(
  jsonb_build_object('id', gen_random_uuid()::text, 'layout', layout)
)
where pages = '[]'::jsonb
  and layout is not null
  and layout <> '[]'::jsonb;
