# HR & Marketing API Reference

Base path: `/api` (all endpoints below are relative to the API origin).  
Auth: `Authorization: Bearer <Supabase access token>` unless noted.  
Content type: `application/json` for request bodies.  
Envelope: successful responses return `{ "data": ... }`; paginated list endpoints return `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.  
Errors: `{ "error": { "code", "message", "details" } }`.

Sensitive mutations (creates/payments/reimbursements/conversions/approvals where implemented in handlers) accept/require `Idempotency-Key` semantics per `server/src/lib/idempotency.ts` and route logic.

> Note: this is an implementation-oriented reference derived from `server/src/routes/**`. Validate exact request/response fields against route handlers and mappers before external integration.

## Health & session
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | no | Liveness/basic health |
| GET | `/api/me` | yes | Session profile: internal ERP user, `auth_user_id`, org, department, role, permissions, assigned regions/warehouses (as available) |

## Approvals (shared engine)
Mounted under `/api/approvals` (see `server/src/routes/approvals.ts`). All require auth + appropriate permission checks.

| Method | Path | Description |
|---|---|---|
| GET | `/api/approvals` | List approval requests (filters/pagination per handler) |
| GET | `/api/approvals/:id` | Get approval request |
| POST | `/api/approvals/:id/decide` | Decide/advance approval (stage-aware, audited) |

## HR (`/api/hr`)
Routes composed in `server/src/routes/hr/index.ts`. Endpoints enforce auth, RBAC/permissions, org scoping, validation, and pagination/filter/sort where applicable.

### Dashboard & analytics
| Method | Path | Description |
|---|---|---|
| GET | `/api/hr/dashboard` | HR dashboard aggregates/KPIs |
| GET | `/api/hr/analytics` | HR analytics/reporting data |

### Employees & departments
| Method | Path | Description |
|---|---|---|
| GET | `/api/hr/employees` | List employees (paginated/filtered) |
| POST | `/api/hr/employees` | Create employee/profile linkage (server-side codes/rules) |
| GET | `/api/hr/employees/:id` | Employee detail |
| PATCH | `/api/hr/employees/:id` | Update employee |
| GET | `/api/hr/departments` | List departments (shared ERP) |
| GET | `/api/hr/designations` | List designations (if implemented) |

### Attendance
| Method | Path | Description |
|---|---|---|
| GET | `/api/hr/attendance` | List attendance records |
| POST | `/api/hr/attendance` | Create/record attendance |
| PATCH | `/api/hr/attendance/:id` | Update/correct attendance |
| GET | `/api/hr/attendance/corrections` | List correction requests (if exposed) |
| POST | `/api/hr/attendance/corrections` | Submit correction request |
| POST | `/api/hr/attendance/corrections/:id/approve` | Approve correction |
| POST | `/api/hr/attendance/corrections/:id/reject` | Reject correction |

### Leave
| Method | Path | Description |
|---|---|---|
| GET | `/api/hr/leaves` | List leave applications |
| POST | `/api/hr/leaves` | Submit leave application |
| GET | `/api/hr/leaves/:id` | Leave detail |
| PATCH | `/api/hr/leaves/:id` | Update leave (where permitted) |
| POST | `/api/hr/leaves/:id/approve` | Approve leave |
| POST | `/api/hr/leaves/:id/reject` | Reject leave |
| POST | `/api/hr/leaves/:id/cancel` | Cancel leave (if supported) |
| GET | `/api/hr/leave-types` | Leave types |
| GET | `/api/hr/leave-balances` | Leave balances |
| GET | `/api/hr/holidays` | Holidays |

### Payroll, contracts, payments
| Method | Path | Description |
|---|---|---|
| GET | `/api/hr/payroll` | Payroll runs/payslips listing |
| POST | `/api/hr/payroll` | Create payroll run/records (idempotent where applicable) |
| GET | `/api/hr/payroll/:id` | Payroll detail |
| PATCH | `/api/hr/payroll/:id` | Update/status transitions per workflow |
| GET | `/api/hr/contracts` | List contracts |
| POST | `/api/hr/contracts` | Create contract |
| GET | `/api/hr/contracts/:id` | Contract detail |
| PATCH | `/api/hr/contracts/:id` | Update contract |
| GET | `/api/hr/payments` | Daily/other HR payments |
| POST | `/api/hr/payments` | Record payment (idempotent) |
| PATCH | `/api/hr/payments/:id` | Update payment |

### Expenses, requests, talent/settings (as implemented)
| Method | Path | Description |
|---|---|---|
| GET | `/api/hr/expenses` | HR expenses |
| POST | `/api/hr/expenses` | Submit expense (idempotent) |
| POST | `/api/hr/expenses/:id/approve` | Approve |
| POST | `/api/hr/expenses/:id/reject` | Reject |
| GET | `/api/hr/requests` | Employee requests/tickets |
| POST | `/api/hr/requests` | Create request |
| PATCH | `/api/hr/requests/:id` | Update/resolve request |
| GET | `/api/hr/recruitment` | Recruitment/candidates |
| POST/PATCH | `/api/hr/recruitment...` | Candidate pipeline actions (per route) |
| GET | `/api/hr/performance` | Performance reviews |
| POST/PATCH | `/api/hr/performance...` | Review actions |
| GET | `/api/hr/onboarding` | Onboarding tasks/records |
| GET | `/api/hr/offboarding` | Offboarding records |
| GET/PATCH | `/api/hr/settings` | HR settings/config (where exposed) |

## Marketing (`/api/marketing`)
Routes composed in `server/src/routes/marketing/index.ts`.

### Dashboard & analytics
| Method | Path | Description |
|---|---|---|
| GET | `/api/marketing/dashboard` | Marketing dashboard aggregates |
| GET | `/api/marketing/analytics` | Marketing analytics |

### Leads & follow-ups
| Method | Path | Description |
|---|---|---|
| GET | `/api/marketing/leads` | List leads |
| POST | `/api/marketing/leads` | Create lead (duplicate prevention) |
| GET | `/api/marketing/leads/:id` | Lead detail |
| PATCH | `/api/marketing/leads/:id` | Update lead |
| POST | `/api/marketing/leads/:id/assign` | Assign lead |
| POST | `/api/marketing/leads/:id/reject` | Reject lead |
| POST | `/api/marketing/leads/:id/followups` | Add follow-up/activity |
| POST | `/api/marketing/leads/:id/convert` | Convert qualified lead → shared `erp.customers` (preserve history, no duplicate customer) |
| GET | `/api/marketing/lead-sources` | Lead sources |

### Campaigns, offers, discounts
| Method | Path | Description |
|---|---|---|
| GET | `/api/marketing/campaigns` | List campaigns |
| POST | `/api/marketing/campaigns` | Create campaign |
| GET | `/api/marketing/campaigns/:id` | Campaign detail |
| PATCH | `/api/marketing/campaigns/:id` | Update campaign |
| GET | `/api/marketing/offers` | Offers |
| POST | `/api/marketing/offers` | Create offer |
| PATCH | `/api/marketing/offers/:id` | Update offer |
| GET | `/api/marketing/discounts` | Discounts/requests |
| POST | `/api/marketing/discounts` | Submit discount (approval-aware) |
| POST | `/api/marketing/discounts/:id/approve` | Approve |
| POST | `/api/marketing/discounts/:id/reject` | Reject |

### Plans, execution, expenses (workflow)
| Method | Path | Description |
|---|---|---|
| GET | `/api/marketing/plans` | Monthly/marketing plans |
| POST | `/api/marketing/plans` | Create plan |
| GET | `/api/marketing/plans/:id` | Plan detail |
| PATCH | `/api/marketing/plans/:id` | Update plan/execution |
| POST | `/api/marketing/plans/:id/submit` | Submit for approval |
| POST | `/api/marketing/plans/:id/approve` | Approval action (explicit stages) |
| GET | `/api/marketing/expenses` | Marketing expenses (unified, source-aware) |
| POST | `/api/marketing/expenses` | Submit expense (idempotent) |
| PATCH | `/api/marketing/expenses/:id` | Update |
| POST | `/api/marketing/expenses/:id/approve` | Approve/reject per workflow |
| POST | `/api/marketing/expenses/:id/reimburse` | Mark reimbursed (idempotent) |

> Workflow statuses follow backend canonical values (e.g. DB `Approved`; frontend may display “Approved — Ready to Execute”). Stages include senior→manager→admin financial authorization where required.

### Targets, performance, rewards
| Method | Path | Description |
|---|---|---|
| GET | `/api/marketing/targets` | Targets (shared `erp.marketing_targets` extensions) |
| POST/PATCH | `/api/marketing/targets...` | Manage targets |
| GET | `/api/marketing/performance` | Employee/team performance |
| GET | `/api/marketing/rewards` | Rewards wallet summary |
| GET | `/api/marketing/rewards/transactions` | Wallet transactions (append-only semantics respected) |

### Field, dealers, surveys, activity
| Method | Path | Description |
|---|---|---|
| GET | `/api/marketing/field-visits` | Field visits |
| POST/PATCH | `/api/marketing/field-visits...` | Log/update visits |
| GET | `/api/marketing/dealers` | Dealers/network |
| POST/PATCH | `/api/marketing/dealers...` | Dealer actions |
| GET | `/api/marketing/surveys` | Surveys |
| POST/PATCH | `/api/marketing/surveys...` | Survey actions |
| GET | `/api/marketing/activity` | Marketing activity feed/records |

## Notes
- All list endpoints should be consumed with pagination (`page`, `pageSize` / `limit`) and filters as supported by each handler.
- Authorization is enforced server-side via verified JWT/session context, role/permission checks, and RLS-aware DB transactions; frontend role checks are informational only.
- Shared ERP entities (users, customers, products, finance, etc.) are referenced—not duplicated—by HR/Marketing routes.
