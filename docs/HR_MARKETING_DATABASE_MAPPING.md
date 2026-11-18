# HR & Marketing Database Mapping

**Date:** 2026-11-12  
**Source:** `supabase/migrations/010_*`–`015_*`, `020_*`–`024_*`, `030_*`–`034_*`, backend routes/mappers, frontend API types/hooks  
**Scope:** HR & Marketing modules only. No schema invention, no destructive migration guidance.

## 1. HR Feature → Frontend → API → Database Mapping

| HR Feature | Primary Frontend Page/Module | Primary API Route(s) | Primary DB Table(s) | Related Views / Functions / Triggers / Notes |
|---|---|---|---|---|
| Employees / Directory | `src/features/hr/pages/Employees.tsx`, `EmployeeProfile.tsx` | `/hr/employees`, `/hr/employees/:id` | `erp.hr_employees`, `erp.users`, `erp.departments`, `erp.designations` | `erp.hr_create_user`, `erp.hr_update_user` (034), audit logging, RLS policies |
| Employee Documents | Employee profile/docs flows | `/hr/employees/:id/documents`, `/hr/documents/:id/verify` | `erp.hr_employee_documents` | Storage path metadata in DB; actual file upload/storage flow external to route |
| Departments / Designations | Settings/forms/filters | `/hr/departments`, `/hr/designations` | `erp.departments`, `erp.designations` | Used in joins for employees/contracts/jobs |
| Attendance Records | `Attendance.tsx` | `/hr/attendance` | `erp.hr_attendance` | `erp.v_hr_attendance_summary` view; uniqueness per org/employee/date |
| Attendance Corrections | `Attendance.tsx` | `/hr/attendance/corrections`, `/decide` | `erp.hr_attendance_corrections`, `erp.approval_requests/history` | `erp.hr_apply_attendance_correction` trigger/function (033), shared approvals |
| Leaves | `Leave.tsx` | `/hr/leaves`, approve/reject/cancel | `erp.hr_leave_requests`, `erp.hr_leave_approvals`, `erp.hr_leave_types`, `erp.hr_holidays` | `erp.hr_leave_balance_sync` trigger (033), shared approvals |
| Leave Balances | Leave/profile/settings contexts | `/hr/leave-balances` | `erp.hr_leave_balances`, `erp.hr_leave_types` | Upsert per employee/type/year |
| Leave Types / Holidays / HR Settings | `Settings.tsx`, leave flows | `/hr/leave-types`, `/hr/holidays`, `/hr/settings` | `erp.hr_leave_types`, `erp.hr_holidays`, `erp.hr_settings` | Settings stored as JSON blob per org |
| Payroll Runs / Payslips | `Payroll.tsx` | `/hr/payroll/runs`, `/advance`, `/hr/payroll/payslips` | `erp.hr_payroll_runs`, `erp.hr_payslips`, `erp.hr_payslip_lines`, `erp.hr_salary_structures` | Payroll summary views, recompute/net-total triggers (033), doc numbers, approvals |
| Salary Structures | Payroll/settings contexts | `/hr/salary-structures` | `erp.hr_salary_structures` | Active structure superseding logic in route |
| Contracts | `Contracts.tsx`, `ContractDetail.tsx` | `/hr/contracts`, status/signatures/schedule payments | `erp.hr_contracts`, `erp.hr_contract_signatures`, `erp.hr_contract_payments`, `erp.hr_contract_documents` | Approval history joins to `erp.approval_requests/history`; doc numbers |
| Daily Payments (HR) | `DailyPayments.tsx` | `/hr/payments`, approve/reject/status/history, `/hr/contract-payments/:id/mark-paid` | `erp.hr_daily_payments`, `erp.hr_payment_history`, `erp.hr_contract_payments` | Finance approval integration; history endpoint now returns `{payment,history}` |
| HR Expenses | API present (limited canonical UI) | `/hr/expenses` + workflow actions | `erp.hr_expenses`, `erp.hr_expense_approvals` | Shared approvals, reimbursement status flow |
| Recruitment (Jobs/Candidates/Interviews) | `Recruitment.tsx` | `/hr/jobs`, `/hr/candidates`, `/hr/candidates/:id/interviews`, `/hr/interviews/:id/feedback` | `erp.hr_job_openings`, `erp.hr_candidates`, `erp.hr_interviews` | Candidate stage/progression logic in route |
| Onboarding | `Onboarding.tsx` | `/hr/onboarding` | `erp.hr_onboarding_records` | JSONB checklist/systems/notes |
| Performance Reviews | `Performance.tsx` | `/hr/reviews` | `erp.hr_performance_reviews` | Self/manager/HR constrained updates |
| HR Requests | `Requests.tsx` | `/hr/requests` | `erp.hr_employee_requests` | JSONB responses/history semantics |
| Offboarding | `Offboarding.tsx` | `/hr/offboarding` | `erp.hr_offboarding_records`, `erp.hr_employees` | Status side effects (notice/completed/terminated) |
| HR Dashboard / Analytics / Activities | `Dashboard.tsx`, `Reports.tsx` | `/hr/dashboard`, `/hr/analytics*`, `/hr/activities` | `erp.hr_activities` + multiple HR tables | Views: `erp.v_hr_dashboard`, `erp.v_hr_headcount`, `erp.v_hr_attendance_summary`, `erp.v_hr_leave_summary`, `erp.v_hr_payroll_summary` |

