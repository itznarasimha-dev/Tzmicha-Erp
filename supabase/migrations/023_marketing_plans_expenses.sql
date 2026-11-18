-- =============================================================================
-- 023_marketing_plans_expenses.sql
-- Monthly marketing plans (multi-stage workflow), their activities, approval
-- trail, and one unified marketing expense table.
--
-- Expense unification: campaign expenses, monthly-plan expenses and field
-- claims previously lived in three incompatible frontend models. They share one
-- table, discriminated by `source`, so approval and reporting are consistent.
-- =============================================================================

create table if not exists erp.mkt_plans (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references erp.organizations(id) on delete cascade,
  code               text not null,
  title              text not null,
  month              text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  employee_id        uuid not null references erp.users(id) on delete cascade,
  employee_role      text,
  senior_reviewer_id uuid references erp.users(id) on delete set null,
  objective          text,
  target_audience    text,
  planned_activities text,
  expected_leads     int not null default 0 check (expected_leads >= 0),
  expected_conversions int not null default 0 check (expected_conversions >= 0),
  monthly_target     int not null default 0 check (monthly_target >= 0),
  estimated_budget   numeric(14,2) not null default 0 check (estimated_budget >= 0),
  requested_amount   numeric(14,2) not null default 0 check (requested_amount >= 0),
  expected_outcome   text,
  start_date         date,
  end_date           date,
  supporting_notes   text,
  status             text not null default 'Draft'
                       check (status in ('Draft','Pending Senior Review','Pending Manager Approval',
                                         'Pending Admin Financial Authorization','Changes Requested',
                                         'Rejected','Approved','In Progress',
                                         'Submitted for Results Review','Completed')),
  finance_required   boolean not null default false,
  revision_reason    text,
  current_approver_name text,
  previous_approver_name text,
  submitted_at       timestamptz,
  results_submitted_at timestamptz,
  completed_at       timestamptz,
  -- execution snapshot
  execution_started_at timestamptz,
  completed_activities int not null default 0,
  actual_leads       int not null default 0,
  qualified_leads    int not null default 0,
  completed_field_visits int not null default 0,
  trade_partner_visits int not null default 0,
  actual_spending    numeric(14,2) not null default 0,
  execution_percent  numeric(5,2) not null default 0 check (execution_percent between 0 and 100),
  results            text,
  execution_remarks  text,
  idempotency_key    text,
  created_by         uuid references erp.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (org_id, code),
  unique (org_id, idempotency_key),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists mkt_plans_emp_idx    on erp.mkt_plans (org_id, employee_id, month);
create index if not exists mkt_plans_status_idx on erp.mkt_plans (org_id, status, month);

create table if not exists erp.mkt_plan_activities (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  plan_id           uuid not null references erp.mkt_plans(id) on delete cascade,
  activity_type     text not null,
  name              text not null,
  objective         text,
  target_audience   text,
  planned_activities text,
  expected_leads    int not null default 0,
  expected_conversions int not null default 0,
  monthly_target    int not null default 0,
  estimated_budget  numeric(14,2) not null default 0,
  expected_outcome  text,
  start_date        date,
  end_date          date,
  supporting_notes  text,
  completed_activities int not null default 0,
  actual_leads      int not null default 0,
  qualified_leads   int not null default 0,
  completed_field_visits int not null default 0,
  trade_partner_visits int not null default 0,
  actual_spending   numeric(14,2) not null default 0,
  execution_percent numeric(5,2) not null default 0,
  results           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists mkt_plan_activities_idx on erp.mkt_plan_activities (plan_id);

create table if not exists erp.mkt_plan_approvals (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references erp.organizations(id) on delete cascade,
  plan_id      uuid not null references erp.mkt_plans(id) on delete cascade,
  stage        text not null
                 check (stage in ('submission','senior','manager','admin','execution','results','completed')),
  action       text not null,
  by_user_id   uuid references erp.users(id) on delete set null,
  by_name      text,
  by_role      text,
  decision     text not null
                 check (decision in ('Submitted','Approved','Changes Requested','Rejected','Started',
                                     'Progress Updated','Results Submitted','Revision Requested','Completed')),
  comments     text,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists mkt_plan_approvals_idx on erp.mkt_plan_approvals (plan_id, occurred_at);

-- Deferred FK from shared targets to plans
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'marketing_targets_plan_fkey'
       and conrelid = 'erp.marketing_targets'::regclass
  ) then
    alter table erp.marketing_targets
      add constraint marketing_targets_plan_fkey
      foreign key (plan_id) references erp.mkt_plans(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Unified marketing expenses
-- ---------------------------------------------------------------------------
create table if not exists erp.mkt_expenses (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  code             text not null,
  source           text not null default 'campaign'
                     check (source in ('campaign','monthly_plan','field_claim','other')),
  title            text not null,
  plan_id          uuid references erp.mkt_plans(id) on delete set null,
  plan_activity_id uuid references erp.mkt_plan_activities(id) on delete set null,
  campaign_id      uuid references erp.mkt_campaigns(id) on delete set null,
  employee_id      uuid references erp.users(id) on delete set null,
  category         text not null default 'Other'
                     check (category in ('Advertising','Content Production','Events','Field Marketing',
                                         'Printing','Influencer Fees','Travel','Other')),
  vendor_name      text,
  amount           numeric(14,2) not null check (amount > 0),
  currency         char(3) not null default 'INR',
  expense_date     date not null default current_date,
  description      text not null,
  document_path    text,
  status           text not null default 'Draft'
                     check (status in ('Draft','Submitted','Pending Manager Review',
                                       'Pending Admin Financial Authorization','Changes Requested',
                                       'Approved','Rejected','Paid','Reimbursed')),
  manager_required boolean not null default true,
  finance_required boolean not null default true,
  submitted_at     timestamptz,
  current_approver_name text,
  reviewer_comments text,
  decided_at       timestamptz,
  decided_by       uuid references erp.users(id) on delete set null,
  invoice_id       uuid references erp.invoices(id) on delete set null,
  finance_payment_id uuid references erp.payments(id) on delete set null,
  idempotency_key  text,
  created_by       uuid references erp.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, code),
  unique (org_id, idempotency_key),
  check (status <> 'Rejected' or length(coalesce(reviewer_comments,'')) > 0)
);

create index if not exists mkt_expenses_emp_idx    on erp.mkt_expenses (org_id, employee_id, expense_date desc);
create index if not exists mkt_expenses_status_idx on erp.mkt_expenses (org_id, status, submitted_at desc);
create index if not exists mkt_expenses_plan_idx   on erp.mkt_expenses (plan_id);

create table if not exists erp.mkt_expense_approvals (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  expense_id       uuid not null references erp.mkt_expenses(id) on delete cascade,
  stage            text not null default 'manager'
                     check (stage in ('manager','admin','finance')),
  approver_user_id uuid references erp.users(id) on delete set null,
  decision         text not null check (decision in ('Approved','Rejected','Changes Requested')),
  comments         text,
  decided_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists mkt_expense_approvals_idx on erp.mkt_expense_approvals (expense_id, decided_at);
