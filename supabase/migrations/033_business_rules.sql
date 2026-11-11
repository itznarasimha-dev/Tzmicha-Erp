-- =============================================================================
-- 033_business_rules.sql
-- Triggers and invariants: timestamps, leave balances, payroll totals, reward
-- ledger, payment allocation guards, lead conversion, discount authority and
-- audit trail.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. updated_at on every table that has the column
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname as tablename
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped
     where n.nspname = 'erp' and c.relkind = 'r'
  loop
    execute format('drop trigger if exists set_updated_at on erp.%I', r.tablename);
    execute format(
      'create trigger set_updated_at before update on erp.%I
         for each row execute function erp.set_updated_at()', r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. HR employee lifecycle
-- ---------------------------------------------------------------------------
create or replace function erp.hr_employee_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.employee_status = 'Terminated' and old.employee_status is distinct from 'Terminated' then
    new.terminated_at := coalesce(new.terminated_at, now());
  end if;
  if new.employee_status <> 'Terminated' then
    new.terminated_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists hr_employee_lifecycle on erp.hr_employees;
create trigger hr_employee_lifecycle
  before update on erp.hr_employees
  for each row execute function erp.hr_employee_lifecycle();

-- ---------------------------------------------------------------------------
-- 3. Leave balances
-- ---------------------------------------------------------------------------
create or replace function erp.hr_leave_balance_sync()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_year    int;
  v_type    erp.hr_leave_types;
  v_balance erp.hr_leave_balances;
  v_delta_pending numeric(6,1) := 0;
  v_delta_used    numeric(6,1) := 0;
begin
  v_year := extract(year from coalesce(new.start_date, old.start_date))::int;

  select * into v_type from erp.hr_leave_types where id = coalesce(new.leave_type_id, old.leave_type_id);

  -- Ensure a balance row exists (allocated from the leave-type policy).
  insert into erp.hr_leave_balances (org_id, employee_id, leave_type_id, year, allocated)
  values (coalesce(new.org_id, old.org_id),
          coalesce(new.employee_id, old.employee_id),
          coalesce(new.leave_type_id, old.leave_type_id),
          v_year,
          coalesce(v_type.allocation_days, 0))
  on conflict (org_id, employee_id, leave_type_id, year) do nothing;

  select * into v_balance
    from erp.hr_leave_balances
   where org_id = coalesce(new.org_id, old.org_id)
     and employee_id = coalesce(new.employee_id, old.employee_id)
     and leave_type_id = coalesce(new.leave_type_id, old.leave_type_id)
     and year = v_year
   for update;

  if tg_op = 'INSERT' then
    if new.status = 'Pending' then
      v_delta_pending := new.days;
    elsif new.status = 'Approved' then
      v_delta_used := new.days;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'Pending' and new.status = 'Pending' then
      v_delta_pending := new.days - old.days;
    elsif old.status = 'Pending' and new.status = 'Approved' then
      v_delta_pending := -old.days;
      v_delta_used := new.days;
    elsif old.status = 'Pending' and new.status in ('Rejected','Cancelled') then
      v_delta_pending := -old.days;
    elsif old.status = 'Approved' and new.status in ('Rejected','Cancelled') then
      v_delta_used := -old.days;
    end if;
  end if;

  if v_delta_pending > 0
     and (v_balance.allocated - v_balance.used - v_balance.pending) < v_delta_pending then
    raise exception 'Insufficient leave balance: requested %, available %',
      v_delta_pending, (v_balance.allocated - v_balance.used - v_balance.pending)
      using errcode = '23514';
  end if;

  update erp.hr_leave_balances
     set pending = greatest(pending + v_delta_pending, 0),
         used    = greatest(used + v_delta_used, 0)
   where id = v_balance.id;

  return new;
end;
$$;

drop trigger if exists hr_leave_balance_sync on erp.hr_leave_requests;
create trigger hr_leave_balance_sync
  after insert or update of status, days on erp.hr_leave_requests
  for each row execute function erp.hr_leave_balance_sync();

-- ---------------------------------------------------------------------------
-- 4. Attendance correction approval applies the correction
-- ---------------------------------------------------------------------------
create or replace function erp.hr_apply_attendance_correction()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
begin
  if new.status = 'Approved' and old.status <> 'Approved' then
    insert into erp.hr_attendance (
      org_id, employee_id, attendance_date, check_in, check_out, status, source, corrected, note
    ) values (
      new.org_id, new.employee_id, new.correction_date, new.check_in, new.check_out,
      new.requested_status, 'Manual', true, 'Correction approved'
    )
    on conflict (org_id, employee_id, attendance_date)
    do update set
      check_in  = excluded.check_in,
      check_out = excluded.check_out,
      status    = excluded.status,
      corrected = true,
      note      = excluded.note,
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists hr_apply_attendance_correction on erp.hr_attendance_corrections;
create trigger hr_apply_attendance_correction
  after update of status on erp.hr_attendance_corrections
  for each row execute function erp.hr_apply_attendance_correction();

-- ---------------------------------------------------------------------------
-- 5. Payslip net pay + payroll run totals
-- ---------------------------------------------------------------------------
create or replace function erp.hr_payslip_compute_net()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.net_pay := new.basic + new.allowances + new.overtime
                 - new.deductions - new.leave_deduction - new.tax;
  if new.net_pay < 0 then
    raise exception 'Payslip net pay cannot be negative (employee %, period %)', new.employee_id, new.period
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists hr_payslip_compute_net on erp.hr_payslips;
create trigger hr_payslip_compute_net
  before insert or update on erp.hr_payslips
  for each row execute function erp.hr_payslip_compute_net();

create or replace function erp.hr_payroll_run_totals()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_run uuid := coalesce(new.payroll_run_id, old.payroll_run_id);
begin
  update erp.hr_payroll_runs r
     set total_gross = coalesce((select sum(ps.basic + ps.allowances + ps.overtime)
                                   from erp.hr_payslips ps where ps.payroll_run_id = v_run), 0),
         total_deductions = coalesce((select sum(ps.deductions + ps.leave_deduction + ps.tax)
                                   from erp.hr_payslips ps where ps.payroll_run_id = v_run), 0),
         total_net = coalesce((select sum(ps.net_pay)
                                   from erp.hr_payslips ps where ps.payroll_run_id = v_run), 0)
   where r.id = v_run;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists hr_payroll_run_totals on erp.hr_payslips;
create trigger hr_payroll_run_totals
  after insert or update or delete on erp.hr_payslips
  for each row execute function erp.hr_payroll_run_totals();

-- ---------------------------------------------------------------------------
-- 6. Reward ledger → wallet balance (append-only, no negative balance)
-- ---------------------------------------------------------------------------
create or replace function erp.mkt_reward_tx_apply()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_balance numeric(14,2);
begin
  select balance into v_balance
    from erp.mkt_reward_wallets
   where id = new.wallet_id
   for update;

  if v_balance is null then
    raise exception 'Reward wallet % not found', new.wallet_id using errcode = 'P0002';
  end if;

  v_balance := v_balance + new.amount;
  if v_balance < 0 then
    raise exception 'Reward redemption exceeds available balance' using errcode = '23514';
  end if;

  new.balance_after := v_balance;

  update erp.mkt_reward_wallets
     set balance = v_balance,
         updated_at = now()
   where id = new.wallet_id;

  return new;
end;
$$;

drop trigger if exists mkt_reward_tx_apply on erp.mkt_reward_transactions;
create trigger mkt_reward_tx_apply
  before insert on erp.mkt_reward_transactions
  for each row execute function erp.mkt_reward_tx_apply();

-- ---------------------------------------------------------------------------
-- 7. Payment allocation guard — prevents overpayment and cross-org allocation
-- ---------------------------------------------------------------------------
create or replace function erp.payment_alloc_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_invoice_total numeric(14,2);
  v_invoice_paid  numeric(14,2);
  v_payment_amount numeric(14,2);
  v_payment_allocated numeric(14,2);
  v_invoice_org uuid;
  v_payment_org uuid;
begin
  select total_amount, org_id into v_invoice_total, v_invoice_org
    from erp.invoices where id = new.invoice_id and status <> 'cancelled';
  if v_invoice_total is null then
    raise exception 'Invoice % not found or cancelled', new.invoice_id using errcode = '23503';
  end if;

  select amount, org_id into v_payment_amount, v_payment_org
    from erp.payments where id = new.payment_id;
  if v_payment_amount is null then
    raise exception 'Payment % not found', new.payment_id using errcode = '23503';
  end if;

  if v_invoice_org <> v_payment_org or new.org_id <> v_invoice_org then
    raise exception 'Cross-organization payment allocation is not allowed' using errcode = '42501';
  end if;

  select coalesce(sum(amount),0) into v_invoice_paid
    from erp.payment_allocations where invoice_id = new.invoice_id;

  if v_invoice_paid + new.amount > v_invoice_total then
    raise exception 'Allocation exceeds invoice balance (invoice %, paid %, new %)',
      v_invoice_total, v_invoice_paid, new.amount using errcode = '23514';
  end if;

  select coalesce(sum(amount),0) into v_payment_allocated
    from erp.payment_allocations where payment_id = new.payment_id;

  if v_payment_allocated + new.amount > v_payment_amount then
    raise exception 'Allocation exceeds payment amount (payment %, allocated %, new %)',
      v_payment_amount, v_payment_allocated, new.amount using errcode = '23514';
  end if;

  new.org_id := v_invoice_org;
  return new;
end;
$$;

drop trigger if exists payment_alloc_guard on erp.payment_allocations;
create trigger payment_alloc_guard
  before insert or update on erp.payment_allocations
  for each row execute function erp.payment_alloc_guard();

create or replace function erp.payment_alloc_invoice_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  v_total numeric(14,2);
  v_paid  numeric(14,2);
begin
  select total_amount into v_total from erp.invoices where id = v_invoice;
  select coalesce(sum(amount),0) into v_paid from erp.payment_allocations where invoice_id = v_invoice;

  update erp.invoices
     set status = case
                    when v_paid >= v_total then 'paid'
                    when v_paid > 0 then 'partially_paid'
                    else status
                  end,
         updated_at = now()
   where id = v_invoice and status not in ('cancelled','draft');
  return null;
end;
$$;

drop trigger if exists payment_alloc_invoice_status on erp.payment_allocations;
create trigger payment_alloc_invoice_status
  after insert or update or delete on erp.payment_allocations
  for each row execute function erp.payment_alloc_invoice_status();

-- ---------------------------------------------------------------------------
-- 8. Discount authority
-- ---------------------------------------------------------------------------
alter table erp.users
  add column if not exists max_discount_percent numeric(5,2) not null default 0;

create or replace function erp.can_approve_discount(p_percent numeric)
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
       and (
         r.code in ('system_admin','admin','manager','finance')
         or u.max_discount_percent >= p_percent
       )
  );