## 2. Marketing Feature → Frontend → API → Database Mapping

| Marketing Feature | Primary Frontend Page/Module | Primary API Route(s) | Primary DB Table(s) | Related Views / Functions / Triggers / Notes |
|---|---|---|---|---|---|
| Marketing Dashboard | `features/marketing/pages/MarketingDashboard.tsx`, workspace dashboards | `/marketing/dashboard` | Aggregates across marketing tables | `erp.v_marketing_dashboard`, `erp.v_lead_pipeline`, `erp.v_campaign_performance`, `erp.v_marketing_expense_summary` |
| Leads | `LeadsPage.tsx`, workspace lead pages/components | `/marketing/leads`, detail, assign, reject, convert | `erp.mkt_leads`, `erp.mkt_lead_sources`, `erp.mkt_campaigns`, `erp.users` | Lead conversion/customer refs, activities/follow-ups/assignments relations |
| Lead Activities | Lead timelines, activity views | `/marketing/leads/:id/activities` | `erp.mkt_lead_activities` | Append-style timeline |
| Follow-ups | Lead/follow-up workspaces | `/marketing/leads/:id/follow-ups`, complete/cancel | `erp.mkt_lead_follow_ups`, `erp.mkt_leads` | Lead next-action/status updates in route logic |
| Lead Conversion | Lead conversion/handover flows | `/marketing/leads/:id/convert` | `erp.mkt_lead_conversions`, `erp.customers`, `erp.mkt_customer_references` | Idempotency/replay handling; DB conversion guards/rules |
| Campaigns | `DigitalMarketingPage.tsx`, workspace views | `/marketing/campaigns` | `erp.mkt_campaigns` | `erp.v_campaign_performance` |
| Offers | Limited UI; APIs present | `/marketing/offers`, submit/decide | `erp.mkt_campaign_offers`, `erp.approval_requests/history` | Shared approval engine |
| Discounts | Limited UI; APIs present | `/marketing/discounts`, decide | `erp.mkt_discounts`, `erp.mkt_discount_approvals` | Authority/guard rules in 033 |
| Marketing Plans | `PlansBudgetsPage.tsx`, `MonthlyPlansWorkspace`, planning pages | `/marketing/plans` + workflow/execution endpoints | `erp.mkt_plans`, `erp.mkt_plan_activities`, `erp.mkt_plan_approvals` | Multi-stage approvals, admin/finance authorization paths |
| Marketing Expenses | `ExpensesPaymentsPage.tsx`, `MonthlyExpensesWorkspace` | `/marketing/expenses` + submit/decide/reimburse | `erp.mkt_expenses`, `erp.mkt_expense_approvals` | Unified source model (campaign/plan/field/other), approvals |
| Targets | Field targets UI (store-driven), APIs present | `/marketing/targets` | `erp.marketing_targets`, `erp.mkt_plans` (ref) | Used by performance refresh |
| Performance | Reports/performance dashboards | `/marketing/performance`, `/refresh` | `erp.mkt_employee_performance`, `erp.v_employee_performance` | Computed from leads/visits/campaigns/targets |
| Rewards / Transactions | Limited UI; APIs present | `/marketing/rewards`, award/redeem/transactions | `erp.mkt_reward_wallets`, `erp.mkt_reward_transactions`, `erp.v_reward_balances` | Append-only reward tx trigger + wallet balance application |
| Field Visits | `features/field-marketing/VisitPlanner.tsx`, dashboards | `/marketing/visits`, check-in/out | `erp.mkt_field_visits` | Assignee/supervisor scope checks, status transitions |
| Surveys | `features/field-marketing/MarketSurveys.tsx` | `/marketing/surveys` | `erp.mkt_market_surveys`, `erp.regions` | Region linkage |
| Dealers | `features/field-marketing/DealerProspectDirectory.tsx` | `/marketing/dealers` | `erp.mkt_dealer_prospects` | Lead/customer refs, owner assignment |
| Activity Records | Dashboard/activity feeds | `/marketing/activity-records` | `erp.mkt_activity_records` | Consolidated append-only records; analytics/scoped reads |

