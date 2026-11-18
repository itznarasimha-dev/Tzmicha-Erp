# Phase 1 — Repository Audit & Frontend→Database Mapping Report

**Project:** Totally ERP / Tzmicha Enterprise
**Scope audited:** HR Management + Marketing only (read-only audit; no files modified)
**Audit date:** 2026-11-11
**Repository root:** `ERP-main/`

---

## 1. Executive summary

| Question | Finding |
|---|---|
| Is the repo a git repository? | **No.** `git status` → `fatal: not a git repository`. The folder is a ZIP/extracted copy. |
| Is there a backend? | **No.** No `server/`, `api/`, NestJS, Express, Fastify, Next.js API routes or edge functions. |
| Is Supabase configured? | **No.** Zero occurrences of `supabase`, `createClient`, `DATABASE_URL`, `service_role` in `src/`. No `.env` file, no `supabase/` folder. |
| Are there SQL migrations? | **No.** No `.sql` or `.prisma` file anywhere outside `node_modules`. |
| Is there an ERP database schema? | **No.** The shared ERP `erp.*` schema described in the specification does **not** exist in this repository. All "database" behaviour is a browser `localStorage` simulation. |
| Is there real authentication? | **No.** Role switching is a demo control. Marketing has a hard-coded demo login. HR has no auth at all. |
| Is there RBAC? | **Partially, frontend-only.** `ROLE_PERMISSIONS` in `src/types/index.ts` + `RoleGuard`. No server-side or database enforcement. |
| Frontend framework | React 19 + TypeScript + Vite 8 + Tailwind 3 + Zustand 5 + Recharts 3 + React Router 7. |
| Build tooling | `tsc -b && vite build`, oxlint. No test runner installed. |

**Bottom line:** this is a **frontend prototype**. There is nothing to *connect to* yet. The entire data tier (schema, migrations, auth, API, storage) has to be created, and it must be created **defensively** so it merges cleanly when the other team member lands the shared ERP schema.

---

## 2. Repository structure (inspected)

```
ERP-main/
├── package.json                 # React/Vite app, no backend deps
├── vite.config.ts / vite.config.js / vercel.json
├── tailwind.config.js / postcss.config.js
├── index.html
├── README.md                    # describes a 4-role glassmorphism ERP demo
└── src/
    ├── App.tsx                  # single BrowserRouter, mounts every portal
    ├── main.tsx / main.jsx
    ├── types/index.ts           # 68 domain interfaces (the de-facto "schema")
    ├── store/useErpStore.ts     # 4,987-line Zustand store, localStorage persistence
    ├── mock-data/{seed.ts,financeSeed.ts}
    ├── services/{finance,inventory,pricing}Service.ts
    ├── routes/RoleProtectedRoute.tsx
    ├── components/{auth,layout,ui}/
    └── features/
        ├── admin/               # 30 admin views
        ├── manager/
        ├── sales/               # standalone Sales portal (JSX)
        ├── service/             # standalone Service portal
        ├── store/ + store-manager/
        ├── finance/
        ├── field-marketing/     # used by Marketing portal
        ├── hr/                  # ← OUR SCOPE: standalone HR portal (14 modules)
        ├── marketing/           # ← OUR SCOPE: standalone Marketing portal
        └── shared/
```

### Scope ownership confirmed

| Folder | Ownership | Evidence |
|---|---|---|
| `src/features/hr/` | **Ours** | Mounted at `/hr/*` in `src/App.tsx` via `HRPortalLayout`. |
| `src/features/marketing/` | **Ours** | Mounted at `/marketing/*` via `MarketingPortalLayout`. |
| `src/features/field-marketing/` | **Ours** (marketing sub-scope) | Mounted inside `MarketingPortalLayout` (`/marketing/field-ops`, `/visits`, `/surveys`, `/dealers`, `/wallet`, `/targets`). |
| `src/features/marketing/pages/hr/*` + `HRWorkspacePage.tsx` | **Ours, duplicated** | Only reachable from `src/features/marketing/App.tsx`, which is **not mounted** by the root `App.tsx`. Dead/second legacy HR implementation. |
| `src/features/{admin,manager,sales,service,store,store-manager,finance}/` | **Other team / untouched** | Do not modify. |
| `src/store/useErpStore.ts`, `src/mock-data/*`, `src/types/index.ts` | **Shared / other team** | Read-only reference. Marketing imports `useErpStore` for the connected-user badge and children of the "targets/rewards" flows. |

