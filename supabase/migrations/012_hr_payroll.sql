-- =============================================================================
-- 012_hr_payroll.sql
-- Salary components, salary structures, payroll runs, payslips and lines.
-- =============================================================================

create table if not exists erp.hr_salary_components (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  code            text not null,
  name            text not null,
  component_kind  text not null check (component_kind in ('Earning','Deduction','Employer Contribution')),
  taxable         boolean not null default true,
  calculation     text not null default 'Fixed'
                    check (calculation in ('Fixed','PercentOfBasic','PercentOfGross')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.hr_salary_structures (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references erp.organizations(id) on delete cascade,
  employee_id    uuid not null references erp.hr_employees(id) on delete cascade,
  effective_from date not null,
  effective_to   date,
  currency       char(3) not null default 'INR',
  annual_ctc     numeric(14,2) not null default 0 check (annual_ctc >= 0),
  basic          numeric(14,2) not null default 0 check (basic >= 0),
  hra            numeric(14,2) not null default 0 check (hra >= 0),
  allowances     numeric(14,2) not null default 0 check (allowances >= 0),
  deductions     numeric(14,2) not null default 0 check (deductions >= 0),
  employer_pf    numeric(14,2) not null default 0 check (employer_pf >= 0),
  status         text not null default 'Active'
                   check (status in ('Draft','Active','Superseded')),
  note           text,
  created_by     uuid references erp.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, employee_id, effective_from),
  check (effective_to is null or effective_to >= effective_from)
);

create index if not exists hr_salary_emp_idx on erp.hr_salary_structures (org_id, employee_id, effective_from desc);

create table if not exists erp.hr_payroll_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  period        text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status        text not null default 'Draft'
                  check (status in ('Draft','HR Review','Finance Approval','Approved','Paid','Cancelled')),
  total_gross   numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  total_net     numeric(14,2) not null default 0,
  notes         text,
  prepared_by   uuid references erp.users(id) on delete set null,
  reviewed_by   uuid references erp.users(id) on delete set null,
  approved_by   uuid references erp.users(id) on delete set null,
  approved_at   timestamptz,
  paid_at       timestamptz,
  idempotency_key text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, period),
  unique (org_id, idempotency_key)
);

create table if not exists erp.hr_payslips (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  payroll_run_id   uuid not null references erp.hr_payroll_runs(id) on delete cascade,
  employee_id      uuid not null references erp.hr_employees(id) on delete restrict,
  period           text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  basic            numeric(14,2) not null default 0 check (basic >= 0),
  allowances       numeric(14,2) not null default 0 check (allowances >= 0),
  overtime         numeric(14,2) not null default 0 check (overtime >= 0),
  deductions       numeric(14,2) not null default 0 check (deductions >= 0),
  leave_deduction  numeric(14,2) not null default 0 check (leave_deduction >= 0),
  tax              numeric(14,2) not null default 0 check (tax >= 0),
  net_pay          numeric(14,2) not null default 0,
  attendance_days  numeric(5,1) not null default 0,
  leave_days       numeric(5,1) not null default 0,
  status           text not null default 'Draft'
                     check (status in ('Draft','HR Review','Finance Approval','Approved','Paid')),
  note             text,
  payslip_code     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, payroll_run_id, employee_id),
  constraint hr_payslip_net_matches
    check (net_pay = basic + allowances + overtime - deductions - leave_deduction - tax)
);

create index if not exists hr_payslips_emp_idx on erp.hr_payslips (org_id, employee_id, period desc);

create table if not exists erp.hr_payslip_lines (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references erp.organizations(id) on delete cascade,
  payslip_id   uuid not null references erp.hr_payslips(id) on delete cascade,
  component_id uuid references erp.hr_salary_components(id) on delete set null,
  label        text not null,
  line_kind    text not null check (line_kind in ('Earning','Deduction')),
  amount       numeric(14,2) not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists hr_payslip_lines_idx on erp.hr_payslip_lines (payslip_id);
