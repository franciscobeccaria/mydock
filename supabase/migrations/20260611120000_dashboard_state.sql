create table if not exists public.dashboard_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version int not null default 1,
  layout jsonb not null default '[]'::jsonb,      -- WidgetInstance[]
  shortcuts jsonb not null default '[]'::jsonb,   -- Shortcut[]
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.dashboard_state enable row level security;

create policy "dashboard_state_select_own" on public.dashboard_state
  for select using (auth.uid() = user_id);
create policy "dashboard_state_insert_own" on public.dashboard_state
  for insert with check (auth.uid() = user_id);
create policy "dashboard_state_update_own" on public.dashboard_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dashboard_state_delete_own" on public.dashboard_state
  for delete using (auth.uid() = user_id);

create or replace trigger dashboard_state_set_updated_at
  before update on public.dashboard_state
  for each row execute procedure public.set_updated_at();