---

## 3. HR Management — full frontend inventory

Mounted by `src/features/hr/HRPortalLayout.tsx`. State: `src/features/hr/store.tsx` → React context + `localStorage['titan-hr-db-v1']`. Seed: `src/features/hr/data/demo.ts` (1,023 lines of demo records). No API, no auth, no permissions.

### 3.1 Modules (14 tabs)

| # | Tab | Route | Page file | Core features present |
|---|---|---|---|---|
| 1 | Dashboard | `/hr` | `pages/Dashboard.tsx` | Headcount KPIs, department chart, attendance trend, pending approvals, activity feed |
| 2 | Employees | `/hr/employees` | `pages/Employees.tsx` | Directory table, search/filter/sort, create/edit modal, delete cascade, CSV export, profile link |
| 3 | Employee profile | `/hr/employees/:id` | `pages/EmployeeProfile.tsx` | Personal + bank + emergency data, salary, skills, documents upload/verify/remove |
| 4 | Attendance | `/hr/attendance` | `pages/Attendance.tsx` | Daily register, status edit, correction requests + approve/reject, CSV export |
| 5 | Leave | `/hr/leave` | `pages/Leave.tsx` | Balances, apply leave, approve/reject with remarks, leave policies (settings), register export |
| 6 | Recruitment | `/hr/recruitment` | `pages/Recruitment.tsx` | Job openings, candidate Kanban by stage, interviews, offer, convert to employee |
| 7 | Onboarding | `/hr/onboarding` | `pages/Onboarding.tsx` | Onboarding records, checklists, systems access, documents, status |
| 8 | Payroll | `/hr/payroll` | `pages/Payroll.tsx` | Payroll entries per period, salary components, status pipeline Draft→HR Review→Finance Approval→Approved→Paid, payslip |
| 9 | Contracts | `/hr/contracts` | `pages/Contracts.tsx` | Contract register, create modal, detail, signatures, renewals, termination, documents |
| 10 | Contract detail | `/hr/contracts/:id` | `pages/ContractDetail.tsx` | Signature capture, renew, terminate, payment schedule, document upload, timeline, export |
| 11 | Daily payments | `/hr/payments` | `pages/DailyPayments.tsx` | Payment queue to Finance, approve/reject, mark paid, method, categories, export |
| 12 | Performance | `/hr/performance` | `pages/Performance.tsx` | Review cycles, goals, self/manager/HR ratings, reminders, create/delete |
| 13 | Requests | `/hr/requests` | `pages/Requests.tsx` | Employee request tickets, assignment, status, threaded responses |
| 14 | Offboarding | `/hr/offboarding.tsx` | `pages/Offboarding.tsx` | Resignation intake, 4-department clearance, exit interview, settlement, complete |
| 15 | Reports | `/hr/reports` | `pages/Reports.tsx` | Cross-module reports + CSV export |
| 16 | HR settings | `/hr/settings` | `pages/Settings.tsx` | Departments, designations, employment types, statuses, working hours, attendance policy, holidays, leave types, recruitment stages, onboarding checklist, contract types, payment categories, review templates |

### 3.2 HR domain model (from `src/features/hr/types.ts`)

`Employee`, `AttendanceRecord`, `AttendanceCorrection`, `LeaveRequest`, `JobOpening`, `Candidate`, `Interview`, `OnboardingRecord`, `ChecklistItem`, `PayrollEntry`, `Contract`, `ContractSignature`, `PaymentScheduleItem`, `DailyPayment`, `PerformanceReview`, `Goal`, `EmployeeRequest`, `RequestResponse`, `OffboardingRecord`, `Clearance`, `Holiday`, `LeaveType`, `SettingsData`, `DocFile`, `Activity`, `Notification`.

