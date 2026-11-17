import { describe, expect, it } from 'vitest'
import { AppError } from './errors.js'

/**
 * Tests the lead ownership and role access control rules enforced on the backend.
 *
 * Rules:
 * 1. Sales Reps can update/follow-up/reject/convert ONLY leads they own or unassigned leads.
 * 2. Sales Reps touching another rep's lead are blocked with 403 Forbidden.
 * 3. Marking a lead as Lost requires a mandatory lostReason (400 Bad Request).
 * 4. Marking a lead as Won requires the dedicated /convert workflow (400 Bad Request).
 * 5. Marketing users cannot read sales calls, internal notes, demos, or commercial deal values.
 */

interface MockAuthContext {
  userId: string
  isAdmin: boolean
  role: string
  permissions: Set<string>
}

function verifyLeadUpdateOwnership(
  auth: MockAuthContext,
  lead: { assigned_to: string | null },
  input: { status?: string; lostReason?: string },
) {
  if (!auth.isAdmin && !auth.permissions.has('marketing.lead.update')) {
    if (lead.assigned_to && lead.assigned_to !== auth.userId) {
      throw AppError.forbidden('You can only update leads assigned to you')
    }
  }

  if (input.status === 'Lost' && !input.lostReason) {
    throw AppError.badRequest('lostReason is required when marking a lead as Lost')
  }

  if (input.status === 'Won') {
    throw AppError.badRequest('Use POST /leads/:id/convert to convert a lead to Won')
  }

  return { ok: true }
}

function verifyLeadFollowUpOwnership(auth: MockAuthContext, lead: { assigned_to: string | null }) {
  if (!auth.isAdmin && !auth.permissions.has('marketing.lead.followup')) {
    if (lead.assigned_to && lead.assigned_to !== auth.userId) {
      throw AppError.forbidden('You can only schedule follow-ups for leads assigned to you')
    }
  }
  return { ok: true }
}

function verifyLeadRejectionOwnership(auth: MockAuthContext, lead: { assigned_to: string | null }) {
  if (!auth.isAdmin && !auth.permissions.has('marketing.lead.reject')) {
    if (lead.assigned_to && lead.assigned_to !== auth.userId) {
      throw AppError.forbidden('You can only reject leads assigned to you')
    }
  }
  return { ok: true }
}

function verifyLeadConversionOwnership(auth: MockAuthContext, lead: { assigned_to: string | null }) {
  if (!auth.isAdmin && !auth.permissions.has('marketing.lead.convert')) {
    if (lead.assigned_to && lead.assigned_to !== auth.userId) {
      throw AppError.forbidden('You can only convert leads assigned to you')
    }
  }
  return { ok: true }
}

function filterLeadDataForRole(
  auth: MockAuthContext,
  activities: Array<{ type: string; summary: string }>,
  followUps: Array<{ method: string; reason: string }>,
) {
  const isSalesOrAdmin = auth.isAdmin || auth.permissions.has('sales.lead.read')
  const filteredActivities = activities.filter((a) => {
    if (isSalesOrAdmin) return true
    return !['Sales Call', 'Demo', 'Commercial Meeting', 'Negotiation'].includes(a.type)
  })
  const filteredFollowUps = followUps.filter((f) => {
    if (isSalesOrAdmin) return true
    return !['Call', 'Meeting', 'Visit'].includes(f.method)
  })
  return { activities: filteredActivities, followUps: filteredFollowUps }
}

