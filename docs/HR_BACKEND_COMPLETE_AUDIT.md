# HR Backend Complete Audit

**Project:** Totally ERP / Tzmicha Enterprise  
**Scope:** HR Management only (no Sales/Service/Finance/Inventory/Procurement changes)  
**Audit date:** 2026-11-12  
**Environment:** `C:\Users\HOME\Desktop\ERP-main2\ERP-main` (workspace nested under repo folder), not a git repo in this environment.  
**Method:** Static repository audit (frontend HR pages/routes/hooks, backend HR routes/middleware/mappers/libs, Supabase migrations/views/RLS/functions, existing docs/tests) + baseline checks executed locally (server typecheck/tests, frontend build/typecheck evidence from run). No destructive DB operations performed.

## 1. Executive Summary

| Area | Status |
|---|---|
| HR backend route coverage (core CRUD/workflows) | **MOSTLY COMPLETE** with targeted gaps/contract mismatches |
| HR frontend integration (canonical portal `src/features/hr`) | **PARTIALLY COMPLETE / HYBRID** (API-connected in API mode for many flows, demo/local fallbacks remain; page-by-page full integration not completed in this pass) |
| Database schema/RLS/rules/views for HR (migrations) | **COMPLETE in code** (deployment/runtime verification **BLOCKED**) |
| Security/auth/permissions wiring | **COMPLETE in server design** (JWT + DB identity + RLS context + permission checks) |
| Automated tests (HR domain) | **PARTIAL** (DB-free route wiring/auth tests added in `server/src/hr-routes.test.ts`; no live DB workflow integration tests) |
| Live Supabase/API runtime verification | **BLOCKED** (no verified live credentials/connected runtime in this audit) |

## 2. Inspected HR Surfaces

### 2.1 Frontend (canonical HR portal, root-mounted)
- Shell/routing/state: `src/features/hr/HRPortalLayout.tsx`, `src/features/hr/App.tsx` (standalone variant), `src/App.tsx` mounts `/hr/*` for roles `hr|admin|manager`
- Data layer: `src/features/hr/store.tsx`, `src/features/hr/useHrData.ts`, `src/features/hr/api-sync.ts`, `src/features/hr/api-actions.ts`, `src/lib/api/hr.ts`, `src/lib/api/client.ts`
- Pages: `Dashboard.tsx`, `Employees.tsx`, `EmployeeProfile.tsx`, `Attendance.tsx`, `Leave.tsx`, `Recruitment.tsx`, `Onboarding.tsx`, `Payroll.tsx`, `Contracts.tsx`, `ContractDetail.tsx`, `DailyPayments.tsx`, `Performance.tsx`, `Requests.tsx`, `Offboarding.tsx`, `Reports.tsx`, `Settings.tsx`, `NotFound.tsx`
- Components/support: `components/employee-modal.tsx`, `components/contract-modal.tsx`, `components/ui.tsx`, `types.ts`, `data/demo.ts`, `lib/hr.ts`

### 2.2 Additional HR-related frontend surfaces (separate/legacy demo implementations, not canonical backend-integrated portal)
- `src/features/marketing/pages/HRWorkspacePage.tsx`, `src/features/marketing/pages/hr/*.tsx`, `src/features/marketing/context/HRContext.tsx`, `src/features/marketing/config/hrNavigation.ts` (browser-local/demo HR workspace in marketing feature namespace)
- `src/features/marketing/pages/marketing-workspace/HRContext.tsx`, `HRPages.tsx` (legacy/demo)

### 2.3 Backend
- Router mount: `server/src/routes/hr/index.ts` (`authenticate` applied to all HR routes)
- Feature routes: `directory.ts`, `attendance.ts`, `leave.ts`, `payroll.ts`, `contracts.ts`, `expenses.ts`, `talent.ts`, `dashboard.ts`
- Shared infra: `server/src/middleware/auth.ts`, `server/src/db/transaction.ts`, `server/src/db/pool.ts`, `server/src/lib/{sql,validation,approvals,idempotency}.ts`, `server/src/http.ts`, `server/src/mappers/hr.ts`

### 2.4 Database (HR migrations/views/rules/RLS support)
- Core HR: `010_hr_core.sql`, `011_hr_attendance_leave.sql`, `012_hr_payroll.sql`, `013_hr_contracts_payments.sql`, `014_hr_expenses.sql`, `015_hr_talent.sql`
- Cross-cutting: `030_approvals.sql`, `031_rls.sql`, `032_analytics_views.sql`, `033_business_rules.sql`, `034_hr_marketing_api_support.sql`