Critical observations:
- `Employee.salary` is stored on the employee record and rendered in the directory → confidential data needs column-level protection + permission gating.
- `Employee.bankAccount` is plain text in the browser → must become a restricted column, never returned by list endpoints.
- `Employee.documents[].dataUrl` stores base64 file content in localStorage → must move to Supabase Storage.
- IDs are `emp-001` style strings → must become UUID FKs with a separate `employee_code` business identifier.
- Deleting an employee currently cascades across attendance/leave/payroll → must become soft-delete/termination, never physical delete of financial history.
- There is **no role concept inside the HR portal** — any visitor to `/hr` can do everything. RBAC must be added.

---

## 4. Marketing — full frontend inventory

Mounted by `src/features/marketing/MarketingPortalLayout.tsx`. State lives in **six** localStorage-backed contexts:

| Context | Storage key | Responsibility |
|---|---|---|
| `AuthContext` | demo session | Single hard-coded demo credential (`DEMO_CREDENTIALS`), no real auth |
| `DemoRoleContext` | `demo role` | Switch between Tiers 1–3 / HR / Finance / Employee |
| `DemoDataContext` | marketing data | Entire marketing dataset (44 collections) |
| `RoleWorkspaceContext` | role workspace | Per-role dashboards/tasks |
| `MarketingDepartmentContext` | dept state | Department plan/expense workflow (1,800+ lines) |
| `HRContext` | hr state | Legacy HR workspace inside marketing (dead code path) |
| `ToastContext` / `ThemeContext` | — | UI only |

### 4.1 Modules and tabs (`config/navigation.ts`)

| Module | Path | Tabs |
|---|---|---|
| Dashboard | `/marketing/dashboard` | Overview |
| Plans & Budgets | `/marketing/plans` | Monthly Plans, Campaign Budgets, Budget Tracking, Forecast vs Actual |
| Digital Marketing | `/marketing/digital` | Campaigns, Social Media, Email, Website & SEO |
| Field Marketing | `/marketing/field` | Field Teams, Field Visits, Store Visits & Demos, Event Activities, Market Research, Expense Claims, Visit Reports |
| Trade & Retail | `/marketing/trade` | Store Activities, Posters & Banners, Retail Promotions, Dealer Schemes, Store Agreements, Trade Events |
| Agencies & Partners | `/marketing/agencies` (hidden) | Agencies, Influencers, Production Houses, Printing Vendors, Event Organizers, Vendor Performance |
| Marketing Assets | `/marketing/assets` (hidden) | 5 asset categories |
| Leads & Attribution | `/marketing/leads` | Dashboard, Campaign Leads, Pipeline Board, Follow-ups, Sales Handovers, Attribution, Sales Opportunities, Campaign-to-Sales, ROI |
| Expenses & Payments | `/marketing/expenses` | Monthly Expenses, Campaign Expenses, Field Expense Claims, Budget vs Actual, Finance Integration |
| Approvals & Contracts | `/marketing/approvals` | Approval Inbox, Pending, Campaign, Budget, Offer approvals, Contract Management, Usage Rights, Renewals |
| Reports & Analytics | `/marketing/reports` | 7 report tabs |
| AI Assistant | `/marketing/assistant` | 5 suggestion tabs (template-driven, no backend) |

Plus role workspaces: `/marketing/workspace/:section` for Manager / Senior / Junior dashboards (`pages/workspace/*`).

### 4.2 Lead workflow implemented in the UI (must be preserved)

`New → Contacted / Interested / Follow-up Required → Qualified → Sent to Sales → Converted` with closed outcomes `Rejected / Not Interested / Lost`.

Rich sub-models already present and required in the database:
`LeadInterests`, `LeadQualification`, `LeadAttribution`, `LeadFollowUp`, `LeadSalesAssignment` (with `handoverHistory`, `contactAttempts`, `reassignments`, `supervisoryNotes`, `customerNotifications`), `LeadRejection` (with previous status/follow-up for restore), `LeadConversion` (customerId, opportunityId).

