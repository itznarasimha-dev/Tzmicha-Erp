-- =============================================================================
-- 014_hr_expenses.sql
-- HR expense claims (reimbursements) and their approval trail.
-- Receipts live in the private `receipts` bucket.
-- =============================================================================

create table if not exists erp.hr_expenses (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  code            text not null,
  employee_id     uuid not null references erp.hr_employees(id) on delete restrict,
  category        text not null default 'Other',
  amount          numeric(14,2) not null check (amount > 0),
  currency        char(3) not null default 'INR',
  expense_date    date not null default current_date,
  description     text not null,
  receipt_path    text,
  status          text not null default 'Pending'
                    check (status in ('Draft','Pending','Approved','Rejected','Paid','Reimbursed')),
  submitted_at    timestamptz,
  current_approver uuid references erp.users(id) on delete set null,
  decided_at      timestamptz,
  decided_by      uuid references erp.users(id) on delete set null,
  reviewer_remarks text,
  finance_payment_id uuid references erp.payments(id) on delete set null,
  idempotency_key text,
  created_by      uuid references erp.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, code),
  unique (org_id, idempotency_key),
  check (status <> 'Rejected' or length(coalesce(reviewer_remarks, '')) > 0)
);

create index if not exists hr_expenses_emp_idx    on erp.hr_expenses (org_id, employee_id, expense_date desc);
create index if not exists hr_expenses_status_idx on erp.hr_expenses (org_id, status, submitted_at desc);

create table if not exists erp.hr_expense_approvals (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  expense_id       uuid not null references erp.hr_expenses(id) on delete cascade,
  stage            text not null default 'HR Review'
                     check (stage in ('HR Review','Finance Review')),
  approver_user_id uuid references erp.users(id) on delete set null,
  decision         text not null check (decision in ('Approved','Rejected','Changes Requested')),
  remarks          text,
  decided_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists hr_expense_approvals_exp_idx on erp.hr_expense_approvals (expense_id, decided_at);
