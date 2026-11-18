# Marketing Backend Complete Audit

**Project:** Totally ERP / Tzmicha Enterprise  
**Scope:** Marketing Management only (no Sales/Service/Finance/Inventory/Procurement changes)  
**Audit date:** 2026-11-12  
**Method:** Static repository audit of marketing frontend surfaces, backend routes/mappers/shared libs, Supabase migrations/views/RLS/functions/rules, and existing docs/tests. No destructive DB operations performed.

## 1. Executive Summary

| Area | Status |
|---|---|
| Marketing backend API coverage (leads/campaigns/plans/expenses/targets/performance/rewards/field/dashboard) | **MOSTLY COMPLETE (core workflows implemented)** |
| Marketing frontend integration | **MIXED / IMPROVED** (`features/field-marketing` now API-mode integrated for supported reads/mutations with demo fallback preserved; `features/marketing` portal/workspaces remain hybrid/partially integrated page-by-page) |
| Marketing role hierarchy preservation in UI/config | **PRESENT** (Manager/Senior/Junior flows and scoping in marketing workspace/UI configs) |
| DB schema/RLS/rules/views for Marketing (migrations) | **COMPLETE in code** (runtime verification **BLOCKED**) |
| Automated marketing domain tests | **PARTIAL** (DB-free route wiring/auth tests added in `server/src/marketing-routes.test.ts`; no live DB workflow/integration tests) |
| Live Supabase/API runtime verification | **BLOCKED** |

## 2. Inspected Marketing Surfaces

### 2.1 Frontend
- Primary portal: `src/features/marketing/MarketingPortalLayout.tsx`, `pages/*`, `components/*`, `context/*`, `config/*`, `useMarketingData.ts`, `api-sync.ts`, `api-actions.ts`, `src/lib/api/marketing.ts`
- Field marketing pages: `src/features/field-marketing/{FieldMarketingDashboard,VisitPlanner,MarketSurveys,DealerProspectDirectory,MarketingWalletAndExpenses,MarketingTargets,MarketingPortalLayout}.tsx` + `api-integration.ts` (API-mode integration implemented in this pass; demo mode preserved)
- Admin/sales-adjacent marketing views (in-scope references): `src/features/admin/AdminFieldMarketingView.tsx`, `src/features/sales/pages/MarketingLeadsPage.jsx` (separate sales-context workflow)
- Marketing role/workspace system: `src/features/marketing/pages/RoleWorkspacePage.tsx`, `MarketingWorkspacePage.tsx`, `context/MarketingDepartmentContext.tsx`, `config/roleNavigation.ts`, workspace pages/components

### 2.2 Backend
- Router mount: `server/src/routes/marketing/index.ts` (`authenticate` applied globally)
- Routes: `leads.ts`, `campaigns.ts`, `plans.ts`, `performance.ts`, `field.ts`, `shared.ts`
- Shared infra/mappers: `server/src/mappers/marketing.ts`, auth/db/libs same as HR

### 2.3 Database (Marketing migrations/views/rules/RLS)
- Core: `020_marketing_leads.sql`, `021_marketing_campaigns_offers_discounts.sql`, `022_marketing_targets_rewards.sql`, `023_marketing_plans_expenses.sql`, `024_marketing_field.sql`
- Cross-cutting: `030_approvals.sql`, `031_rls.sql`, `032_analytics_views.sql`, `033_business_rules.sql`, `034_hr_marketing_api_support.sql`

## 3. Feature-by-Feature Audit

