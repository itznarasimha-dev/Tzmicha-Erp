# HR & Marketing Pending Work Audit

**Scope:** HR Management + Marketing only.  
**Date:** 2026-11-11 (workspace snapshot).  
**Supabase status:** deferred — no live credentials, migrations not applied, no live DB/RLS/auth-sync/storage verification. Demo mode preserved; live API mode never silently falls back to demo or fakes success.

## Mapping convention
- `db` / `update(...)` = existing localStorage-backed demo store (demo mode).
- `hrActions.*` / `marketingApi.*` = existing API clients in `src/lib/api/hr.ts` and `src/lib/api/marketing.ts`.
- `runHrApiAction` / `runMarketingApiAction` = guards: require `dataSource === 'api'` + configured token; never report success without server confirmation; never silently fall back to demo; refresh on success.
- "Connected (live)" = mutation wired to the real API in API mode with validation/loading/duplicate guard/error/refresh; demo mode kept and labeled.
- "Pending" = backend API method exists but the UI mutation is still local/demo-only; or no clean endpoint identified and it is documented below.

---

## A. HR — completed / wired to live API (this session)

| UI action | Location | API method | Status |
|---|---|---|---|
| Record daily payment | `pages/DailyPayments.tsx` `recordPayment` | `createPayment` (`POST /hr/payments`, idempotent) | Connected (live) |
| Approve / reject / mark-paid payment | `pages/DailyPayments.tsx` `applyAction` | `approvePayment` / `rejectPayment` / `changePaymentStatus` | Connected (live) |
| Prepare payroll run | `pages/Payroll.tsx` `runPayroll` | `createPayrollRun` (`POST /hr/payroll/runs`) | Connected (live) |
| Advance payroll (submit/review/approve/mark-paid) | `pages/Payroll.tsx` `applyAction` | `advancePayrollRun` (`POST /hr/payroll/runs/:id/advance`) | Connected (live) |
| Create contract | `components/contract-modal.tsx` | `createContract` (`POST /hr/contracts`, idempotent) | Connected (live) |
| Update contract | `components/contract-modal.tsx` | `updateContract` (`PATCH /hr/contracts/:id`) | Connected (live) |
| Contract status (review/submit/signature/activate) | `pages/ContractDetail.tsx` `runStep` | `changeContractStatus` (`POST /hr/contracts/:id/status`) | Connected (live) |
| Contract terminate | `pages/ContractDetail.tsx` `terminate` | `changeContractStatus` action `terminate` | Connected (live) |
| Create employee request | `pages/Requests.tsx` `createRequest` | `createEmployeeRequest` (`POST /hr/requests`) | Connected (live) |
| Start/resolve/reject/reopen request | `pages/Requests.tsx` `runAction` | `updateEmployeeRequest` (`PATCH /hr/requests/:id`) | Connected (live) |
| Send response / reassign request | `pages/Requests.tsx` `sendResponse`/`reassign` | `updateEmployeeRequest` | Connected (live) |
| Record / upsert attendance | `pages/Attendance.tsx` `saveCorrection` | `recordAttendance` (`POST /hr/attendance`, upsert) | Connected (live) |
| Approve / reject correction | `pages/Attendance.tsx` `applyDecision` | `decideCorrection` (`POST /hr/attendance/corrections/:id/decide`) | Connected (live) |
| Employee correction request submission | `pages/Attendance.tsx` `submitCorrectionRequest` | `requestCorrection` (`POST /hr/attendance/corrections`) | Connected (live) |
| Employee create / edit / delete | `components/employee-modal.tsx`, `pages/Employees.tsx` | `createEmployee` / `updateEmployee` / `deleteEmployee` | Connected (live, prior) |
| Leave submit / approve / reject | `pages/Leave.tsx` | `applyLeave` / `approveLeave` / `rejectLeave` | Connected (live, prior) |

### HR — partially completed / pending
- **Activate/deactivate as an explicit employee action:** no dedicated UI control or endpoint identified; status editable only via `updateEmployee` where the backend allows. Documented as pending.
- **Renew contract (new end date):** `changeContractStatus` does not accept a new end date; kept demo-local, documented as pending a dedicated endpoint.
- **Delete contract:** no `deleteContract` API method; kept demo-local, documented as pending.
- **Delete employee request:** no delete endpoint; kept demo-local.
- **HR Expenses page:** no dedicated HR expenses UI page exists under `features/hr/pages` although the backend `hrExpensesRouter` (`/hr/expenses`, list/create/get/approve/reject/request-changes/reimburse) exists. UI location/endpoint mapping to confirm; do not invent a page.
- **Attendance summary endpoint binding:** `getAttendanceSummary` exists; summary cards still derive from hydrated local range data. Partial.
- **HR Dashboard KPIs:** read from store hydration (`fetchHrDatabase`/`api-sync`) which is API-backed in live mode; `getDashboard`/`getAnalytics` endpoints exist. Partial/connected via hydration.
- **Payroll payslip retrieval:** `listPayslips` exists; payslip download stays local/demo. Partial.
- **Remaining HR pages:** Onboarding, Offboarding, Recruitment, Performance, Reviews, Settings, Reports — local mutations remain; APIs exist for many but UI wiring not completed in this session.