Conversion rules already coded: duplicate-customer guard, single customer per lead, sales rep + supervising manager, handover event recording, `converted` flag.

### 4.3 Marketing domain model (`types/marketing.ts` + `types/workflow.ts`)

44 collections: campaigns, plans, monthlyPlans, marketingExpenses, workflowConfig, leads, opportunities, fieldTeams, fieldVisits, research, socialPosts, paidAds, emails, seoTasks, keywords, content, influencers, videos, storeActivities, posters, promotions, dealerSchemes, storeAgreements, tradeEvents, agencies, assets, expenses, invoices, celebrityPayments, fieldClaims, customers, salesReps, approvals, contracts, notifications, aiHistory, assistantPlans.

Workflow models: `MonthlyPlan` (multi-stage: Draft → Pending Senior → Pending Manager → Pending Admin Financial Authorization → Approved/In Progress → Results Review → Completed), `MarketingExpenseRequest` (Draft → Submitted → Manager → Admin → Approved/Rejected), `AdminAuthorizationState`, `WorkflowApprovalEntry`.

Critical observations:
- `MarketingExpenseRequest` + `Expense` + `FieldClaim` are three overlapping expense models → must map to one `erp.mkt_expenses` table with a `source` discriminator, not three tables.
- Marketing keeps its **own** `customers` and `salesReps` arrays → these must become **references** to shared ERP customers/users; no duplicate customer system.
- `Approvals` are generic (Campaign/Budget/Offer/Contract/Creative/Expense) → one shared `erp.approval_requests` table.
- `wallet`/rewards do **not** exist in the marketing model today; the wallet UI is actually in `field-marketing/MarketingWalletAndExpenses.tsx`, bound to the **shared** `useErpStore.walletTransactions` / `expenseClaims`. The spec's "Rewards Wallet" therefore needs a new marketing-specific wallet (`mkt_reward_wallets`) plus reuse of the shared wallet for advances.
- `MarketingTarget` already exists in the shared store (`types/index.ts:920`) → reuse, do not duplicate.

---

## 5. Shared ERP entities available in the frontend (must be reused)

From `src/types/index.ts` and `src/store/useErpStore.ts`:

| Frontend type | Key fields | Target table (to create if absent) |
|---|---|---|
| `Organization` | `id`, `teamId`, `name`, `legalName`, `taxGstNumber`, `plan`, `currency` | `erp.organizations` |
| `User` | `id`, `name`, `email`, `role`, sub-roles, `employeeId`, `department`, `permissions`, `organizationId`, `teamId`, `assignedRegionId`, `assignedWarehouseIds`, `walletBalance` | `erp.users` (+ `erp.roles`) |
| `Region` | `id`, `code`, `name`, `state` | `erp.regions` |
| `Warehouse` | `id`, `regionId`, `code`, `name` | `erp.warehouses` |
| `Product` | `id`, `sku`, prices, category | `erp.products` |
| `Customer` | `id`, `code`, `name`, `phone`, `email`, `gstin`, `creditLimit`, `status` | `erp.customers` |
| `Supplier` | `id`, `code`, `name` | `erp.suppliers` |
| `Quotation` | `id`, `quotationNo`, `customerId`, totals | `erp.quotations` |
| `SalesOrder` | `id`, `orderNumber`, `customerId`, `discountPercent`, status | `erp.sales_orders` |
| `Invoice` | `id`, `invoiceNumber`, `customerId`, `balance` | `erp.invoices` |
| `ExpenseClaim` / `WalletTransaction` | claims, advances, `balanceAfter` | `erp.expense_claims`, `erp.wallet_transactions` |
| `MarketingTarget` | employee, period, metric, target/achieved | `erp.marketing_targets` (shared) |
| `EmployeeAttendanceRecord` | per-day punch + POA | superseded by `erp.hr_attendance` (HR-owned), shared read model |
| `LeaveRequest` | leave application | superseded by `erp.hr_leave_requests` |
| `PayrollRecord` | payroll month/status/net pay | superseded by `erp.hr_payslips` |
| `RoleQueryTicket` | helpdesk | `erp.role_queries` (shared) — out of scope, reference only |

