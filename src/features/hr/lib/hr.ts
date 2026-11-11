import type { Contract, PaymentScheduleItem } from '../types'
import { addDays, diffDays, todayISO, uid } from './utils'

export function effectiveContractStatus(c: Contract): Contract['status'] {
  if (['Draft', 'Pending Review', 'Pending Signature', 'Terminated', 'Renewed'].includes(c.status)) return c.status
  if (c.endDate < todayISO()) return 'Expired'
  if (diffDays(todayISO(), c.endDate) <= 30) return 'Expiring Soon'
  return 'Active'
}

export function contractDaysRemaining(c: Contract) {
  return diffDays(todayISO(), c.endDate)
}

export function buildPaymentSchedule(value: number, frequency: Contract['paymentFrequency'], startDate: string): PaymentScheduleItem[] {
  const config: Record<Contract['paymentFrequency'], { count: number; gap: number }> = {
    Monthly: { count: 6, gap: 30 },
    Quarterly: { count: 4, gap: 90 },
    Annual: { count: 2, gap: 365 },
    Milestone: { count: 3, gap: 45 },
    'One-time': { count: 1, gap: 0 },
  }
  const { count, gap } = config[frequency]
  return Array.from({ length: count }).map((_, i) => {
    const dueDate = addDays(startDate, i * gap)
    return {
      id: uid('ps'),
      dueDate,
      amount: Math.round(value / count),
      status: dueDate < todayISO() ? 'Paid' : 'Scheduled',
    }
  })
}