$$;

-- When a discount exceeds the requester's authority it must go through approval.
create or replace function erp.mkt_discount_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_max numeric(5,2);
begin
  select coalesce(max_discount_percent, 0) into v_max
    from erp.users where id = coalesce(new.requested_by, erp.current_user_id());

  if new.status = 'Approved'
     and new.requested_percent > coalesce(v_max, 0)
     and not erp.can_approve_discount(new.requested_percent) then
    raise exception 'Discount of %%% exceeds delegated authority; approval required', new.requested_percent
      using errcode = '42501';
  end if;

  if new.status = 'Approved' and coalesce(new.approved_percent, 0) = 0 then
    new.approved_percent := new.requested_percent;
  end if;

  return new;
end;
$$;

drop trigger if exists mkt_discount_guard on erp.mkt_discounts;
create trigger mkt_discount_guard
  before insert or update on erp.mkt_discounts
  for each row execute function erp.mkt_discount_guard();

-- ---------------------------------------------------------------------------
-- 9. Lead conversion integrity
-- ---------------------------------------------------------------------------
create or replace function erp.mkt_lead_conversion_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_lead erp.mkt_leads;
begin
  select * into v_lead from erp.mkt_leads where id = new.lead_id for update;
  if not found then
    raise exception 'Lead % not found', new.lead_id using errcode = '23503';
  end if;

  if v_lead.org_id <> new.org_id then
    raise exception 'Cross-organization lead conversion is not allowed' using errcode = '42501';
  end if;

  if v_lead.customer_id is not null and v_lead.customer_id <> new.customer_id then
    raise exception 'Lead % is already converted to customer %', new.lead_id, v_lead.customer_id
      using errcode = '23505';
  end if;

  if not exists (select 1 from erp.customers c where c.id = new.customer_id and c.org_id = new.org_id) then
    raise exception 'Customer % does not belong to organization %', new.customer_id, new.org_id
      using errcode = '42501';
  end if;

  update erp.mkt_leads
     set converted = true,
         customer_id = new.customer_id,
         status = 'Converted',
         updated_at = now()
   where id = new.lead_id;

  update erp.customers
     set source_lead_id = coalesce(source_lead_id, new.lead_id),
         updated_at = now()
   where id = new.customer_id;

  return new;