**Reuse rules adopted:**
1. `erp.users` remains the single employee identity. HR adds a **1:1 profile extension** (`erp.hr_employees`), not a second employee table.
2. Marketing leads reference `erp.customers`/`erp.products`/`erp.sales_orders`/`erp.invoices`/`erp.payments` by UUID. No marketing copy of customers, products, invoices or payments.
3. Targets/rewards reference `erp.users`; rewards are a marketing-owned ledger.
4. Approvals are centralised in `erp.approval_requests` + `erp.approval_history` and used by both modules.

---

## 6. Frontend → Database → API → Permission mapping

### 6.1 HR

| Frontend feature | Component | Table(s) | API | Permission | Validation | Relationships |
|---|---|---|---|---|---|---|
| Employee directory | `pages/Employees.tsx` | `erp.hr_employees` ⋈ `erp.users`, `erp.departments`, `erp.designations` | `GET /api/hr/employees` | `hr.employee.read` | org scope, pagination, search | manager_id → hr_employees |
| Create/edit employee | `components/employee-modal.tsx` | `erp.hr_employees`, `erp.users`, `erp.hr_employee_documents` | `POST/PATCH /api/hr/employees` | `hr.employee.write` | unique email/employee_code, dates, bank format | department, designation, manager, org |
| Employee profile + docs | `pages/EmployeeProfile.tsx` | `erp.hr_employee_documents`, storage `erp-attachments` | `GET /api/hr/employees/:id`, `POST /api/hr/employees/:id/documents` | `hr.employee.read` / `hr.document.write` | mime allowlist, ≤10 MB, org path | employee |
| Attendance register | `pages/Attendance.tsx` | `erp.hr_attendance` | `GET/POST/PATCH /api/hr/attendance` | `hr.attendance.read/write` | one row per employee/date, hours 0–24 | employee |
| Attendance correction | `pages/Attendance.tsx` | `erp.hr_attendance_corrections`, `erp.approval_requests` | `POST /api/hr/attendance/corrections`, `POST .../approve|reject` | `hr.attendance.approve` | reason required on reject | attendance record |
| Leave balances/apply | `pages/Leave.tsx` | `erp.hr_leave_types`, `erp.hr_leave_balances`, `erp.hr_leave_requests` | `GET/POST /api/hr/leaves` | `hr.leave.read/create` | from ≤ to, no overlap, balance ≥ days | employee, leave type |
| Leave approval | `pages/Leave.tsx` | `erp.hr_leave_approvals`, `erp.hr_leave_requests` | `POST /api/hr/leaves/:id/approve|reject` | `hr.leave.approve` | self-approval blocked, remarks on reject | approver |
| Leave policy settings | `pages/Settings.tsx` | `erp.hr_leave_types`, `erp.hr_holidays`, `erp.hr_settings` | `GET/PATCH /api/hr/settings` | `hr.settings.write` | allocation 0–365 | org |
| Payroll run | `pages/Payroll.tsx` | `erp.hr_payroll_runs`, `erp.hr_payslips`, `erp.hr_payslip_lines` | `GET/POST /api/hr/payroll` | `hr.payroll.read/prepare` | one run per period, net = sum components | employee, salary structure |
| Salary structure | `pages/Payroll.tsx` | `erp.hr_salary_structures`, `erp.hr_salary_components` | `GET/POST /api/hr/salary-structures` | `hr.payroll.read` (own) / `hr.salary.write` | basic+allowances−deductions = net | employee |
| Payslip | `pages/Payroll.tsx` | `erp.hr_payslips` | `GET /api/hr/payroll/:id` | own payslip or `hr.payroll.read` | — | run, employee |
| Payroll finance approval | `pages/Payroll.tsx` | `erp.hr_payroll_runs`, `erp.approval_requests` | `POST /api/hr/payroll/:id/approve` | `finance.payroll.approve` | cannot approve own run | approver |
| Contracts | `pages/Contracts.tsx`, `ContractDetail.tsx` | `erp.hr_contracts`, `_signatures`, `_payments` | `GET/POST/PATCH /api/hr/contracts` | `hr.contract.read/write` | end ≥ start, value ≥ 0 | employee, department |
| Daily payments | `pages/DailyPayments.tsx` | `erp.hr_daily_payments` (+ shared payments on approval) | `/api/hr/payments` | `hr.payment.read/create`, `finance.payment.approve` | idempotency key, amount > 0 | employee, contract |
| HR expenses | (spec) / payroll-adjacent | `erp.hr_expenses`, `erp.hr_expense_approvals` | `/api/hr/expenses` | `hr.expense.create/approve` | receipt required > ₹5,000 | employee, approval |
| Recruitment | `pages/Recruitment.tsx` | `erp.hr_job_openings`, `_candidates`, `_interviews` | `/api/hr/recruitment/*` | `hr.recruitment.*` | stage transitions | job, candidate |
| Onboarding | `pages/Onboarding.tsx` | `erp.hr_onboarding_records` | `/api/hr/onboarding` | `hr.onboarding.*` | checklist completeness | employee |
| Performance | `pages/Performance.tsx` | `erp.hr_performance_reviews` | `/api/hr/performance` | `hr.performance.*` | rating 1–5, self ≠ final | employee, manager |
| Requests | `pages/Requests.tsx` | `erp.hr_employee_requests` | `/api/hr/requests` | `hr.request.*` / own | status transitions | employee |
| Offboarding | `pages/Offboarding.tsx` | `erp.hr_offboarding_records` | `/api/hr/offboarding` | `hr.offboarding.*` | all clearances before complete | employee |
| Dashboard/analytics | `pages/Dashboard.tsx`, `Reports.tsx` | `erp.v_hr_dashboard`, `erp.v_hr_headcount` | `GET /api/hr/dashboard`, `/analytics` | `hr.analytics.read` | — | aggregates |

