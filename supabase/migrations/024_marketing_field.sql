-- =============================================================================
-- 024_marketing_field.sql
-- Field visits, market research surveys, dealer/prospect onboarding and the
-- consolidated marketing activity record.
-- =============================================================================

create table if not exists erp.mkt_field_visits (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  code          text not null,
  business      text not null,
  contact_name  text,
  contact_phone text,
  lead_id       uuid references erp.mkt_leads(id) on delete set null,
  customer_id   uuid references erp.customers(id) on delete set null,
  purpose       text,
  visit_type    text not null default 'Field Visit'
                  check (visit_type in ('Field Visit','Store Visit','Demo','Dealer Visit')),
  visit_date    date not null default current_date,
  visit_time    text,
  location      text,
  check_in_at   timestamptz,
  check_out_at  timestamptz,
  assigned_to   uuid references erp.users(id) on delete set null,
  notes         text,
  demo_follow_up text,
  checklist     jsonb not null default '[]'::jsonb,
  outcome       text,
  competitor_brands text,
  samples_dispensed text,
  status        text not null default 'Scheduled'
                  check (status in ('Scheduled','In Progress','Completed','Cancelled')),
  created_by    uuid references erp.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, code),
  check (check_out_at is null or check_in_at is null or check_out_at >= check_in_at)
);

create index if not exists mkt_visits_assignee_idx on erp.mkt_field_visits (org_id, assigned_to, visit_date desc);
create index if not exists mkt_visits_status_idx   on erp.mkt_field_visits (org_id, status, visit_date);

create table if not exists erp.mkt_market_surveys (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  competitor        text not null,
  region_id         uuid references erp.regions(id) on delete set null,
  region_text       text,
  observation       text not null,
  product_feedback  text,
  interest          text not null default 'Medium' check (interest in ('High','Medium','Low')),
  pricing_observation text,
  submitted_by      uuid references erp.users(id) on delete set null,
  survey_date       date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists mkt_surveys_idx on erp.mkt_market_surveys (org_id, survey_date desc);

create table if not exists erp.mkt_dealer_prospects (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  code          text not null,
  business_name text not null,
  contact_name  text,
  phone         text,
  email         text,
  city          text,
  state         text,
  address       text,
  category      text,
  stage         text not null default 'Prospect'
                  check (stage in ('Prospect','Contacted','Interested','Onboarding','Onboarded','Rejected')),
  lead_id       uuid references erp.mkt_leads(id) on delete set null,
  customer_id   uuid references erp.customers(id) on delete set null,
  owner_user_id uuid references erp.users(id) on delete set null,
  notes         text,
  next_follow_up date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, code)
);

create index if not exists mkt_dealers_owner_idx on erp.mkt_dealer_prospects (org_id, owner_user_id, stage);

-- Consolidated, immutable-by-append activity record used by the activity feed
-- and by the "Marketing Activity Records" report.
create table if not exists erp.mkt_activity_records (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references erp.organizations(id) on delete cascade,
  employee_id    uuid references erp.users(id) on delete set null,
  employee_name  text,
  activity_type  text not null default 'Other Marketing Activities',
  subject        text not null,
  detail         text,
  reference_type text,
  reference_id   uuid,
  occurred_at    timestamptz not null default now(),
  created_by     uuid references erp.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists mkt_activity_records_idx on erp.mkt_activity_records (org_id, occurred_at desc);
