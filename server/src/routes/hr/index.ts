import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { attendanceRouter } from './attendance.js'
import { contractsRouter } from './contracts.js'
import { dashboardRouter } from './dashboard.js'
import { directoryRouter } from './directory.js'
import { hrExpensesRouter } from './expenses.js'
import { leaveRouter } from './leave.js'
import { payrollRouter } from './payroll.js'
import { talentRouter } from './talent.js'

/**
 * HR API. Mounted under `${API_PREFIX}/hr`; every route requires a verified
 * Supabase access token and re-checks permissions server-side.
 */
export const hrRouter = Router()

hrRouter.use(authenticate)

hrRouter.use(directoryRouter)
hrRouter.use(attendanceRouter)
hrRouter.use(leaveRouter)
hrRouter.use(payrollRouter)
hrRouter.use(contractsRouter)
hrRouter.use(hrExpensesRouter)
hrRouter.use(talentRouter)
hrRouter.use(dashboardRouter)