### 6.2 Marketing

| Frontend feature | Component | Table(s) | API | Permission | Validation | Relationships |
|---|---|---|---|---|---|---|
| Lead capture | `components/leads/LeadFormModal.tsx` | `erp.mkt_leads`, `erp.mkt_lead_sources` | `POST /api/marketing/leads` | `marketing.lead.create` | phone/email required, dedupe on phone+org | source, campaign, product, assignee |
| Lead list/board/filters | `LeadsDashboard`, `LeadBoard` | `erp.mkt_leads`, `erp.v_lead_pipeline` | `GET /api/marketing/leads` | `marketing.lead.read` | scope by role/assignee | — |
| Lead edit/qualify | `LeadProfileModal` | `erp.mkt_leads`, `erp.mkt_lead_activities` | `PATCH /api/marketing/leads/:id` | `marketing.lead.update` | status transition matrix | — |
| Assign lead | `SendToSalesModal`, `components/leads/SalesHandover*` | `erp.mkt_lead_assignments`, `erp.mkt_lead_activities` | `POST /api/marketing/leads/:id/assign` | `marketing.lead.assign` | requires qualified status, active sales user | sales user, manager |
| Follow-ups | `FollowUpModal`, `FollowUpsTab` | `erp.mkt_lead_follow_ups` | `POST /api/marketing/leads/:id/followups`, `PATCH .../followups/:fid` | `marketing.lead.followup` | due date required, one open follow-up | lead |
| Reject lead | `SalesHandoversTab` | `erp.mkt_lead_rejections` | `POST /api/marketing/leads/:id/reject` | `marketing.lead.reject` | reason required, preserve previous status | — |
| Convert lead → customer | conversion flow | `erp.mkt_lead_conversions`, `erp.customers`, `erp.mkt_customer_references` | `POST /api/marketing/leads/:id/convert` | `marketing.lead.convert` | **idempotent**, one conversion/lead, no duplicate customer | customer, opportunity |
| Attribution | `components/leads/AttributionTab.tsx` | `erp.mkt_leads.attribution` (jsonb), `erp.mkt_campaigns` | `GET /api/marketing/analytics/attribution` | `marketing.analytics.read` | — | campaign, lead |
| Campaigns | `pages/DigitalMarketingPage.tsx`, `MarketingModulePage` | `erp.mkt_campaigns` | `/api/marketing/campaigns` | `marketing.campaign.*` | end ≥ start, budget ≥ 0 | product, owner |
| Offers | trade/offer tabs | `erp.mkt_campaign_offers` | `/api/marketing/offers` | `marketing.offer.*` | discount 0–100 | campaign, product |
| Discounts + approvals | `SalesDiscountMatrix` (admin, ref) | `erp.mkt_discounts`, `erp.mkt_discount_approvals` | `/api/marketing/discounts` | `marketing.discount.request/approve` | exceeds limit → approval required | offer, order, customer |
| Targets | `field-marketing/MarketingTargets.tsx`, role workspaces | `erp.marketing_targets` (shared) + `erp.mkt_targets` extension | `/api/marketing/targets` | `marketing.target.read/write` | period uniqueness | employee |
| Performance | `ReportsAnalyticsPage` role/campaign tabs | `erp.mkt_employee_performance` | `/api/marketing/performance` | `marketing.performance.read` | derived only, never manually edited | employee, targets |
| Rewards wallet | (new; wallet UI today uses shared wallet) | `erp.mkt_reward_wallets`, `erp.mkt_reward_transactions` | `/api/marketing/rewards`, `/transactions` | `marketing.reward.read` | append-only, balance = sum(tx) | employee |
| Monthly plans | `MonthlyPlansWorkspace`, `MonthlyPlanFormModal` | `erp.mkt_plans`, `erp.mkt_plan_activities`, `erp.mkt_plan_approvals` | `/api/marketing/plans` | `marketing.plan.*` | month format, budget > 0, stage order | employee, reviewer |
| Expenses | `MonthlyExpensesWorkspace`, `ExpenseFormModal` | `erp.mkt_expenses`, `erp.mkt_expense_approvals` | `/api/marketing/expenses` | `marketing.expense.create/approve` | amount > 0, receipt, plan link | plan, activity |
| Field visits | `field-marketing/VisitPlanner.tsx` | `erp.mkt_field_visits` | `/api/marketing/visits` | `marketing.visit.*` | check-out requires check-in | lead/customer |
| Surveys | `field-marketing/MarketSurveys.tsx` | `erp.mkt_market_surveys` | `/api/marketing/surveys` | `marketing.survey.*` | required observation | region |
| Dealers/prospects | `DealerProspectDirectory.tsx` | `erp.mkt_dealer_prospects` | `/api/marketing/dealers` | `marketing.dealer.*` | dedupe by phone | customer on conversion |
| Approvals inbox | `ApprovalInboxPage` | `erp.approval_requests`, `erp.approval_history` | `/api/marketing/approvals` | `marketing.approval.decide` | stage/role check | any entity |
| Dashboard/analytics | `MarketingDashboard`, `ReportsAnalyticsPage` | `erp.v_marketing_dashboard`, `erp.v_campaign_performance` | `/api/marketing/dashboard`, `/analytics` | `marketing.analytics.read` | — | — |