### HR — blocked
- No live Supabase credentials/project or `server/.env`; migrations/seed not applied; no DB tooling to verify SQL/RLS.
- Shared teammate `erp` schema unavailable for definitive compatibility.
- Storage/document upload for contracts/employees has no confirmed contract-document API (only `uploadEmployeeDocument` exists); do not simulate successful uploads.

---

## B. Marketing — audit of remaining mutation surfaces

| UI action / feature | Location | API method (if present) | Status |
|---|---|---|---|
| Create lead | `pages/LeadsPage.tsx` `saveLead` (create branch) | `createLead` (`POST /marketing/leads`, idempotent) | Connected (live) |
| Edit lead | `pages/LeadsPage.tsx` `saveLead` (edit branch) | `updateLead` (`PATCH /marketing/leads/:id`) | Connected (live) |
| View lead | `pages/LeadsPage.tsx` + `LeadProfileModal` | `getLead` (`GET /marketing/leads/:id`) | Pending (read via local `data`) |
| Assign / reassign lead | `pages/LeadsPage.tsx` `confirmSendToSales` / `openSendToSales` | `assignLead` (`POST /marketing/leads/:id/assign`) | Connected (live) |
| Complete follow-up | `components/leads/FollowUpModal.tsx` | `completeFollowUp` (`POST /marketing/leads/:id/follow-ups/:id/complete`) | Connected (live) |
| Record call / visit / response / remark | Lead follow-up / activity modals | `addLeadActivity` / `createFollowUp` | Pending |
| Update lead status (board move) | `pages/LeadsPage.tsx` `moveLead` | `updateLead` | Connected (live) |
| Reject lead | `pages/LeadsPage.tsx` `moveLead` stage rejected | `rejectLead` (`POST /marketing/leads/:id/reject`) | Connected (live) |
| Qualified lead → customer (convert) | `pages/LeadsPage.tsx` `completeConversion` | `convertLead` (`POST /marketing/leads/:id/convert`) | Connected (live) |
| Duplicate conversion prevention | `completeConversion` `findCustomerMatch` | Backend `convertLead` idempotency/customer dedupe | Connected (live, backend enforces) |
| Lead import | `LeadImportModal` `importLeads` | No import endpoint identified | Pending / document if missing |
| Create campaign | `pages/DigitalMarketingPage.tsx` | `createCampaign` (`POST /marketing/campaigns`, idempotent) | Connected (live) |
| Update campaign / status | Campaign pages | `updateCampaign` (`PATCH /marketing/campaigns/:id`) | Connected (live) |
| Campaign submit / approve / reject | Approvals pages | (submit/decide via plans/offers APIs) | Pending |
| Create / edit offer | Offer pages | `createOffer` / `submitOffer` / `decideOffer` | Pending |
| Create / decide discount | Discount pages | `requestDiscount` / `decideDiscount` | Pending |
| View / manage targets | Targets pages | `listTargets` / `upsertTarget` / `updateTarget` | Pending |
| Performance / work tracking | Performance pages | `listPerformance` / `refreshPerformance` | Pending |
| Wallet balance / transactions | Rewards pages | `listRewards` / `listRewardTransactions` | Pending |
| Award / redeem reward | Rewards pages | `awardReward` / `redeemReward` | Pending |
| Marketing expense submit / approve / reimburse | `pages/ExpensesPaymentsPage.tsx` | `createExpense` / `submitExpense` / `decideExpense` / `reimburseExpense` | Connected (live) |
| Field visit check-in/out | `pages/FieldMarketingPage.tsx` | `createVisit` / `checkInVisit` / `checkOutVisit` / `updateVisit` | Pending |
| Dealer management | `pages/TradeRetailPage.tsx` | `listDealers` / `createDealer` / `updateDealer` | Pending |
| Surveys | Survey pages | `listSurveys` / `createSurvey` | Pending |
| Activity records | Activity pages | `listActivityRecords` / `createActivityRecord` | Pending |
| Marketing dashboard KPIs | `pages/MarketingDashboard.tsx` | `getMarketingDashboard` | Pending (read via local `data`) |

### Marketing — partially completed
- Read-time API hydration + auth bridge exist (`api-sync.ts`, `DemoDataContext.tsx`, `AuthContext.tsx`, `src/lib/api/marketing.ts`) and `runMarketingApiAction` helper added.
- Lead follow-up create → `createFollowUp`; activity recording → `addLeadActivity`; lead import (no endpoint identified).
- Campaigns: `submitOffer`/`decideOffer` exist; offer create → `createOffer`; UI not fully wired.
- Discounts: `requestDiscount`/`decideDiscount` exist; UI not wired.
- Targets: `listTargets`/`upsertTarget`/`updateTarget` exist; UI not wired.
- Performance/work tracking: `listPerformance`/`refreshPerformance` exist; UI not wired.
- Rewards wallet: `listRewards`/`listRewardTransactions`/`awardReward`/`redeemReward` exist; UI not wired.
- Field visits: `createVisit`/`checkInVisit`/`checkOutVisit`/`updateVisit` exist; UI not wired.
- Dealers: `listDealers`/`createDealer`/`updateDealer` exist; UI not wired.
- Surveys: `listSurveys`/`createSurvey` exist; UI not wired.
- Activity records: `listActivityRecords`/`createActivityRecord` exist; UI not wired.
- Marketing dashboard KPIs: `getMarketingDashboard` exists; read via local `data` currently (deeply integrated with local data structures; major refactor needed for API binding).
- Invoices, field claims, celebrity payments (no API endpoints identified).

