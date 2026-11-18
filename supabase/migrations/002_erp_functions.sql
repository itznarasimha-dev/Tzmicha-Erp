-- =============================================================================
-- 002_erp_functions.sql
-- Supabase-compatible helper functions (JWT claims, org/user context,
-- permissions, document numbering, audit logging).
--
-- Every helper is defensive: malformed or missing claims resolve to NULL and
-- never raise. This is required because `request.jwt.claims` may be absent for
-- service-role connections, migrations and background jobs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auth compatibility shims (no-op on a real Supabase project)
-- ---------------------------------------------------------------------------
create schema if not exists auth;

do $$
begin
  if to_regprocedure('auth.jwt()') is null then
    execute $f$
      create function auth.jwt() returns jsonb
      language sql stable
      as $body$
        select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
      $body$;
    $f$;
  end if;

  if to_regprocedure('auth.uid()') is null then
    execute $f$
      create function auth.uid() returns uuid
      language sql stable
      as $body$
        select nullif(auth.jwt() ->> 'sub', '')::uuid;
      $body$;
    $f$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Safe UUID parsing
-- ---------------------------------------------------------------------------
create or replace function erp.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_value is null or btrim(p_value) = '' or btrim(p_value) = 'null' then
    return null;
  end if;
  begin
    return p_value::uuid;
  exception when others then
    return null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- JWT claims (single trusted accessor)
-- ---------------------------------------------------------------------------
create or replace function erp.jwt_claims()
returns jsonb
language sql
stable
set search_path = pg_catalog, auth
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  ) || coalesce(auth.jwt(), '{}'::jsonb);
$$;

create or replace function erp.current_auth_uid()
returns uuid
language sql
stable
set search_path = pg_catalog, erp, auth
as $$
  select coalesce(
    auth.uid(),
    erp.try_uuid(erp.jwt_claims() ->> 'sub'),
    erp.try_uuid(current_setting('request.jwt.claim.sub', true))
  );
$$;

-- ---------------------------------------------------------------------------
-- Tenant context
-- ---------------------------------------------------------------------------
create or replace function erp.current_org_id()
returns uuid
language sql
stable
set search_path = pg_catalog, erp
as $$
  select coalesce(
    erp.try_uuid(erp.jwt_claims() -> 'app_metadata' ->> 'org_id'),
    erp.try_uuid(erp.jwt_claims() ->> 'org_id'),
    erp.try_uuid(current_setting('app.org_id', true))
  );
$$;

-- ---------------------------------------------------------------------------
-- Internal ERP user context
--   Supabase auth.users.id  ->  erp.users.auth_user_id
--   erp.users.id            ->  internal ERP user / employee identity
-- These are deliberately NOT assumed to be the same value.
-- ---------------------------------------------------------------------------
create or replace function erp.current_user_id()
returns uuid
language sql
stable
set search_path = pg_catalog, erp
as $$
  select coalesce(
    (select u.id
       from erp.users u
      where u.auth_user_id = erp.current_auth_uid()
      limit 1),
    erp.try_uuid(erp.jwt_claims() -> 'app_metadata' ->> 'user_id'),
    erp.try_uuid(erp.jwt_claims() ->> 'user_id'),
    erp.try_uuid(current_setting('app.user_id', true))
  );
$$;

create or replace function erp.current_role_code()
returns text
language sql
stable
security definer
set search_path = pg_catalog, erp
as $$
  select r.code
    from erp.users u
    join erp.roles r on r.id = u.role_id
   where u.id = erp.current_user_id()
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
--   Primary roles: system_admin, manager, sales, marketing, store_manager,
--                  service, hr, finance, employee
--   Admin bypass is explicit and server-side only.
-- ---------------------------------------------------------------------------
create or replace function erp.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, erp
as $$
  select exists (
    select 1
      from erp.users u
      join erp.roles r on r.id = u.role_id
     where u.id = erp.current_user_id()
       and u.org_id = erp.current_org_id()
       and u.status = 'active'
       and (
         r.code in ('system_admin','admin')
         or exists (
           select 1
             from erp.role_permissions rp
            where rp.role_id = r.id
              and rp.permission_code = p_permission
         )
       )
  );
$$;

create or replace function erp.assert_permission(p_permission text)
returns void
language plpgsql
stable
set search_path = pg_catalog, erp
as $$
begin
  if not erp.has_permission(p_permission) then
    raise exception 'Permission denied: %', p_permission
      using errcode = '42501';
  end if;
end;
$$;

-- Employee self-service: the caller owns the record
create or replace function erp.is_self(p_user_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog, erp
as $$
  select p_user_id is not null and p_user_id = erp.current_user_id();
$$;

-- ---------------------------------------------------------------------------
-- Timestamps
-- ---------------------------------------------------------------------------
create or replace function erp.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Document numbering (never MAX(id)+1, never generated in the browser)
-- ---------------------------------------------------------------------------
create or replace function erp.next_doc_number(
  p_org  uuid,
  p_type text,
  p_fy   text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_org    uuid := coalesce(p_org, erp.current_org_id());
  v_prefix text;
  v_pad    int;
  v_fy     text;
  v_num    bigint;
  v_annual boolean;
begin
  if v_org is null then
    raise exception 'next_doc_number: organization is required' using errcode = '22023';
  end if;

  select prefix, pad into v_prefix, v_pad from erp.doc_types where code = p_type;
  if v_prefix is null then
    raise exception 'next_doc_number: unknown document type %', p_type using errcode = '22023';
  end if;

  v_annual := p_type in ('employee','customer','supplier');
  if v_annual then
    -- Permanent, org-wide sequence: EMP-001
    v_fy := 'ANNUAL';
  else
    v_fy := coalesce(nullif(btrim(p_fy), ''), to_char(now(), 'YYYY'));
  end if;

  insert into erp.document_sequences (org_id, doc_type, fy, last_number)
  values (v_org, p_type, v_fy, 1)
  on conflict (org_id, doc_type, fy)
  do update set last_number = erp.document_sequences.last_number + 1,
                updated_at  = now()
  returning last_number into v_num;

  if v_annual then
    return v_prefix || '-' || lpad(v_num::text, v_pad, '0');
  end if;

  return v_prefix || '-' || v_fy || '-' || lpad(v_num::text, v_pad, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------
create or replace function erp.log_audit(
  p_action    text,
  p_entity    text,
  p_entity_id uuid,
  p_summary   text default null,
  p_before    jsonb default null,
  p_after     jsonb default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_org uuid := erp.current_org_id();
begin
  if v_org is null then
    return;
  end if;

  insert into erp.audit_logs (
    org_id, actor_user_id, action, entity, entity_id, summary, before_data, after_data
  ) values (
    v_org, erp.current_user_id(), p_action, p_entity, p_entity_id, p_summary, p_before, p_after
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grant execution to the authenticated role only where appropriate.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regrole('authenticated') is not null then
    grant usage on schema erp to authenticated;
    grant execute on function erp.current_org_id()      to authenticated;
    grant execute on function erp.current_user_id()     to authenticated;
    grant execute on function erp.current_role_code()   to authenticated;
    grant execute on function erp.has_permission(text)  to authenticated;
    grant execute on function erp.next_doc_number(uuid, text, text) to authenticated;
    grant execute on function erp.log_audit(text, text, uuid, text, jsonb, jsonb) to authenticated;
  end if;

  if to_regrole('service_role') is not null then
    grant usage on schema erp to service_role;
    grant execute on all functions in schema erp to service_role;
  end if;
end $$;