---

## 7. Existing architecture conventions to follow

| Concern | Existing convention | Decision |
|---|---|---|
| State | Zustand + context providers | Keep UI state; add API-backed data providers |
| IDs | `emp-001`, `ld-0001`, `TOT-MKT-0087` | UUID PK + `*_code` business identifier |
| Dates | ISO strings / `YYYY-MM-DD` | `date` for business dates, `timestamptz` for events |
| Money | `number` (INR) | `numeric(14,2)`, currency on organization |
| CSS | Tailwind + per-portal CSS | untouched |
| Navigation | React Router nested routes | untouched |
| Role model | `UserRole` + sub-role strings | mirror in `erp.roles` with codes |
| Demo data | `data/demo.ts`, `data/marketing/*` | retained as *seed/dev fixtures*, never as runtime data source once APIs are live |
| No tests | — | add backend integration tests + frontend type/build gate |

---

## 8. Gaps, risks and blockers

| # | Severity | Finding | Mitigation |
|---|---|---|---|
| R1 | **Blocker** | No Supabase project, URL, anon key, service key, or `DATABASE_URL` exists. Migrations cannot be applied or verified against a live DB from this repo. | Provide credentials; migrations are written to be idempotent and reviewable. |
| R2 | **Critical** | No shared `erp` schema in repo; another teammate is landing it. | Baseline tables created with `CREATE TABLE IF NOT EXISTS` + documented "adopt shared if present" header. No destructive statements. |
| R3 | **Critical** | No backend at all. | Create `server/` (Node 20 + Express + TS + `pg`), mounted independently; do not touch existing frontend entry. |
| R4 | **Critical** | HR portal has no RBAC whatsoever. | Add `hr.*` permission set in DB + server; gate UI with `RoleGuard`/permission hook. |
| R5 | **High** | Marketing auth accepts one hard-coded credential; session is a localStorage object. | Replace with Supabase Auth sign-in; keep demo mode behind `VITE_DEMO_MODE`. |
| R6 | **High** | Duplicate HR implementation (`features/hr` vs `features/marketing/pages/hr`) with diverging models. | Treat `features/hr` as canonical; leave the legacy one untouched (it is unreachable) and note it for removal by the repo owner. |
| R7 | **High** | `localStorage` is used as a database across 6 contexts; large datasets exceed quota risk. | Move to API; retain local cache only for demo mode. |
| R8 | **High** | Plaintext bank account / salary / document base64 in browser storage. | Restricted columns, `hr.salary.read` permission, Supabase Storage private buckets. |
| R9 | Medium | Three overlapping expense models in marketing. | Single `mkt_expenses` with `source` enum; adapters for UI models. |
| R10 | Medium | Demo IDs are non-UUID and non-unique across portals (`ld-001`, `emp-001`). | Server generates UUIDs + business codes; UI switches to codes for display. |
| R11 | Medium | No test runner or CI. | Add `server` tests (vitest) + `npm run build` gate; document manual UI test matrix. |
| R12 | Low | `README.md` documents 4 roles only; HR/Marketing portals are newer. | Documentation update in final report. |

