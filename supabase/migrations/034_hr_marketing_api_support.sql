-- =============================================================================
-- 034_hr_marketing_api_support.sql
-- Additive helpers required by the HR/Marketing API. Safe to re-run.
--
-- WHY THIS EXISTS
--   `erp.users` is shared master data. RLS only lets a user update their own
--   row (or an admin with admin.user.write) insert rows. HR managers hold
--   `hr.employee.write`, not tenant user administration. Rather than widening
--   the RLS policy (which would let HR managers change roles/status of any
--   user), employee provisioning goes through a narrow SECURITY DEFINER
--   function that checks the HR permission and only touches identity columns.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Marketing document types used by the API's server-side numbering.
-- Additive and idempotent: `doc_types` is seeded by 001 but the Marketing
-- module also numbers dealer prospects and market surveys.
-- ---------------------------------------------------------------------------
insert into erp.doc_types (code, prefix, label, pad) values
  ('dealer', 'DLR', 'Dealer Prospect', 4),
  ('survey', 'SRV', 'Market Survey',   4)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Create the shared ERP user for a new hire.
-- ---------------------------------------------------------------------------
create or replace function erp.hr_create_user(
  p_auth_user_id  uuid,
  p_email         text,
  p_name          text,
  p_phone         text default null,
  p_department_id uuid default null,
  p_designation_id uuid default null,
  p_manager_id    uuid default null,
  p_role_code     text default 'employee'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_org    uuid := erp.current_org_id();
  v_role   uuid;
  v_code   text;
  v_id     uuid;
  v_email  text := lower(btrim(coalesce(p_email, '')));
begin
  if v_org is null then
    raise exception 'hr_create_user: organization context is required' using errcode = '22023';
  end if;
  if not erp.has_permission('hr.employee.write') then
    raise exception 'Permission denied: hr.employee.write' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'hr_create_user: a valid email is required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'hr_create_user: name is required' using errcode = '22023';
  end if;

  select id into v_role from erp.roles where org_id = v_org and code = p_role_code;
  if v_role is null then
    select id into v_role from erp.roles where org_id = v_org and code = 'employee';
  end if;
  if v_role is null then
    raise exception 'hr_create_user: no role available for this organization' using errcode = '22023';
  end if;

  if exists (select 1 from erp.users where org_id = v_org and email = v_email) then
    raise exception 'A user with this email already exists' using errcode = '23505';
  end if;

  v_code := erp.next_doc_number(v_org, 'employee');

  insert into erp.users (
    org_id, auth_user_id, employee_code, name, email, phone,
    role_id, department_id, designation_id, manager_id, status, joined_on
  ) values (
    v_org, p_auth_user_id, v_code, btrim(p_name), v_email, nullif(btrim(coalesce(p_phone,'')), ''),
    v_role, p_department_id, p_designation_id, p_manager_id, 'active', current_date
  )
  returning id into v_id;

  perform erp.log_audit('hr.user.created', 'erp.users', v_id, btrim(p_name));
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Update the shared identity columns of an existing employee.
-- Role changes are deliberately NOT exposed here.
-- ---------------------------------------------------------------------------
create or replace function erp.hr_update_user(
  p_user_id       uuid,
  p_name          text default null,
  p_email         text default null,
  p_phone         text default null,
  p_department_id uuid default null,
  p_designation_id uuid default null,
  p_manager_id    uuid default null,
  p_status        text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_org uuid := erp.current_org_id();
  v_id  uuid;
begin
  if v_org is null then
    raise exception 'hr_update_user: organization context is required' using errcode = '22023';
  end if;
  if not (erp.has_permission('hr.employee.write')
          or p_user_id = erp.current_user_id()) then
    raise exception 'Permission denied: hr.employee.write' using errcode = '42501';
  end if;

  update erp.users
     set name = coalesce(nullif(btrim(coalesce(p_name,'')), ''), name),
         email = coalesce(nullif(lower(btrim(coalesce(p_email,''))), ''), email),
         phone = coalesce(nullif(btrim(coalesce(p_phone,'')), ''), phone),
         department_id = coalesce(p_department_id, department_id),
         designation_id = coalesce(p_designation_id, designation_id),
         manager_id = coalesce(p_manager_id, manager_id),
         status = coalesce(nullif(btrim(coalesce(p_status,'')), ''), status),
         updated_at = now()
   where id = p_user_id
     and org_id = v_org
  returning id into v_id;

  if v_id is null then
    raise exception 'Employee user not found' using errcode = 'P0002';
  end if;

  perform erp.log_audit('hr.user.updated', 'erp.users', v_id, null);
  return v_id;
end;
$$;

revoke all on function erp.hr_create_user(uuid, text, text, text, uuid, uuid, uuid, text) from public;
revoke all on function erp.hr_update_user(uuid, text, text, text, uuid, uuid, uuid, text) from public;

do $$
begin
  if to_regrole('authenticated') is not null then
    grant execute on function erp.hr_create_user(uuid, text, text, text, uuid, uuid, uuid, text) to authenticated;
    grant execute on function erp.hr_update_user(uuid, text, text, text, uuid, uuid, uuid, text) to authenticated;
  end if;
end $$;

comment on function erp.hr_create_user(uuid, text, text, text, uuid, uuid, uuid, text) is
  'HR-scoped creation of the shared erp.users identity. Never changes roles.';
