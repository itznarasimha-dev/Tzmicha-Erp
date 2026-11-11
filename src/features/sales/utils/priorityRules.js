/**
 * ApexERP Automatic Customer & Activity Priority Rules Engine
 * Computes transparent, auditable priority scores based on:
 * - Key-account status (authorized manager configured)
 * - Overdue follow-up commitments & payment past-dues
 * - Active quotation value, stages, and customer urgency
 * - Historical orders, repeat purchases, and business revenue
 */

export const FOLLOWUP_TARGETS = {
  'Very High': { label: 'Within 24 Hours', hours: 24, days: 1 },
  'High': { label: 'Within 24 Hours', hours: 24, days: 1 },
  'Medium': { label: 'Within 36–72 Hours', hours: 48, days: 2 },
  'Low': { label: 'Within 3–4 Days', hours: 72, days: 3 },
};

/**
 * Calculates priority for a follow-up or customer touchpoint
 */
export function calculateActivityPriority(followup, customer = {}, { orders = [], quotations = [], invoices = [] } = {}) {
  // 1. Check if Key Account
  const isKeyAccount = customer?.isKeyAccount || customer?.id === 'CUST-001' || customer?.id === 'CUST-003';

  // 2. Check for overdue invoice/payment commitment
  const today = new Date().toISOString().split('T')[0];
  const scheduledDate = followup.followUpDate || followup.nextFollowUpDate || today;
  const isOverdue = scheduledDate < today && followup.status !== 'Completed' && followup.status !== 'Closed';

  const customerInvoices = invoices.filter((i) => i.customerId === customer?.id || i.customerName === customer?.name);
  const hasOverdueInvoice = customerInvoices.some((i) => i.status === 'Overdue' || (i.dueDate && i.dueDate < today && i.balance > 0));

  // 3. Check for high-value open quotations
  const customerQuotes = quotations.filter((q) => q.customerId === customer?.id || q.customerName === customer?.name);
  const openQuotes = customerQuotes.filter((q) => q.status === 'Approved' || q.status === 'Sent' || q.status === 'Under Review');
  const highValueQuote = openQuotes.find((q) => Number(q.totalAmount || 0) >= 100000);

  // 4. Check customer purchase history
  const totalOrders = customer?.totalOrders || orders.filter((o) => o.customerId === customer?.id).length;
  const isHighValueCustomer = totalOrders >= 5 || (customer?.outstandingBalance || 0) > 100000;

  // Decision logic with transparent reason
  if (isOverdue || hasOverdueInvoice) {
    return {
      priority: 'Very High',
      reason: hasOverdueInvoice
        ? 'Very High Priority — Overdue payment invoice pending resolution'
        : 'Very High Priority — Overdue scheduled commitment requiring immediate response',
      targetSLA: FOLLOWUP_TARGETS['Very High'].label,
      weight: 1,
    };
  }

  if (isKeyAccount && (openQuotes.length > 0 || highValueQuote)) {
    return {
      priority: 'Very High',
      reason: `Very High Priority — Key Strategic Account (${customer?.name || 'Client'}) with active quotation negotiation`,
      targetSLA: FOLLOWUP_TARGETS['Very High'].label,
      weight: 1,
    };
  }

  if (highValueQuote) {
    return {
      priority: 'High',
      reason: `High Priority — High-value quotation ${highValueQuote.quotationNo} (₹${Number(highValueQuote.totalAmount).toLocaleString('en-IN')}) pending customer decision`,
      targetSLA: FOLLOWUP_TARGETS['High'].label,
      weight: 2,
    };
  }

  if (isKeyAccount) {
    return {
      priority: 'High',
      reason: `High Priority — Key Strategic Account (${customer?.name || 'Client'})`,
      targetSLA: FOLLOWUP_TARGETS['High'].label,
      weight: 2,
    };
  }

  if (openQuotes.length > 0) {
    return {
      priority: 'Medium',
      reason: `Medium Priority — Active quotation ${openQuotes[0].quotationNo} in pipeline`,
      targetSLA: FOLLOWUP_TARGETS['Medium'].label,
      weight: 3,
    };
  }

  if (isHighValueCustomer) {
    return {
      priority: 'Medium',
      reason: `Medium Priority — Repeat customer with ${totalOrders} historical orders`,
      targetSLA: FOLLOWUP_TARGETS['Medium'].label,
      weight: 3,
    };
  }

  return {
    priority: followup.priority || 'Low',
    reason: 'Low Priority — Routine customer communication / standard account review',
    targetSLA: FOLLOWUP_TARGETS['Low'].label,
    weight: 4,
  };
}

/**
 * Evaluates priority for a quoted customer based on responsiveness, elapsed time, and order value:
 * - Newly quoted (<24-48 hours): High Priority
 * - No response in 24-48 hours: Moves to Medium Priority
 * - No response after agreed follow-up period (>72-96 hours): Moves to Low Priority
 * - Prompt customer response: Preserves/Elevates priority based on purchase intent, order value, urgency, and next steps
 * - Not interested: Normal list / Low priority
 */
