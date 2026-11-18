-- =============================================================================
-- 031_rls.sql
-- Row Level Security for the whole erp schema.
--
-- LAYERED MODEL
--   1. Permissive `org_isolation` policy on every org-owned table:
--        row.org_id = erp.current_org_id()
--      → cross-tenant access is impossible even if a server bug omits a filter.
--   2. RESTRICTIVE policies on confidential tables (salary, payslips, documents,
--      expenses, rewards, leads) that additionally require a permission or
--      self-ownership.
--   3. Append-only tables refuse UPDATE/DELETE outright.
--
-- The API layer still enforces fine-grained authorization (e.g. "own records
-- only" for updates), because RLS is a safety net, not the whole policy engine.
-- =============================================================================

-- 1. Enable RLS on every table in the erp schema.
do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'erp'
  loop
    execute format('alter table erp.%I enable row level security', r.tablename);
  end loop;
end $$;

-- 2. Generic tenant isolation on every table that owns an org_id column.
do $$
declare
  r record;
begin
  for r in
    select c.relname as tablename
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'org_id' and not a.attisdropped
     where n.nspname = 'erp'
       and c.relkind = 'r'
  loop
    execute format('drop policy if exists org_isolation on erp.%I', r.tablename);

    execute format($f$
      create policy org_isolation on erp.%I
        as permissive
        for all
        to authenticated
        using (org_id = erp.current_org_id())
        with check (org_id = erp.current_org_id())
    $f$, r.tablename);
  end loop;
end $$;

-- 3. Organizations: a member can read only their own tenant.
drop policy if exists org_self_read on erp.organizations;
create policy org_self_read on erp.organizations
  for select to authenticated
  using (id = erp.current_org_id());

drop policy if exists org_admin_update on erp.organizations;
create policy org_admin_update on erp.organizations
  for update to authenticated
  using (id = erp.current_org_id() and erp.has_permission('org.settings.write'))
  with check (id = erp.current_org_id());

-- 4. Global reference tables (read-only for tenants).
drop policy if exists permissions_read on erp.permissions;
create policy permissions_read on erp.permissions
  for select to authenticated using (true);

drop policy if exists doc_types_read on erp.doc_types;
create policy doc_types_read on erp.doc_types
  for select to authenticated using (true);

-- 5. Users: org-wide directory (no salary data lives here).
--    Writes are restricted to user administration.
drop policy if exists users_write on erp.users;
create policy users_write on erp.users
  for insert to authenticated
  with check (org_id = erp.current_org_id() and erp.has_permission('admin.user.write'));

drop policy if exists users_update on erp.users;
create policy users_update on erp.users
  for update to authenticated
  using (org_id = erp.current_org_id()
         and (id = erp.current_user_id() or erp.has_permission('admin.user.write')))
  with check (org_id = erp.current_org_id());

drop policy if exists users_delete on erp.users;
create policy users_delete on erp.users
  for delete to authenticated
  using (org_id = erp.current_org_id() and erp.has_permission('admin.user.write'));

-- 6. Confidential HR data -----------------------------------------------------
drop policy if exists hr_employees_read on erp.hr_employees;
create policy hr_employees_read on erp.hr_employees
  as restrictive for select to authenticated
  using (
    erp.has_permission('hr.employee.read')
    or erp.has_permission('hr.salary.read')
    or erp.has_permission('hr.payroll.prepare')
    or user_id = erp.current_user_id()
  );

drop policy if exists hr_employees_write on erp.hr_employees;
create policy hr_employees_write on erp.hr_employees
  as restrictive for insert to authenticated
  with check (erp.has_permission('hr.employee.write'));

drop policy if exists hr_employees_update on erp.hr_employees;
create policy hr_employees_update on erp.hr_employees
  as restrictive for update to authenticated
  using (erp.has_permission('hr.employee.write'))
  with check (erp.has_permission('hr.employee.write'));

drop policy if exists hr_salary_read on erp.hr_salary_structures;
create policy hr_salary_read on erp.hr_salary_structures
  as restrictive for select to authenticated
  using (
    erp.has_permission('hr.salary.read')
    or erp.has_permission('hr.payroll.prepare')
    or employee_id in (select id from erp.hr_employees where user_id = erp.current_user_id())
  );

drop policy if exists hr_payslips_read on erp.hr_payslips;
create policy hr_payslips_read on erp.hr_payslips
  as restrictive for select to authenticated
  using (
    erp.has_permission('hr.payroll.read')
    or erp.has_permission('hr.salary.read')
    or employee_id in (select id from erp.hr_employees where user_id = erp.current_user_id())
  );

drop policy if exists hr_payslips_no_delete on erp.hr_payslips;
create policy hr_payslips_no_delete on erp.hr_payslips
  as restrictive for delete to authenticated
  using (false);

drop policy if exists hr_payroll_runs_no_delete on erp.hr_payroll_runs;
create policy hr_payroll_runs_no_delete on erp.hr_payroll_runs
  as restrictive for delete to authenticated
  using (false);

drop policy if exists hr_documents_read on erp.hr_employee_documents;
create policy hr_documents_read on erp.hr_employee_documents
  as restrictive for select to authenticated
  using (
    erp.has_permission('hr.document.read')
    or employee_id in (select id from erp.hr_employees where user_id = erp.current_user_id())
  );

drop policy if exists hr_documents_write on erp.hr_employee_documents;
create policy hr_documents_write on erp.hr_employee_documents
  as restrictive for insert to authenticated
  with check (erp.has_permission('hr.document.write'));

drop policy if exists hr_contracts_read on erp.hr_contracts;
create policy hr_contracts_read on erp.hr_contracts
  as restrictive for select to authenticated
  using (
    erp.has_permission('hr.contract.read')
    or employee_id in (select id from erp.hr_employees where user_id = erp.current_user_id())
  );

drop policy if exists hr_payments_read on erp.hr_daily_payments;
create policy hr_payments_read on erp.hr_daily_payments
  as restrictive for select to authenticated
  using (
    erp.has_permission('hr.payment.read')
    or erp.has_permission('finance.payment.read')
    or employee_id in (select id from erp.hr_employees where user_id = erp.current_user_id())
  );

drop policy if exists hr_expenses_read on erp.hr_expenses;
create policy hr_expenses_read on erp.hr_expenses
  as restrictive for select to authenticated
  using (
    erp.has_permission('hr.expense.read')
    or erp.has_permission('finance.expense.read')
    or employee_id in (select id from erp.hr_employees where user_id = erp.current_user_id())
  );

drop policy if exists hr_expenses_write on erp.hr_expenses;
create policy hr_expenses_write on erp.hr_expenses
  as restrictive for insert to authenticated
  with check (
    erp.has_permission('hr.expense.write')
    or employee_id in (select id from erp.hr_employees where user_id = erp.current_user_id())
  );

drop policy if exists hr_payroll_runs_write on erp.hr_payroll_runs;
create policy hr_payroll_runs_write on erp.hr_payroll_runs
  as restrictive for insert to authenticated
  with check (erp.has_permission('hr.payroll.prepare'));

-- 7. Marketing data -----------------------------------------------------------
drop policy if exists mkt_leads_read on erp.mkt_leads;
create policy mkt_leads_read on erp.mkt_leads
  as restrictive for select to authenticated
  using (
    erp.has_permission('marketing.lead.read')
    or assigned_to = erp.current_user_id()
    or generated_by = erp.current_user_id()
    or erp.has_permission('sales.lead.read')
  );

drop policy if exists mkt_leads_write on erp.mkt_leads;
create policy mkt_leads_write on erp.mkt_leads
  as restrictive for insert to authenticated
  with check (erp.has_permission('marketing.lead.create'));

drop policy if exists mkt_leads_update on erp.mkt_leads;
create policy mkt_leads_update on erp.mkt_leads
  as restrictive for update to authenticated
  using (
    erp.has_permission('marketing.lead.update')
    or assigned_to = erp.current_user_id()
    or erp.has_permission('sales.lead.update')
  )
  with check (
    erp.has_permission('marketing.lead.update')
    or assigned_to = erp.current_user_id()
    or erp.has_permission('sales.lead.update')
  );

drop policy if exists mkt_followups_read on erp.mkt_lead_follow_ups;
create policy mkt_followups_read on erp.mkt_lead_follow_ups
  as restrictive for select to authenticated
  using (
    erp.has_permission('marketing.lead.read')
    or lead_id in (select id from erp.mkt_leads where assigned_to = erp.current_user_id())
  );

drop policy if exists mkt_expenses_read on erp.mkt_expenses;
create policy mkt_expenses_read on erp.mkt_expenses
  as restrictive for select to authenticated
  using (
    erp.has_permission('marketing.expense.read')
    or erp.has_permission('finance.expense.read')
    or employee_id = erp.current_user_id()
  );

drop policy if exists mkt_expenses_write on erp.mkt_expenses;
create policy mkt_expenses_write on erp.mkt_expenses
  as restrictive for insert to authenticated
  with check (
    erp.has_permission('marketing.expense.create')
    or employee_id = erp.current_user_id()
  );

drop policy if exists mkt_plans_read on erp.mkt_plans;
create policy mkt_plans_read on erp.mkt_plans
  as restrictive for select to authenticated
  using (
    erp.has_permission('marketing.plan.read')
    or employee_id = erp.current_user_id()
    or senior_reviewer_id = erp.current_user_id()
  );

drop policy if exists mkt_plans_write on erp.mkt_plans;
create policy mkt_plans_write on erp.mkt_plans
  as restrictive for insert to authenticated
  with check (
    erp.has_permission('marketing.plan.create')
    or employee_id = erp.current_user_id()
  );

drop policy if exists mkt_rewards_read on erp.mkt_reward_wallets;
create policy mkt_rewards_read on erp.mkt_reward_wallets
  as restrictive for select to authenticated
  using (erp.has_permission('marketing.reward.read') or employee_id = erp.current_user_id());

drop policy if exists mkt_reward_tx_read on erp.mkt_reward_transactions;
create policy mkt_reward_tx_read on erp.mkt_reward_transactions
  as restrictive for select to authenticated
  using (erp.has_permission('marketing.reward.read') or employee_id = erp.current_user_id());

drop policy if exists mkt_reward_tx_no_delete on erp.mkt_reward_transactions;
create policy mkt_reward_tx_no_delete on erp.mkt_reward_transactions
  as restrictive for delete to authenticated
  using (false);

drop policy if exists mkt_discounts_read on erp.mkt_discounts;
create policy mkt_discounts_read on erp.mkt_discounts
  as restrictive for select to authenticated
  using (
    erp.has_permission('marketing.discount.read')
    or erp.has_permission('sales.discount.read')
    or requested_by = erp.current_user_id()
  );

-- 8. Wallet (shared field-marketing advances) ---------------------------------
drop policy if exists wallet_read on erp.wallet_accounts;
create policy wallet_read on erp.wallet_accounts
  as restrictive for select to authenticated
  using (
    erp.has_permission('finance.wallet.read')
    or erp.has_permission('marketing.wallet.read')
    or user_id = erp.current_user_id()
  );

drop policy if exists wallet_tx_read on erp.wallet_transactions;
create policy wallet_tx_read on erp.wallet_transactions
  as restrictive for select to authenticated
  using (
    erp.has_permission('finance.wallet.read')
    or erp.has_permission('marketing.wallet.read')
    or user_id = erp.current_user_id()
  );

drop policy if exists wallet_tx_no_update on erp.wallet_transactions;
create policy wallet_tx_no_update on erp.wallet_transactions
  as restrictive for update to authenticated
  using (false);

drop policy if exists wallet_tx_no_delete on erp.wallet_transactions;
create policy wallet_tx_no_delete on erp.wallet_transactions
  as restrictive for delete to authenticated
  using (false);

-- 9. Append-only platform records --------------------------------------------
drop policy if exists stock_movements_no_update on erp.stock_movements;
create policy stock_movements_no_update on erp.stock_movements
  as restrictive for update to authenticated using (false);
drop policy if exists stock_movements_no_delete on erp.stock_movements;
create policy stock_movements_no_delete on erp.stock_movements
  as restrictive for delete to authenticated using (false);

drop policy if exists audit_logs_read on erp.audit_logs;
create policy audit_logs_read on erp.audit_logs
  as restrictive for select to authenticated
  using (erp.has_permission('admin.audit.read'));
drop policy if exists audit_logs_no_update on erp.audit_logs;
create policy audit_logs_no_update on erp.audit_logs
  as restrictive for update to authenticated using (false);
drop policy if exists audit_logs_no_delete on erp.audit_logs;
create policy audit_logs_no_delete on erp.audit_logs
  as restrictive for delete to authenticated using (false);

-- 10. Approval engine ---------------------------------------------------------
drop policy if exists approvals_read on erp.approval_requests;
create policy approvals_read on erp.approval_requests
  as restrictive for select to authenticated
  using (
    requested_by = erp.current_user_id()
    or assigned_to = erp.current_user_id()
    or erp.has_permission('approval.decide')
    or erp.has_permission('hr.approval.decide')
    or erp.has_permission('marketing.approval.decide')
    or erp.has_permission('finance.approval.decide')
  );

-- 11. Table privileges (RLS still applies on top).
do $$
begin
  if to_regrole('authenticated') is not null then
    grant select, insert, update, delete on all tables in schema erp to authenticated;
    grant usage, select on all sequences in schema erp to authenticated;
  end if;

  if to_regrole('service_role') is not null then
    grant all on all tables in schema erp to service_role;
    grant all on all sequences in schema erp to service_role;
  end if;

  if to_regrole('anon') is not null then
    revoke all on all tables in schema erp from anon;
  end if;
end $$;