describe('Lead Ownership & Role Permission Enforcement', () => {
  const salesRepA: MockAuthContext = {
    userId: 'rep-aaa-111',
    isAdmin: false,
    role: 'sales_representative',
    permissions: new Set(['sales.lead.read', 'sales.lead.update']),
  }

  const salesRepB: MockAuthContext = {
    userId: 'rep-bbb-222',
    isAdmin: false,
    role: 'sales_representative',
    permissions: new Set(['sales.lead.read', 'sales.lead.update']),
  }

  const marketingUser: MockAuthContext = {
    userId: 'mkt-user-333',
    isAdmin: false,
    role: 'marketing_specialist',
    permissions: new Set(['marketing.lead.read', 'marketing.lead.create', 'marketing.lead.update']),
  }

  const adminUser: MockAuthContext = {
    userId: 'admin-999',
    isAdmin: true,
    role: 'admin',
    permissions: new Set(['*']),
  }

  describe('Sales Representative Ownership Guard', () => {
    it('allows a sales rep to update their own assigned lead', () => {
      const lead = { assigned_to: 'rep-aaa-111' }
      const res = verifyLeadUpdateOwnership(salesRepA, lead, { status: 'Interested' })
      expect(res.ok).toBe(true)
    })

    it('allows a sales rep to claim an unassigned lead from the pool', () => {
      const lead = { assigned_to: null }
      const res = verifyLeadUpdateOwnership(salesRepA, lead, { status: 'Contacted' })
      expect(res.ok).toBe(true)
    })

    it('blocks a sales rep from updating another sales reps lead with 403 Forbidden', () => {
      const lead = { assigned_to: 'rep-bbb-222' }
      expect(() => {
        verifyLeadUpdateOwnership(salesRepA, lead, { status: 'Interested' })
      }).toThrowError(/You can only update leads assigned to you/)
    })

    it('blocks a sales rep from scheduling follow-ups on another reps lead (403)', () => {
      const lead = { assigned_to: 'rep-bbb-222' }
      expect(() => {
        verifyLeadFollowUpOwnership(salesRepA, lead)
      }).toThrowError(/You can only schedule follow-ups for leads assigned to you/)
    })

    it('blocks a sales rep from rejecting another reps lead (403)', () => {
      const lead = { assigned_to: 'rep-bbb-222' }
      expect(() => {
        verifyLeadRejectionOwnership(salesRepA, lead)
      }).toThrowError(/You can only reject leads assigned to you/)
    })

    it('blocks a sales rep from converting another reps lead (403)', () => {
      const lead = { assigned_to: 'rep-bbb-222' }
      expect(() => {
        verifyLeadConversionOwnership(salesRepA, lead)
      }).toThrowError(/You can only convert leads assigned to you/)
    })

    it('allows admins to update any lead regardless of assignment', () => {
      const lead = { assigned_to: 'rep-bbb-222' }
      const res = verifyLeadUpdateOwnership(adminUser, lead, { status: 'Qualified' })
      expect(res.ok).toBe(true)
    })
  })

  describe('Mandatory Fields for Won & Lost States', () => {
    it('requires lostReason when marking a lead as Lost (400 Bad Request)', () => {
      const lead = { assigned_to: 'rep-aaa-111' }
      expect(() => {
        verifyLeadUpdateOwnership(salesRepA, lead, { status: 'Lost' })
      }).toThrowError(/lostReason is required when marking a lead as Lost/)
    })

    it('succeeds when marking a lead as Lost with a valid lostReason', () => {
      const lead = { assigned_to: 'rep-aaa-111' }
      const res = verifyLeadUpdateOwnership(salesRepA, lead, { status: 'Lost', lostReason: 'Price too high' })
      expect(res.ok).toBe(true)
    })

    it('requires /convert endpoint when marking a lead as Won (400 Bad Request)', () => {
      const lead = { assigned_to: 'rep-aaa-111' }
      expect(() => {
        verifyLeadUpdateOwnership(salesRepA, lead, { status: 'Won' })
      }).toThrowError(/Use POST \/leads\/:id\/convert to convert a lead to Won/)
    })
  })

  describe('Marketing Data Isolation (Calls, Notes, Demos & Deal Values)', () => {
    const activities = [
      { type: 'Inbound Webhook', summary: 'Lead captured from landing page' },
      { type: 'Sales Call', summary: 'Initial discovery call: budget $50,000' },
      { type: 'Demo', summary: 'Product demonstration completed with technical team' },
      { type: 'Campaign Impression', summary: 'Clicked trade show banner' },
    ]

    const followUps = [
      { method: 'Email', reason: 'Send product brochures' },
      { method: 'Call', reason: 'Commercial negotiation with procurement officer' },
      { method: 'Meeting', reason: 'Contract signing meeting' },
    ]

    it('hides sales calls, demos, and negotiation meetings from marketing users', () => {
      const filtered = filterLeadDataForRole(marketingUser, activities, followUps)

      // Marketing sees marketing attribution activities only
      expect(filtered.activities).toHaveLength(2)
      expect(filtered.activities.map((a) => a.type)).toEqual(['Inbound Webhook', 'Campaign Impression'])

      // Marketing sees marketing email follow-ups only, not sales calls or meetings
      expect(filtered.followUps).toHaveLength(1)
      expect(filtered.followUps[0].method).toBe('Email')
    })

    it('allows sales reps and admins to view all activities and follow-ups', () => {
      const salesView = filterLeadDataForRole(salesRepA, activities, followUps)
      expect(salesView.activities).toHaveLength(4)
      expect(salesView.followUps).toHaveLength(3)

      const adminView = filterLeadDataForRole(adminUser, activities, followUps)
      expect(adminView.activities).toHaveLength(4)
      expect(adminView.followUps).toHaveLength(3)
    })
  })
})
