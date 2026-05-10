create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  provider_account_id text,
  provider_account_email text,
  scopes text[] not null default '{}',
  last_sync_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integrations_provider_check check (
    provider in ('linear', 'gmail', 'google_tasks', 'google_calendar')
  ),
  constraint integrations_status_check check (
    status in ('disconnected', 'pending', 'connected', 'error')
  ),
  constraint integrations_user_provider_key unique (user_id, provider)
);

create table if not exists public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.integration_tokens is 'Server-only token store. Encrypt values with TOKEN_ENCRYPTION_SECRET before enabling live provider sync.';
comment on column public.integration_tokens.access_token_encrypted is 'TODO: encrypt provider tokens server-side only.';
comment on column public.integration_tokens.refresh_token_encrypted is 'TODO: encrypt provider refresh tokens server-side only.';

create table if not exists public.widget_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  widget_key text not null,
  payload jsonb not null default '{}'::jsonb,
  summary text,
  source_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint widget_cache_provider_check check (
    provider in ('linear', 'gmail', 'google_tasks', 'google_calendar')
  ),
  constraint widget_cache_user_provider_widget_key unique (user_id, provider, widget_key)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      updated_at = timezone('utc', now());

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create or replace trigger integrations_set_updated_at
before update on public.integrations
for each row execute procedure public.set_updated_at();

create or replace trigger integration_tokens_set_updated_at
before update on public.integration_tokens
for each row execute procedure public.set_updated_at();

create or replace trigger widget_cache_set_updated_at
before update on public.widget_cache
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_tokens enable row level security;
alter table public.widget_cache enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = id);

create policy "integrations_select_own" on public.integrations
for select using (auth.uid() = user_id);

create policy "integrations_insert_own" on public.integrations
for insert with check (auth.uid() = user_id);

create policy "integrations_update_own" on public.integrations
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "integrations_delete_own" on public.integrations
for delete using (auth.uid() = user_id);

create policy "integration_tokens_no_client_access" on public.integration_tokens
for all using (false) with check (false);

create policy "widget_cache_select_own" on public.widget_cache
for select using (auth.uid() = user_id);

create policy "widget_cache_insert_own" on public.widget_cache
for insert with check (auth.uid() = user_id);

create policy "widget_cache_update_own" on public.widget_cache
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "widget_cache_delete_own" on public.widget_cache
for delete using (auth.uid() = user_id);
