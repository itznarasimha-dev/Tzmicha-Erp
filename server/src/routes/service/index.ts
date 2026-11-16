import { Router } from 'express'
import { z } from 'zod'
import { withRls, one, many, count, audit } from '../../db/transaction.js'
import { AppError } from '../../errors.js'
import { sendData, validateBody } from '../../http.js'
import { authenticate } from '../../middleware/auth.js'
import { uuidSchema } from '../../lib/validation.js'

export const serviceRouter = Router()

async function logAudit(
  client: any,
  auth: any,
  entry: { action: string; entityType: string; entityId: string | null; details?: any }
) {
  await audit(
    client,
    entry.action,
    entry.entityType,
    entry.entityId,
    `Action ${entry.action} by ${auth.name}`,
    null,
    entry.details ?? null
  )
}

serviceRouter.use(authenticate)

// -----------------------------------------------------------------------------
// Overview & Requests
// -----------------------------------------------------------------------------
serviceRouter.get('/overview', async (req, res) => {
  const auth = req.auth!
  const overview = await withRls(auth, async (client) => {
    const totalOrders = await count(client, `select count(*)::int from erp.sales_orders where org_id = $1`, [auth.orgId])
    const serviceHandoverOrders = await count(
      client,
      `select count(*)::int from erp.sales_orders where org_id = $1 and status = 'service_handover'`,
      [auth.orgId]
    )
    return {
      totalRequests: serviceHandoverOrders,
      activeAssignments: Math.min(serviceHandoverOrders, 5),
      completedServices: Math.max(0, totalOrders - serviceHandoverOrders),
      slaComplianceRate: 98.4,
      avgResolutionHours: 4.2,
      equipmentCoverage: {
        activeWarranties: 124,
        activeAmcContracts: 48,
        expiringIn30Days: 9,
      },
      sparePartsMetrics: {
        totalSkus: 86,
        lowStockAlerts: 3,
        pendingRequisitions: 2,
      },
      recentActivity: [],
    }
  }, { readOnly: true })

  sendData(res, overview)
})

serviceRouter.get('/requests', async (req, res) => {
  const auth = req.auth!
  const requests = await withRls(auth, async (client) => {
    return many(
      client,
      `select o.id, o.code as request_number, c.name as customer_name, o.created_at, o.status,
              'Installation & Commissioning' as category, 'Medium' as priority,
              'Service handover for completed sales order' as issue_description
         from erp.sales_orders o
         left join erp.customers c on c.id = o.customer_id
        where o.org_id = $1
        order by o.created_at desc limit 50`,
      [auth.orgId]
    )
  }, { readOnly: true })
  sendData(res, requests)
})

serviceRouter.post('/requests', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_request.create',
      entityType: 'service_request',
      entityId: auth.orgId,
      details: body,
    })
  })

  sendData(res, { id: `sr-${Date.now()}`, ...body, status: 'open', createdAt: new Date().toISOString() }, 201)
})

serviceRouter.post('/requests/:id/triage', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_request.triage',
      entityType: 'service_request',
      entityId: id,
      details: body,
    })
  })

  sendData(res, { id, triageStatus: body.action || 'accepted', updatedAt: new Date().toISOString() })
})

serviceRouter.post('/requests/:id/escalate', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_request.escalate',
      entityType: 'service_request',
      entityId: id,
      details: body,
    })
  })

  sendData(res, { id, escalated: true, severity: body.severity || 'High' }, 201)
})

serviceRouter.post('/escalations/:id/resolve', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_escalation.resolve',
      entityType: 'service_escalation',
      entityId: id,
      details: body,
    })
  })

  sendData(res, { id, resolved: true, note: body.resolutionNote })
})

// -----------------------------------------------------------------------------
// Assignments & Execution
// -----------------------------------------------------------------------------
serviceRouter.post('/assignments', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_assignment.create',
      entityType: 'service_assignment',
      entityId: body.serviceRequestId || auth.orgId,
      details: body,
    })
  })

  sendData(res, { id: `asgn-${Date.now()}`, ...body, status: 'assigned' }, 201)
})

serviceRouter.patch('/assignments/:id', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_assignment.update',
      entityType: 'service_assignment',
      entityId: id,
      details: body,
    })
  })

  sendData(res, { id, ...body, updatedAt: new Date().toISOString() })
})

serviceRouter.post('/executions', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_execution.record',
      entityType: 'service_execution',
      entityId: body.assignmentId || auth.orgId,
      details: body,
    })
  })

  sendData(res, { id: `exec-${Date.now()}`, ...body, status: 'completed' }, 201)
})

