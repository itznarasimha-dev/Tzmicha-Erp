-- =============================================================================
-- 010_hr_core.sql
-- HR employees, documents and module settings.
--
-- DESIGN: erp.users remains the single employee identity (shared ERP).
-- erp.hr_employees is a 1:1 HR profile extension. No second employee table,
-- no duplicated auth or role columns.
-- =============================================================================

create table if not exists erp.hr_employees (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  user_id           uuid not null references erp.users(id) on delete cascade,
  first_name        text not null,
  last_name         text not null,
  photo_url         text,
  date_of_birth     date,
  gender            text check (gender in ('Male','Female','Other')),
  personal_email    text,
  phone             text,
  address           text,
  emergency_contact text,
  joining_date      date not null default current_date,
  employment_type   text not null default 'Full-time'
                      check (employment_type in ('Full-time','Part-time','Contract','Internship')),
  employee_status   text not null default 'Active'
                      check (employee_status in ('Active','Probation','On Leave','Notice Period','Terminated')),
  department_id     uuid references erp.departments(id) on delete set null,
  designation_id    uuid references erp.designations(id) on delete set null,
  manager_id        uuid references erp.hr_employees(id) on delete set null,
  work_location     text,
  -- Sensitive payroll identity. Only the masked value is stored here; the full
  -- account number belongs in a vault/secret store, referenced by bank_account_ref.
  bank_account_masked text,
  bank_account_ref    text,
  bank_ifsc           text,
  -- Restricted compensation figure. Reads require hr.salary.read.
  current_ctc       numeric(14,2) check (current_ctc is null or current_ctc >= 0),
  skills            text[] not null default '{}',
  bio               text,
  terminated_at     timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists hr_employees_org_idx    on erp.hr_employees (org_id);
create index if not exists hr_employees_dept_idx   on erp.hr_employees (department_id);
create index if not exists hr_employees_status_idx on erp.hr_employees (org_id, employee_status);

create table if not exists erp.hr_employee_documents (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  employee_id   uuid not null references erp.hr_employees(id) on delete cascade,
  doc_type      text not null default 'Other',
  name          text not null,
  storage_path  text not null,
  mime_type     text,
  size_bytes    bigint check (size_bytes is null or size_bytes >= 0),
  status        text not null default 'Pending'
                  check (status in ('Verified','Pending','Rejected')),
  verified_by   uuid references erp.users(id) on delete set null,
  verified_at   timestamptz,
  uploaded_by   uuid references erp.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, storage_path)
);

create index if not exists hr_documents_employee_idx on erp.hr_employee_documents (employee_id);

-- Settings-driven configuration (departments/designations live in shared tables;
-- the remaining HR policy configuration is stored as a validated JSON document).
create table if not exists erp.hr_settings (
  org_id     uuid primary key references erp.organizations(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_by uuid references erp.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column erp.hr_employees.bank_account_masked is
  'Masked account only (e.g. ****1234). Never store a full account number.';
comment on column erp.hr_employees.current_ctc is
  'Confidential. SELECT must be gated by hr.salary.read or self-access.';
