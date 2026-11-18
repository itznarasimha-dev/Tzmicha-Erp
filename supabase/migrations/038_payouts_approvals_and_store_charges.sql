-- =============================================================================
-- 038_payouts_approvals_and_store_charges.sql
-- Phase 6, Phase 7, and Phase 8 schema additions:
-- 1. Company Expenses & Employee Claims
-- 2. Customer Refunds with Finance & Admin Multi-tier Approval
-- 3. Store Charges & Inward Landed Cost Integration
-- 4. Company Profiles & Accounting Periods (Period Lock)
-- 5. Organization Bank Accounts for Treasury & Disbursement
-- 6. Unified Approval Request type expansion
--
-- 100% Additive: CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- Zero destructive operations. Zero DROP/TRUNCATE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Doc Types seed for new finance documents
-- -----------------------------------------------------------------------------
insert into erp.doc_types (code, prefix, label, pad)
values
  ('expense',      'EXP', 'Company Expense',   5),
  ('refund',       'REF', 'Customer Refund',   5),
  ('store_charge', 'CHG', 'Store Firm Charge', 5),
  ('payslip',      'PAY', 'Employee Payslip',  5)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Expand Approval Entity Types (recreate check constraint cleanly)
-- -----------------------------------------------------------------------------
do $$
begin
  alter table erp.approval_requests drop constraint if exists approval_requests_entity_type_check;
  alter table erp.approval_requests add constraint approval_requests_entity_type_check
    check (entity_type in (
      'hr_leave','hr_attendance_correction','hr_expense',
      'hr_payment','hr_payroll_run','hr_contract',
      'mkt_plan','mkt_expense','mkt_discount','mkt_offer',
      'mkt_campaign','mkt_contract',
      'sales_incentive','sales_expense','store_charge','customer_refund'
    ));
exception when others then
  null;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Company Expenses & Employee Claims
-- -----------------------------------------------------------------------------
create table if not exists erp.company_expenses (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  expense_number  text not null,
  category        text not null default 'Other',
  description     text not null,
  amount          numeric(14,2) not null check (amount > 0),
  tax_amount      numeric(14,2) not null default 0 check (tax_amount >= 0),
  total_amount    numeric(14,2) not null check (total_amount > 0),
  gstin           text,
  vendor_name     text,
  invoice_number  text,
  invoice_date    date,
  payment_mode    text not null default 'Bank Transfer'
                    check (payment_mode in ('Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'Cash', 'Petty Cash')),
  payment_ref     text,
  budget_tag      text,
  receipt_url     text,
  status          text not null default 'pending'
                    check (status in ('draft', 'pending', 'approved', 'paid', 'rejected')),
  idempotency_key text,
  paid_at         timestamptz,
  paid_by         uuid references erp.users(id) on delete set null,
  created_by      uuid references erp.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, expense_number),
  unique (org_id, idempotency_key)
);

create index if not exists company_expenses_org_status_idx on erp.company_expenses (org_id, status, created_at desc);
create index if not exists company_expenses_category_idx   on erp.company_expenses (org_id, category);

-- -----------------------------------------------------------------------------
-- 4. Customer Refunds (Service Request -> Finance Review -> Admin Limit Approval)
-- -----------------------------------------------------------------------------
create table if not exists erp.customer_refunds (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  refund_number       text not null,
  customer_id         uuid not null references erp.customers(id) on delete restrict,
  invoice_id          uuid references erp.invoices(id) on delete restrict,
  service_ticket_id   text,
  reason              text not null,
  amount              numeric(14,2) not null check (amount > 0),
  refund_method       text not null default 'Bank Transfer'
                        check (refund_method in ('Bank Transfer', 'UPI', 'Original Payment Method', 'Credit Note', 'Cheque')),
  bank_details        jsonb,
  status              text not null default 'pending_review'
                        check (status in ('pending_review', 'pending_admin_approval', 'approved', 'rejected', 'paid')),
  review_notes        text,
  reviewed_by         uuid references erp.users(id) on delete set null,
  reviewed_at         timestamptz,
  admin_approved_by   uuid references erp.users(id) on delete set null,
  admin_approved_at   timestamptz,
  credit_note_id      uuid references erp.credit_notes(id) on delete set null,
  payment_ref         text,
  paid_at             timestamptz,
  idempotency_key     text,
  created_by          uuid references erp.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, refund_number),
  unique (org_id, idempotency_key)
);

-- Partial index: only one open/pending refund per invoice + ticket
create unique index if not exists customer_refunds_single_open_idx
  on erp.customer_refunds (org_id, invoice_id, coalesce(service_ticket_id, ''))
  where status in ('pending_review', 'pending_admin_approval');