### Marketing — blocked
- Same Supabase/DB/tooling/shared-schema blockers as HR.
- Marketing lead conversion ties into shared `erp.customers` + Sales integration; backend `convertLead` customer dedupe/opportunity behavior to be verified against live backend.
- Stock/cost read depends on shared ERP services exposure; not confirmed available.

---

## C. Shared API integration quality
- `runHrApiAction` / `runMarketingApiAction` enforce: API-mode required, server-confirmed success only, no silent demo fallback, useful error toasts, post-success refresh, loading/duplicate guards used by callers.
- Server-side authz/RBAC/RLS remain authoritative; frontend never trusts client-supplied org/role.
- Idempotency keys used on sensitive creates (`hr-payment`, `hr-employee`, `hr-contract`, `hr-leave`, `hr-expense`, `mkt-lead`, etc.).
- No service-role keys in frontend; `.env.example` documents browser-safe vars only.

---

## D. Files changed (this session, manual tracking)
**Created:** `docs/05-pending-work-audit.md`  
**Updated:** `src/features/hr/pages/DailyPayments.tsx`, `src/features/hr/pages/Payroll.tsx`, `src/features/hr/components/contract-modal.tsx`, `src/features/hr/pages/ContractDetail.tsx`, `src/features/hr/pages/Requests.tsx`, `src/features/hr/pages/Attendance.tsx`  
**Deleted:** none  
(Pre-existing: `src/features/hr/api-actions.ts`, `src/features/marketing/api-actions.ts`, `.env.example`, `docs/03-api-reference.md`, `docs/04-final-implementation-report.md`)

---

## E. Recommended remaining execution order

### Completed since last audit
- Created `src/features/hr/useHrData.ts` — reusable READ hooks for all HR GET APIs with loading/error/refetch states
- Created `src/features/marketing/useMarketingData.ts` — reusable READ hooks for all Marketing GET APIs with loading/error/refetch states
- Updated `src/features/hr/pages/Employees.tsx` — uses `useEmployees` hook for API-backed employee listing with loading/error/retry states
- Updated `src/features/hr/pages/Dashboard.tsx` — store hydration provides API-backed data in API mode; `syncStatus`/`syncError` loading/error handling added
- Updated `src/features/marketing/pages/MarketingDashboard.tsx` — uses `useMarketingDashboard` hook for API-backed KPI cards with loading/error states
- Updated `src/features/hr/pages/Leave.tsx` — uses `useLeaves`/`useLeaveTypes` hooks for API-backed listing
- Updated `src/features/hr/pages/Attendance.tsx` — uses `useAttendance`/`useCorrections` hooks for API-backed listing
- Updated `src/features/hr/pages/DailyPayments.tsx` — uses `usePayments` hook for API-backed listing
- Updated `src/features/hr/pages/Requests.tsx` — uses `useEmployeeRequests` hook for API-backed listing
- Updated `src/features/hr/pages/Recruitment.tsx` — uses `useJobs`/`useCandidates` hooks for API-backed listing
- Updated `src/features/hr/pages/Onboarding.tsx` — uses `useOnboarding` hook for API-backed listing
- Updated `src/features/hr/pages/Offboarding.tsx` — uses `useOffboarding` hook for API-backed listing
- Updated `src/features/hr/pages/Performance.tsx` — uses `useReviews` hook for API-backed listing
- Verified: `npx tsc -p tsconfig.app.json --noEmit --pretty false` — **PASS**
- Verified: `npx vite build` — **PASS**

### Remaining execution order
1. Resolve type mismatches for `Contracts.tsx` (`Contract`/`ApiContract`) and `Payroll.tsx` (`PayrollEntry`/`ApiPayrollRun`) to enable hook integration
2. Connect remaining Marketing listing pages to `useMarketingData` hooks (LeadsPage, DigitalMarketingPage, PlansBudgetsPage, ExpensesPaymentsPage, FieldMarketingPage, TradeRetailPage, ReportsAnalyticsPage)
3. Create HR Expenses UI page (backend `hrExpensesRouter` exists at `/hr/expenses`; no dedicated page under `features/hr/pages` — do not invent a page, document instead)
4. Add `useContract(id)` hook for ContractDetail page (no single-contract READ hook exists)
5. Document missing UI pages for Marketing Offers/Discounts/Targets/Performance/Rewards/Field/Dealers/Surveys/Activity records (APIs exist, no UI pages)
6. Re-run `npx tsc -p tsconfig.app.json --noEmit --pretty false` and `npx vite build` after all edits; fix regressions
7. Update `docs/04-final-implementation-report.md` and `docs/06-hr-marketing-verification-audit.md`
