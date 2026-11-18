import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many } from '../db/transaction.js'
import { AppError } from '../errors.js'
import { sendData, validateBody, validatedBody } from '../http.js'
import { authenticate } from '../middleware/auth.js'
import { uuidSchema, optionalText } from '../lib/validation.js'

export const notificationsRouter = Router()

notificationsRouter.use(authenticate)

notificationsRouter.get('/', async (req, res) => {
  const auth = req.auth!

  const notifications = await withRls(auth, async (client) => {
    return many(
      client,
      `select * from erp.notifications
       where org_id = $1 and (user_id = $2 or user_id is null or recipient_role = 'all' or recipient_role = $3)
       order by created_at desc limit 50`,
      [auth.orgId, auth.userId, auth.role]
    )
  }, { readOnly: true })

  sendData(res, notifications)
})

const createNotificationSchema = z.object({
  userId: z.string().uuid().optional(),
  recipientRole: optionalText(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'warning', 'success', 'alert', 'error']).default('info'),
  actionUrl: optionalText(),
  metadata: z.record(z.any()).optional(),
})

notificationsRouter.post('/', validateBody(createNotificationSchema), async (req, res) => {
  const auth = req.auth!
  const body = validatedBody<z.infer<typeof createNotificationSchema>>(req)

  const created = await withRls(auth, async (client) => {
    const notif = await one<{ id: string }>(
      client,
      `insert into erp.notifications (
        org_id, user_id, recipient_role, title, message, type, action_url, metadata
      ) values ($1, $2, $3, $4, $5, $6, $7, coalesce($8, '{}'::jsonb))
      returning *`,
      [
        auth.orgId,
        body.userId || null,
        body.recipientRole || null,
        body.title,
        body.message,
        body.type,
        body.actionUrl || null,
        body.metadata ? JSON.stringify(body.metadata) : null,
      ]
    )
    if (!notif) throw new AppError(500, 'internal_error', 'Failed to create notification')
    return notif
  })

  sendData(res, created, 201)
})

notificationsRouter.patch('/:id/read', async (req, res) => {
  const auth = req.auth!
  const id = uuidSchema.parse(req.params.id)

  const updated = await withRls(auth, async (client) => {
    const notif = await one<{ id: string; is_read: boolean }>(
      client,
      `update erp.notifications
       set is_read = true, read_at = now()
       where id = $1 and org_id = $2
       returning *`,
      [id, auth.orgId]
    )
    if (!notif) throw new AppError(404, 'not_found', 'Notification not found')
    return notif
  })

  sendData(res, updated)
})

notificationsRouter.patch('/read-all', async (req, res) => {
  const auth = req.auth!

  await withRls(auth, async (client) => {
    await client.query(
      `update erp.notifications
       set is_read = true, read_at = now()
       where org_id = $1 and (user_id = $2 or user_id is null) and is_read = false`,
      [auth.orgId, auth.userId]
    )
  })

  sendData(res, { ok: true })
})
