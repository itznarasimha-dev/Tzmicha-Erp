# Phase 2 — Database Architecture & Relationship Report

**Schema:** `erp` (PostgreSQL 15+, Supabase)
**Migrations:** `supabase/migrations/001…033`
**Seed:** `supabase/seed/initial_erp_seed.sql`

---

## 1. Ownership map (no duplicate systems)

| Domain | Tables | Owner |
|---|---|---|
| Tenancy / identity | `organizations`, `roles`, `permissions`, `role_permissions`, `users` | Shared ERP |
| Org structure | `departments`, `designations`, `regions`, `warehouses` | Shared ERP |
| Commercial master | `customers`, `products`, `suppliers`, `quotations`, `sales_orders`, `invoices`, `payments`, `payment_allocations`, `stock_movements` | Shared ERP |
| Targets / wallet | `marketing_targets`, `wallet_accounts`, `wallet_transactions` | Shared ERP |
| Approvals | `approval_requests`, `approval_history` | Shared service |
| Platform | `audit_logs`, `doc_types`, `document_sequences` | Shared platform |
| **HR** | `hr_*` (24 tables) | **HR module** |
| **Marketing** | `mkt_*` (20 tables) | **Marketing module** |

Confirmed reuse:
- No `hr_employee_master`, no `mkt_customers`, no `mkt_products`, no `mkt_invoices`, no `mkt_payments`.
- HR employee = `erp.users` + 1:1 `erp.hr_employees` profile.
- Marketing conversion writes into `erp.customers` and records the link in `mkt_lead_conversions`.
- Marketing targets reuse `erp.marketing_targets`; only a nullable `plan_id` / `created_by` was added.

---

## 2. Entity relationship diagram (text)

```
                            erp.organizations
                                    │ 1
        ┌───────────────┬───────────┼────────────┬──────────────┬───────────────┐
        │               │           │            │              │               │
   erp.roles      erp.departments erp.regions  erp.users    erp.customers   erp.products
        │               │           │            │              │               │
  role_permissions  designations  warehouses      │              │               │
                                                    │              │               │
                        ┌───────────────────────────┘              │               │
                        │ 1:1                                      │               │
                 erp.hr_employees ────────────────────────────────┼───────────────┘
                        │ 1                                        │
   ┌────────────┬───────┼──────────┬────────────┬─────────────┐    │
   │            │       │          │            │             │    │
hr_attendance hr_leave hr_payroll hr_contracts hr_expenses hr_documents
   │            │        │          │            │
hr_corrections hr_leave  hr_payslips hr_contract  hr_expense_approvals
               _approvals │           _signatures
                           │           _payments
                           │           _documents
                     hr_payroll_runs ── hr_daily_payments ──► erp.payments (finance)
                     hr_payslip_lines                         │
                                                              ▼
                                                     erp.payment_allocations
                                                              │
                                                        erp.invoices
                                                              ▲
                                                              │
                                                          erp.sales_orders
                                                              ▲
                                                              │
erp.users ──► hr_offboarding_records                     erp.quotations
    │        hr_performance_reviews
    │        hr_employee_requests
    │        hr_onboarding_records
    │        hr_job_openings ── hr_candidates ── hr_interviews
    │
    ├──► mkt_leads ──► mkt_lead_follow_ups
    │        │    ├──► mkt_lead_activities
    │        │    ├──► mkt_lead_assignments ──► (sales rep + manager from erp.users)
    │        │    ├──► mkt_lead_rejections
    │        │    ├──► mkt_lead_conversions ──► erp.customers
    │        │    └──► mkt_customer_references ──► customers / quotations / orders / invoices / payments
    │        └──► mkt_field_visits
    │
    ├──► mkt_campaigns ──► mkt_campaign_offers ──► mkt_discounts ──► mkt_discount_approvals
    ├──► mkt_plans ──► mkt_plan_activities
    │        └─────► mkt_plan_approvals
    ├──► mkt_expenses ──► mkt_expense_approvals
    ├──► mkt_reward_wallets ──► mkt_reward_transactions (append-only)
    ├──► mkt_employee_performance
    ├──► mkt_dealer_prospects
    ├──► mkt_market_surveys
    └──► mkt_activity_records

erp.approval_requests ──► erp.approval_history   (covers hr_* and mkt_* entities)
erp.audit_logs                                   (append-only, sensitive tables)
```