## 3. Feature-by-Feature Audit

Legend: **C=Create, R=Read, U=Update, D=Delete/Deactivate, S/F=Search/Filter, P=Permissions, V=Validation, T=Tests**

| Feature | Frontend Page(s) | Backend API(s) | DB Table/View(s) | C | R | U | D/Deact | Search/Filter/Pagination | Permissions | Validation | Testing Status | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Employees | `pages/Employees.tsx`, `EmployeeProfile.tsx`, modal | `/hr/employees` (GET/POST/PATCH/DELETE), `/hr/employees/:id`, docs | `erp.hr_employees`, `erp.users`, `erp.departments`, `erp.designations`, `erp.hr_employee_documents` | Yes | Yes | Yes | Yes (soft/terminate + deactivate user) | Yes (server query filters/sort/pagination in API; UI also has local controls) | Yes (`hr.employee.*`, salary gated) | Yes (Zod schemas) | Generic server tests only; no HR route tests | **COMPLETED (core) / PARTIALLY CONNECTED UI** |
| Employee Profiles | `pages/EmployeeProfile.tsx` | `/hr/employees/:id`, documents endpoints | `erp.hr_employees`, docs, salary structures, leave balances | Partial (docs upload metadata) | Yes | Partial (profile fields via PATCH employee) | Partial | Section-level/local | Yes | Yes | No dedicated tests | **PARTIALLY COMPLETED** |
| Departments | `pages/Settings.tsx` (config), employee filters | `/hr/departments` (GET/POST) | `erp.departments`, joins `erp.hr_employees` | Yes | Yes | No endpoint found | No endpoint found | List/read filters in UI | Yes (`hr.employee.read`, `hr.settings.write`) | Yes | No dedicated tests | **PARTIALLY COMPLETED** |
| Designations | `pages/Settings.tsx`, employee forms | `/hr/designations` (GET/POST) | `erp.designations`, `erp.departments` | Yes | Yes | No endpoint found | No endpoint found | List/read | Yes | Yes | No dedicated tests | **PARTIALLY COMPLETED** |
| Attendance | `pages/Attendance.tsx` | `/hr/attendance` (GET/POST), `/hr/attendance/summary` | `erp.hr_attendance`, `erp.v_hr_attendance_summary` | Yes (record/upsert semantics) | Yes | Implicit via upsert/corrections | N/A in schema-supported flow | Yes (date/employee/status filters, pagination supported by API) | Yes (self/all scoping, `hr.attendance.read/write`) | Yes | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Attendance Corrections | `pages/Attendance.tsx` | `/hr/attendance/corrections` (GET/POST), `/decide` | `erp.hr_attendance_corrections`, approvals, trigger apply in 033 | Yes | Yes | Status via decide | N/A | Filters by status/scope | Yes (`hr.attendance.approve`) | Yes (remarks required on reject) | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Leaves | `pages/Leave.tsx` | `/hr/leaves` (GET/POST), `/approve`, `/reject`, `/cancel` | `erp.hr_leave_requests`, `erp.hr_leave_approvals`, approvals, balances | Yes | Yes | Status transitions | Cancel supported | Yes (filters/pagination in API; UI rich filters) | Yes (self create, approver perms, no self-approval) | Yes (dates, overlap, working-day calc) | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Leave Types | `pages/Settings.tsx`, leave forms | `/hr/leave-types` (GET) | `erp.hr_leave_types` | No create endpoint in HR routes | Yes | No | No | Read/list | Yes (`hr.leave.read`/`hr.employee.read`) | N/A for writes | No dedicated tests | **PARTIALLY COMPLETED** |
| Payroll | `pages/Payroll.tsx` | `/hr/salary-structures`, `/hr/payroll/runs`, `/hr/payroll/runs/:id`, `/advance`, `/hr/payroll/payslips` | `erp.hr_salary_structures`, `erp.hr_payroll_runs`, `erp.hr_payslips`, `erp.hr_payslip_lines`, views | Yes (structures, runs) | Yes | Yes (payslip edit, run advance) | Cancel via advance workflow | Yes (period/status/employee pagination & filters) | Yes (`hr.payroll.*`, finance approval actions guarded) | Yes (transition checks, period duplication guard) | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Payslips | `pages/Payroll.tsx`, profile contexts | `/hr/payroll/payslips`, PATCH, included in run detail | `erp.hr_payslips`, `erp.hr_payslip_lines` | Created via payroll run | Yes | Yes (limited editable states) | N/A | Yes | Yes (self or payroll/salary read) | Yes | No dedicated tests | **COMPLETED (core API)** |
| Contracts | `pages/Contracts.tsx`, `ContractDetail.tsx`, modal | `/hr/contracts` CRUD-ish (GET list/detail, POST, PATCH, status, signatures, schedule payments) | `erp.hr_contracts`, signatures, payment schedule, documents, approvals/history | Yes | Yes | Yes | No hard delete; terminate workflow exists | Yes (filters/search/sort/pagination) | Yes (`hr.contract.read/write`) | Yes (dates, transitions, schedule total <= value) | No dedicated tests | **COMPLETED (core API)** |
| Daily Payments | `pages/DailyPayments.tsx` | `/hr/payments` (GET/POST), `/approve`, `/reject`, `/status`, `/history`; contract payment mark-paid | `erp.hr_daily_payments`, `erp.hr_payment_history`, `erp.hr_contract_payments`, approvals | Yes | Yes | Status changes | N/A | Yes (filters/search/sort/pagination) | Yes (`hr.payment.*`, finance perms for decisions/status) | Yes (state checks, idempotency on create) | No dedicated tests | **COMPLETED (core API) / FIXED history response contract** |
| HR Expenses | No dedicated canonical HR page found; API exists | `/hr/expenses` (GET/POST/GET by id), approve/reject/request-changes/reimburse | `erp.hr_expenses`, `erp.hr_expense_approvals`, approvals | Yes | Yes | Workflow/status actions only | No general delete/edit endpoint | Yes (filters/pagination) | Yes (self vs HR/finance perms) | Yes (idempotency, state checks) | No dedicated tests | **PARTIALLY COMPLETED (backend present, UI surface limited)** |
| HR Requests | `pages/Requests.tsx` | `/hr/requests` (GET/POST/PATCH) | `erp.hr_employee_requests` | Yes | Yes | Yes (status/assignment/priority/response) | No delete endpoint | Yes (filters/pagination) | Yes (owner vs `hr.request.read/write`) | Yes | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Recruitment | `pages/Recruitment.tsx` | `/hr/jobs`, `/hr/candidates`, `/hr/interviews` | `erp.hr_job_openings`, `erp.hr_candidates`, `erp.hr_interviews` | Yes | Yes | Yes | No delete endpoints | Yes (jobs/candidates paginated; UI has board/table) | Yes (`hr.recruitment.*`) | Yes (pipeline/stage rules) | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Candidates | `pages/Recruitment.tsx` | `/hr/candidates`, `/hr/candidates/:id`, interviews/feedback | `erp.hr_candidates`, `erp.hr_interviews` | Yes | Yes | Yes | No | Yes | Yes | Yes | No dedicated tests | **COMPLETED (core API)** |
| Onboarding | `pages/Onboarding.tsx` | `/hr/onboarding` (GET/POST/PATCH) | `erp.hr_onboarding_records` | Yes | Yes | Yes | No delete endpoint | List (non-paginated route) + UI filters | Yes (`hr.onboarding.*`) | Yes | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Offboarding | `pages/Offboarding.tsx` | `/hr/offboarding` (GET/POST/PATCH) | `erp.hr_offboarding_records`, `erp.hr_employees` (status side effects) | Yes | Yes | Yes | No delete endpoint | List + UI filters | Yes (`hr.offboarding.*`) | Yes (date checks) | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Performance Reviews | `pages/Performance.tsx` | `/hr/reviews` (GET/POST/PATCH) | `erp.hr_performance_reviews` | Yes | Yes | Yes (role-constrained edits) | No delete endpoint | Yes (paginated, filters) | Yes (self vs `hr.performance.write`) | Yes | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| HR Dashboard | `pages/Dashboard.tsx` | `/hr/dashboard` | `erp.v_hr_dashboard`, attendance/employees/activities/holidays/approvals | N/A | Yes | N/A | N/A | Aggregated widgets | Yes (`hr.analytics.read`/`hr.employee.read`) | N/A | No dedicated tests | **COMPLETED (API) / UI uses store-hydrated or demo aggregates** |
| HR Analytics | `pages/Reports.tsx`, dashboard widgets | `/hr/analytics`, `/hr/analytics/attendance`, `/hr/analytics/payroll` | `erp.v_hr_headcount`, `erp.v_hr_attendance_summary`, `erp.v_hr_leave_summary`, `erp.v_hr_payroll_summary` | N/A | Yes | N/A | N/A | Read-only analytics | Yes (`hr.analytics.read`) | N/A | No dedicated tests | **COMPLETED (API) / REPORTS PAGE largely store/demo-derived** |
| HR Activities | Dashboard/activity feeds | `/hr/activities` | `erp.hr_activities` | Created as side effects in routes | Yes | N/A | N/A | Paginated/list | Yes | N/A | No dedicated tests | **COMPLETED (core)** |

