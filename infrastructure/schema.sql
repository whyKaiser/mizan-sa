-- Mizan schema bootstrap. Run on the dedicated project, not an unrelated database.
begin;
create table if not exists public.mizan_projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mizan_payload_object check (jsonb_typeof(data) = 'object'),
  constraint mizan_payload_required check (data ?& array['id','name','costs','journal','reports']),
  constraint mizan_payload_identity check ((data->>'id') is not null and data->>'id' = id::text),
  constraint mizan_payload_name check (length(btrim(data->>'name')) between 1 and 120),
  constraint mizan_payload_size check (octet_length(data::text) <= 8388608),
  constraint mizan_payload_arrays check (jsonb_typeof(data->'costs') = 'array' and jsonb_typeof(data->'journal') = 'array' and jsonb_typeof(data->'reports') = 'array')
);
create index if not exists mizan_projects_owner_updated on public.mizan_projects (user_id, updated_at desc);
alter table public.mizan_projects enable row level security;
revoke all on public.mizan_projects from anon, authenticated;
grant select, insert, update, delete on public.mizan_projects to authenticated;

-- Rerunning this bootstrap preserves rows; it replaces only this app's policies.
drop policy if exists mizan_select_own on public.mizan_projects;
create policy mizan_select_own on public.mizan_projects for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists mizan_insert_own on public.mizan_projects;
create policy mizan_insert_own on public.mizan_projects for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists mizan_update_own on public.mizan_projects;
create policy mizan_update_own on public.mizan_projects for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists mizan_delete_own on public.mizan_projects;
create policy mizan_delete_own on public.mizan_projects for delete to authenticated
using ((select auth.uid()) = user_id);
commit;