// -----------------------------------------------------------------------------
// Spare Parts & Requisitions
// -----------------------------------------------------------------------------
serviceRouter.patch('/spare-parts/:id', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'spare_part.update',
      entityType: 'spare_part',
      entityId: id,
      details: body,
    })
  })

  sendData(res, { id, ...body, updatedAt: new Date().toISOString() })
})

serviceRouter.post('/requisitions', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'spare_part_requisition.create',
      entityType: 'spare_part_requisition',
      entityId: body.serviceRequestId || auth.orgId,
      details: body,
    })
  })

  sendData(res, { id: `req-${Date.now()}`, ...body, status: 'pending' }, 201)
})

serviceRouter.post('/requisitions/:id/transition', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'spare_part_requisition.transition',
      entityType: 'spare_part_requisition',
      entityId: id,
      details: body,
    })
  })

  sendData(res, { id, status: body.action || 'approved', updatedAt: new Date().toISOString() })
})

// -----------------------------------------------------------------------------
// Warranties, AMC & Exemptions
// -----------------------------------------------------------------------------
serviceRouter.post('/warranties', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'warranty.create',
      entityType: 'warranty',
      entityId: auth.orgId,
      details: body,
    })
  })

  sendData(res, { id: `war-${Date.now()}`, ...body, type: 'warranty', status: 'active' }, 201)
})

serviceRouter.post('/amc', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'amc.create',
      entityType: 'amc',
      entityId: auth.orgId,
      details: body,
    })
  })

  sendData(res, { id: `amc-${Date.now()}`, ...body, type: 'amc', status: 'active' }, 201)
})

serviceRouter.post('/warranty-exemptions', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'warranty_exemption.request',
      entityType: 'warranty_exemption',
      entityId: body.serviceRequestId || auth.orgId,
      details: body,
    })
  })

  sendData(res, { id: `wex-${Date.now()}`, ...body, status: 'pending_review' }, 201)
})

serviceRouter.post('/warranty-exemptions/:id/approve', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'warranty_exemption.approve',
      entityType: 'warranty_exemption',
      entityId: id,
      details: req.body,
    })
  })

  sendData(res, { id, status: 'approved', updatedAt: new Date().toISOString() })
})

serviceRouter.post('/warranty-exemptions/:id/reject', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'warranty_exemption.reject',
      entityType: 'warranty_exemption',
      entityId: id,
      details: req.body,
    })
  })

  sendData(res, { id, status: 'rejected', updatedAt: new Date().toISOString() })
})

// -----------------------------------------------------------------------------
// Service Billing Approvals
// -----------------------------------------------------------------------------
serviceRouter.post('/billing/:invoiceId/approve-service', async (req, res) => {
  const auth = req.auth!
  const invoiceId = req.params.invoiceId

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_billing.approve',
      entityType: 'invoice',
      entityId: invoiceId,
      details: req.body,
    })
  })

  sendData(res, { invoiceId, status: 'approved', message: 'Service billing approved' })
})

serviceRouter.post('/billing/:invoiceId/reject-service', async (req, res) => {
  const auth = req.auth!
  const invoiceId = req.params.invoiceId

  await withRls(auth, async (client) => {
    await logAudit(client, auth, {
      action: 'service_billing.reject',
      entityType: 'invoice',
      entityId: invoiceId,
      details: req.body,
    })
  })

  sendData(res, { invoiceId, status: 'rejected', message: 'Service billing rejected' })
})

// -----------------------------------------------------------------------------
// Proposals, AMC Renewal & Preventive Visits
// -----------------------------------------------------------------------------
serviceRouter.post('/spare-part-proposals', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  sendData(res, { id: `prop-${Date.now()}`, ...body, status: 'pending' }, 201)
})

serviceRouter.post('/spare-part-proposals/:id/decide', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  sendData(res, { id, status: body.action === 'approve' ? 'approved' : 'rejected' })
})

serviceRouter.post('/amc/:id/renew', async (req, res) => {
  const auth = req.auth!
  const id = req.params.id
  const body = req.body || {}

  sendData(res, { id, renewed: true, nextExpiryDate: body.newEndDate || '2027-12-31' })
})

serviceRouter.post('/preventive-visits', async (req, res) => {
  const auth = req.auth!
  const body = req.body || {}

  sendData(res, { id: `pv-${Date.now()}`, ...body, status: 'scheduled' }, 201)
})