## 4. Key HR Findings (Critical)

1. **Payment history API contract mismatch fixed (backend):** `GET /hr/payments/:id/history` previously returned only history array; it now returns `{ payment, history }` to match `src/lib/api/hr.ts#getPaymentHistory` and typical detail+history consumers. (`server/src/routes/hr/contracts.ts`)
2. **Canonical HR portal is hybrid demo/API:** `store.tsx` + `useHrData.ts` + `api-sync.ts` + `api-actions.ts` support API hydration and guarded mutations in API mode with fallback/warnings; however many page-level behaviors still rely on local `db` state, partial hydration, or demo-only actions.
3. **HR frontend integration is not uniform across all pages:** Core modules (employees/leaves/attendance/payments/requests/recruitment/onboarding/offboarding/performance/payroll/contracts) have varying levels of API usage; Reports/Settings and some detail/document flows remain partly demo-local.
4. **Master data CRUD gaps:** departments/designations/leave types/holidays/settings lack full CRUD endpoints in HR routes (create/list and limited delete exist where implemented).
5. **No dedicated HR domain backend integration tests:** only generic `server/src/*.test.ts` and `server/src/lib/*.test.ts` plus app auth-gate checks.
6. **Live DB/Supabase runtime not verified in this environment:** schema/RLS/triggers/views are present in migrations, but applied state and live auth/storage behavior are unverified.

