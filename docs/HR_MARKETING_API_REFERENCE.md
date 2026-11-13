# HR & Marketing API Reference (Code-Verified)

**Date:** 2026-11-12  
**Source of truth:** `server/src/routes/hr/*`, `server/src/routes/marketing/*`, `server/src/app.ts`, frontend wrappers in `src/lib/api/hr.ts` and `src/lib/api/marketing.ts`  
**Base path:** `${API_PREFIX}` (default `/api`)  
**Auth:** Bearer Supabase access token (`Authorization: Bearer <token>`) required for protected routes; identity and permissions resolved server-side from DB.  
**Envelope:** Most successful responses use `{ data: ... }`; paginated endpoints return `{ data: [...], pagination: { page, pageSize, total, totalPages } }`.

## 1. Common Conventions

- **RLS:** DB operations run in request-scoped transactions (`withRls`) setting JWT claims, `app.org_id`, `app.user_id`, and RLS role.
- **Permissions:** Route-level `requirePermission(...)` and/or handler-level scope checks (`self`, owner, supervisor, admin).
- **Validation:** Zod schemas + `validateBody/validateQuery/parseWith`; sort/search fields are whitelisted.
- **Idempotency:** Supported on selected create endpoints via `Idempotency-Key` (e.g. HR employee/leave/payroll/payment/expense/contract, marketing discount/lead convert/plan/expense creates).
- **Errors:** Normalized via `AppError`/error middleware (no internal leakage intended).

## 2. HR Endpoints (`/api/hr`)

> All HR routes are behind `authenticate` in `server/src/routes/hr/index.ts`.

### 2.1 Directory / Settings / Master Data (`directory.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/hr/employees` | List employees (paginated, filter/search/sort) | `hr.employee.read` | Salary visibility conditional |
| GET | `/hr/employees/:id` | Employee detail + docs (+ salary/balances as allowed) | `hr.employee.read` | |
| POST | `/hr/employees` | Create employee (creates/links shared user) | `hr.employee.write` | Uses DB functions `erp.hr_create_user`; idempotent on frontend wrapper |
| PATCH | `/hr/employees/:id` | Update employee/profile/shared user fields | `hr.employee.write` | |
| DELETE | `/hr/employees/:id` | Soft terminate/deactivate | `hr.employee.write` | |
| POST | `/hr/employees/:id/documents` | Add employee document metadata | `hr.document.write` or `hr.employee.write` | Storage upload handled separately |
| POST | `/hr/documents/:id/verify` | Verify/reject employee document | `hr.document.write` or `hr.employee.write` | |
| GET | `/hr/departments` | List departments + headcount | `hr.employee.read` | |
| POST | `/hr/departments` | Create department | `hr.settings.write` or `hr.employee.write` | No PATCH/DELETE endpoint found |
| GET | `/hr/designations` | List designations | `hr.employee.read` | |
| POST | `/hr/designations` | Create designation | `hr.settings.write` or `hr.employee.write` | No PATCH/DELETE endpoint found |
| GET | `/hr/leave-types` | List leave types | `hr.leave.read` or `hr.employee.read` | Read-only |
| GET | `/hr/holidays` | List holidays (year) | `hr.leave.read` or `hr.employee.read` | |
| POST | `/hr/holidays` | Create holiday | `hr.settings.write` or `hr.employee.write` | |
| DELETE | `/hr/holidays/:id` | Delete holiday | `hr.settings.write` | |
| GET | `/hr/settings` | Get HR settings blob | `hr.settings.write` or `hr.employee.read` | |
| PUT | `/hr/settings` | Upsert HR settings | `hr.settings.write` | |
| GET | `/hr/activities` | HR activity feed | `hr.employee.read` | |