create index if not exists customer_refunds_customer_idx on erp.customer_refunds (org_id, customer_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Store Manager Firm Charges (Landed Cost & Transport/Handling)
-- -----------------------------------------------------------------------------
create table if not exists erp.store_charges (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  charge_number       text not null,
  warehouse_id        uuid not null references erp.warehouses(id) on delete restrict,
  charge_category     text not null
                        check (charge_category in ('freight', 'loading_unloading', 'manpower', 'packaging', 'customs_insurance', 'product_cost', 'storage', 'other')),
  reference_type      text not null
                        check (reference_type in ('po', 'grn', 'dispatch', 'transfer', 'general')),
  reference_id        uuid,
  vendor_name         text,
  amount              numeric(14,2) not null check (amount > 0),
  tax_amount          numeric(14,2) not null default 0 check (tax_amount >= 0),
  total_amount        numeric(14,2) not null check (total_amount > 0),
  attachment_url      text,
  remarks             text,
  status              text not null default 'submitted'
                        check (status in ('submitted', 'approved', 'rejected', 'posted')),
  reviewed_by         uuid references erp.users(id) on delete set null,
  reviewed_at         timestamptz,
  rejection_reason    text,
  landed_cost_added   boolean not null default false,
  journal_entry_id    uuid references erp.journal_entries(id) on delete set null,
  created_by          uuid references erp.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, charge_number)
);

create index if not exists store_charges_wh_status_idx on erp.store_charges (org_id, warehouse_id, status);

-- Additive Landed Cost tracking on Goods Receipt Lines
alter table erp.goods_receipt_lines add column if not exists landed_cost_share numeric(14,2) default 0;
alter table erp.goods_receipt_lines add column if not exists final_unit_landed_cost numeric(14,2) default 0;

-- -----------------------------------------------------------------------------
-- 6. Company Profiles & Accounting Period Lock
-- -----------------------------------------------------------------------------
create table if not exists erp.company_profiles (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  legal_name          text not null,
  brand_name          text,
  gstin               text,
  pan                 text,
  cin                 text,
  registered_address  text,
  primary_bank_name   text,
  primary_account_no  text,
  primary_ifsc        text,
  invoice_prefix      text not null default 'INV',
  fy_start_month      integer not null default 4 check (fy_start_month between 1 and 12),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, gstin)
);

create table if not exists erp.accounting_periods (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  period_name         text not null check (period_name ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  start_date          date not null,
  end_date            date not null,
  is_locked           boolean not null default false,
  locked_by           uuid references erp.users(id) on delete set null,
  locked_at           timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, period_name)
);

-- -----------------------------------------------------------------------------
-- 7. Bank Accounts (Treasury & Cash Flow)
-- -----------------------------------------------------------------------------
create table if not exists erp.bank_accounts (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  account_name        text not null,
  account_number      text not null,
  ifsc_code           text not null,
  bank_name           text not null,
  branch              text,
  opening_balance     numeric(14,2) not null default 0,
  current_balance     numeric(14,2) not null default 0,
  is_primary          boolean not null default false,
  status              text not null default 'active' check (status in ('active', 'inactive', 'dormant')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, account_number)
);

-- -----------------------------------------------------------------------------
-- 8. Row Level Security Policies
-- -----------------------------------------------------------------------------
alter table erp.company_expenses enable row level security;
alter table erp.customer_refunds enable row level security;
alter table erp.store_charges enable row level security;
alter table erp.company_profiles enable row level security;
alter table erp.accounting_periods enable row level security;
alter table erp.bank_accounts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'company_expenses_org_isolation' and tablename = 'company_expenses' and schemaname = 'erp') then
    create policy company_expenses_org_isolation on erp.company_expenses
      for all using (org_id = current_setting('app.current_org_id', true)::uuid);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'customer_refunds_org_isolation' and tablename = 'customer_refunds' and schemaname = 'erp') then
    create policy customer_refunds_org_isolation on erp.customer_refunds
      for all using (org_id = current_setting('app.current_org_id', true)::uuid);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'store_charges_org_isolation' and tablename = 'store_charges' and schemaname = 'erp') then
    create policy store_charges_org_isolation on erp.store_charges
      for all using (org_id = current_setting('app.current_org_id', true)::uuid);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'company_profiles_org_isolation' and tablename = 'company_profiles' and schemaname = 'erp') then
    create policy company_profiles_org_isolation on erp.company_profiles
      for all using (org_id = current_setting('app.current_org_id', true)::uuid);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'accounting_periods_org_isolation' and tablename = 'accounting_periods' and schemaname = 'erp') then
    create policy accounting_periods_org_isolation on erp.accounting_periods
      for all using (org_id = current_setting('app.current_org_id', true)::uuid);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'bank_accounts_org_isolation' and tablename = 'bank_accounts' and schemaname = 'erp') then
    create policy bank_accounts_org_isolation on erp.bank_accounts
      for all using (org_id = current_setting('app.current_org_id', true)::uuid);
  end if;
end $$;
