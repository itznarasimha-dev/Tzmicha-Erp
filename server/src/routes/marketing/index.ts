import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { campaignsRouter } from './campaigns.js'
import { fieldRouter } from './field.js'
import { leadsRouter } from './leads.js'
import { performanceRouter } from './performance.js'
import { plansRouter } from './plans.js'

/**
 * Marketing API. Every route requires a verified Supabase access token; the
 * caller's organization, role and permissions are read from the database on
 * each request (see `middleware/auth.ts`).
 */
export const marketingRouter = Router()

marketingRouter.use(authenticate)

marketingRouter.use(leadsRouter)
marketingRouter.use(campaignsRouter)
marketingRouter.use(plansRouter)
marketingRouter.use(performanceRouter)
marketingRouter.use(fieldRouter)