### 2.2 Attendance (`attendance.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/hr/attendance` | List attendance records | Auth + self or `hr.attendance.read` | Filters/pagination/sort |
| POST | `/hr/attendance` | Record/upsert attendance | `hr.attendance.write` | Upsert by org/employee/date |
| GET | `/hr/attendance/summary` | Attendance summary view | Auth + self or `hr.attendance.read` | Reads `erp.v_hr_attendance_summary` |
| GET | `/hr/attendance/corrections` | List correction requests | Auth + self or `hr.attendance.read` | |
| POST | `/hr/attendance/corrections` | Submit correction request | Auth (self) or `hr.attendance.write` for others | Raises approval |
| POST | `/hr/attendance/corrections/:id/decide` | Approve/reject correction | `hr.attendance.approve` | DB trigger applies approved correction |

### 2.3 Leave (`leave.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/hr/leaves` | List leave requests | Auth + self or `hr.leave.read` | |
| POST | `/hr/leaves` | Apply for leave | Auth (self) or `hr.leave.create` for others | Overlap/holiday/working-day checks; approval/auto-approve |
| POST | `/hr/leaves/:id/approve` | Approve leave | `hr.leave.approve` | No self-approval |
| POST | `/hr/leaves/:id/reject` | Reject leave | `hr.leave.approve` | Remarks required |
| POST | `/hr/leaves/:id/cancel` | Cancel leave | Owner or `hr.leave.approve` | Cancels pending approvals |
| GET | `/hr/leave-balances` | List leave balances | Auth + self or `hr.leave.read` | Year filter |
| POST | `/hr/leave-balances` | Upsert leave balance allocation | `hr.settings.write` or `hr.leave.approve` | |

### 2.4 Payroll (`payroll.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/hr/salary-structures` | List salary structures | `hr.salary.read` or `hr.payroll.prepare` | |
| POST | `/hr/salary-structures` | Create/supersede salary structure | `hr.payroll.prepare` | |
| GET | `/hr/payroll/runs` | List payroll runs | `hr.payroll.read` | Paginated |
| POST | `/hr/payroll/runs` | Create payroll run + payslips | `hr.payroll.prepare` | Idempotency/replay support |
| GET | `/hr/payroll/runs/:id` | Run detail + payslips | `hr.payroll.read` | |
| POST | `/hr/payroll/runs/:id/advance` | Workflow action (submit/review/approve/mark-paid/cancel) | `hr.payroll.prepare` or `finance.payment.approve` (+ action checks) | Approval integration |
| GET | `/hr/payroll/payslips` | List payslips | Auth + self or `hr.payroll.read`/`hr.salary.read` | |
| PATCH | `/hr/payroll/payslips/:id` | Edit payslip (limited states) | `hr.payroll.prepare` | |

### 2.5 Contracts & Payments (`contracts.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/hr/contracts` | List contracts | `hr.contract.read` | Filters/search/sort/pagination |
| GET | `/hr/contracts/:id` | Contract detail | `hr.contract.read` | Includes signatures/schedule/docs/approval history |
| POST | `/hr/contracts` | Create contract | `hr.contract.write` | Doc number generation |
| PATCH | `/hr/contracts/:id` | Update contract | `hr.contract.write` | Locked for expired/terminated |
| POST | `/hr/contracts/:id/status` | Contract workflow action | `hr.contract.write` | submit/request_signature/activate/renew/terminate |
| POST | `/hr/contracts/:id/signatures` | Add signature | `hr.contract.write` | |
| POST | `/hr/contracts/:id/payments` | Add schedule payment | `hr.contract.write` or `hr.payment.create` | Enforces total <= contract value |
| POST | `/hr/contract-payments/:id/mark-paid` | Mark scheduled payment paid | `hr.payment.create` or `hr.contract.write` | |
| GET | `/hr/payments` | List daily payments | `hr.payment.read` | |
| POST | `/hr/payments` | Create daily payment | `hr.payment.create` | Idempotent + raises finance approval |
| POST | `/hr/payments/:id/approve` | Approve daily payment | `hr.payment.create` or `finance.payment.approve` | |
| POST | `/hr/payments/:id/reject` | Reject daily payment | `hr.payment.create` or `finance.payment.approve` | |
| POST | `/hr/payments/:id/status` | Update payment execution status | `hr.payment.create` or `finance.payment.approve` | Requires approved state |
| GET | `/hr/payments/:id/history` | Payment detail + history | `hr.payment.read` | **Returns `{ payment, history }` (contract aligned/fixed)** |

