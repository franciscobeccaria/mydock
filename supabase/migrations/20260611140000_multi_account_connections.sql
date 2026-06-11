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

-- 4b. Backfill existing users: their Google login connection predates is_default
--     and would otherwise stay false, leaving the non-removable login-account
--     guard (provider='google' && is_default) ineffective until the user
--     re-authenticates. Mark the oldest Google row per user as the default.
--     Idempotent: only sets rows that aren't already a default for their user.
update public.integration_accounts ia
set is_default = true
where ia.provider = 'google'
  and ia.id = (
    select inner_ia.id
    from public.integration_accounts inner_ia
    where inner_ia.user_id = ia.user_id
      and inner_ia.provider = 'google'
    order by inner_ia.created_at asc
    limit 1
  )
  and not exists (
    select 1 from public.integration_accounts d
    where d.user_id = ia.user_id and d.provider = 'google' and d.is_default
  );

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
