import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { sendData } from '../http.js'

export const meRouter = Router()

meRouter.use(authenticate)

/**
 * GET /api/me
 * The single source of truth for the signed-in caller. The frontend uses this
 * to scope navigation and hide actions; it is never trusted for authorization
 * (the API re-checks every permission).
 */
meRouter.get('/', (req, res) => {
  const auth = req.auth!
  sendData(res, {
    user: {
      id: auth.userId,
      authUserId: auth.authUserId,
      name: auth.name,
      email: auth.email,
      employeeCode: auth.employeeCode,
      role: auth.role,
      roleName: auth.roleName,
      roleTier: auth.roleTier,
      isAdmin: auth.isAdmin,
      hrEmployeeId: auth.hrEmployeeId,
      permissions: [...auth.permissions].sort(),
    },
    organization: auth.org,
  })
})