## 3. Cross-Cutting HR/Marketing Database Objects

| Object Type | Name(s) | Purpose |
|---|---|---|
| Shared approvals | `erp.approval_requests`, `erp.approval_history`, `erp.request_approval`, `erp.decide_approval` | Unified approval workflow/history for HR and Marketing entities |
| RLS / tenancy helpers | Policies/functions in `031_rls.sql`, `erp.current_org_id()`, `erp.current_user_id()` usage | Organization isolation and access control enforcement |
| Analytics views | `erp.v_hr_*`, `erp.v_marketing_dashboard`, `erp.v_lead_pipeline`, `erp.v_campaign_performance`, `erp.v_employee_performance`, `erp.v_reward_balances`, `erp.v_marketing_expense_summary` | Read models for dashboards/reports/analytics |
| Business rules/triggers | `033_business_rules.sql` (leave balance sync, attendance correction apply, payroll recompute, reward tx apply, lead/discount/payment guards, audit row change, etc.) | Data integrity and workflow automation |
| HR API support functions | `erp.hr_create_user`, `erp.hr_update_user` (034) | Controlled provisioning/update of shared `erp.users` for HR flows without widening RLS |

## 4. Relationship & Constraint Notes (Selected)

- **Org scoping:** HR/Marketing records are org-scoped (`org_id`) and protected by RLS policies.
- **UUID identities:** Primary/foreign keys use UUIDs across HR/Marketing entities; many FKs reference `erp.users`, `erp.hr_employees`, `erp.mkt_leads`, `erp.mkt_plans`, shared `erp.customers`, etc.
- **Uniqueness/idempotency:** Present in multiple flows (e.g. attendance per employee/day, payroll period idempotency, leave/campaign/contract/payment codes/keys depending on table, lead conversion uniqueness, reward tx append-only constraints).
- **Workflow state integrity:** Enforced by route-level transition checks and DB constraints/triggers/functions (and shared approvals) rather than ad hoc frontend-only logic.
- **Document metadata vs storage:** Routes store metadata/paths in DB; Supabase Storage upload/access remains a separate integration concern and must be verified live.

## 5. Verification Status

- **Schema objects present in migrations:** Verified by static audit.
- **Applied to live database:** **NOT VERIFIED** in this environment.
- **RLS/trigger/function behavior at runtime:** **NOT VERIFIED** in this environment.
- **Frontend data binding to these mappings:** **PARTIALLY VERIFIED** by code inspection (hybrid/demo/API patterns vary by module/page).