---

## 9. Implementation plan adopted (post-audit)

1. **Database** — `supabase/migrations/*.sql` with: shared baseline (idempotent), helper functions, auth sync, storage, HR (core/attendance/leave/payroll/contracts/payments/expenses/talent), Marketing (leads/campaigns/offers/discounts/targets/rewards/expenses/plans/field), approvals, RLS, analytics views, seed.
2. **Backend** — `server/` Express API: Supabase JWT verification, org-scoped RLS transaction context, zod validation, idempotency, audit, `/api/me`, `/api/hr/*`, `/api/marketing/*`.
3. **Frontend integration** — `src/lib/api` client + per-domain services; HR store and marketing data provider hydrate from and persist to the API when `VITE_API_URL` is set, falling back to demo mode otherwise (no UI redesign).
4. **Security** — RLS + permission checks in DB and server; storage policies; no service-role key in client.
5. **Testing** — backend integration tests, build/type gate, documented manual matrix.
6. **Report** — completed / partial / not started, with exact evidence.

**Rules honoured during implementation:** no deletion of unrelated folders, no modification of Sales/Finance/Store/Admin/Service modules, no duplicate customer/product/finance systems, no mock data presented as a live database.

---

## 10. Phase 1 gate

- [x] Repository inspected — no files modified
- [x] HR folder identified (`src/features/hr`)
- [x] Marketing folder identified (`src/features/marketing`, `src/features/field-marketing`)
- [x] Shared schemas inspected (frontend model only — no DB)
- [x] Frontend→DB→API mapping produced (section 6)
- [x] Risks and blockers documented (section 8)
- [ ] Live database inspection — **blocked**, no Supabase project/credentials in repo