---

## 3. Table inventory

### HR (24)

| Table | Purpose | Key constraints |
|---|---|---|
| `hr_employees` | 1:1 HR profile of `erp.users` | `unique(org_id,user_id)`; masked bank only; `current_ctc` restricted |
| `hr_employee_documents` | Private documents | `unique(org_id,storage_path)` |
| `hr_settings` | HR policy configuration | PK `org_id` |
| `hr_attendance` | Daily register | `unique(org_id,employee_id,attendance_date)`; hours 0–24 |
| `hr_attendance_corrections` | Correction requests | reason required; approval applies record |
| `hr_leave_types` | Leave policy | `unique(org_id,code)`; allocation 0–365 |
| `hr_leave_balances` | Per employee/type/year | `unique(org_id,employee_id,leave_type_id,year)` |
| `hr_leave_requests` | Applications | `end >= start`, `days > 0` |
| `hr_leave_approvals` | Decision trail | append-only history |
| `hr_holidays` | Holiday calendar | `unique(org_id,date,name)` |
| `hr_salary_components` | Earning/deduction master | `unique(org_id,code)` |
| `hr_salary_structures` | Effective-dated CTC | `unique(org_id,employee_id,effective_from)` |
| `hr_payroll_runs` | Monthly run | `unique(org_id,period)`, `unique(org_id,idempotency_key)` |
| `hr_payslips` | Per employee payslip | `unique(org_id,run,employee)`; net formula check |
| `hr_payslip_lines` | Component breakdown | FK to payslip |
| `hr_contracts` | Contract register | `unique(org_id,code)`, `end>=start` |
| `hr_contract_signatures` | Signature capture | — |
| `hr_contract_payments` | Payment schedule | `amount > 0` |
| `hr_contract_documents` | Contract files | private storage |
| `hr_daily_payments` | Payment queue → Finance | `unique(org_id,code)`, idempotency |
| `hr_payment_history` | Payment audit trail | — |
| `hr_expenses` | Reimbursements | rejection requires remarks; idempotency |
| `hr_expense_approvals` | Expense approvals | rejection requires remarks |
| `hr_job_openings` / `hr_candidates` / `hr_interviews` | Recruitment | stage enums, FK chain |
| `hr_onboarding_records` | Onboarding | checklist/systems JSON |
| `hr_performance_reviews` | Reviews | `unique(org_id,employee,period,cycle)`; ratings 0–5 |
| `hr_employee_requests` | HR helpdesk | status/priority enums |
| `hr_offboarding_records` | Exit | `unique(org_id,employee_id)`, `last_working_day>=resignation` |
| `hr_activities` | Activity feed | — |

### Marketing (20)

| Table | Purpose | Key constraints |
|---|---|---|
| `mkt_lead_sources` | Source catalogue | `unique(org_id,code)` |
| `mkt_leads` | Lead / prospect record | `unique(org_id,code)`; `converted` ⇒ `customer_id` |
| `mkt_lead_activities` | Lead timeline | append-only feed |
| `mkt_lead_follow_ups` | Scheduled + completed follow-ups | due_at required |
| `mkt_lead_assignments` | Sales handover | one `is_current` assignment per lead |
| `mkt_lead_rejections` | Closed outcome + restore data | previous status preserved |
| `mkt_lead_conversions` | One conversion per lead | `unique(lead_id)`, `unique(org_id,customer_id)` |
| `mkt_customer_references` | Link to shared customer/quotation/order/invoice/payment | FKs only, no copies |
| `mkt_campaigns` | Campaigns + KPI JSON | `end>=start`, budget ≥ 0 |
| `mkt_campaign_offers` | Offers/schemes | discount 0–100 |
| `mkt_discounts` | Discount requests | `approved<=requested`; authority trigger |
| `mkt_discount_approvals` | Approval trail | rejection requires remarks |
| `mkt_employee_performance` | Derived KPI snapshot | `unique(org,employee,period)` |
| `mkt_reward_wallets` | Rewards balance | `unique(org,employee)`, balance ≥ 0 |
| `mkt_reward_transactions` | Append-only ledger | UPDATE/DELETE blocked |
| `mkt_plans` | Monthly plan workflow | `unique(org_id,code)`, month format |
| `mkt_plan_activities` | Plan activity lines | — |
| `mkt_plan_approvals` | Stage decision history | — |
| `mkt_expenses` | Unified expense | `unique(org_id,code)`, idempotency |
| `mkt_expense_approvals` | Manager/Admin/Finance trail | — |
| `mkt_field_visits` | Visits / check-in-out | `check_out>=check_in` |
| `mkt_market_surveys` | Competitor research | observation required |
| `mkt_dealer_prospects` | Dealer onboarding pipeline | `unique(org_id,code)` |
| `mkt_activity_records` | Consolidated activity log | append-only feed |

