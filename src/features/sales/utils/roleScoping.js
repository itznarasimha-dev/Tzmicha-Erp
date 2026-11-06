/**
 * Role-based visibility and scope utilities for ApexERP Sales Hierarchy
 * 
 * Hierarchy:
 * Level 1: Sales Manager (Company-wide)
 * Level 2: Sales Coordinator (Hyderabad & Deccan regional scope, supervised team)
 * Level 3: Sales Representative (Assigned customer accounts)
 * Level 4: Junior Sales Employee (Assigned / associated customer accounts)
 */

export function isCustomerInRoleScope(customer, userRole, userProfile) {
  if (!userRole || userRole === 'sales_manager' || userRole === 'admin' || userRole === 'finance') {
    return true; // Company-wide scope
  }

  if (!customer) {
    // If no customer record can be resolved, coordinators and managers see it by default
    return userRole === 'sales_coordinator';
  }

  if (userRole === 'sales_coordinator') {
    const isHydRegion =
      customer.regionId === 'REG-HYD' ||
      customer.state === 'Telangana' ||
      (customer.city && customer.city.toLowerCase().includes('hyderabad')) ||
      (customer.territoryId && customer.territoryId.startsWith('TERR-HYD'));

    const supervisedTeam = ['Vikram Mehta', 'Aditya Joshi', 'Rahul Verma', 'Sneha Patil', 'Rohan Sharma'];
    const isSupervisedRep = customer.assignedTo && supervisedTeam.includes(customer.assignedTo);
    const isUnassigned = !customer.assignedTo;

    return Boolean(isHydRegion || isSupervisedRep || isUnassigned);
  }

  if (userRole === 'sales_rep') {
    return Boolean(
      (userProfile && customer.assignedTo === userProfile.fullName) ||
      (userProfile && customer.assignedEmployeeId === userProfile.employeeId) ||
      !customer.assignedTo
    );
  }

  if (userRole === 'junior_sales') {
    return Boolean(
      (userProfile && customer.assignedTo === userProfile.fullName) ||
      (userProfile && customer.assignedEmployeeId === userProfile.employeeId)
    );
  }

  return true;
}

export function isRecordInRoleScope(record, customer, userRole, userProfile) {
  if (!userRole || userRole === 'sales_manager' || userRole === 'admin' || userRole === 'finance') {
    return true;
  }
  return isCustomerInRoleScope(customer, userRole, userProfile);
}

/**
 * Check if an employee or budget record is within authorized role scope:
 * - Sales Manager / Admin / Finance: Company-wide (all employees)
 * - Sales Coordinator: Regional team scope (Hyderabad/Southern team)
 * - Sales Representative / Junior Sales: Own records only
 */
export function isEmployeeInRoleScope(emp, userRole, userProfile) {
  if (!userRole || userRole === 'sales_manager' || userRole === 'admin' || userRole === 'finance') {
    return true; // Full organizational scope
  }

  const empId = typeof emp === 'string' ? emp : emp?.employeeId;
  const empName = typeof emp === 'string' ? emp : emp?.employeeName || emp?.fullName;

  if (userRole === 'sales_coordinator') {
    const regionalTeamIds = ['APX-EMP-3044', 'APX-EMP-4091', 'APX-EMP-4092', 'APX-EMP-4093', 'APX-EMP-5011', 'APX-EMP-5012'];
    const regionalTeamNames = ['Sneha Patil', 'Vikram Mehta', 'Rohan Sharma', 'Priya Nair', 'Aditya Joshi', 'Neha Kulkarni'];
    return Boolean(
      regionalTeamIds.includes(empId) ||
      regionalTeamNames.includes(empName) ||
      (emp?.assignedArea && emp.assignedArea.toLowerCase().includes('hyderabad')) ||
      (emp?.assignedArea && emp.assignedArea.toLowerCase().includes('territory'))
    );
  }

  if (userRole === 'sales_rep' || userRole === 'junior_sales') {
    const myId = userProfile?.employeeId || 'APX-EMP-4091';
    const myName = userProfile?.fullName || 'Vikram Mehta';
    return Boolean((empId && empId === myId) || (empName && empName === myName));
  }

  return true;
}

/**
 * Determine payment follow-up priority based on configurable business rules:
 * - Paid: 100% verified payment received -> Removed from active collection follow-up
 * - High Priority: Significantly overdue (>14 days), or overdue with substantial balance (>₹50,000), or missed commitments
 * - Medium Priority: Partially paid with meaningful balance, or approaching due date (within 7 days)
 * - Low Priority: Payment not yet due, on schedule, no immediate collection concern
 */
