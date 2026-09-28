-- Run on the dedicated Mizan project. All fixtures are rolled back.
-- These are database-policy tests, not a replacement for real sign-in tests.
begin;
select set_config('mizan.test.a', gen_random_uuid()::text, true);
select set_config('mizan.test.b', gen_random_uuid()::text, true);
select set_config('mizan.test.project', gen_random_uuid()::text, true);

insert into auth.users (id, aud, role, email)
select current_setting('mizan.test.a')::uuid, 'authenticated', 'authenticated',
       current_setting('mizan.test.a') || '@example.invalid'
union all
select current_setting('mizan.test.b')::uuid, 'authenticated', 'authenticated',
       current_setting('mizan.test.b') || '@example.invalid';

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.mizan_projects'::regclass) then
    raise exception 'RLS must be enabled';
  end if;
  if has_table_privilege('anon', 'public.mizan_projects', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Anonymous role has table privileges';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mizan.test.a'), 'role', 'authenticated')::text, true);
insert into public.mizan_projects (id, user_id, data)
values (current_setting('mizan.test.project')::uuid, current_setting('mizan.test.a')::uuid,
        jsonb_build_object('id', current_setting('mizan.test.project'), 'name', 'RLS test', 'costs', '[]'::jsonb, 'journal', '[]'::jsonb, 'reports', '[]'::jsonb));

do $$
declare affected integer;
begin
  if (select count(*) from public.mizan_projects where id = current_setting('mizan.test.project')::uuid) <> 1 then
    raise exception 'Owner cannot read own project';
  end if;
  update public.mizan_projects set revision = 2
  where id = current_setting('mizan.test.project')::uuid and revision = 1;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner cannot update own project'; end if;
  update public.mizan_projects set revision = 3
  where id = current_setting('mizan.test.project')::uuid and revision = 1;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale revision overwrote project'; end if;

  begin
    update public.mizan_projects set user_id = current_setting('mizan.test.b')::uuid
    where id = current_setting('mizan.test.project')::uuid;
    raise exception 'Owner reassignment was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.mizan_projects set data = jsonb_set(data, '{name}', 'null'::jsonb)
    where id = current_setting('mizan.test.project')::uuid;
    raise exception 'Null project name was allowed';
  exception when check_violation then null;
  end;
  begin
    update public.mizan_projects set data = jsonb_set(data, '{journal}', '{}'::jsonb)
    where id = current_setting('mizan.test.project')::uuid;
    raise exception 'Invalid journal type was allowed';
  exception when check_violation then null;
  end;
end $$;

select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mizan.test.b'), 'role', 'authenticated')::text, true);
do $$
declare affected integer; other_id uuid := gen_random_uuid();
begin
  if exists (select 1 from public.mizan_projects where id = current_setting('mizan.test.project')::uuid) then
    raise exception 'Other user can read project';
  end if;
  update public.mizan_projects set revision = 3 where id = current_setting('mizan.test.project')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Other user can update project'; end if;
  delete from public.mizan_projects where id = current_setting('mizan.test.project')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Other user can delete project'; end if;
  begin
    insert into public.mizan_projects (id, user_id, data)
    values (other_id, current_setting('mizan.test.a')::uuid,
            jsonb_build_object('id', other_id, 'name', 'Invalid owner', 'costs', '[]'::jsonb, 'journal', '[]'::jsonb, 'reports', '[]'::jsonb));
    raise exception 'Other user can insert for a different owner';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mizan.test.a'), 'role', 'authenticated')::text, true);
do $$
declare affected integer;
begin
  delete from public.mizan_projects where id = current_setting('mizan.test.project')::uuid and revision = 2;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner cannot delete own project'; end if;
end $$;
reset role;
rollback;
select 'PASS: owner CRUD, cross-user isolation, owner reassignment, stale revision, payload constraints; fixtures rolled back' as result;