| Feature | Frontend Page(s)/Surface(s) | Backend API(s) | DB Table/View(s) | C | R | U | D/Deact | Search/Filter/Pagination | Permissions | Validation | Testing Status | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Marketing Dashboard | `features/marketing/pages/MarketingDashboard.tsx`, workspace dashboards | `/marketing/dashboard`, `/marketing/activity-records` | `erp.v_marketing_dashboard`, `erp.v_lead_pipeline`, `erp.v_campaign_performance`, `erp.mkt_activity_records`, approvals/views | N/A | Yes | N/A | N/A | Dashboard filters/aggregates (client + API payload) | Yes (`marketing.analytics.read`/`marketing.lead.read`) | N/A | No dedicated tests | **COMPLETED API / HYBRID UI** |
| Leads | `features/marketing/pages/LeadsPage.tsx`, lead components/workspaces, sales leads page (separate context) | `/marketing/leads` CRUD-ish, assign, reject, convert, follow-ups, activities | `erp.mkt_leads`, sources, activities, follow-ups, assignments, rejections, conversions, customers refs | Yes | Yes | Yes | Status/reject flows (no hard delete) | Yes (filters/search/sort/pagination in API; rich UI filters) | Yes + scoped access rules | Yes (Zod, state checks, duplicate/open lead checks) | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Lead Details | Lead detail/profile modals and tabs | `/marketing/leads/:id`, activities/follow-ups | `erp.mkt_leads`, activities, follow-ups, assignment/conversion/rejection tables | Partial via sub-actions | Yes | Yes via actions | N/A | Timeline/detail views | Yes/scoped | Yes | No dedicated tests | **COMPLETED (core API)** |
| Lead Activities | Lead timelines, activity records module | `/marketing/leads/:id/activities` (GET/POST), `/marketing/activity-records` | `erp.mkt_lead_activities`, `erp.mkt_activity_records` | Yes | Yes | Append-only style | No delete | Yes (activity-records pagination/filters) | Auth + permissions (note: explicit scope check on GET lead activities is lighter than detail endpoint) | Yes | No dedicated tests | **PARTIALLY COMPLETED** |
| Follow-ups | Lead follow-up UI/workspaces | `/marketing/leads/:id/follow-ups`, complete/cancel | `erp.mkt_lead_follow_ups`, lead updates, activities | Yes | Yes (via lead detail) | Yes (complete/cancel/outcome) | Cancel supported | UI filters/queues; API detail-scoped | Yes (`marketing.lead.followup`) | Yes | No dedicated tests | **COMPLETED (core API)** |
| Lead Conversion | Lead conversion flows/handover | `/marketing/leads/:id/convert` | `erp.mkt_lead_conversions`, `erp.customers`, refs, lead status, activities | Yes (conversion record) | Yes | State transition | N/A | N/A | Yes (`marketing.lead.convert`) | Yes (state/idempotency/dup handling) | No dedicated tests | **COMPLETED (core API) / HYBRID UI** |
| Campaigns | `pages/DigitalMarketingPage.tsx`, module/workspace views | `/marketing/campaigns` (GET list/detail, POST, PATCH) | `erp.mkt_campaigns`, `erp.v_campaign_performance` | Yes | Yes | Yes | No explicit delete endpoint | Yes (pagination/filters/search) | Yes (`marketing.campaign.*`) | Yes (dates, spend/budget checks) | No dedicated tests | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Marketing Plans | `pages/PlansBudgetsPage.tsx`, `MonthlyPlansWorkspace`, workspace planning pages | `/marketing/plans` + submit/approve/reject/request-changes/start/execution/submit-results/complete | `erp.mkt_plans`, `erp.mkt_plan_activities`, `erp.mkt_plan_approvals`, approvals | Yes | Yes | Yes | No delete endpoint | Yes (pagination/filters; UI planning views) | Yes + owner/approver scoping and stage permissions | Yes (state transitions, finance/admin stages) | No dedicated tests | **COMPLETED (core API) / HYBRID UI** |
| Offers | Campaign/offer APIs exist; limited dedicated UI | `/marketing/offers` (GET/POST/submit/decide) | `erp.mkt_campaign_offers`, approvals | Yes | Yes | Status/workflow actions | No generic delete | Yes (pagination/filters) | Yes (`marketing.offer.*`, approval decide perms) | Yes (discount/value rules) | No dedicated tests | **COMPLETED (core API) / UI PENDING-LIMITED** |
| Targets | `features/field-marketing/MarketingTargets.tsx` (API-mode read integrated in this pass), marketing portal views vary | `/marketing/targets` (GET/POST/PATCH) | `erp.marketing_targets`, `erp.mkt_plans` refs | UI: no (read-focused); API supports upsert/create | Yes | UI: no (API supports PATCH) | No delete endpoint | API pagination/filters available; UI shows mapped records | Yes (`marketing.target.read/write`) | Yes | DB-free route tests only; no domain workflow tests | **PARTIALLY COMPLETED (field page reads API in API mode; create/update UI not added)** |
| Performance | `pages/ReportsAnalyticsPage.tsx` / dashboards/workspace performance views, field target context | `/marketing/performance`, `/marketing/performance/refresh` | `erp.mkt_employee_performance`, `erp.v_employee_performance`, related lead/visit/campaign/target data | Refresh computes snapshots | Yes | Refresh/update snapshots | N/A | Yes (pagination/filters) | Yes (`marketing.performance.read`, refresh perms) | Yes | DB-free route tests only | **COMPLETED (core API) / HYBRID UI** |
| Marketing Expenses | `pages/ExpensesPaymentsPage.tsx`, `MonthlyExpensesWorkspace`, workspace expenses, `features/field-marketing/MarketingWalletAndExpenses.tsx` (API submit/read integrated) | `/marketing/expenses` (GET list/detail, POST, PATCH, submit, decide, reimburse) | `erp.mkt_expenses`, `erp.mkt_expense_approvals`, plans/campaign refs, approvals | Yes | Yes | Partial (field submit/read; portal flows mixed) | No delete endpoint | Yes (pagination/filters/search) | Yes (owner/scoped + approval/finance perms) | Yes (stage/state/idempotency) | DB-free route tests only | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Expense Approvals | Expense workflows/modals/workspaces | `/marketing/expenses/:id/decide`, `/marketing/expenses/:id/submit`, `/marketing/expenses/:id/reimburse` | `erp.mkt_expenses`, `erp.mkt_expense_approvals`, `erp.approval_requests/history` | Action records | Yes | Yes (workflow transitions) | N/A | Workflow queues/filters in UI | Yes (manager/admin/finance as applicable) | Yes | DB-free route tests only | **COMPLETED (core API)** |
| Rewards | `features/field-marketing/MarketingWalletAndExpenses.tsx` (API-mode wallet/tx read integrated), limited portal UI | `/marketing/rewards`, `/rewards/:employeeId/transactions`, `/rewards/award`, `/rewards/redeem` | `erp.mkt_reward_wallets`, `erp.mkt_reward_transactions`, views/rules | Yes (award/redeem tx via API; UI mostly read-focused) | Yes | Balance changes via tx/trigger | N/A (append-only tx model) | Yes (pagination/lists) | Yes (read/write/self redeem controls) | Yes (balance checks, DB triggers) | DB-free route tests only | **COMPLETED (core API) / PARTIALLY CONNECTED UI** |
| Reward Transactions | Same as rewards | transactions endpoints above | `erp.mkt_reward_transactions` | Yes | Yes | N/A append-only | N/A | Yes | Yes | Yes | DB-free route tests only | **COMPLETED (core API)** |
| Visits | `features/field-marketing/VisitPlanner.tsx`, `FieldMarketingDashboard.tsx` (API-mode integrated); marketing portal field page still separate | `/marketing/visits` (GET list/detail, POST, PATCH, check-in, check-out) | `erp.mkt_field_visits` | Yes | Yes | Partial (create/check-in/check-out workflows; full edit UI not exposed) | No delete endpoint | API pagination/filters available; UI basic list/refresh | Yes (`marketing.visit.*` + scope checks) | Yes | DB-free route tests only | **PARTIALLY COMPLETED (field app API-integrated for core read/create/check-in/check-out)** |
| Surveys | `features/field-marketing/MarketSurveys.tsx` (API-mode integrated) | `/marketing/surveys` (GET/POST) | `erp.mkt_market_surveys`, regions/users refs | Yes | Yes | No PATCH endpoint | No delete endpoint | API pagination/filters available; UI basic list/refresh | Yes (`marketing.survey.read/write`) | Yes | DB-free route tests only | **PARTIALLY COMPLETED (API-integrated with schema-adapted mapping; limited CRUD by backend/UI)** |
| Dealers | `features/field-marketing/DealerProspectDirectory.tsx` (API-mode integrated) | `/marketing/dealers` (GET/POST/PATCH) | `erp.mkt_dealer_prospects` | Yes | Yes | UI: no (API supports PATCH) | No delete endpoint | API pagination/filters available; UI search/refresh | Yes (`marketing.dealer.read/write`) | Yes | DB-free route tests only | **PARTIALLY COMPLETED (field app API-integrated for read/create)** |
| Activity Records | Dashboard/workspace activity views, `useMarketingData` support | `/marketing/activity-records` (GET/POST) | `erp.mkt_activity_records` | Yes | Yes | Append-only by design | No delete | Yes (pagination/filters/search) | Yes (`marketing.analytics.read`/`marketing.lead.read`/write perms) | Yes | No dedicated tests | **COMPLETED (core API) / UI varies** |
| Marketing Analytics | Dashboard/reports/performance views | `/marketing/dashboard`, `/marketing/performance`, `/marketing/targets`, views | `erp.v_marketing_dashboard`, `erp.v_lead_pipeline`, `erp.v_campaign_performance`, `erp.v_employee_performance`, expense summaries | N/A | Yes | N/A | N/A | Aggregated | Yes | N/A | No dedicated tests | **COMPLETED (core API) / HYBRID UI** |

