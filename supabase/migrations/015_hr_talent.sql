-- =============================================================================
-- 015_hr_talent.sql
-- Recruitment, onboarding, performance, employee requests, offboarding and the
-- HR activity feed. These back the remaining HR portal workspaces.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Recruitment
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_job_openings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  title           text not null,
  department_id   uuid references erp.departments(id) on delete set null,
  location        text,
  employment_type text not null default 'Full-time'
                    check (employment_type in ('Full-time','Part-time','Contract','Internship')),
  posted_on       date not null default current_date,
  deadline        date,
  status          text not null default 'Open'
                    check (status in ('Open','On Hold','Closed')),
  hiring_manager_id uuid references erp.users(id) on delete set null,
  openings        int not null default 1 check (openings > 0),
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists erp.hr_candidates (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  job_id            uuid references erp.hr_job_openings(id) on delete set null,
  name              text not null,
  email             text,
  phone             text,
  stage             text not null default 'Applied'
                      check (stage in ('Applied','Screening','Interview','Offer','Hired','Rejected')),
  applied_on        date not null default current_date,
  source            text,
  resume_path       text,
  rating            numeric(3,1) check (rating is null or rating between 0 and 5),
  experience_years  numeric(4,1) check (experience_years is null or experience_years >= 0),
  current_company   text,
  expected_salary   numeric(14,2) check (expected_salary is null or expected_salary >= 0),
  offer_salary      numeric(14,2) check (offer_salary is null or offer_salary >= 0),
  offer_status      text check (offer_status in ('Sent','Accepted','Declined')),
  rejection_reason  text,
  notes             text,
  converted_employee_id uuid references erp.hr_employees(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists hr_candidates_job_idx on erp.hr_candidates (org_id, job_id, stage);

create table if not exists erp.hr_interviews (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  candidate_id  uuid not null references erp.hr_candidates(id) on delete cascade,
  round         text not null,
  interview_date date not null,
  interview_time text,
  interviewer_id uuid references erp.users(id) on delete set null,
  interviewer_name text,
  mode          text not null default 'Video' check (mode in ('Video','On-site','Phone')),
  feedback      text,
  rating        numeric(3,1) check (rating is null or rating between 0 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_onboarding_records (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  employee_id     uuid references erp.hr_employees(id) on delete set null,
  name            text not null,
  email           text,
  designation_id  uuid references erp.designations(id) on delete set null,
  designation     text,
  department_id   uuid references erp.departments(id) on delete set null,
  manager_id      uuid references erp.users(id) on delete set null,
  manager_name    text,
  employment_type text not null default 'Full-time'
                    check (employment_type in ('Full-time','Part-time','Contract','Internship')),
  joining_date    date not null,
  status          text not null default 'Not Started'
                    check (status in ('Not Started','In Progress','Ready','Completed')),
  checklist       jsonb not null default '[]'::jsonb,
  systems         jsonb not null default '[]'::jsonb,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Performance
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_performance_reviews (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references erp.organizations(id) on delete cascade,
  employee_id    uuid not null references erp.hr_employees(id) on delete cascade,
  period         text not null,
  cycle          text not null,
  due_date       date,
  status         text not null default 'Not Started'
                   check (status in ('Not Started','Self Assessment','Manager Review','HR Review','Completed')),
  self_rating    numeric(3,1) check (self_rating is null or self_rating between 0 and 5),
  manager_rating numeric(3,1) check (manager_rating is null or manager_rating between 0 and 5),
  hr_rating      numeric(3,1) check (hr_rating is null or hr_rating between 0 and 5),
  goals          jsonb not null default '[]'::jsonb,
  strengths      text,
  improvements   text,
  comments       text,
  manager_id     uuid references erp.users(id) on delete set null,
  manager_name   text,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, employee_id, period, cycle)
);

create index if not exists hr_reviews_emp_idx on erp.hr_performance_reviews (org_id, employee_id, period);

-- ---------------------------------------------------------------------------
-- Employee requests (HR helpdesk)
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_employee_requests (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  employee_id      uuid not null references erp.hr_employees(id) on delete cascade,
  request_type     text not null,
  subject          text not null,
  description      text not null,
  status           text not null default 'Open'
                     check (status in ('Open','In Progress','Resolved','Rejected')),
  priority         text not null default 'Medium'
                     check (priority in ('Low','Medium','High','Urgent')),
  assigned_to      uuid references erp.users(id) on delete set null,
  responses        jsonb not null default '[]'::jsonb,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists hr_requests_status_idx on erp.hr_employee_requests (org_id, status, priority);

-- ---------------------------------------------------------------------------
-- Offboarding
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_offboarding_records (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references erp.organizations(id) on delete cascade,
  employee_id           uuid not null references erp.hr_employees(id) on delete cascade,
  resignation_date      date not null,
  last_working_day      date not null,
  reason                text,
  notice_period_days    int not null default 0 check (notice_period_days >= 0),
  status                text not null default 'In Progress'
                          check (status in ('In Progress','Clearance','Completed','Cancelled')),
  exit_interview_date   date,
  exit_interview_notes  text,
  clearances            jsonb not null default '[]'::jsonb,
  settlement_amount     numeric(14,2) not null default 0 check (settlement_amount >= 0),
  settlement_status     text not null default 'Pending'
                          check (settlement_status in ('Pending','Processing','Paid')),
  settlement_notes      text,
  history               jsonb not null default '[]'::jsonb,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (last_working_day >= resignation_date),
  unique (org_id, employee_id)
);

-- ---------------------------------------------------------------------------
-- Activity feed
-- ---------------------------------------------------------------------------
create table if not exists erp.hr_activities (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  activity_type text not null,
  title         text not null,
  detail        text,
  actor_user_id uuid references erp.users(id) on delete set null,
  actor_name    text,
  created_at    timestamptz not null default now()
);

create index if not exists hr_activities_idx on erp.hr_activities (org_id, created_at desc);
