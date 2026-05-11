create table if not exists public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_account_id text,
  provider_account_email text,
  scopes text[] not null default '{}',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integration_accounts_provider_check check (provider in ('google')),
  constraint integration_accounts_user_provider_key unique (user_id, provider)
);

comment on table public.integration_accounts is 'Server-only account linkage for shared providers like Google Workspace.';
comment on column public.integration_accounts.access_token_encrypted is 'Encrypt provider access tokens with TOKEN_ENCRYPTION_SECRET.';
comment on column public.integration_accounts.refresh_token_encrypted is 'Encrypt provider refresh tokens with TOKEN_ENCRYPTION_SECRET.';

alter table public.integrations
  add column if not exists account_id uuid references public.integration_accounts(id) on delete set null;

create or replace trigger integration_accounts_set_updated_at
before update on public.integration_accounts
for each row execute procedure public.set_updated_at();

alter table public.integration_accounts enable row level security;

drop policy if exists "integration_accounts_no_client_access" on public.integration_accounts;
create policy "integration_accounts_no_client_access" on public.integration_accounts
for all using (false) with check (false);