## 4. Key Marketing Findings (Critical)

1. **Field-marketing integration improved but not fully complete:** `src/features/field-marketing/*` now supports API-mode reads/mutations for key supported flows (visits, surveys, dealer prospects, targets read, expenses submit/read, rewards wallet/tx read) with loading/error/refresh states and demo fallback preserved; some update/delete/workflow/UI refinements remain and portal field surfaces are still separate.
2. **Split implementation model remains:** `src/features/marketing` portal/workspaces still contain hybrid/demo-local patterns across many pages; `features/marketing/pages/FieldMarketingPage.tsx` is not the same as the integrated `features/field-marketing/*` app.
3. **Role hierarchy preserved in UI/config:** Manager/Senior/Junior sub-role routing, workspace scoping, and workflow concepts remain present in marketing portal/workspace components.
4. **Backend workflow coverage is strong:** leads/campaigns/plans/expenses/targets/performance/rewards/field APIs include validations, scoped permissions, approvals, and idempotency for key creates.
5. **Testing/runtime gaps remain:** added DB-free route wiring/auth tests (`server/src/marketing-routes.test.ts`) but no live DB workflow integration tests; Supabase/runtime verification blocked.
6. **Contract mapping still requires runtime validation:** field UI and backend schemas differ in places (surveys, wallet/expense semantics, target metrics), requiring careful mapping and eventual live verification.

