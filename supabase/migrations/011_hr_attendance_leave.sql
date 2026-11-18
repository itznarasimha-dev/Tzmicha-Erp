-- =============================================================================
-- 011_hr_attendance_leave.sql
-- Attendance register, correction requests, leave policy, balances, requests
-- and the approval trail.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_attendance (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  employee_id   uuid not null references erp.hr_employees(id) on delete cascade,
  attendance_date date not null,
  check_in      timestamptz,
  check_out     timestamptz,
  status        text not null default 'Present'
                  check (status in ('Present','Late','Absent','On Leave','Remote','Half Day')),
  hours         numeric(4,2) not null default 0 check (hours between 0 and 24),
  note          text,
  source        text not null default 'Web'
                  check (source in ('Biometric','Web','Manual','Mobile')),
  corrected     boolean not null default false,
  linked_leave_id uuid,
  recorded_by   uuid references erp.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, employee_id, attendance_date),
  check (check_out is null or check_in is null or check_out >= check_in)
);

create index if not exists hr_attendance_emp_idx  on erp.hr_attendance (org_id, employee_id, attendance_date desc);
create index if not exists hr_attendance_date_idx on erp.hr_attendance (org_id, attendance_date);

create table if not exists erp.hr_attendance_corrections (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  employee_id      uuid not null references erp.hr_employees(id) on delete cascade,
  attendance_id    uuid references erp.hr_attendance(id) on delete set null,
  correction_date  date not null,
  requested_status text not null
                     check (requested_status in ('Present','Late','Absent','On Leave','Remote','Half Day')),
  check_in         timestamptz,
  check_out        timestamptz,
  reason           text not null,
  status           text not null default 'Pending'
                     check (status in ('Pending','Approved','Rejected')),
  requested_at     timestamptz not null default now(),
  reviewed_by      uuid references erp.users(id) on delete set null,
  reviewed_at      timestamptz,
  remarks          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists hr_corrections_emp_idx on erp.hr_attendance_corrections (org_id, employee_id, status);

-- ---------------------------------------------------------------------------
-- Leave policy
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_leave_types (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  code              text not null,
  name              text not null,
  allocation_days   numeric(5,1) not null default 0 check (allocation_days between 0 and 365),
  paid              boolean not null default true,
  carry_forward     boolean not null default false,
  requires_approval boolean not null default true,
  color             text not null default '#6366f1',
  description       text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.hr_leave_balances (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  employee_id   uuid not null references erp.hr_employees(id) on delete cascade,
  leave_type_id uuid not null references erp.hr_leave_types(id) on delete cascade,
  year          int not null check (year between 2000 and 2100),
  allocated     numeric(5,1) not null default 0 check (allocated >= 0),
  used          numeric(5,1) not null default 0 check (used >= 0),
  pending       numeric(5,1) not null default 0 check (pending >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, employee_id, leave_type_id, year)
);

create table if not exists erp.hr_holidays (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  name       text not null,
  holiday_date date not null,
  holiday_type text not null default 'Public'
                 check (holiday_type in ('Public','Company','Optional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, holiday_date, name)
);

-- ---------------------------------------------------------------------------
-- Leave requests & approvals
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_leave_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  employee_id   uuid not null references erp.hr_employees(id) on delete cascade,
  leave_type_id uuid not null references erp.hr_leave_types(id) on delete restrict,
  start_date    date not null,
  end_date      date not null,
  days          numeric(5,1) not null check (days > 0),
  half_day      boolean not null default false,
  reason        text not null,
  status        text not null default 'Pending'
                  check (status in ('Pending','Approved','Rejected','Cancelled')),
  priority      text not null default 'Medium'
                  check (priority in ('Low','Medium','High','Urgent')),
  applied_on    timestamptz not null default now(),
  reviewer_id   uuid references erp.users(id) on delete set null,
  reviewer_name text,
  remarks       text,
  decided_at    timestamptz,
  created_by    uuid references erp.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists hr_leave_emp_idx    on erp.hr_leave_requests (org_id, employee_id, status);
create index if not exists hr_leave_status_idx on erp.hr_leave_requests (org_id, status, applied_on desc);

create table if not exists erp.hr_leave_approvals (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  leave_request_id uuid not null references erp.hr_leave_requests(id) on delete cascade,
  approver_user_id uuid references erp.users(id) on delete set null,
  decision         text not null check (decision in ('Approved','Rejected','Cancelled','Comment')),
  remarks          text,
  decided_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists hr_leave_approvals_req_idx on erp.hr_leave_approvals (leave_request_id, decided_at);