end;
$$;

drop trigger if exists mkt_lead_conversion_guard on erp.mkt_lead_conversions;
create trigger mkt_lead_conversion_guard
  before insert on erp.mkt_lead_conversions
  for each row execute function erp.mkt_lead_conversion_guard();

-- ---------------------------------------------------------------------------
-- 10. Generic audit trail for sensitive tables
-- ---------------------------------------------------------------------------
create or replace function erp.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, erp
as $$
declare
  v_org uuid;
  v_id uuid;
  v_summary text;
begin
  v_org := coalesce(
    case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'org_id')::uuid
         else (to_jsonb(new) ->> 'org_id')::uuid end,
    erp.current_org_id()
  );

  if v_org is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_id := erp.try_uuid(case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id'
                            else to_jsonb(new) ->> 'id' end);

  v_summary := format('%s %s', tg_op, tg_table_name);

  insert into erp.audit_logs (
    org_id, actor_user_id, action, entity, entity_id, summary, before_data, after_data
  ) values (
    v_org,
    erp.current_user_id(),
    lower(tg_op),
    tg_table_name,
    v_id,
    v_summary,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'hr_daily_payments','hr_expenses','hr_payroll_runs','hr_contracts',
    'mkt_expenses','mkt_discounts','mkt_plans','mkt_leads','mkt_campaigns',
    'approval_requests'
  ]
  loop
    execute format('drop trigger if exists audit_row_change on erp.%I', t);
    execute format(
      'create trigger audit_row_change after insert or update or delete on erp.%I
         for each row execute function erp.audit_row_change()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Grants for the new helpers
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regrole('authenticated') is not null then
    grant execute on function erp.can_approve_discount(numeric) to authenticated;
  end if;
end $$;
