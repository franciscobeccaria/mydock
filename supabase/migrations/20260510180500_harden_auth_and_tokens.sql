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

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "integration_tokens_no_client_access" on public.integration_tokens;
create policy "integration_tokens_no_client_access" on public.integration_tokens
for all using (false) with check (false);
