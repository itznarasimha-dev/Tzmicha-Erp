-- =============================================================================
-- 032_analytics_views.sql
-- Read-only reporting views used by the HR and Marketing dashboards.
-- All views are security_invoker so RLS of the underlying tables still applies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- HR
-- ---------------------------------------------------------------------------
create or replace view erp.v_hr_headcount
with (security_invoker = true) as
select
  e.org_id,
  coalesce(d.name, 'Unassigned') as department,
  e.employee_status,
  e.employment_type,
  count(*)::int as headcount
from erp.hr_employees e
left join erp.departments d on d.id = e.department_id
where e.deleted_at is null
group by e.org_id, d.name, e.employee_status, e.employment_type;

create or replace view erp.v_hr_dashboard
with (security_invoker = true) as
select
  o.id as org_id,
  (select count(*) from erp.hr_employees e where e.org_id = o.id and e.deleted_at is null)::int as total_employees,
  (select count(*) from erp.hr_employees e where e.org_id = o.id and e.deleted_at is null
     and e.employee_status = 'Active')::int as active_employees,
  (select count(*) from erp.hr_employees e where e.org_id = o.id and e.deleted_at is null
     and e.employee_status = 'Probation')::int as probation_employees,
  (select count(*) from erp.hr_employees e where e.org_id = o.id and e.deleted_at is null
     and e.employee_status = 'On Leave')::int as on_leave_employees,
  (select count(*) from erp.hr_leave_requests l where l.org_id = o.id and l.status = 'Pending')::int as pending_leaves,
  (select count(*) from erp.hr_daily_payments p where p.org_id = o.id
     and p.approval_status = 'Pending')::int as pending_payments,
  (select count(*) from erp.hr_expenses x where x.org_id = o.id and x.status = 'Pending')::int as pending_expenses,
  (select count(*) from erp.hr_employee_requests r where r.org_id = o.id
     and r.status in ('Open','In Progress'))::int as open_requests,
  (select count(*) from erp.hr_attendance a where a.org_id = o.id
     and a.attendance_date = current_date and a.status in ('Present','Late','Remote','Half Day'))::int as present_today,
  (select coalesce(sum(ps.net_pay),0) from erp.hr_payslips ps
     where ps.org_id = o.id and ps.period = to_char(current_date,'YYYY-MM'))::numeric(14,2) as payroll_this_month,
  (select count(*) from erp.hr_contracts c where c.org_id = o.id
     and c.status in ('Active','Expiring Soon'))::int as active_contracts
from erp.organizations o;

create or replace view erp.v_hr_attendance_summary
with (security_invoker = true) as
select
  a.org_id,
  a.employee_id,
  to_char(a.attendance_date, 'YYYY-MM') as period,
  count(*) filter (where a.status in ('Present','Remote'))::int as present_days,
  count(*) filter (where a.status = 'Late')::int as late_days,
  count(*) filter (where a.status = 'Absent')::int as absent_days,
  count(*) filter (where a.status = 'On Leave')::int as leave_days,
  count(*) filter (where a.status = 'Half Day')::int as half_days,
  coalesce(sum(a.hours), 0)::numeric(8,2) as total_hours
from erp.hr_attendance a
group by a.org_id, a.employee_id, to_char(a.attendance_date, 'YYYY-MM');

create or replace view erp.v_hr_leave_summary
with (security_invoker = true) as
select
  l.org_id,
  l.employee_id,
  lt.name as leave_type,
  to_char(l.start_date, 'YYYY') as year,
  count(*)::int as requests,
  coalesce(sum(l.days) filter (where l.status = 'Approved'), 0)::numeric(6,1) as approved_days,
  coalesce(sum(l.days) filter (where l.status = 'Pending'), 0)::numeric(6,1) as pending_days
from erp.hr_leave_requests l
join erp.hr_leave_types lt on lt.id = l.leave_type_id
group by l.org_id, l.employee_id, lt.name, to_char(l.start_date, 'YYYY');

create or replace view erp.v_hr_payroll_summary
with (security_invoker = true) as
select
  p.org_id,
  p.period,
  p.status as run_status,
  count(ps.id)::int as payslips,
  coalesce(sum(ps.basic), 0)::numeric(14,2) as total_basic,
  coalesce(sum(ps.allowances + ps.overtime), 0)::numeric(14,2) as total_allowances,
  coalesce(sum(ps.deductions + ps.leave_deduction + ps.tax), 0)::numeric(14,2) as total_deductions,
  coalesce(sum(ps.net_pay), 0)::numeric(14,2) as total_net
from erp.hr_payroll_runs p
left join erp.hr_payslips ps on ps.payroll_run_id = p.id
group by p.org_id, p.period, p.status;

-- ---------------------------------------------------------------------------
-- Marketing
-- ---------------------------------------------------------------------------
create or replace view erp.v_lead_pipeline
with (security_invoker = true) as
select
  l.org_id,
  l.status,
  l.priority,
  l.source_category,
  count(*)::int as lead_count,
  coalesce(sum((l.qualification ->> 'estimatedValue')::numeric), 0)::numeric(14,2) as estimated_value,
  count(*) filter (where l.converted)::int as converted_count
