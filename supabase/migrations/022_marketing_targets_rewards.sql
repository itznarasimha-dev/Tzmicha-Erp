-- =============================================================================
-- 022_marketing_targets_rewards.sql
-- Targets reuse the shared erp.marketing_targets table. This migration adds only
-- the marketing-owned performance snapshot and rewards ledger.
-- =============================================================================

-- Link a shared target row to a marketing plan (nullable, non-destructive).
alter table erp.marketing_targets
  add column if not exists plan_id uuid,
  add column if not exists created_by uuid references erp.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Employee performance snapshot (derived; never hand-edited in the UI)
-- ---------------------------------------------------------------------------
create table if not exists erp.mkt_employee_performance (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references erp.organizations(id) on delete cascade,
  employee_id      uuid not null references erp.users(id) on delete cascade,
  period           text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  leads_generated  int not null default 0 check (leads_generated >= 0),
  leads_qualified  int not null default 0 check (leads_qualified >= 0),
  conversions      int not null default 0 check (conversions >= 0),
  field_visits     int not null default 0 check (field_visits >= 0),
  campaigns_owned  int not null default 0 check (campaigns_owned >= 0),
  revenue_attributed numeric(14,2) not null default 0,
  target_leads     int not null default 0,
  score            numeric(6,2) not null default 0,
  computed_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (org_id, employee_id, period)
);

create index if not exists mkt_performance_idx on erp.mkt_employee_performance (org_id, period);

-- ---------------------------------------------------------------------------
-- Rewards wallet (append-only ledger; balance is derived and mirrored)
-- ---------------------------------------------------------------------------
create table if not exists erp.mkt_reward_wallets (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references erp.organizations(id) on delete cascade,
  employee_id uuid not null references erp.users(id) on delete cascade,
  currency   char(3) not null default 'INR',
  balance    numeric(14,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, employee_id)
);

create table if not exists erp.mkt_reward_transactions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references erp.organizations(id) on delete cascade,
  wallet_id     uuid not null references erp.mkt_reward_wallets(id) on delete cascade,
  employee_id   uuid not null references erp.users(id) on delete cascade,
  entry_type    text not null
                  check (entry_type in ('Award','Adjustment','Redemption','Reversal','Opening')),
  amount        numeric(14,2) not null check (amount <> 0),
  balance_after numeric(14,2) not null check (balance_after >= 0),
  reference_type text,
  reference_id  uuid,
  note          text,
  created_by    uuid references erp.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists mkt_reward_tx_idx on erp.mkt_reward_transactions (wallet_id, created_at desc);
create index if not exists mkt_reward_tx_emp_idx on erp.mkt_reward_transactions (org_id, employee_id, created_at desc);

-- Append-only: reward history is financial history.
create or replace function erp.mkt_reward_tx_append_only()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'mkt_reward_transactions is append-only; post a Reversal entry instead'
    using errcode = '55000';
end;
$$;

drop trigger if exists mkt_reward_tx_no_update on erp.mkt_reward_transactions;
create trigger mkt_reward_tx_no_update
  before update or delete on erp.mkt_reward_transactions
  for each row execute function erp.mkt_reward_tx_append_only();
