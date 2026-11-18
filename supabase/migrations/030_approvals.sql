-- =============================================================================
-- 030_approvals.sql
-- One shared approval engine for HR and Marketing.
--
-- Module tables keep their own status column for workflow rendering; this table
-- is the authoritative queue, with an append-only decision history.
-- =============================================================================

create table if not exists erp.approval_requests (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references erp.organizations(id) on delete cascade,
  entity_type    text not null
                   check (entity_type in ('hr_leave','hr_attendance_correction','hr_expense',
                                          'hr_payment','hr_payroll_run','hr_contract',
                                          'mkt_plan','mkt_expense','mkt_discount','mkt_offer',
                                          'mkt_campaign','mkt_contract')),
  entity_id      uuid not null,
  title          text not null,
  stage          text not null default 'manager',
  status         text not null default 'Pending'
                   check (status in ('Pending','Approved','Rejected','Changes Requested','Cancelled','Expired')),
  requested_by   uuid references erp.users(id) on delete set null,
  assigned_to    uuid references erp.users(id) on delete set null,
  assigned_role  text,
  amount         numeric(14,2),
  approved_percent numeric(5,2),
  payload        jsonb not null default '{}'::jsonb,
  comments       text,
  decided_by     uuid references erp.users(id) on delete set null,
  decided_at     timestamptz,
  idempotency_key text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

create unique index if not exists approval_requests_pending_uidx
  on erp.approval_requests (org_id, entity_type, entity_id, stage)
  where status = 'Pending';

create index if not exists approval_requests_queue_idx
  on erp.approval_requests (org_id, status, entity_type, created_at desc);

create table if not exists erp.approval_history (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references erp.organizations(id) on delete cascade,
  approval_request_id uuid not null references erp.approval_requests(id) on delete cascade,
  action             text not null,
  actor_user_id      uuid references erp.users(id) on delete set null,
  actor_name         text,
  from_status        text,
  to_status          text,
  comments           text,
  created_at         timestamptz not null default now()
);

create index if not exists approval_history_idx on erp.approval_history (approval_request_id, created_at);

-- ---------------------------------------------------------------------------
-- Raise an approval request (idempotent per entity+stage).
-- ---------------------------------------------------------------------------
create or replace function erp.request_approval(
  p_entity_type  text,
  p_entity_id    uuid,
  p_title        text,
  p_stage        text default 'manager',
  p_assigned_role text default null,
  p_assigned_to  uuid default null,
  p_amount       numeric default null,
  p_payload      jsonb default '{}'::jsonb
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
    raise exception 'request_approval: organization context is required' using errcode = '22023';
  end if;

  insert into erp.approval_requests (
    org_id, entity_type, entity_id, title, stage, status,
    requested_by, assigned_to, assigned_role, amount, payload
  ) values (
    v_org, p_entity_type, p_entity_id, p_title, p_stage, 'Pending',
    erp.current_user_id(), p_assigned_to, p_assigned_role, p_amount, p_payload
  )
  on conflict (org_id, entity_type, entity_id, stage) where status = 'Pending'
  do update set title = excluded.title,
                amount = excluded.amount,
                payload = excluded.payload,
                updated_at = now()
  returning id into v_id;

  insert into erp.approval_history (
    org_id, approval_request_id, action, actor_user_id, actor_name, from_status, to_status, comments
  ) values (
    v_org, v_id, 'requested', erp.current_user_id(),
    (select name from erp.users where id = erp.current_user_id()),
    null, 'Pending', null
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Decide an approval request. Enforces: permission, no self-approval,
-- idempotent terminal state, append-only history.
-- ---------------------------------------------------------------------------
create or replace function erp.decide_approval(
  p_request_id uuid,
  p_decision   text,
  p_comments   text default null,
  p_approved_percent numeric default null
)
returns erp.approval_requests
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_row erp.approval_requests;
  v_user uuid := erp.current_user_id();
begin
  if p_decision not in ('Approved','Rejected','Changes Requested','Cancelled') then
    raise exception 'decide_approval: invalid decision %', p_decision using errcode = '22023';
  end if;

  select * into v_row
    from erp.approval_requests
   where id = p_request_id
     and org_id = erp.current_org_id()
   for update;

  if not found then
    raise exception 'Approval request not found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'Pending' then
    -- Idempotent: return the already-decided record instead of duplicating.
    return v_row;
  end if;

  if v_row.requested_by = v_user then
    raise exception 'Self-approval is not permitted' using errcode = '42501';
  end if;

  if not (erp.has_permission('approval.decide')
          or erp.has_permission('hr.approval.decide')
          or erp.has_permission('marketing.approval.decide')
          or erp.has_permission('finance.approval.decide')) then
    raise exception 'Permission denied: approval.decide' using errcode = '42501';
  end if;

  if p_decision = 'Rejected' and length(coalesce(p_comments,'')) = 0 then
    raise exception 'A rejection comment is required' using errcode = '22023';
  end if;

  update erp.approval_requests
     set status = p_decision,
         comments = coalesce(p_comments, comments),
         approved_percent = coalesce(p_approved_percent, approved_percent),
         decided_by = v_user,
         decided_at = now(),
         updated_at = now()
   where id = p_request_id
  returning * into v_row;

  insert into erp.approval_history (
    org_id, approval_request_id, action, actor_user_id, actor_name, from_status, to_status, comments
  ) values (
    v_row.org_id, p_request_id, 'decided', v_user,
    (select name from erp.users where id = v_user),
    'Pending', p_decision, p_comments
  );

  perform erp.log_audit('approval.' || lower(replace(p_decision,' ','_')),
                        v_row.entity_type, v_row.entity_id,
                        coalesce(p_comments, p_decision));

  return v_row;
end;
$$;

revoke all on function erp.decide_approval(uuid, text, text, numeric) from public;
do $$
begin
  if to_regrole('authenticated') is not null then
    grant execute on function erp.request_approval(text, uuid, text, text, text, uuid, numeric, jsonb) to authenticated;
    grant execute on function erp.decide_approval(uuid, text, text, numeric) to authenticated;
  end if;
end $$;
