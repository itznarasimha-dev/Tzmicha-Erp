-- =============================================================================
-- 003_erp_auth_sync.sql
-- Bridge between Supabase auth.users and erp.users.
--
-- HARDENING NOTES (deviations from the reference implementation, deliberate):
--   1. Organization and role are read from raw_app_meta_data (admin/service-role
--      controlled). raw_user_meta_data is user-controlled at signup and MUST NOT
--      be able to grant a role or tenant.
--   2. The fallback role is a non-privileged role (employee), never admin.
--   3. An email that is already linked to a different auth user is refused,
--      so a signup can never take over an existing ERP account.
--   4. An existing provisioning trigger is never replaced.
-- =============================================================================

create or replace function erp.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_org_id      uuid;
  v_role_id     uuid;
  v_emp_code    text;
  v_name        text;
  v_existing_id uuid;
  v_existing_auth uuid;
begin
  -- Tenant: trusted app_metadata only.
  v_org_id := erp.try_uuid(new.raw_app_meta_data ->> 'org_id');

  if v_org_id is null then
    select id into v_org_id
      from erp.organizations
     where team_id = 'APEX-2026'
     limit 1;
  end if;

  if v_org_id is null then
    select id into v_org_id
      from erp.organizations
     where is_active
     order by created_at
     limit 1;
  end if;

  if v_org_id is null then
    raise exception 'Auth sync: no organization configured for new user %', new.id;
  end if;

  -- Role: trusted app_metadata (role_id or role_code), else least-privilege.
  v_role_id := erp.try_uuid(new.raw_app_meta_data ->> 'role_id');

  if v_role_id is null and nullif(new.raw_app_meta_data ->> 'role_code', '') is not null then
    select id into v_role_id
      from erp.roles
     where org_id = v_org_id
       and code = new.raw_app_meta_data ->> 'role_code'
     limit 1;
  end if;

  if v_role_id is null then
    select id into v_role_id
      from erp.roles
     where org_id = v_org_id
       and code = 'employee'
     limit 1;
  end if;

  if v_role_id is null then
    raise exception 'Auth sync: no default employee role configured for organization %', v_org_id;
  end if;

  v_emp_code := coalesce(
    nullif(new.raw_app_meta_data ->> 'employee_code', ''),
    'EMP-' || upper(substring(replace(new.id::text, '-', '') from 1 for 6))
  );

  v_name := coalesce(
    nullif(new.raw_app_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  -- Refuse to attach this auth identity to an ERP account owned by another
  -- auth user (account-takeover guard).
  select u.id, u.auth_user_id
    into v_existing_id, v_existing_auth
    from erp.users u
   where u.org_id = v_org_id
     and lower(u.email) = lower(coalesce(new.email, ''))
   limit 1;

  if v_existing_id is not null
     and v_existing_auth is not null
     and v_existing_auth <> new.id then
    raise exception 'Auth sync: email % is already linked to another ERP user', new.email;
  end if;

  insert into erp.users (
    org_id, auth_user_id, employee_code, name, email, role_id, status
  ) values (
    v_org_id, new.id, v_emp_code, v_name, lower(coalesce(new.email, '')), v_role_id, 'active'
  )
  on conflict (org_id, email)
  do update set
    auth_user_id = excluded.auth_user_id,
    updated_at   = now()
  where erp.users.auth_user_id is null
     or erp.users.auth_user_id = excluded.auth_user_id;

  return new;
end;
$$;

-- Only trusted roles may execute the provisioning function.
revoke all on function erp.handle_auth_user_created() from public;
do $$
begin
  if to_regrole('anon') is not null then
    revoke all on function erp.handle_auth_user_created() from anon;
  end if;
  if to_regrole('authenticated') is not null then
    revoke all on function erp.handle_auth_user_created() from authenticated;
  end if;
end $$;

-- Attach the trigger only if no other provisioning trigger is already present.
do $$
begin
  if to_regclass('auth.users') is null then
    raise notice 'auth.users not found — skipping auth sync trigger (non-Supabase environment)';
    return;
  end if;

  if exists (
    select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth'
       and c.relname = 'users'
       and not t.tgisinternal
       and t.tgname <> 'erp_on_auth_user_created'
  ) then
    raise notice 'An auth.users provisioning trigger already exists — erp trigger not installed. Review manually.';
    return;
  end if;

  drop trigger if exists erp_on_auth_user_created on auth.users;
  create trigger erp_on_auth_user_created
    after insert on auth.users
    for each row
    execute function erp.handle_auth_user_created();
end $$;
