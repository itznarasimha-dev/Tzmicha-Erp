-- =============================================================================
-- 021_marketing_campaigns_offers_discounts.sql
-- Campaigns, campaign offers, discount requests and discount approvals.
-- Discount rules reuse the shared Sales discount authority; Marketing only
-- raises and records the request.
-- =============================================================================

create table if not exists erp.mkt_campaigns (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references erp.organizations(id) on delete cascade,
  code        text not null,
  name        text not null,
  objective   text,
  channel     text not null default 'Digital'
                check (channel in ('Digital','Social','Email','Field','Trade','Events',
                                   'Influencer','Retail','Content')),
  audience    text,
  product_id  uuid references erp.products(id) on delete set null,
  product_text text,
  start_date  date not null,
  end_date    date not null,
  budget      numeric(14,2) not null default 0 check (budget >= 0),
  spend       numeric(14,2) not null default 0 check (spend >= 0),
  status      text not null default 'Draft'
                check (status in ('Draft','Planned','Active','Paused','Completed','Archived')),
  owner_user_id uuid references erp.users(id) on delete set null,
  owner_name  text,
  kpis        jsonb not null default
                '{"impressions":0,"clicks":0,"leads":0,"qualifiedLeads":0,"conversions":0,"revenue":0}'::jsonb,
  created_by  uuid references erp.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, code),
  check (end_date >= start_date)
);

create index if not exists mkt_campaigns_status_idx on erp.mkt_campaigns (org_id, status, start_date);

-- Deferred FK: mkt_leads.campaign_id -> mkt_campaigns
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'mkt_leads_campaign_fkey'
       and conrelid = 'erp.mkt_leads'::regclass
  ) then
    alter table erp.mkt_leads
      add constraint mkt_leads_campaign_fkey
      foreign key (campaign_id) references erp.mkt_campaigns(id) on delete set null;
  end if;
end $$;

create table if not exists erp.mkt_campaign_offers (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  code            text not null,
  campaign_id     uuid references erp.mkt_campaigns(id) on delete cascade,
  title           text not null,
  description     text,
  offer_type      text not null default 'Discount'
                    check (offer_type in ('Discount','Bundle','Cashback','Freebie','Scheme','Other')),
  discount_percent numeric(5,2) check (discount_percent is null or discount_percent between 0 and 100),
  discount_amount  numeric(14,2) check (discount_amount is null or discount_amount >= 0),
  product_id      uuid references erp.products(id) on delete set null,
  valid_from      date,
  valid_to        date,
  status          text not null default 'Draft'
                    check (status in ('Draft','Pending Approval','Active','Paused','Expired','Rejected')),
  created_by      uuid references erp.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, code),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index if not exists mkt_offers_campaign_idx on erp.mkt_campaign_offers (campaign_id, status);

create table if not exists erp.mkt_discounts (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  code              text not null,
  offer_id          uuid references erp.mkt_campaign_offers(id) on delete set null,
  customer_id       uuid references erp.customers(id) on delete set null,
  sales_order_id    uuid references erp.sales_orders(id) on delete set null,
  requested_by      uuid references erp.users(id) on delete set null,
  requested_percent numeric(5,2) not null check (requested_percent between 0 and 100),
  approved_percent  numeric(5,2) check (approved_percent is null or approved_percent between 0 and 100),
  status            text not null default 'Pending'
                      check (status in ('Draft','Pending','Approved','Rejected','Expired')),
  reason            text not null,
  decided_at        timestamptz,
  decided_by        uuid references erp.users(id) on delete set null,
  idempotency_key   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (org_id, code),
  unique (org_id, idempotency_key),
  check (approved_percent is null or approved_percent <= requested_percent)
);

create index if not exists mkt_discounts_status_idx on erp.mkt_discounts (org_id, status, created_at desc);

create table if not exists erp.mkt_discount_approvals (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  discount_id      uuid not null references erp.mkt_discounts(id) on delete cascade,
  approver_user_id uuid references erp.users(id) on delete set null,
  decision         text not null check (decision in ('Approved','Rejected','Changes Requested')),
  approved_percent numeric(5,2) check (approved_percent is null or approved_percent between 0 and 100),
  remarks          text,
  decided_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  check (decision <> 'Rejected' or length(coalesce(remarks,'')) > 0)
);

create index if not exists mkt_discount_approvals_idx on erp.mkt_discount_approvals (discount_id, decided_at desc);
