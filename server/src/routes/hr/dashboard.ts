import { Router } from 'express'
import { withRls, one, many } from '../../db/transaction.js'
import { sendData, validateQuery, validatedQuery } from '../../http.js'
import { requirePermission } from '../../middleware/auth.js'
import { mapActivity, mapLeaveType, num } from '../../mappers/hr.js'
import { optionalText } from '../../lib/validation.js'

export const dashboardRouter = Router()

dashboardRouter.get('/dashboard', requirePermission('hr.analytics.read', 'hr.employee.read'), async (req, res) => {
  const auth = req.auth!

  const payload = await withRls(auth, async (client) => {
    const summary = await one(
      client,
      'select * from erp.v_hr_dashboard where org_id = erp.current_org_id()',
    )

    const [headcount, attendanceToday, activities, upcomingHolidays, pendingApprovals] = await Promise.all([
      many(
        client,
        `select coalesce(d.name, 'Unassigned') as department,
                count(*)::int as headcount,
                count(*) filter (where e.employee_status = 'Active')::int as active,
                count(*) filter (where e.employee_status = 'Probation')::int as probation
           from erp.hr_employees e
           left join erp.departments d on d.id = e.department_id
          where e.org_id = erp.current_org_id() and e.deleted_at is null
          group by d.name
          order by headcount desc`,
      ),
      many(
        client,
        `select status, count(*)::int as count
           from erp.hr_attendance
          where org_id = erp.current_org_id() and attendance_date = current_date
          group by status`,
      ),
      many(
        client,
        `select * from erp.hr_activities
          where org_id = erp.current_org_id()
          order by created_at desc limit 12`,
      ),
      many(
        client,
        `select * from erp.hr_holidays
          where org_id = erp.current_org_id() and holiday_date >= current_date
          order by holiday_date limit 5`,
      ),
      many(
        client,
        `select entity_type, count(*)::int as count
           from erp.approval_requests
          where org_id = erp.current_org_id() and status = 'Pending'
            and entity_type like 'hr_%'
          group by entity_type`,
      ),
    ])

    return {
      summary: summary
        ? {
            totalEmployees: num(summary.total_employees),
            activeEmployees: num(summary.active_employees),
            probationEmployees: num(summary.probation_employees),
            onLeaveEmployees: num(summary.on_leave_employees),
            pendingLeaves: num(summary.pending_leaves),
            pendingPayments: num(summary.pending_payments),
            pendingExpenses: num(summary.pending_expenses),
            openRequests: num(summary.open_requests),
            presentToday: num(summary.present_today),
            payrollThisMonth: num(summary.payroll_this_month),
            activeContracts: num(summary.active_contracts),
          }
        : null,
      headcountByDepartment: headcount,
      attendanceToday,
      recentActivities: activities.map(mapActivity),
      upcomingHolidays: upcomingHolidays.map((row) => ({
        id: row.id,
        name: row.name,
        date: row.holiday_date,
        type: row.holiday_type,
      })),
      pendingApprovalsByType: pendingApprovals,
    }
  }, { readOnly: true })

  sendData(res, payload)
})

dashboardRouter.get('/analytics', requirePermission('hr.analytics.read'), async (req, res) => {
  const auth = req.auth!

  const payload = await withRls(auth, async (client) => {
    const [headcount, attendance, leave, payroll, tenure, monthlyJoiners] = await Promise.all([
      many(
        client,
        `select department, employee_status, employment_type, headcount
           from erp.v_hr_headcount where org_id = erp.current_org_id()
          order by department`,
      ),
      many(
        client,
        `select * from erp.v_hr_attendance_summary
          where org_id = erp.current_org_id()
          order by period desc limit 500`,
      ),
      many(
        client,
        `select * from erp.v_hr_leave_summary
          where org_id = erp.current_org_id()
          order by year desc, leave_type`,
      ),
      many(
        client,
        `select * from erp.v_hr_payroll_summary
          where org_id = erp.current_org_id()
          order by period desc`,
      ),
      many(
        client,
        `select case
                  when extract(year from age(current_date, joining_date)) < 1 then '<1 yr'
                  when extract(year from age(current_date, joining_date)) < 3 then '1-3 yrs'
                  when extract(year from age(current_date, joining_date)) < 5 then '3-5 yrs'
                  else '5+ yrs'
                end as bucket,
                count(*)::int as count
           from erp.hr_employees
          where org_id = erp.current_org_id() and deleted_at is null
          group by bucket`,
      ),
      many(
        client,
        `select to_char(joining_date, 'YYYY-MM') as month, count(*)::int as joiners
           from erp.hr_employees
          where org_id = erp.current_org_id() and deleted_at is null
            and joining_date >= (date_trunc('month', current_date) - interval '11 months')::date
          group by month order by month`,
      ),
    ])

    return {
      headcount,
      attendanceSummary: attendance,
      leaveSummary: leave,
      payrollSummary: payroll,
      tenureDistribution: tenure,
      monthlyJoiners,
    }
  }, { readOnly: true })

  sendData(res, payload)
})

dashboardRouter.get('/analytics/attendance', requirePermission('hr.analytics.read'), async (req, res) => {
  const auth = req.auth!
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select * from erp.v_hr_attendance_summary
          where org_id = erp.current_org_id() order by period desc limit 1000`,
      ),
    { readOnly: true },
  )
  sendData(res, rows)
})

dashboardRouter.get('/analytics/payroll', requirePermission('hr.analytics.read'), async (req, res) => {
  const auth = req.auth!
  const rows = await withRls(
    auth,
    (client) =>
      many(
        client,
        `select * from erp.v_hr_payroll_summary
          where org_id = erp.current_org_id() order by period desc limit 60`,
      ),
    { readOnly: true },
  )
  sendData(res, rows)
})