### 2.6 HR Expenses (`expenses.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/hr/expenses` | List HR expenses | Auth + self or `hr.expense.read`/`finance.expense.read` | |
| POST | `/hr/expenses` | Create (and optionally submit) expense | Auth (self) or `hr.expense.write` for others | Idempotent |
| GET | `/hr/expenses/:id` | Expense detail + approvals | Auth + self or read perms | |
| POST | `/hr/expenses/:id/approve` | Approve expense | `hr.expense.approve` | |
| POST | `/hr/expenses/:id/reject` | Reject expense | `hr.expense.approve` | |
| POST | `/hr/expenses/:id/request-changes` | Request changes | `hr.expense.approve` | |
| POST | `/hr/expenses/:id/reimburse` | Mark reimbursed | `finance.payment.approve` or `hr.expense.approve` | |

### 2.7 Talent / People Ops (`talent.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET/POST/PATCH | `/hr/jobs` | Job openings CRUD (no delete) | `hr.recruitment.read/write` | |
| GET/POST/PATCH | `/hr/candidates` | Candidates CRUD (no delete) | `hr.recruitment.read/write` | |
| GET | `/hr/candidates/:id` | Candidate detail + interviews | `hr.recruitment.read` | |
| POST | `/hr/candidates/:id/interviews` | Schedule interview | `hr.recruitment.write` | Auto-advances stage |
| POST | `/hr/interviews/:id/feedback` | Submit interview feedback | `hr.recruitment.write` | |
| GET/POST/PATCH | `/hr/onboarding` | Onboarding records | `hr.onboarding.read/write` | |
| GET/POST/PATCH | `/hr/reviews` | Performance reviews | Auth/self or `hr.performance.read/write` | Self-review constraints in handler |
| GET/POST/PATCH | `/hr/requests` | Employee requests/helpdesk | Auth/self or `hr.request.read/write` | Owner can append response |
| GET/POST/PATCH | `/hr/offboarding` | Offboarding records | `hr.offboarding.read/write` | Status side effects on employee |

### 2.8 Dashboard / Analytics (`dashboard.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/hr/dashboard` | HR dashboard aggregates | `hr.analytics.read` or `hr.employee.read` | |
| GET | `/hr/analytics` | Bundled analytics | `hr.analytics.read` | |
| GET | `/hr/analytics/attendance` | Attendance analytics | `hr.analytics.read` | |
| GET | `/hr/analytics/payroll` | Payroll analytics | `hr.analytics.read` | |

## 3. Marketing Endpoints (`/api/marketing`)

> All marketing routes are behind `authenticate` in `server/src/routes/marketing/index.ts`.

### 3.1 Leads (`leads.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/marketing/leads` | List leads (scoped) | Auth + scoped read (admin/read-all perms or own) | |
| GET | `/marketing/leads/:id` | Lead detail + related records | Auth + scope check | |
| POST | `/marketing/leads` | Create lead | `marketing.lead.create` | Duplicate/open-lead checks, doc number |
| PATCH | `/marketing/leads/:id` | Update lead | `marketing.lead.update` | State restrictions |
| POST | `/marketing/leads/:id/assign` | Assign to sales/user | `marketing.lead.assign` | Updates status/history |
| POST | `/marketing/leads/:id/follow-ups` | Create follow-up | `marketing.lead.followup` | |
| POST | `/marketing/leads/:id/follow-ups/:followUpId/complete` | Complete follow-up | `marketing.lead.followup` | |
| POST | `/marketing/leads/:id/follow-ups/:followUpId/cancel` | Cancel follow-up | `marketing.lead.followup` | |
| GET | `/marketing/leads/:id/activities` | Lead activity timeline | Auth (handler-level scope lighter than detail) | |
| POST | `/marketing/leads/:id/activities` | Append manual activity | `marketing.lead.update` | |
| POST | `/marketing/leads/:id/reject` | Reject lead | `marketing.lead.reject` | Cancels scheduled follow-ups |
| POST | `/marketing/leads/:id/convert` | Convert lead to customer | `marketing.lead.convert` | Idempotency/replay handling, customer creation + refs |

