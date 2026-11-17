-- =============================================================================
-- 037_supplier_orders_and_store_grn.sql
-- Additive migration for Supplier Purchase Orders, Store Manager Receiving (GRN),
-- ETA History, Discrepancies, and 3-Way Match Linkage.
--
-- NON-NEGOTIABLE SAFETY GUARANTEES:
-- - 100% additive: CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- - No DROP, TRUNCATE, DELETE, or destructive DDL.
-- - No column renaming or type altering.
-- - Fully idempotent and safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Document Numbering Types: GRN & Discrepancies
-- -----------------------------------------------------------------------------
insert into erp.doc_types (code, prefix, label, pad) values
  ('grn',         'GRN',  'Goods Receipt Note', 4),
  ('discrepancy', 'DISC', 'Receiving Discrepancy', 4)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- 2. PO Expected Arrival Date (ETA) History
-- -----------------------------------------------------------------------------
create table if not exists erp.po_eta_history (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  purchase_order_id   uuid not null references erp.purchase_orders(id) on delete cascade,
  old_date            date,
  new_date            date not null,
  reason              text not null,
  changed_by          uuid references erp.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_po_eta_history_po on erp.po_eta_history(purchase_order_id);
create index if not exists idx_po_eta_history_org on erp.po_eta_history(org_id);

-- -----------------------------------------------------------------------------
-- 3. Goods Receipt Notes (GRN)
-- -----------------------------------------------------------------------------
create table if not exists erp.goods_receipt_notes (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references erp.organizations(id) on delete cascade,
  grn_number            text not null,
  purchase_order_id     uuid not null references erp.purchase_orders(id) on delete cascade,
  warehouse_id          uuid not null references erp.warehouses(id) on delete restrict,
  supplier_delivery_ref text,
  transporter_name      text,
  vehicle_number        text,
  lr_number             text,
  received_by           uuid references erp.users(id) on delete set null,
  received_at           timestamptz not null default now(),
  status                text not null default 'verified' check (status in ('draft', 'verified', 'discrepancy_flagged', 'cancelled')),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (org_id, grn_number)
);

create index if not exists idx_grn_org on erp.goods_receipt_notes(org_id);
create index if not exists idx_grn_po on erp.goods_receipt_notes(purchase_order_id);
create index if not exists idx_grn_warehouse on erp.goods_receipt_notes(warehouse_id);

-- -----------------------------------------------------------------------------
-- 4. Goods Receipt Note Lines
-- -----------------------------------------------------------------------------
create table if not exists erp.goods_receipt_lines (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  grn_id              uuid not null references erp.goods_receipt_notes(id) on delete cascade,
  po_line_id          uuid references erp.purchase_order_lines(id) on delete set null,
  product_id          uuid not null references erp.products(id) on delete restrict,
  ordered_quantity    numeric(14,3) not null check (ordered_quantity >= 0),
  received_quantity   numeric(14,3) not null check (received_quantity >= 0),
  accepted_quantity   numeric(14,3) not null default 0 check (accepted_quantity >= 0),
  shortage_quantity   numeric(14,3) not null default 0 check (shortage_quantity >= 0),
  damaged_quantity    numeric(14,3) not null default 0 check (damaged_quantity >= 0),
  excess_quantity     numeric(14,3) not null default 0 check (excess_quantity >= 0),
  batch_number        text,
  expiry_date         date,
  storage_location    text,
  unit_cost           numeric(14,2) not null default 0,
  stock_movement_id   uuid references erp.stock_movements(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_grn_lines_grn on erp.goods_receipt_lines(grn_id);
create index if not exists idx_grn_lines_product on erp.goods_receipt_lines(product_id);

-- -----------------------------------------------------------------------------
-- 5. Receiving Discrepancies
-- -----------------------------------------------------------------------------
create table if not exists erp.receiving_discrepancies (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references erp.organizations(id) on delete cascade,
  discrepancy_number    text not null,
  grn_id                uuid not null references erp.goods_receipt_notes(id) on delete cascade,
  purchase_order_id     uuid not null references erp.purchase_orders(id) on delete cascade,
  product_id            uuid not null references erp.products(id) on delete restrict,
  discrepancy_type      text not null check (discrepancy_type in ('shortage', 'damaged', 'excess', 'wrong_item')),
  variance_quantity     numeric(14,3) not null default 0,
  financial_value       numeric(14,2) not null default 0,
  status                text not null default 'pending_review' check (status in ('pending_review', 'supplier_notified', 'credit_claimed', 'resolved', 'written_off')),
  reported_by           uuid references erp.users(id) on delete set null,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (org_id, discrepancy_number)
);

create index if not exists idx_discrepancies_org on erp.receiving_discrepancies(org_id);
create index if not exists idx_discrepancies_po on erp.receiving_discrepancies(purchase_order_id);
create index if not exists idx_discrepancies_grn on erp.receiving_discrepancies(grn_id);

-- -----------------------------------------------------------------------------
-- 6. Additive Columns on Purchase Orders for 3-Way Matching & Store Workflow
-- -----------------------------------------------------------------------------
alter table erp.purchase_orders
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references erp.users(id) on delete set null,
  add column if not exists approval_limit numeric(14,2) not null default 50000,
  add column if not exists approved_by uuid references erp.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists billed_amount numeric(14,2) not null default 0,
  add column if not exists matching_status text not null default 'unmatched' check (matching_status in ('unmatched', 'partially_matched', 'matched', 'discrepancy'));

-- -----------------------------------------------------------------------------
-- 7. Row Level Security Policies (org_isolation)
-- -----------------------------------------------------------------------------
alter table erp.po_eta_history enable row level security;
alter table erp.goods_receipt_notes enable row level security;
alter table erp.goods_receipt_lines enable row level security;
alter table erp.receiving_discrepancies enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'erp' and tablename = 'po_eta_history' and policyname = 'org_isolation') then
    create policy org_isolation on erp.po_eta_history using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'erp' and tablename = 'goods_receipt_notes' and policyname = 'org_isolation') then
    create policy org_isolation on erp.goods_receipt_notes using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'erp' and tablename = 'goods_receipt_lines' and policyname = 'org_isolation') then
    create policy org_isolation on erp.goods_receipt_lines using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'erp' and tablename = 'receiving_discrepancies' and policyname = 'org_isolation') then
    create policy org_isolation on erp.receiving_discrepancies using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
  end if;
end $$;