from erp.mkt_leads l
group by l.org_id, l.status, l.priority, l.source_category;

create or replace view erp.v_campaign_performance
with (security_invoker = true) as
select
  c.org_id,
  c.id as campaign_id,
  c.code,
  c.name,
  c.channel,
  c.status,
  c.budget,
  c.spend,
  count(l.id)::int as leads,
  count(l.id) filter (where l.status in ('Qualified','Sent to Sales','Converted'))::int as qualified_leads,
  count(l.id) filter (where l.converted)::int as conversions,
  coalesce(sum((l.qualification ->> 'estimatedValue')::numeric) filter (where l.converted), 0)::numeric(14,2) as converted_value,
  case when c.spend > 0
       then round((coalesce(sum((l.qualification ->> 'estimatedValue')::numeric) filter (where l.converted), 0) - c.spend) / c.spend * 100, 2)
       else null end as roi_percent
from erp.mkt_campaigns c
left join erp.mkt_leads l on l.campaign_id = c.id
group by c.org_id, c.id, c.code, c.name, c.channel, c.status, c.budget, c.spend;

create or replace view erp.v_marketing_dashboard
with (security_invoker = true) as
select
  o.id as org_id,
  (select count(*) from erp.mkt_leads l where l.org_id = o.id)::int as total_leads,
  (select count(*) from erp.mkt_leads l where l.org_id = o.id and l.status = 'New')::int as new_leads,
  (select count(*) from erp.mkt_leads l where l.org_id = o.id and l.status = 'Qualified')::int as qualified_leads,
  (select count(*) from erp.mkt_leads l where l.org_id = o.id and l.converted)::int as converted_leads,
  (select count(*) from erp.mkt_leads l where l.org_id = o.id and l.status = 'Rejected')::int as rejected_leads,
  (select count(*) from erp.mkt_lead_follow_ups f where f.org_id = o.id
     and f.status = 'Scheduled' and f.due_at < now())::int as overdue_follow_ups,
  (select count(*) from erp.mkt_campaigns c where c.org_id = o.id and c.status = 'Active')::int as active_campaigns,
  (select coalesce(sum(c.budget),0) from erp.mkt_campaigns c where c.org_id = o.id)::numeric(14,2) as total_budget,
  (select coalesce(sum(c.spend),0) from erp.mkt_campaigns c where c.org_id = o.id)::numeric(14,2) as total_spend,
  (select coalesce(sum(x.amount),0) from erp.mkt_expenses x
     where x.org_id = o.id and x.status in ('Approved','Paid','Reimbursed'))::numeric(14,2) as approved_expenses,
  (select count(*) from erp.approval_requests a where a.org_id = o.id and a.status = 'Pending')::int as pending_approvals,
  (select coalesce(sum(w.balance),0) from erp.mkt_reward_wallets w where w.org_id = o.id)::numeric(14,2) as rewards_outstanding
from erp.organizations o;

create or replace view erp.v_employee_performance
with (security_invoker = true) as
select
  p.org_id,
  p.employee_id,
  u.name as employee_name,
  p.period,
  p.leads_generated,
  p.leads_qualified,
  p.conversions,
  p.field_visits,
  p.campaigns_owned,
  p.revenue_attributed,
  p.target_leads,
  case when p.target_leads > 0
       then round(p.leads_generated::numeric / p.target_leads * 100, 2)
       else null end as lead_target_percent,
  p.score,
  p.computed_at
from erp.mkt_employee_performance p
join erp.users u on u.id = p.employee_id;

create or replace view erp.v_reward_balances
with (security_invoker = true) as
select
  w.org_id,
  w.employee_id,
  u.name as employee_name,
  w.currency,
  w.balance,
  coalesce(sum(t.amount) filter (where t.entry_type in ('Award','Adjustment','Opening')), 0)::numeric(14,2) as total_awarded,
  coalesce(abs(sum(t.amount) filter (where t.entry_type in ('Redemption','Reversal'))), 0)::numeric(14,2) as total_redeemed,
  max(t.created_at) as last_transaction_at
from erp.mkt_reward_wallets w
join erp.users u on u.id = w.employee_id
left join erp.mkt_reward_transactions t on t.wallet_id = w.id
group by w.org_id, w.employee_id, u.name, w.currency, w.balance;

create or replace view erp.v_marketing_expense_summary
with (security_invoker = true) as
select
  x.org_id,
  to_char(x.expense_date, 'YYYY-MM') as period,
  x.source,
  x.category,
  x.status,
  count(*)::int as expense_count,
  coalesce(sum(x.amount), 0)::numeric(14,2) as total_amount
from erp.mkt_expenses x
group by x.org_id, to_char(x.expense_date, 'YYYY-MM'), x.source, x.category, x.status;