### 3.2 Campaigns / Offers / Discounts (`campaigns.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET/GET :id/POST/PATCH | `/marketing/campaigns` | Campaign CRUD subset | `marketing.campaign.read/create/update` | No delete endpoint found |
| GET/POST | `/marketing/offers` | List/create offers | `marketing.offer.read/create` | |
| POST | `/marketing/offers/:id/submit` | Submit offer for approval | `marketing.offer.create` | |
| POST | `/marketing/offers/:id/decide` | Decide offer approval | `marketing.approval.decide`/`approval.decide` | No self-approval |
| GET/POST | `/marketing/discounts` | List/request discounts | `marketing.discount.read/request` | Idempotent create |
| POST | `/marketing/discounts/:id/decide` | Decide discount | `marketing.discount.approve`/approval decide perms | Records approval row |

### 3.3 Plans & Marketing Expenses (`plans.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET/GET :id/POST/PATCH | `/marketing/plans` | Plan create/read/update | Auth + scoped owner/reviewer/approver rules | |
| POST | `/marketing/plans/:id/submit` | Submit for review | Owner or approver | Raises approval |
| POST | `/marketing/plans/:id/approve` | Multi-stage approve | `marketing.plan.approve` | Senior→manager→admin finance→approved |
| POST | `/marketing/plans/:id/reject` | Reject plan | `marketing.plan.approve` | |
| POST | `/marketing/plans/:id/request-changes` | Request changes | `marketing.plan.approve` | |
| POST | `/marketing/plans/:id/start` | Start execution | Owner/approver context | |
| PATCH | `/marketing/plans/:id/execution` | Update execution metrics | Owner/approver context | |
| POST | `/marketing/plans/:id/submit-results` | Submit results for review | Owner/approver context | |
| POST | `/marketing/plans/:id/complete` | Complete plan/results stage | `marketing.plan.approve` | |
| GET/GET :id/POST/PATCH | `/marketing/expenses` | Unified marketing expenses | Auth + scope/owner checks | |
| POST | `/marketing/expenses/:id/submit` | Submit expense | Owner or `marketing.expense.approve` | |
| POST | `/marketing/expenses/:id/decide` | Approve/reject/request changes | Approval/finance perms | Stage-aware |
| POST | `/marketing/expenses/:id/reimburse` | Mark reimbursed | Expense/finance approval perms | |

### 3.4 Performance / Targets / Rewards / Dashboard (`performance.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/marketing/dashboard` | Marketing dashboard aggregates | `marketing.analytics.read` or `marketing.lead.read` | Reads views + approvals + expenses summary |
| GET/POST/PATCH | `/marketing/targets` | Target read/upsert/update | `marketing.target.read/write` | |
| GET | `/marketing/performance` | Employee performance snapshots | `marketing.performance.read` or `marketing.analytics.read` | |
| POST | `/marketing/performance/refresh` | Recompute performance snapshots | `marketing.target.write` or `marketing.performance.read` | |
| GET | `/marketing/rewards` | Reward wallets | `marketing.reward.read` | |
| GET | `/marketing/rewards/:employeeId/transactions` | Reward transactions | Self or `marketing.reward.read` | |
| POST | `/marketing/rewards/award` | Award/adjust rewards | `marketing.reward.write` | |
| POST | `/marketing/rewards/redeem` | Redeem rewards | Self or `marketing.reward.write` | Balance checks + DB trigger |

