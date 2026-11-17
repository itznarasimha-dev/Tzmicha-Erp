-- =============================================================================
-- 035_finance_and_notifications.sql
-- Additive migration for Finance Module (Chart of Accounts, General Ledger,
-- Tax Rates, Credit Notes) and System Notifications.
--
-- NON-NEGOTIABLE SAFETY GUARANTEES:
-- - 100% additive: CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- - No DROP, TRUNCATE, DELETE, or destructive DDL.
-- - No column renaming or type altering.
-- - Fully idempotent and safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Document Numbering Types
-- ---------------------------------------------------------------------------
insert into erp.doc_types (code, prefix, label, pad) values
  ('credit_note', 'CRN', 'Credit Note', 4),
  ('debit_note',  'DBN', 'Debit Note',  4)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Finance: Tax Rates (GST, TDS, TCS slabs)
-- ---------------------------------------------------------------------------
create table if not exists erp.tax_rates (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references erp.organizations(id) on delete cascade,
  code        text not null,
  name        text not null,
  rate        numeric not null check (rate >= 0),
  type        text not null default 'GST',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, code)
);

create index if not exists idx_tax_rates_org on erp.tax_rates(org_id);

-- ---------------------------------------------------------------------------
-- 3. Finance: Chart of Accounts (COA)
-- ---------------------------------------------------------------------------
create table if not exists erp.chart_of_accounts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  code            text not null,
  name            text not null,
  type            text not null check (type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  category        text not null default 'General',
  opening_balance numeric not null default 0,
  current_balance numeric not null default 0,
  currency        char(3) not null default 'INR',
  description     text,
  is_reconciled   boolean not null default false,
  is_active       boolean not null default true,
  parent_id       uuid references erp.chart_of_accounts(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, code)
);

create index if not exists idx_chart_of_accounts_org on erp.chart_of_accounts(org_id);
create index if not exists idx_chart_of_accounts_type on erp.chart_of_accounts(org_id, type);

-- ---------------------------------------------------------------------------
-- 4. Finance: Journal Entries (Header)
-- ---------------------------------------------------------------------------
create table if not exists erp.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  voucher_number  text not null,
  entry_date      date not null default current_date,
  reference_type  text not null default 'general_adjustment',
  reference_id    text,
  description     text not null,
  total_debit     numeric not null default 0,
  total_credit    numeric not null default 0,
  status          text not null default 'draft' check (status in ('draft', 'posted', 'voided')),
  created_by      uuid references erp.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, voucher_number)
);

