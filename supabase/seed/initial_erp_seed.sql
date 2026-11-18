-- =============================================================================
-- initial_erp_seed.sql
-- Idempotent baseline seed for HR + Marketing.
--
-- RULES OBEYED
--   * every INSERT resolves IDs dynamically (no hard-coded UUIDs)
--   * every INSERT is idempotent (ON CONFLICT DO NOTHING)
--   * existing rows are never updated or deleted
--   * no demo employees, customers or financial transactions are created
--   * company legal name / GSTIN below are the reference values from the
--     specification. VERIFY against statutory records before production use.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Organization
-- ---------------------------------------------------------------------------
insert into erp.organizations (team_id, name, legal_name, gstin, plan_code, currency)
values (
  'APEX-2026',
  'Tzmicha Enterprise',
  'Tzmicha Manufacturing & Distribution Pvt Ltd',  -- VERIFY before production
  '29AABCT1332L1Z2',                                -- VERIFY before production
  'Enterprise',
  'INR'
)
on conflict (team_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Departments
-- ---------------------------------------------------------------------------
insert into erp.departments (org_id, code, name)
select o.id, d.code, d.name
from erp.organizations o
cross join (values
  ('EXEC', 'Executive Management'),
  ('SALES','Commercial Sales'),
  ('MKT',  'Marketing & Alliances'),
  ('WH',   'Warehouse & Supply Chain'),
  ('FIN',  'Finance & Accounts'),
  ('SVC',  'Customer Service & Field Engineering'),
  ('HR',   'Human Resources')
) as d(code, name)
where o.team_id = 'APEX-2026'
on conflict (org_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Roles
-- ---------------------------------------------------------------------------
insert into erp.roles (org_id, code, name, tier, description, is_system)
select o.id, r.code, r.name, r.tier, r.description, true
from erp.organizations o
cross join (values
  ('system_admin',      'System Administrator',            1, 'Full tenant administration'),
  ('manager',           'Operations General Manager',      1, 'Cross-functional operations oversight'),
  ('marketing_manager', 'Marketing Manager',               1, 'Department budgets, targets, approvals'),
  ('marketing_senior',  'Senior Marketing Executive',      2, 'Sector lead and reviewer'),
  ('marketing_junior',  'Junior Field Marketer',           3, 'Field execution, leads, expenses'),
  ('hr_manager',        'HR & People Manager',             1, 'Employees, attendance, payroll, contracts'),
  ('finance_controller','Financial Controller',            1, 'Payroll authorisation, payments, expenses'),
  ('sales',             'Sales Executive',                 2, 'Customers, quotations, orders'),
  ('store_manager',     'Store Manager',                   2, 'Warehouse and inventory'),
  ('service',           'Service Engineer',                3, 'Service and warranty'),
  ('employee',          'Employee (self-service)',         4, 'Personal profile, attendance, leave')
) as r(code, name, tier, description)
where o.team_id = 'APEX-2026'
on conflict (org_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Permissions
-- ---------------------------------------------------------------------------
insert into erp.permissions (code, module, action, description) values
  -- HR
  ('hr.employee.read',            'hr','employee.read',            'View employee directory'),
  ('hr.employee.write',           'hr','employee.write',           'Create or update employees'),
  ('hr.salary.read',              'hr','salary.read',              'View confidential salary data'),
  ('hr.document.read',            'hr','document.read',            'View employee documents'),
  ('hr.document.write',           'hr','document.write',           'Upload employee documents'),
  ('hr.document.delete',          'hr','document.delete',          'Delete employee documents'),
  ('hr.attendance.read',          'hr','attendance.read',          'View attendance'),
  ('hr.attendance.write',         'hr','attendance.write',         'Record attendance'),
  ('hr.attendance.approve',       'hr','attendance.approve',       'Decide attendance corrections'),
  ('hr.leave.read',               'hr','leave.read',               'View leave requests'),
  ('hr.leave.create',             'hr','leave.create',             'Apply for leave'),
  ('hr.leave.approve',            'hr','leave.approve',            'Approve or reject leave'),
  ('hr.payroll.read',             'hr','payroll.read',             'View payroll'),
  ('hr.payroll.prepare',          'hr','payroll.prepare',          'Prepare payroll runs'),
  ('hr.contract.read',            'hr','contract.read',            'View contracts'),
  ('hr.contract.write',           'hr','contract.write',           'Create or update contracts'),
  ('hr.payment.read',             'hr','payment.read',             'View HR payments'),
  ('hr.payment.create',           'hr','payment.create',           'Create HR payments'),
  ('hr.expense.read',             'hr','expense.read',             'View HR expenses'),
  ('hr.expense.write',            'hr','expense.write',            'Submit HR expenses'),
  ('hr.expense.approve',          'hr','expense.approve',          'Approve HR expenses'),
  ('hr.recruitment.read',         'hr','recruitment.read',         'View recruitment'),
  ('hr.recruitment.write',        'hr','recruitment.write',        'Manage recruitment'),
  ('hr.onboarding.read',          'hr','onboarding.read',          'View onboarding'),
  ('hr.onboarding.write',         'hr','onboarding.write',         'Manage onboarding'),
  ('hr.performance.read',         'hr','performance.read',         'View performance reviews'),
  ('hr.performance.write',        'hr','performance.write',        'Manage performance reviews'),
  ('hr.request.read',             'hr','request.read',             'View employee requests'),
  ('hr.request.write',            'hr','request.write',            'Manage employee requests'),
  ('hr.offboarding.read',         'hr','offboarding.read',         'View offboarding'),
  ('hr.offboarding.write',        'hr','offboarding.write',        'Manage offboarding'),
  ('hr.settings.write',           'hr','settings.write',           'Manage HR policy settings'),
  ('hr.analytics.read',           'hr','analytics.read',           'View HR analytics'),
  ('hr.approval.decide',          'hr','approval.decide',          'Decide HR approvals'),
  -- Marketing
  ('marketing.lead.read',         'marketing','lead.read',         'View leads'),
  ('marketing.lead.create',       'marketing','lead.create',       'Create leads'),
  ('marketing.lead.update',       'marketing','lead.update',       'Update / qualify leads'),
  ('marketing.lead.assign',       'marketing','lead.assign',       'Assign leads to sales'),
  ('marketing.lead.followup',     'marketing','lead.followup',     'Schedule and complete follow-ups'),
  ('marketing.lead.reject',       'marketing','lead.reject',       'Reject leads'),
  ('marketing.lead.convert',      'marketing','lead.convert',      'Convert lead to customer'),
  ('marketing.campaign.read',     'marketing','campaign.read',     'View campaigns'),
  ('marketing.campaign.create',   'marketing','campaign.create',   'Create campaigns'),
  ('marketing.campaign.update',   'marketing','campaign.update',   'Update campaigns'),
  ('marketing.offer.read',        'marketing','offer.read',        'View offers'),
  ('marketing.offer.create',      'marketing','offer.create',      'Create offers'),
  ('marketing.discount.read',     'marketing','discount.read',     'View discount requests'),
  ('marketing.discount.request',  'marketing','discount.request',  'Raise discount requests'),
  ('marketing.discount.approve',  'marketing','discount.approve',  'Approve discount requests'),
  ('marketing.plan.read',         'marketing','plan.read',         'View marketing plans'),
  ('marketing.plan.create',       'marketing','plan.create',       'Create marketing plans'),
  ('marketing.plan.approve',      'marketing','plan.approve',      'Review / approve plans'),
  ('marketing.expense.read',      'marketing','expense.read',      'View marketing expenses'),
  ('marketing.expense.create',    'marketing','expense.create',    'Submit marketing expenses'),
  ('marketing.expense.approve',   'marketing','expense.approve',   'Approve marketing expenses'),
  ('marketing.target.read',       'marketing','target.read',       'View targets'),
  ('marketing.target.write',      'marketing','target.write',      'Set targets'),
  ('marketing.performance.read',  'marketing','performance.read',  'View performance'),
  ('marketing.reward.read',       'marketing','reward.read',       'View rewards wallet'),
  ('marketing.reward.write',      'marketing','reward.write',      'Award rewards'),
  ('marketing.document.read',     'marketing','document.read',     'View marketing documents'),
  ('marketing.document.write',    'marketing','document.write',    'Upload marketing documents'),
  ('marketing.document.delete',   'marketing','document.delete',   'Delete marketing documents'),
  ('marketing.visit.read',        'marketing','visit.read',        'View field visits'),
  ('marketing.visit.write',       'marketing','visit.write',       'Manage field visits'),
  ('marketing.survey.read',       'marketing','survey.read',       'View market surveys'),
  ('marketing.survey.write',      'marketing','survey.write',      'Submit market surveys'),
  ('marketing.dealer.read',       'marketing','dealer.read',       'View dealer prospects'),
  ('marketing.dealer.write',      'marketing','dealer.write',      'Manage dealer prospects'),
  ('marketing.analytics.read',    'marketing','analytics.read',    'View marketing analytics'),
  ('marketing.approval.decide',   'marketing','approval.decide',   'Decide marketing approvals'),
  ('marketing.wallet.read',       'marketing','wallet.read',       'View field advance wallet'),
  -- Finance / shared
  ('finance.payment.read',        'finance','payment.read',        'View payments'),
  ('finance.payment.approve',     'finance','payment.approve',     'Approve payments'),
  ('finance.expense.read',        'finance','expense.read',        'View expenses'),
  ('finance.document.read',       'finance','document.read',       'View finance documents'),
  ('finance.document.write',      'finance','document.write',      'Upload finance documents'),
  ('finance.document.delete',     'finance','document.delete',     'Delete finance documents'),
  ('finance.wallet.read',         'finance','wallet.read',         'View advance wallets'),
  ('finance.approval.decide',     'finance','approval.decide',     'Decide financial approvals'),
  ('approval.decide',             'shared','approval.decide',      'Decide any assigned approval'),
  ('admin.user.write',            'admin','user.write',            'Manage users'),
  ('admin.audit.read',            'admin','audit.read',            'Read audit log'),
  ('org.settings.write',          'admin','settings.write',        'Manage organization settings'),
  ('sales.lead.read',             'sales','lead.read',             'View handed-over leads'),
  ('sales.lead.update',           'sales','lead.update',           'Update handed-over leads'),
  ('sales.discount.read',         'sales','discount.read',         'View discount authority')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Role → permission mapping
-- ---------------------------------------------------------------------------
-- system_admin receives every permission.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
cross join erp.permissions p
where r.code = 'system_admin'
on conflict do nothing;

-- manager: approvals + read access across HR and Marketing.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p
  on p.code = 'approval.decide'
  or p.action like '%.read'
  or p.code in ('hr.expense.approve','marketing.expense.approve','marketing.discount.approve')
where r.code = 'manager'
on conflict do nothing;

-- HR manager: all HR permissions.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p on p.module = 'hr' or p.code = 'approval.decide'
where r.code = 'hr_manager'
on conflict do nothing;

-- Finance controller.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p
  on p.module = 'finance'
  or p.code in (
    'approval.decide',
    'hr.payroll.read','hr.salary.read','hr.payment.read','hr.expense.read',
    'hr.expense.approve','hr.employee.read','hr.contract.read',
    'marketing.expense.read','marketing.plan.read',
    'admin.audit.read','finance.document.read','finance.document.write'
  )
where r.code = 'finance_controller'
on conflict do nothing;

-- Marketing manager: all marketing permissions.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p
  on p.module = 'marketing'
  or p.code in ('approval.decide','hr.employee.read','sales.discount.read')
where r.code = 'marketing_manager'
on conflict do nothing;

-- Senior marketing executive.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p on p.code in (
  'marketing.lead.read','marketing.lead.create','marketing.lead.update',
  'marketing.lead.assign','marketing.lead.followup','marketing.lead.reject',
  'marketing.campaign.read','marketing.campaign.create','marketing.campaign.update',
  'marketing.offer.read','marketing.offer.create',
  'marketing.plan.read','marketing.plan.create','marketing.plan.approve',
  'marketing.expense.read','marketing.expense.create',
  'marketing.target.read','marketing.performance.read','marketing.reward.read',
  'marketing.document.read','marketing.document.write',
  'marketing.visit.read','marketing.visit.write','marketing.survey.read',
  'marketing.survey.write','marketing.dealer.read','marketing.dealer.write',
  'marketing.analytics.read','marketing.wallet.read','hr.employee.read'
)
where r.code = 'marketing_senior'
on conflict do nothing;

-- Junior field marketer (least privilege).
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p on p.code in (
  'marketing.lead.read','marketing.lead.create','marketing.lead.update',
  'marketing.lead.followup','marketing.expense.read','marketing.expense.create',
  'marketing.plan.read','marketing.plan.create','marketing.target.read',
  'marketing.reward.read','marketing.document.read','marketing.document.write',
  'marketing.visit.read','marketing.visit.write','marketing.survey.read',
  'marketing.survey.write','marketing.dealer.read','marketing.dealer.write',
  'marketing.wallet.read','hr.employee.read'
)
where r.code = 'marketing_junior'
on conflict do nothing;

-- Sales: consumes handed-over leads and discount visibility.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p on p.code in ('sales.lead.read','sales.lead.update','sales.discount.read','hr.employee.read')
where r.code = 'sales'
on conflict do nothing;

-- Store manager / service: limited directory visibility.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p on p.code in ('hr.employee.read','sales.lead.read')
where r.code in ('store_manager','service')
on conflict do nothing;

-- Employee self-service.
insert into erp.role_permissions (role_id, permission_code)
select r.id, p.code
from erp.roles r
join erp.permissions p on p.code in (
  'hr.leave.create','hr.attendance.read','hr.expense.write','hr.document.read',
  'hr.request.write','hr.performance.read'
)
where r.code = 'employee'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6. Regions
-- ---------------------------------------------------------------------------
insert into erp.regions (org_id, code, name, state)
select o.id, r.code, r.name, r.state
from erp.organizations o
cross join (values
  ('NZ-DL','North Zone','Delhi'),
  ('WZ-MH','West Zone','Maharashtra'),
  ('SZ-KA','South Zone','Karnataka')
) as r(code, name, state)
where o.team_id = 'APEX-2026'
on conflict (org_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Warehouses
-- ---------------------------------------------------------------------------
insert into erp.warehouses (org_id, region_id, code, name, address)
select o.id, reg.id, w.code, w.name, w.address
from erp.organizations o
join (values
  ('NZ-DL','WH-DEL-01','Okhla Central Logistics Depot','Okhla Industrial Area Phase III, New Delhi'),
  ('WZ-MH','WH-BHW-02','Bhiwandi Western Hub','Bhiwandi Logistics Park, Maharashtra'),
  ('SZ-KA','WH-BLR-03','Peenya Industrial Storage Depot','Peenya Industrial Area, Bengaluru')
) as w(region_code, code, name, address) on true
join erp.regions reg on reg.org_id = o.id and reg.code = w.region_code
where o.team_id = 'APEX-2026'
on conflict (org_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 8. HR leave types, salary components, settings
-- ---------------------------------------------------------------------------
insert into erp.hr_leave_types (org_id, code, name, allocation_days, paid, carry_forward, requires_approval, color, description)
select o.id, lt.code, lt.name, lt.allocation, lt.paid, lt.carry, true, lt.color, lt.description
from erp.organizations o
cross join (values
  ('CL','Casual Leave',        12.0, true,  false, '#6366f1','Short-notice personal leave'),
  ('SL','Sick Leave',          10.0, true,  false, '#f97316','Medical leave with certificate above 2 days'),
  ('PL','Privileged Leave',    18.0, true,  true,  '#10b981','Annual earned leave'),
  ('CO','Comp-off',             0.0, true,  true,  '#0ea5e9','Compensatory off against approved work'),
  ('ML','Maternity/Paternity', 90.0, true,  false, '#ec4899','Statutory maternity and paternity leave')
) as lt(code, name, allocation, paid, carry, color, description)
where o.team_id = 'APEX-2026'
on conflict (org_id, code) do nothing;

insert into erp.hr_salary_components (org_id, code, name, component_kind, taxable, calculation)
select o.id, c.code, c.name, c.kind, c.taxable, 'Fixed'
from erp.organizations o
cross join (values
  ('BASIC','Basic Salary','Earning',true),
  ('HRA','House Rent Allowance','Earning',true),
  ('CONV','Conveyance Allowance','Earning',true),
  ('SPECIAL','Special Allowance','Earning',true),
  ('PF','Provident Fund','Deduction',false),
  ('ESI','ESI','Deduction',false),
  ('PT','Professional Tax','Deduction',false),
  ('TDS','Income Tax (TDS)','Deduction',false)
) as c(code, name, kind, taxable)
where o.team_id = 'APEX-2026'
on conflict (org_id, code) do nothing;

insert into erp.hr_settings (org_id, data)
select o.id, '{}'::jsonb
from erp.organizations o
where o.team_id = 'APEX-2026'
on conflict (org_id) do nothing;

-- ---------------------------------------------------------------------------
-- 9. Marketing lead sources
-- ---------------------------------------------------------------------------
insert into erp.mkt_lead_sources (org_id, code, name, category)
select o.id, s.code, s.name, s.category
from erp.organizations o
cross join (values
  ('DIGITAL_CAMPAIGN','Digital Campaign','Digital Marketing'),
  ('FIELD_VISIT','Field Visit','Field Marketing'),
  ('TRADE_EVENT','Trade Event','Trade Marketing'),
  ('REFERRAL','Referral','Referral'),
  ('WEBSITE_ENQUIRY','Website Enquiry','Website'),
  ('RETAIL_ACTIVITY','Retail Activity','Trade Marketing'),
  ('SOCIAL_MEDIA','Social Media','Digital Marketing'),
  ('WHATSAPP','WhatsApp','Other'),
  ('CAMPAIGN','Campaign','Campaign'),
  ('EVENTS','Events','Campaign'),
  ('MANUAL_ENTRY','Manual Entry','Other'),
  ('OTHER','Other','Other')
) as s(code, name, category)
where o.team_id = 'APEX-2026'
on conflict (org_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- 10. Optional bootstrap administrator
--
-- Employees are deliberately NOT seeded. Provision the first administrator
-- after a Supabase auth user exists, e.g.:
--
--   update erp.users u
--      set role_id = (select id from erp.roles where org_id = u.org_id and code = 'system_admin')
--    where u.email = 'admin@example.com';
--
-- Signup metadata cannot grant this role (see 003_erp_auth_sync.sql).
-- ---------------------------------------------------------------------------
