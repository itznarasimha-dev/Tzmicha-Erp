-- =============================================================================
-- 036_document_snapshots_and_imports.sql
-- Additive migration for Document Snapshots, Purchase Orders, and Bulk Import Engine.
--
-- NON-NEGOTIABLE SAFETY GUARANTEES:
-- - 100% additive: CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- - No DROP, TRUNCATE, DELETE, or destructive DDL.
-- - No column renaming or type altering.
-- - Fully idempotent and safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Document Numbering Type: Purchase Order & Import Batches
-- ---------------------------------------------------------------------------
insert into erp.doc_types (code, prefix, label, pad) values
  ('purchase_order', 'PO',  'Purchase Order', 4),
  ('import_batch',   'IMP', 'Import Batch',   4)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Bulk Import Batches (Audit, Idempotency via File Hash, Error Logs)
-- ---------------------------------------------------------------------------
create table if not exists erp.import_batches (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references erp.organizations(id) on delete cascade,
  batch_number    text not null,
  document_type   text not null check (document_type in ('quotation', 'invoice', 'sales_order', 'purchase_order')),
  file_name       text not null,
  file_hash       text not null,
  total_rows      int not null default 0,
  imported_count  int not null default 0,
  skipped_count   int not null default 0,
  failed_count    int not null default 0,
  status          text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'reverted')),
  error_log       jsonb not null default '[]'::jsonb,
  created_by      uuid references erp.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (org_id, file_hash)
);

create index if not exists idx_import_batches_org on erp.import_batches(org_id);
create index if not exists idx_import_batches_type on erp.import_batches(org_id, document_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Supplier Purchase Orders (PO)
-- ---------------------------------------------------------------------------
create table if not exists erp.purchase_orders (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references erp.organizations(id) on delete cascade,
  code                  text not null,
  supplier_id           uuid references erp.suppliers(id) on delete set null,
  warehouse_id          uuid references erp.warehouses(id) on delete set null,
  status                text not null default 'draft' check (status in ('draft', 'sent', 'acknowledged', 'partially_received', 'received', 'completed', 'cancelled')),
  order_date            date not null default current_date,
  expected_arrival_date date,
  total_amount          numeric(14,2) not null default 0,
  transporter_name      text,
  vehicle_number        text,
  lr_number             text,
  notes                 text,
  snapshot              jsonb,
  import_batch_id       uuid references erp.import_batches(id) on delete set null,
  created_by            uuid references erp.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (org_id, code)
);

create index if not exists idx_purchase_orders_org on erp.purchase_orders(org_id);
create index if not exists idx_purchase_orders_supplier on erp.purchase_orders(supplier_id);
create index if not exists idx_purchase_orders_warehouse on erp.purchase_orders(warehouse_id);

-- ---------------------------------------------------------------------------
-- 4. Supplier Purchase Order Lines
-- ---------------------------------------------------------------------------
create table if not exists erp.purchase_order_lines (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references erp.organizations(id) on delete cascade,
  purchase_order_id   uuid not null references erp.purchase_orders(id) on delete cascade,
  product_id          uuid references erp.products(id) on delete restrict,
  quantity            numeric(14,3) not null check (quantity > 0),
  received_quantity   numeric(14,3) not null default 0 check (received_quantity >= 0),
  unit_price          numeric(14,2) not null default 0,
  tax_rate            numeric(5,2) not null default 18,
  net_amount          numeric(14,2) not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists idx_po_lines_order on erp.purchase_order_lines(purchase_order_id);
create index if not exists idx_po_lines_product on erp.purchase_order_lines(product_id);

-- ---------------------------------------------------------------------------
-- 5. Additive Columns on Existing Document Tables (Immutable Snapshots & Batch Tracking)
-- ---------------------------------------------------------------------------
alter table erp.quotations
  add column if not exists snapshot jsonb,
  add column if not exists import_batch_id uuid references erp.import_batches(id) on delete set null;

alter table erp.sales_orders
  add column if not exists snapshot jsonb,
  add column if not exists import_batch_id uuid references erp.import_batches(id) on delete set null;

alter table erp.invoices
  add column if not exists snapshot jsonb,
  add column if not exists import_batch_id uuid references erp.import_batches(id) on delete set null;

alter table erp.credit_notes
  add column if not exists snapshot jsonb;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security & Tenant Isolation
-- ---------------------------------------------------------------------------
alter table erp.import_batches enable row level security;
alter table erp.purchase_orders enable row level security;
alter table erp.purchase_order_lines enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'import_batches',
    'purchase_orders',
    'purchase_order_lines'
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