### Views (10)

`v_invoice_balances`, `v_hr_headcount`, `v_hr_dashboard`, `v_hr_attendance_summary`,
`v_hr_leave_summary`, `v_hr_payroll_summary`, `v_lead_pipeline`,
`v_campaign_performance`, `v_marketing_dashboard`, `v_employee_performance`,
`v_reward_balances`, `v_marketing_expense_summary`.
All views use `security_invoker = true`, so RLS still applies to the caller.

---

## 4. Business rules enforced in the database

| Rule | Mechanism |
|---|---|
| Tenant isolation | permissive `org_isolation` RLS policy on every table with `org_id` |
| Confidential salary / documents / expenses / rewards | RESTRICTIVE RLS policies requiring permission or self-ownership |
| Append-only financial records | `mkt_reward_transactions`, `wallet_transactions`, `stock_movements`, `audit_logs`, payslips/runs DELETE blocked by restrictive policies |
| No overpayment | `payment_alloc_guard` trigger on `payment_allocations` |
| Invoice balance derived | `v_invoice_balances` + `payment_alloc_invoice_status` trigger |
| Leave balance integrity | `hr_leave_balance_sync` (pending/used, insufficient-balance rejection) |
| Attendance correction | `hr_apply_attendance_correction` writes the corrected attendance row |
| Payslip net pay | `hr_payslip_compute_net` (BEFORE) + CHECK constraint |
| Payroll totals | `hr_payroll_run_totals` recomputes run totals |
| Reward balance | `mkt_reward_tx_apply` sets `balance_after`, blocks negative balance |
| Discount authority | `mkt_discount_guard` + `can_approve_discount()` |
| One conversion per lead | unique indexes + `mkt_lead_conversion_guard` |
| No self-approval | `decide_approval()` |
| Document numbering | `next_doc_number(org,type,fy)` + `document_sequences` (no MAX(id)+1) |
| Audit trail | `audit_row_change` on 10 sensitive tables |
| Signup cannot self-promote | auth sync reads only `raw_app_meta_data`; fallback role = `employee` |

---

## 5. Migration review checklist (pre-application)

Run against a **staging** project first:

```sql
-- 1. Confirm schema/table collisions with the shared team deliverables
select table_schema, table_name
from information_schema.tables
where table_schema = 'erp'
order by table_name;

-- 2. Confirm migration order / no partial state
select * from supabase_migrations.schema_migrations order by version;

-- 3. Confirm the auth trigger situation before applying 003
select tgname, tgrelid::regclass
from pg_trigger
where not tgisinternal and tgrelid = 'auth.users'::regclass;

-- 4. Confirm RLS is enabled everywhere
select tablename, rowsecurity
from pg_tables where schemaname = 'erp' and not rowsecurity;

-- 5. Confirm no policy gaps on sensitive tables
select tablename, policyname, permissive, cmd
from pg_policies where schemaname = 'erp'
order by tablename, policyname;

-- 6. Confirm document sequences
select * from erp.doc_types order by code;
```

Rollback strategy: every migration is additive. To roll back, drop the `erp` objects created by
these files **in reverse order** — but never in production after real data exists. No migration
contains `DROP TABLE`, `TRUNCATE`, or `DELETE`.

---

## 6. Known assumptions

1. Shared tables created by 001 are **adopt-or-create**. If the shared team provides richer
   versions, the only required columns are the ones referenced by FKs and by the API.
2. `erp.users.id` is the internal ERP identifier; `auth_user_id` links to `auth.users.id`.
   They are never assumed equal.
3. Every module table carries a denormalised `org_id` so RLS is uniform.
4. Money is `numeric(14,2)`; dates are `date`; events are `timestamptz`.
5. Business codes are generated by `erp.next_doc_number`; UUIDs remain the only FK type.