## 5. Marketing Workflow Verification (Code-Level)

| Workflow | Evidence | Status |
|---|---|---|
| Create lead → assign → follow up → qualify → convert | Lead create/patch/assign/follow-up/convert endpoints; lead UI flows exist (hybrid) | **SUPPORTED (code) / runtime BLOCKED** |
| Create campaign → submit → approve → track performance | Campaign CRUD/status APIs exist; approvals/performance views exist (UI coverage varies) | **PARTIALLY SUPPORTED (campaign lifecycle/approval semantics depend on modeled flows; tracking APIs exist)** |
| Create marketing plan → submit → approve → execute | Full plan workflow endpoints and transitions implemented | **SUPPORTED (code) / runtime BLOCKED** |
| Submit expense → approve → reimburse | Expense submit/decide/reimburse endpoints implemented | **SUPPORTED (code) / runtime BLOCKED** |
| Assign target → track progress → calculate eligible rewards | Targets/performance refresh/rewards endpoints implemented; UI integration varies | **SUPPORTED (code, partial UI wiring)** |

## 6. Marketing Security / Isolation (Code-Level)

- Authenticated marketing router (`authenticate` on marketing routes)
- Permission checks and scoped reads/writes in handlers (self/owner/supervisor/role-based where applicable)
- RLS transaction context via `withRls`
- RLS policies for leads/follow-ups/plans/expenses/rewards/discounts/field data in migrations
- Approval engine and audit logging in workflows

**Conclusion:** Backend security controls are largely implemented in code; runtime enforcement and org isolation must be validated on a configured environment (**BLOCKED**).

## 7. Marketing Gaps / Pending Work (Scoped)

- Complete remaining field-marketing gaps: richer update/status workflows where UI/backend support exists (e.g. dealer PATCH, target create/update UI, visit PATCH/detail flows), better pagination/filter controls, and any schema-supported activity/performance surfacing.
- Refactor `features/marketing` portal/workspace pages and `features/marketing/pages/FieldMarketingPage.tsx` to be consistently API-mode integrated (reads/mutations/workflows/loading/error/refresh) without breaking demo mode or role hierarchy.
- Harden UI-to-API contracts for schema differences (surveys, rewards wallet vs travel advance concepts, target metrics/periods) and add missing UI for supported resources where required.
- Add DB-backed marketing workflow integration tests (lead/plan/expense/visit/target/reward permissions, approvals, idempotency, RLS scoping) when environment is available.
- Runtime verification with real Supabase/Postgres, permissions, and role hierarchy users (intentionally postponed now).