## 5. HR Workflow Verification (Code-Level)

| Workflow | Evidence | Status |
|---|---|---|
| Add employee → view profile → edit details | Employee create/list/detail/update endpoints; HR pages/modals exist | **SUPPORTED (code) / runtime BLOCKED** |
| Apply leave → manager approval → updated leave balance | Leave create/approve/reject/cancel + approval integration + DB leave balance sync trigger | **SUPPORTED (code) / runtime BLOCKED** |
| Record attendance → view attendance report/summary | Attendance upsert/list/summary + analytics view endpoints | **SUPPORTED (code) / runtime BLOCKED** |
| Prepare payroll → approve payroll → view payslip | Payroll run create/advance transitions + payslip listing/detail | **SUPPORTED (code) / runtime BLOCKED** |
| Submit expense → approve/reject → reimbursement | HR expense routes with approve/reject/request-changes/reimburse | **SUPPORTED (code, no canonical HR expense UI page found) / runtime BLOCKED** |
| Create HR request → assign → resolve | Request create/patch endpoints support assignment/status/response | **SUPPORTED (code) / runtime BLOCKED** |

## 6. HR Security / Isolation (Code-Level)

- Supabase JWT verification + DB identity resolution in `server/src/middleware/auth.ts`
- Request-scoped RLS transaction context in `server/src/db/transaction.ts`
- Permission checks (`requirePermission`, `requireSelfOrPermission`, admin bypass) on HR routes
- RLS policies and sensitive-data protections in `031_rls.sql` (HR docs, salaries/payslips/contracts/payments/expenses restricted)
- Shared approval engine and audit logging used across HR workflows

**Conclusion:** Security model is substantially implemented in code; effective runtime enforcement depends on deployed DB role/config and applied migrations (**BLOCKED** to confirm live).

## 7. HR Gaps / Pending Work (Scoped)

- Complete uniform frontend API consumption on all canonical HR pages (remove remaining demo-local-only mutation/read paths where backend exists)
- Add/confirm missing master-data update/delete endpoints if required by UI/business rules (without inventing schema)
- Add dedicated HR backend route/integration tests for critical workflows
- Runtime verification against configured Supabase/Postgres environment (auth, RLS, storage, workflows)
- Validate any remaining contract mismatches (frontend expects vs backend responses) during live integration tests
