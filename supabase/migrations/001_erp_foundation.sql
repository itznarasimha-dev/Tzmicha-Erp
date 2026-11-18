-- =============================================================================
-- 001_erp_foundation.sql
-- Totally ERP — shared foundation (adopt-or-create)
--
-- IMPORTANT
--   The shared ERP schema is owned by another team member. This migration is
--   intentionally 100% idempotent: every statement uses IF NOT EXISTS or
--   CREATE OR REPLACE, so it is a NO-OP for tables that already exist.
--   It creates only the minimum shared entities that HR and Marketing must
--   reference. It never drops, truncates or rewrites another module's data.
--
--   If the shared schema already provides a table with additional columns,
--   this migration leaves it untouched. HR/Marketing only depend on the
--   columns declared here.
-- =============================================================================

create schema if not exists erp;

-- ---------------------------------------------------------------------------
-- Tenants & identity
-- ---------------------------------------------------------------------------
create table if not exists erp.organizations (
  id            uuid primary key default gen_random_uuid(),
  team_id       text not null unique,
  name          text not null,
  legal_name    text,
  gstin         text,
  plan_code     text not null default 'Standard',
  currency      char(3) not null default 'INR',
  timezone      text not null default 'Asia/Kolkata',
  fiscal_year_start_month int not null default 4 check (fiscal_year_start_month between 1 and 12),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists erp.roles (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references erp.organizations(id) on delete cascade,
  code        text not null,
  name        text not null,
  tier        int not null default 3,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.permissions (
  code        text primary key,
  module      text not null,
  action      text not null,
  description text
);

create table if not exists erp.role_permissions (
  role_id         uuid not null references erp.roles(id) on delete cascade,
  permission_code text not null references erp.permissions(code) on delete cascade,
  primary key (role_id, permission_code)
);

create table if not exists erp.departments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references erp.organizations(id) on delete cascade,
  code        text not null,
  name        text not null,
  head_user_id uuid,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.designations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  department_id uuid references erp.departments(id) on delete set null,
  code          text not null,
  name          text not null,
  level         text not null default 'Mid',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.regions (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  code       text not null,
  name       text not null,
  state      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.warehouses (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  region_id  uuid references erp.regions(id) on delete set null,
  code       text not null,
  name       text not null,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.users (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  auth_user_id    uuid,
  employee_code   text not null,
  name            text not null,
  email           text not null,
  phone           text,
  avatar_url      text,
  role_id         uuid not null references erp.roles(id),
  department_id   uuid references erp.departments(id) on delete set null,
  designation_id  uuid references erp.designations(id) on delete set null,
  manager_id      uuid references erp.users(id) on delete set null,
  region_id       uuid references erp.regions(id) on delete set null,
  warehouse_id    uuid references erp.warehouses(id) on delete set null,
  status          text not null default 'active'
                    check (status in ('active','invited','suspended','inactive')),
  joined_on       date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, email),
  unique (org_id, employee_code),
  unique (auth_user_id)
);

create index if not exists users_org_idx        on erp.users (org_id);
create index if not exists users_auth_idx       on erp.users (auth_user_id);
create index if not exists users_dept_idx       on erp.users (department_id);

-- Link to Supabase auth when the auth schema is present (always true on Supabase).
do $$
begin
  if to_regclass('auth.users') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'users_auth_user_id_fkey' and conrelid = 'erp.users'::regclass
     ) then
    alter table erp.users
      add constraint users_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Commercial master data (referenced by Marketing, never duplicated there)
-- ---------------------------------------------------------------------------
create table if not exists erp.customers (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references erp.organizations(id) on delete cascade,
  code           text not null,
  name           text not null,
  company        text,
  phone          text,
  email          text,
  gstin          text,
  address        text,
  city           text,
  state          text,
  country        text not null default 'India',
  industry       text,
  region_id      uuid references erp.regions(id) on delete set null,
  owner_user_id  uuid references erp.users(id) on delete set null,
  credit_limit   numeric(14,2) not null default 0,
  status         text not null default 'active'
                   check (status in ('active','on_hold','inactive')),
  source_lead_id uuid,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, code)
);

create index if not exists customers_org_idx   on erp.customers (org_id);
create index if not exists customers_phone_idx on erp.customers (org_id, phone);

create table if not exists erp.products (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references erp.organizations(id) on delete cascade,
  code           text not null,
  name           text not null,
  category       text,
  uom            text not null default 'Nos',
  standard_price numeric(14,2) not null default 0,
  floor_price    numeric(14,2) not null default 0,
  status         text not null default 'active'
                   check (status in ('active','inactive','discontinued')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.suppliers (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  code       text not null,
  name       text not null,
  phone      text,
  email      text,
  gstin      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.quotations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  code          text not null,
  customer_id   uuid references erp.customers(id) on delete set null,
  sales_user_id uuid references erp.users(id) on delete set null,
  status        text not null default 'draft',
  valid_until   date,
  total_amount  numeric(14,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.sales_orders (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  code             text not null,
  customer_id      uuid references erp.customers(id) on delete set null,
  quotation_id     uuid references erp.quotations(id) on delete set null,
  sales_user_id    uuid references erp.users(id) on delete set null,
  source_lead_id   uuid,
  status           text not null default 'draft',
  order_date       date not null default current_date,
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  total_amount     numeric(14,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.invoices (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  code          text not null,
  customer_id   uuid references erp.customers(id) on delete set null,
  sales_order_id uuid references erp.sales_orders(id) on delete set null,
  status        text not null default 'issued'
                  check (status in ('draft','issued','paid','partially_paid','overdue','cancelled')),
  issue_date    date not null default current_date,
  due_date      date,
  total_amount  numeric(14,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists erp.payments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  code          text not null,
  customer_id   uuid references erp.customers(id) on delete set null,
  method        text not null default 'Bank Transfer',
  amount        numeric(14,2) not null check (amount > 0),
  paid_at       timestamptz not null default now(),
  reference     text,
  idempotency_key text,
  created_by    uuid references erp.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, code),
  unique (org_id, idempotency_key)
);

create table if not exists erp.payment_allocations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  payment_id uuid not null references erp.payments(id) on delete cascade,
  invoice_id uuid not null references erp.invoices(id) on delete restrict,
  amount     numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists payment_alloc_payment_idx on erp.payment_allocations (payment_id);
create index if not exists payment_alloc_invoice_idx on erp.payment_allocations (invoice_id);

create table if not exists erp.stock_movements (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references erp.organizations(id) on delete cascade,
  product_id   uuid not null references erp.products(id) on delete restrict,
  warehouse_id uuid references erp.warehouses(id) on delete set null,
  movement_type text not null check (movement_type in ('inward','outward','transfer_in','transfer_out','adjustment')),
  quantity     numeric(14,3) not null,
  reference_type text,
  reference_id uuid,
  occurred_at  timestamptz not null default now(),
  created_by   uuid references erp.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists stock_movements_product_idx on erp.stock_movements (org_id, product_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Shared marketing targets (the Marketing portal target grid reuses this)
-- ---------------------------------------------------------------------------
create table if not exists erp.marketing_targets (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  user_id       uuid not null references erp.users(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  metric        text not null default 'leads'
                  check (metric in ('leads','qualified_leads','conversions','revenue','visits','campaigns')),
  target_value  numeric(14,2) not null default 0,
  achieved_value numeric(14,2) not null default 0,
  unit          text not null default 'count',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (period_end >= period_start),
  unique (org_id, user_id, period_start, period_end, metric)
);

-- ---------------------------------------------------------------------------
-- Shared wallet (field-marketing advances / settlements already use this)
-- ---------------------------------------------------------------------------
create table if not exists erp.wallet_accounts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  user_id    uuid not null references erp.users(id) on delete cascade,
  currency   char(3) not null default 'INR',
  balance    numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists erp.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  wallet_id     uuid not null references erp.wallet_accounts(id) on delete cascade,
  user_id       uuid not null references erp.users(id) on delete cascade,
  entry_type    text not null check (entry_type in ('advance_issued','claim_settlement','adjustment','reversal')),
  amount        numeric(14,2) not null check (amount <> 0),
  balance_after numeric(14,2) not null,
  reference_type text,
  reference_id  uuid,
  note          text,
  created_by    uuid references erp.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists wallet_tx_wallet_idx on erp.wallet_transactions (wallet_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Platform support
-- ---------------------------------------------------------------------------
create table if not exists erp.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  actor_user_id uuid references erp.users(id) on delete set null,
  action        text not null,
  entity        text not null,
  entity_id     uuid,
  summary       text,
  before_data   jsonb,
  after_data    jsonb,
  ip_address    inet,
  created_at    timestamptz not null default now()
);

create index if not exists audit_logs_org_idx on erp.audit_logs (org_id, created_at desc);

create table if not exists erp.doc_types (
  code   text primary key,
  prefix text not null,
  label  text not null,
  pad    int not null default 4
);

insert into erp.doc_types (code, prefix, label, pad) values
  ('employee',   'EMP', 'Employee',        3),
  ('customer',   'CUST','Customer',        3),
  ('supplier',   'SUP', 'Supplier',        3),
  ('quotation',  'QUO', 'Quotation',       4),
  ('sales_order','ORD', 'Sales Order',     4),
  ('invoice',    'INV', 'Invoice',         4),
  ('journal',    'JV',  'Journal Voucher', 4),
  ('lead',       'LED', 'Marketing Lead',  4),
  ('campaign',   'CMP', 'Campaign',        4),
  ('offer',      'OFR', 'Campaign Offer',  4),
  ('discount',   'DSC', 'Discount Request',4),
  ('contract',   'CTR', 'Contract',        4),
  ('hr_payment', 'HRP', 'HR Payment',      4),
  ('hr_expense', 'HRE', 'HR Expense',      4),
  ('mkt_expense','MKE', 'Marketing Expense',4),
  ('plan',       'PLN', 'Marketing Plan',  4),
  ('visit',      'VIS', 'Field Visit',     4),
  ('payslip',    'PSL', 'Payslip',         5)
on conflict (code) do nothing;

create table if not exists erp.document_sequences (
  org_id      uuid not null references erp.organizations(id) on delete cascade,
  doc_type    text not null references erp.doc_types(code),
  fy          text not null,
  last_number bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (org_id, doc_type, fy)
);

-- ---------------------------------------------------------------------------
-- Derived financial view (never re-derive balances in application code)
-- ---------------------------------------------------------------------------
create or replace view erp.v_invoice_balances
with (security_invoker = true) as
select
  i.id             as invoice_id,
  i.org_id,
  i.code,
  i.customer_id,
  i.status,
  i.total_amount,
  coalesce(sum(pa.amount), 0)::numeric(14,2) as paid_amount,
  (i.total_amount - coalesce(sum(pa.amount), 0))::numeric(14,2) as balance_due
from erp.invoices i
left join erp.payment_allocations pa on pa.invoice_id = i.id
group by i.id;

comment on view erp.v_invoice_balances is
  'Invoice balance is derived from payment_allocations. Never store a balance column on invoices.';
