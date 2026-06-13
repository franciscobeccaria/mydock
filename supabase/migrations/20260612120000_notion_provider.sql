-- FRA-142: add Notion as an integration provider. Pasted-token auth (Personal
-- Access Token), same shape as Linear — no new tables, the multi-account schema
-- (FRA-138) already holds many accounts per provider. Just widen the provider
-- CHECK constraints on the three tables that gate provider values.

-- 1. integration_accounts: one row per connected Notion workspace.
alter table public.integration_accounts
  drop constraint if exists integration_accounts_provider_check;
alter table public.integration_accounts
  add constraint integration_accounts_provider_check
  check (provider in ('google', 'linear', 'notion'));

-- 2. integrations: per-user status row used by the widget registry.
alter table public.integrations
  drop constraint if exists integrations_provider_check;
alter table public.integrations
  add constraint integrations_provider_check
  check (provider in ('linear', 'gmail', 'google_tasks', 'google_calendar', 'notion'));

-- 3. widget_cache: per-account cache rows are keyed by provider too.
alter table public.widget_cache
  drop constraint if exists widget_cache_provider_check;
alter table public.widget_cache
  add constraint widget_cache_provider_check
  check (provider in ('linear', 'gmail', 'google_tasks', 'google_calendar', 'notion'));