### 3.5 Field Marketing (`field.ts`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET/GET :id/POST/PATCH | `/marketing/visits` | Field visits CRUD subset | `marketing.visit.read/write` + scope checks | |
| POST | `/marketing/visits/:id/check-in` | Check-in visit | Auth + handler scope (assignee/supervisor) | |
| POST | `/marketing/visits/:id/check-out` | Check-out/complete visit | Auth + handler scope | Outcome/checklist updates |
| GET/POST | `/marketing/surveys` | Market surveys list/create | `marketing.survey.read/write` | No GET by id/PATCH/DELETE found |
| GET/POST/PATCH | `/marketing/dealers` | Dealer prospects CRUD subset | `marketing.dealer.read/write` | No GET by id/DELETE found |
| GET/POST | `/marketing/activity-records` | Consolidated activity records | `marketing.analytics.read`/`marketing.lead.read` and write perms | Append-only by convention |

## 4. Shared Approvals Endpoints (`/api/approvals`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/approvals` | Approval queue/list | Auth + visibility scoping | `canDecide` = `approval.decide` / `hr.approval.decide` / `marketing.approval.decide` / `finance.approval.decide`; otherwise only rows the caller requested or is assigned |
| GET | `/approvals/pending-for-entity` | Pending approval for entity | Auth | |
| GET | `/approvals/:id` | Approval detail + history | Auth + scope check | |
| POST | `/approvals/:id/decide` | Generic approval decision | Auth; DB function enforces decision permissions | Uses `erp.decide_approval`; `Rejected` requires a comment |

### 4.1 Caller identity (`/api/me`)
| Method | Path | Purpose | Permission / Access | Notes |
|---|---|---|---|---|
| GET | `/me` | Verified caller profile | Auth | Returns `{ user: { id, authUserId, name, email, employeeCode, role, roleName, roleTier, isAdmin, hrEmployeeId, permissions[] }, organization: {...} }`. This is the **only** source the HR frontend uses to decide navigation, route access and action visibility; the backend remains authoritative. |

## 5. Notable API/Frontend Contract Notes (Audit)

- **Fixed:** HR `GET /hr/payments/:id/history` now returns `{ payment, history }` to match frontend client typing.
- **Implemented in this pass:** `src/features/field-marketing/*` now consumes marketing APIs in API mode for supported reads/mutations/workflows (visits, surveys, dealers, targets read, expenses submit/read, rewards wallet/transactions read) with loading/error/refresh handling and demo fallback preserved. UI↔API field mapping is adapter-based where schemas differ (e.g. visits/surveys/wallet semantics).
- **HR role foundation implemented:** `src/features/hr/lib/access.ts` maps every user-facing capability to the **exact** backend permission codes (`hr.employee.read`, `hr.leave.approve`, `hr.attendance.approve`, `hr.expense.approve`, `finance.payment.approve`, `approval.decide`, …). `GET /me` supplies the role + permission list; `canAccessHrRoute`, `visibleHrModules`, `resolveHrDashboardView`, `canViewSalary` and `isSelf` derive from it. No permission string or role is invented, and the backend's `requirePermission`/`hasPermission` checks remain authoritative.
- **HR pages now read the existing endpoints in API mode:** `GET /hr/payroll/runs` + `GET /hr/payslips` (period/status/pagination), `GET /hr/leave-balances`, `GET /hr/holidays`, `GET /hr/payments/:id/history`, `GET /hr/dashboard`, `GET /hr/analytics`, plus the previously wired employees/attendance/leave/contracts/payments/expenses/jobs/candidates/onboarding/reviews/requests/offboarding endpoints.
- **Ownership / confidentiality honoured in the UI:** leave cancellation is offered to the request owner (`POST /hr/leaves/:id/cancel` allows the owner or `hr.leave.approve`); an employee may only advance their own performance review to `Self Assessment`; salary is shown only to the owner, `hr.salary.read`/`hr.payroll.prepare` holders and admins; request status/assignment changes require `hr.request.write`.
- Frontend HR/Marketing clients are broad and typed (`src/lib/api/hr.ts`, `src/lib/api/marketing.ts`), but page-level consumption is still not uniform across all canonical HR and marketing portal surfaces (the marketing portal was intentionally out of scope for the HR role phase).
- Some backend resources intentionally omit delete endpoints (audit/history workflows, master-data catalogues, contracts); UI and docs should reflect supported operations only.
- Live contract verification against a running API + real DB is still required (**BLOCKED** in this environment).