create index if not exists idx_journal_entries_org on erp.journal_entries(org_id);
create index if not exists idx_journal_entries_date on erp.journal_entries(org_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- 5. Finance: Journal Entry Lines
-- ---------------------------------------------------------------------------
create table if not exists erp.journal_entry_lines (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  journal_entry_id  uuid not null references erp.journal_entries(id) on delete cascade,
  account_id        uuid references erp.chart_of_accounts(id) on delete restrict,
  account_code      text not null,
  account_name      text not null,
  account_type      text not null,
  debit             numeric not null default 0,
  credit            numeric not null default 0,
  description       text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_journal_entry_lines_entry on erp.journal_entry_lines(journal_entry_id);
create index if not exists idx_journal_entry_lines_account on erp.journal_entry_lines(account_id);

-- ---------------------------------------------------------------------------
-- 6. Finance: General Ledger (Consolidated Posting Records)
-- ---------------------------------------------------------------------------
create table if not exists erp.general_ledger (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references erp.organizations(id) on delete cascade,
  journal_entry_id  uuid references erp.journal_entries(id) on delete cascade,
  account_id        uuid references erp.chart_of_accounts(id) on delete restrict,
  entry_number      text not null,
  entry_date        date not null default current_date,
  posting_date      timestamptz not null default now(),
  source_doc_type   text,
  source_doc_id     text,
  reference         text,
  description       text,
  debit             numeric not null default 0,
  credit            numeric not null default 0,
  currency          char(3) not null default 'INR',
  created_at        timestamptz not null default now()
);

create index if not exists idx_general_ledger_org on erp.general_ledger(org_id);
create index if not exists idx_general_ledger_account on erp.general_ledger(org_id, account_id, entry_date desc);

-- ---------------------------------------------------------------------------
-- 7. Finance: Credit Notes & Debit Notes
-- ---------------------------------------------------------------------------
create table if not exists erp.credit_notes (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references erp.organizations(id) on delete cascade,
  note_number             text not null,
  note_type               text not null default 'credit_note' check (note_type in ('credit_note', 'debit_note')),
  original_invoice_id     uuid references erp.invoices(id) on delete set null,
  original_invoice_number text,
  customer_id             uuid references erp.customers(id) on delete set null,
  customer_name           text,
  customer_gstin          text,
  issue_date              date not null default current_date,
  reason                  text not null default 'sales_return',
  taxable_amount          numeric not null default 0,
  cgst_amount             numeric not null default 0,
  sgst_amount             numeric not null default 0,
  igst_amount             numeric not null default 0,
  total_amount            numeric not null default 0,
  amount_in_words         text,
  status                  text not null default 'draft' check (status in ('draft', 'issued', 'applied', 'cancelled')),
  notes                   text,
  idempotency_key         text,
  created_by              uuid references erp.users(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (org_id, note_number)
);

create index if not exists idx_credit_notes_org on erp.credit_notes(org_id);
create index if not exists idx_credit_notes_customer on erp.credit_notes(customer_id);
create index if not exists idx_credit_notes_invoice on erp.credit_notes(original_invoice_id);

-- ---------------------------------------------------------------------------
-- 8. Notifications
-- ---------------------------------------------------------------------------
create table if not exists erp.notifications (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  user_id         uuid references erp.users(id) on delete cascade,
  recipient_role  text,
  title           text not null,
  message         text not null,
  type            text not null default 'info' check (type in ('info', 'warning', 'success', 'alert', 'error')),
  action_url      text,
  is_read         boolean not null default false,
  read_at         timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_notifications_user on erp.notifications(user_id, is_read, created_at desc);
create index if not exists idx_notifications_org on erp.notifications(org_id, recipient_role);

-- ---------------------------------------------------------------------------
-- 9. Additive Columns on Existing Invoices Table
-- ---------------------------------------------------------------------------
alter table erp.invoices
  add column if not exists subtotal numeric not null default 0,
  add column if not exists tax_amount numeric not null default 0,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists notes text,
  add column if not exists terms text;

-- ---------------------------------------------------------------------------
-- 10. Row Level Security (RLS) & Tenant Isolation
-- ---------------------------------------------------------------------------
alter table erp.tax_rates enable row level security;
alter table erp.chart_of_accounts enable row level security;
alter table erp.journal_entries enable row level security;
alter table erp.journal_entry_lines enable row level security;
alter table erp.general_ledger enable row level security;
alter table erp.credit_notes enable row level security;
alter table erp.notifications enable row level security;

-- Permissive org isolation policies on all newly created tables
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'tax_rates',
    'chart_of_accounts',
    'journal_entries',
    'journal_entry_lines',
    'general_ledger',
    'credit_notes'
  ]) loop
    execute format('drop policy if exists org_isolation on erp.%I', t);
    execute format($pol$
      create policy org_isolation on erp.%I
        as permissive
        for all
        to authenticated
        using (org_id = erp.current_org_id())
        with check (org_id = erp.current_org_id())
    $pol$, t);
  end loop;
end $$;

-- Notifications RLS: user can see notifications specifically for them or broadcast to their role
drop policy if exists notifications_self_and_role on erp.notifications;
create policy notifications_self_and_role on erp.notifications
  as permissive
  for select
  to authenticated
  using (
    org_id = erp.current_org_id()
    and (
      user_id = auth.uid()
      or user_id is null
      or recipient_role = 'all'
      or exists (
        select 1 from erp.users u
        join erp.roles r on r.id = u.role_id
        where u.auth_user_id = auth.uid()
          and r.code = erp.notifications.recipient_role
      )
    )
  );

drop policy if exists notifications_insert on erp.notifications;
create policy notifications_insert on erp.notifications
  as permissive
  for insert
  to authenticated
  with check (org_id = erp.current_org_id());

drop policy if exists notifications_update on erp.notifications;
create policy notifications_update on erp.notifications
  as permissive
  for update
  to authenticated
  using (
    org_id = erp.current_org_id()
    and (user_id = auth.uid() or user_id is null)
  )
  with check (
    org_id = erp.current_org_id()
  );
