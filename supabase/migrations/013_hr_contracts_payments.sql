-- =============================================================================
-- 013_hr_contracts_payments.sql
-- Employee/contractor/vendor contracts, signatures, schedules, documents and
-- the HR daily-payment queue that feeds Finance.
-- =============================================================================

create table if not exists erp.hr_contracts (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references erp.organizations(id) on delete cascade,
  code               text not null,
  title              text not null,
  party_type         text not null default 'Employee'
                       check (party_type in ('Employee','Contractor','Vendor')),
  employee_id        uuid references erp.hr_employees(id) on delete set null,
  party_name         text not null,
  department_id      uuid references erp.departments(id) on delete set null,
  contract_type      text not null default 'Employment',
  start_date         date not null,
  end_date           date not null,
  value              numeric(14,2) not null default 0 check (value >= 0),
  currency           char(3) not null default 'INR',
  payment_frequency  text not null default 'Monthly'
                       check (payment_frequency in ('Monthly','Quarterly','Annual','Milestone','One-time')),
  status             text not null default 'Draft'
                       check (status in ('Draft','Pending Review','Pending Signature','Active',
                                         'Expiring Soon','Expired','Renewed','Terminated')),
  notes              text,
  terminated_reason  text,
  created_by         uuid references erp.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (org_id, code),
  check (end_date >= start_date)
);

create index if not exists hr_contracts_emp_idx on erp.hr_contracts (org_id, employee_id, status);

create table if not exists erp.hr_contract_signatures (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references erp.organizations(id) on delete cascade,
  contract_id  uuid not null references erp.hr_contracts(id) on delete cascade,
  signer_name  text not null,
  signer_role  text not null,
  status       text not null default 'Pending' check (status in ('Pending','Signed')),
  signed_at    timestamptz,
  signature_path text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists erp.hr_contract_payments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references erp.organizations(id) on delete cascade,
  contract_id  uuid not null references erp.hr_contracts(id) on delete cascade,
  due_date     date not null,
  amount       numeric(14,2) not null check (amount > 0),
  status       text not null default 'Scheduled'
                 check (status in ('Scheduled','Paid','Overdue','Cancelled')),
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists hr_contract_payments_idx on erp.hr_contract_payments (contract_id, due_date);

create table if not exists erp.hr_contract_documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references erp.organizations(id) on delete cascade,
  contract_id  uuid not null references erp.hr_contracts(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  status       text not null default 'Pending'
                 check (status in ('Verified','Pending','Rejected')),
  uploaded_by  uuid references erp.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, storage_path)
);

-- ---------------------------------------------------------------------------
-- Daily payments
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_daily_payments (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references erp.organizations(id) on delete cascade,
  code               text not null,
  payee              text not null,
  party_type         text not null default 'Employee'
                       check (party_type in ('Employee','Contractor','Vendor')),
  employee_id        uuid references erp.hr_employees(id) on delete set null,
  contract_id        uuid references erp.hr_contracts(id) on delete set null,
  payment_date       date not null default current_date,
  due_date           date,
  category           text not null default 'Salary',
  amount             numeric(14,2) not null check (amount > 0),
  currency           char(3) not null default 'INR',
  method             text not null default 'Bank Transfer'
                       check (method in ('Bank Transfer','UPI','Cheque','Cash','Card')),
  approval_status    text not null default 'Pending'
                       check (approval_status in ('Pending','Approved','Rejected')),
  payment_status     text not null default 'Pending'
                       check (payment_status in ('Pending','Processing','Paid','Failed','Overdue')),
  description        text,
  remarks            text,
  approved_by        uuid references erp.users(id) on delete set null,
  approved_at        timestamptz,
  -- Set when the approved payment is posted to the shared Finance ledger
  finance_payment_id uuid references erp.payments(id) on delete set null,
  idempotency_key    text,
  created_by         uuid references erp.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (org_id, code),
  unique (org_id, idempotency_key)
);

create index if not exists hr_payments_status_idx on erp.hr_daily_payments (org_id, approval_status, payment_status);
create index if not exists hr_payments_emp_idx    on erp.hr_daily_payments (org_id, employee_id, payment_date desc);

create table if not exists erp.hr_payment_history (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  payment_id    uuid not null references erp.hr_daily_payments(id) on delete cascade,
  action        text not null,
  actor_user_id uuid references erp.users(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
