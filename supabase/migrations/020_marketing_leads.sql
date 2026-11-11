-- =============================================================================
-- 020_marketing_leads.sql
-- Lead sources, leads, activities, follow-ups, sales handovers, rejections and
-- conversions.
--
-- The lead is the single customer-prospect record. Conversion writes into the
-- SHARED erp.customers table — Marketing never owns a customer table.
-- =============================================================================

create table if not exists erp.mkt_lead_sources (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  code       text not null,
  name       text not null,
  category   text not null default 'Other'
               check (category in ('Digital Marketing','Field Marketing','Trade Marketing',
                                   'Campaign','Website','Referral','Other')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.mkt_leads (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  code            text not null,
  name            text not null,
  company         text,
  phone           text,
  whatsapp        text,
  email           text,
  location        text,
  city            text,
  state           text,
  country         text default 'India',
  address         text,
  industry        text,
  customer_type   text,
  job_title       text,
  source_id       uuid references erp.mkt_lead_sources(id) on delete set null,
  source          text,
  source_category text
                    check (source_category is null or source_category in
                      ('Digital Marketing','Field Marketing','Trade Marketing',
                       'Campaign','Website','Referral','Other')),
  source_detail   text,
  marketing_activity text,
  campaign_id     uuid,
  product_id      uuid references erp.products(id) on delete set null,
  product_text    text,
  assigned_to     uuid references erp.users(id) on delete set null,
  generated_by    uuid references erp.users(id) on delete set null,
  status          text not null default 'New'
                    check (status in ('New','Contacted','Interested','Follow-up Required',
                                      'Qualified','Sent to Sales','Converted','Rejected',
                                      'Not Interested','Lost')),
  priority        text not null default 'Medium'
                    check (priority in ('Urgent','High','Medium','Low')),
  next_follow_up  timestamptz,
  last_contact    timestamptz,
  next_action     text,
  notes           text,
  solutions_discussed text,
  information_shared  text,
  interests       jsonb not null default '{}'::jsonb,
  qualification   jsonb not null default '{}'::jsonb,
  attribution     jsonb not null default '{}'::jsonb,
  converted       boolean not null default false,
  customer_id     uuid references erp.customers(id) on delete set null,
  lost_reason     text,
  created_by      uuid references erp.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, code),
  check (not converted or customer_id is not null)
);

create index if not exists mkt_leads_org_idx      on erp.mkt_leads (org_id, status, created_at desc);
create index if not exists mkt_leads_phone_idx    on erp.mkt_leads (org_id, phone);
create index if not exists mkt_leads_email_idx    on erp.mkt_leads (org_id, lower(email));
create index if not exists mkt_leads_assignee_idx on erp.mkt_leads (org_id, assigned_to, status);
create index if not exists mkt_leads_campaign_idx on erp.mkt_leads (campaign_id);

create table if not exists erp.mkt_lead_activities (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  lead_id       uuid not null references erp.mkt_leads(id) on delete cascade,
  activity_type text not null,
  summary       text not null,
  actor_user_id uuid references erp.users(id) on delete set null,
  actor_name    text,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists mkt_lead_activities_idx on erp.mkt_lead_activities (lead_id, occurred_at desc);

create table if not exists erp.mkt_lead_follow_ups (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references erp.organizations(id) on delete cascade,
  lead_id            uuid not null references erp.mkt_leads(id) on delete cascade,
  due_at             timestamptz not null,
  method             text not null default 'Call'
                       check (method in ('Call','WhatsApp','Email','Meeting','Visit','Other')),
  reason             text not null,
  reminder           text,
  status             text not null default 'Scheduled'
                       check (status in ('Scheduled','Completed','Cancelled')),
  created_by         uuid references erp.users(id) on delete set null,
  created_by_name    text,
  created_at         timestamptz not null default now(),
  completed_at       timestamptz,
  outcome            text,
  latest_response    text,
  new_requirements   text,
  concerns           text,
  updated_budget     numeric(14,2) check (updated_budget is null or updated_budget >= 0),
  purchase_readiness text,
  agreed_next_steps  text,
  updated_at         timestamptz not null default now()
);

create index if not exists mkt_followups_lead_idx on erp.mkt_lead_follow_ups (lead_id, status, due_at);
create index if not exists mkt_followups_due_idx  on erp.mkt_lead_follow_ups (org_id, status, due_at);

create table if not exists erp.mkt_lead_assignments (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references erp.organizations(id) on delete cascade,
  lead_id               uuid not null references erp.mkt_leads(id) on delete cascade,
  sales_rep_id          uuid not null references erp.users(id) on delete restrict,
  sales_manager_id      uuid references erp.users(id) on delete set null,
  assigned_at           timestamptz not null default now(),
  assigned_by           uuid references erp.users(id) on delete set null,
  expected_first_contact timestamptz,
  first_contact_at      timestamptz,
  handoff_note          text,
  sales_status          text not null default 'Assigned'
                          check (sales_status in ('Assigned','Contacted','Meeting Scheduled',
                                                  'Proposal Sent','Negotiation','Won','Lost')),
  deal_status           text,
  last_contact          timestamptz,
  next_action           text,
  next_follow_up        timestamptz,
  requirement_summary   text,
  communication_status  text,
  reassignment_required boolean not null default false,
  handover_history      jsonb not null default '[]'::jsonb,
  contact_attempts      jsonb not null default '[]'::jsonb,
  reassignments         jsonb not null default '[]'::jsonb,
  supervisory_notes     jsonb not null default '[]'::jsonb,
  customer_notifications jsonb not null default '[]'::jsonb,
  notifications         jsonb not null default '[]'::jsonb,
  is_current            boolean not null default true,
  updated_at            timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

create unique index if not exists mkt_assignments_current_uidx
  on erp.mkt_lead_assignments (lead_id) where is_current;
create index if not exists mkt_assignments_rep_idx on erp.mkt_lead_assignments (org_id, sales_rep_id, is_current);

create table if not exists erp.mkt_lead_rejections (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references erp.organizations(id) on delete cascade,
  lead_id                 uuid not null references erp.mkt_leads(id) on delete cascade,
  reason                  text not null,
  notes                   text,
  rejected_at             timestamptz not null default now(),
  rejected_by             uuid references erp.users(id) on delete set null,
  rejected_by_name        text,
  previous_status         text not null,
  previous_next_follow_up timestamptz,
  restored_at             timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists mkt_rejections_lead_idx on erp.mkt_lead_rejections (lead_id, rejected_at desc);

create table if not exists erp.mkt_lead_conversions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references erp.organizations(id) on delete cascade,
  lead_id        uuid not null references erp.mkt_leads(id) on delete restrict,
  customer_id    uuid not null references erp.customers(id) on delete restrict,
  opportunity_id uuid,
  converted_at   timestamptz not null default now(),
  converted_by   uuid references erp.users(id) on delete set null,
  outcome        text,
  idempotency_key text,
  created_at     timestamptz not null default now(),
  unique (lead_id),
  unique (org_id, customer_id),
  unique (org_id, idempotency_key)
);

create table if not exists erp.mkt_customer_references (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references erp.organizations(id) on delete cascade,
  lead_id     uuid references erp.mkt_leads(id) on delete set null,
  customer_id uuid not null references erp.customers(id) on delete cascade,
  quotation_id uuid references erp.quotations(id) on delete set null,
  sales_order_id uuid references erp.sales_orders(id) on delete set null,
  invoice_id  uuid references erp.invoices(id) on delete set null,
  payment_id  uuid references erp.payments(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (org_id, lead_id, customer_id)
);

create index if not exists mkt_customer_refs_customer_idx on erp.mkt_customer_references (customer_id);