export function getInvoiceFollowUpPriority(invoice) {
  if (!invoice) {
    return { priority: 'None', label: 'Paid / Settled', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' };
  }

  const total = Number(invoice.totalAmount || 0);
  const paid = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance !== undefined ? invoice.balance : Math.max(0, total - paid));
  const isPaid = balance <= 0 || invoice.status === 'Paid';

  if (isPaid) {
    return { priority: 'None', label: 'Paid (Settled)', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let diffDays = 30;
  let isOverdue = invoice.status === 'Overdue';

  if (invoice.dueDate) {
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      isOverdue = true;
    }
  }

  const overdueDays = diffDays < 0 ? Math.abs(diffDays) : 0;
  const percentPaid = total > 0 ? (paid / total) * 100 : 0;

  // High Priority:
  // - Significantly overdue (>14 days)
  // - Overdue with substantial balance (>₹50,000)
  // - Repeated missed commitments / alerts
  if (isOverdue && (overdueDays > 14 || balance >= 50000 || invoice.missedCommitments > 0)) {
    return {
      priority: 'High',
      label: `High Priority (${overdueDays > 0 ? `${overdueDays}d Overdue` : 'Overdue'})`,
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#fca5a5',
      overdueDays,
    };
  }

  if (isOverdue) {
    return {
      priority: 'High',
      label: 'High Priority (Overdue)',
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#fca5a5',
      overdueDays,
    };
  }

  // Medium Priority:
  // - Approaching due date within 7 days
  // - Partial payment received but substantial balance remains
  if (diffDays <= 7 || (paid > 0 && balance > 0)) {
    return {
      priority: 'Medium',
      label: diffDays <= 7 ? `Medium Priority (Due in ${Math.max(1, diffDays)}d)` : 'Medium Priority (Partial Balance)',
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fde68a',
      daysUntilDue: diffDays,
    };
  }

  // Low Priority:
  // - Payment not yet due (>7 days), on schedule
  return {
    priority: 'Low',
    label: 'Low Priority (On Schedule)',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    daysUntilDue: diffDays,
  };
}

/**
 * Calculate accurate verified Percentage Paid
 * Formula: (Total Verified Amount Received / Invoice Grand Total) * 100
 */
export function calculatePercentagePaid(paidAmount, totalAmount) {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((paid / total) * 100));
}

/**
 * Determine Sales Order final closure and milestone state:
 * - "Payment Completed – Order Closed": Full verified payment + Store Delivered + Service completed (where required)
 * - "Payment Completed – Delivery/Service Pending": Paid in full, awaiting operational completion
 * - "Delivered – Awaiting Payment": Store delivery confirmed, awaiting customer settlement
 * - "Service Completed – Payment Pending": Service finished, awaiting remaining balance
 * - "In Progress": Operational fulfillment underway
 */
export function getOrderClosureMilestone(order, linkedInvoice) {
  if (!order) return { status: 'Unknown', label: '—', isClosed: false };

  const totalAmount = Number(order.totalAmount || linkedInvoice?.totalAmount || 0);
  const amountPaid = Number(order.amountPaid ?? linkedInvoice?.paidAmount ?? 0);
  const isFullyPaid = totalAmount > 0 && amountPaid >= totalAmount;

  const isDelivered = order.fulfilmentStatus === 'Delivered';
  const hasService = Boolean(order.serviceHandoff);
  const isServiceCompleted = hasService ? order.serviceHandoff?.serviceCompletionStatus === 'Completed' : true;
  const hasCompletedService = hasService && order.serviceHandoff?.serviceCompletionStatus === 'Completed';

  if (isFullyPaid && isDelivered && isServiceCompleted) {
    return {
      status: 'Closed',
      label: 'Payment Completed – Order Closed',
      color: '#15803d',
      bg: '#dcfce7',
      border: '#bbf7d0',
      isClosed: true,
      description: 'Full payment verified by Finance. Delivery and service requirements fulfilled.',
    };
  }

  if (isFullyPaid && (!isDelivered || !isServiceCompleted)) {
    const pendingOp = !isDelivered ? 'Delivery Confirmation Pending' : 'Service Completion Pending';
    return {
      status: 'PaymentVerified_OpsPending',
      label: `Payment Completed – ${pendingOp}`,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      isClosed: false,
      description: `Full payment cleared. Awaiting final ${!isDelivered ? 'Store delivery challan' : 'Service report'} to close order.`,
    };
  }

  if (hasCompletedService && !isFullyPaid) {
    return {
      status: 'ServiceCompleted_AwaitingPayment',
      label: 'Service Completed – Payment Pending',
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fde68a',
      isClosed: false,
      description: 'Service completed. The remaining amount can now be collected.',
    };
  }

  if (isDelivered && !isFullyPaid) {
    return {
      status: 'Delivered_AwaitingPayment',
      label: 'Delivered – Awaiting Payment',
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fde68a',
      isClosed: false,
      description: 'Product dispatched and delivered. Awaiting customer payment to complete and close the order.',
    };
  }

  return {
    status: 'In_Progress',
    label: order.fulfilmentStatus || 'In Progress',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    isClosed: false,
    description: 'Order fulfillment in progress.',
  };
}