export function calculateQuotedCustomerPriority(customer = {}, latestQuote = null, latestFollowup = null) {
  if (latestFollowup?.outcome === 'Not Interested') {
    return {
      priority: 'Low',
      reason: 'Standard List — Customer expressed not interested. Returned to normal account list.',
      weight: 4,
    };
  }

  if (latestQuote) {
    const today = new Date();
    const quoteDate = new Date(latestQuote.createdDate || latestQuote.approvedAt || today);
    const diffHours = (today.getTime() - quoteDate.getTime()) / (1000 * 60 * 60);
    const hasPromptResponse = Boolean(latestFollowup?.customerResponseReceived);
    const isHighValue = Number(latestQuote.grandTotal || latestQuote.totalAmount || 0) >= 100000;
    const highIntent = latestFollowup?.purchaseIntent === 'High' || latestFollowup?.outcome === 'Commercial Discussion';

    // If customer responded promptly, consider purchase intent, order value, urgency
    if (hasPromptResponse || highIntent) {
      if (isHighValue || highIntent) {
        return {
          priority: 'High',
          reason: `High Priority — Prompt customer response with active purchase intent for quote ${latestQuote.quotationNo}`,
          targetSLA: 'Within 24 Hours',
          weight: 2,
        };
      }
      return {
        priority: 'Medium',
        reason: 'Medium Priority — Active customer response received; progressing commercial terms',
        targetSLA: 'Within 36–72 Hours',
        weight: 3,
      };
    }

    // No response elapsed time evaluation:
    if (diffHours <= 48) {
      return {
        priority: 'High',
        reason: `High Priority — Newly quoted customer (${latestQuote.quotationNo}). Awaiting initial feedback within 24-48h window.`,
        targetSLA: 'Within 24 Hours',
        weight: 2,
      };
    } else if (diffHours <= 96) {
      return {
        priority: 'Medium',
        reason: `Medium Priority — No response within 24-48h for quote ${latestQuote.quotationNo}. Follow-up check-in required.`,
        targetSLA: 'Within 36–72 Hours',
        weight: 3,
      };
    } else {
      return {
        priority: 'Low',
        reason: `Low Priority — No response past agreed follow-up period for quote ${latestQuote.quotationNo}.`,
        targetSLA: 'Within 3–4 Days',
        weight: 4,
      };
    }
  }

  return {
    priority: 'Medium',
    reason: 'Standard customer priority',
    weight: 3,
  };
}

/**
 * Recommends the next follow-up date and time based on outcome and priority
 */
export function recommendNextFollowup(outcome, priority = 'Medium', baseDate = new Date(), requestedDate = null) {
  if (outcome === 'Won' || outcome === 'Lost' || outcome === 'Not Interested') {
    return null; // No follow-up needed for won/lost deals or disinterested accounts
  }

  if (outcome === 'Requested Later Contact' && requestedDate) {
    return {
      date: requestedDate,
      time: priority === 'Very High' || priority === 'High' ? '10:30 AM' : '02:30 PM',
      reason: `Scheduled on customer's requested date (${requestedDate})`,
    };
  }

  const target = FOLLOWUP_TARGETS[priority] || FOLLOWUP_TARGETS['Medium'];
  const nextDate = new Date(baseDate);

  if (outcome === 'Escalated') {
    // Escalations require faster turnaround (24h)
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (outcome === 'Waiting for Customer') {
    // Waiting for customer: give 2 to 3 business days
    nextDate.setDate(nextDate.getDate() + Math.max(2, target.days));
  } else {
    // Follow-up Required
    nextDate.setDate(nextDate.getDate() + target.days);
  }

  // Skip Sundays
  if (nextDate.getDay() === 0) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  const dateStr = nextDate.toISOString().split('T')[0];
  const timeStr = priority === 'Very High' || priority === 'High' ? '10:30 AM' : '02:30 PM';

  return {
    date: dateStr,
    time: timeStr,
    reason: `Automatically recommended based on "${outcome}" outcome with ${priority} Priority SLA target (${target.label})`,
  };
}

/**
 * Calculates Schedule Status automatically
 * States: Scheduled, Due Today, Overdue, Completed, Waiting for Customer, Closed
 */
export function computeScheduleStatus(followup) {
  if (followup.status === 'Completed' || followup.completedDate) {
    if (followup.outcome === 'Won' || followup.outcome === 'Lost') {
      return 'Closed';
    }
    return 'Completed';
  }

  if (followup.outcome === 'Waiting for Customer') {
    return 'Waiting for Customer';
  }

  const today = new Date().toISOString().split('T')[0];
  const scheduledDate = followup.followUpDate || followup.nextFollowUpDate || today;

  if (scheduledDate < today) {
    return 'Overdue';
  }
  if (scheduledDate === today) {
    return 'Due Today';
  }
  return 'Scheduled';
}
