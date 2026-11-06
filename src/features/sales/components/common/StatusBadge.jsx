/**
 * StatusBadge Component
 * Semantic badge styling for all ERP states
 */
export default function StatusBadge({ status, size = 'normal' }) {
  if (!status) return null;

  // Determine badge color class based on status string
  const getBadgeClass = (val) => {
    const s = String(val).toLowerCase();

    // Success / Completed / Paid / In Stock / Delivered / Active / Approved / Won / Download Approved / Present / On Track
    if (
      s === 'active' ||
      s === 'paid' ||
      s === 'in stock' ||
      s === 'delivered' ||
      s === 'accepted' ||
      s === 'approved' ||
      s === 'download approved' ||
      s === 'reimbursed' ||
      s === 'completed' ||
      s === 'resolved' ||
      s === 'released' ||
      s === 'won' ||
      s === 'present' ||
      s === 'on track'
    ) {
      return 'badge-success';
    }

    // Danger / Overdue / Rejected / Shortage / Critical / High / Very High / Lost / Escalated / Download Rejected / Absent / Blocked / Needs Attention
    if (
      s === 'overdue' ||
      s === 'rejected' ||
      s === 'download rejected' ||
      s === 'shortage' ||
      s === 'critical shortage' ||
      s === 'cancelled' ||
      s === 'expired' ||
      s === 'high' ||
      s === 'very high' ||
      s === 'lost' ||
      s === 'escalated' ||
      s === 'absent' ||
      s === 'blocked' ||
      s === 'needs attention'
    ) {
      return 'badge-danger';
    }

    // Warning / Awaiting / Low Stock / Checking / On Hold / Partially / Medium / Due Today / Follow-up Required / Pending Approval / Late / Half-day / At Risk
    if (
      s === 'awaiting stock' ||
      s === 'checking stock' ||
      s === 'awaiting approval' ||
      s === 'pending approval' ||
      s === 'download pending admin approval' ||
      s === 'download requested' ||
      s === 'low stock' ||
      s === 'on hold' ||
      s === 'partially paid' ||
      s === 'partially dispatched' ||
      s === 'under review' ||
      s === 'medium' ||
      s === 'pending' ||
      s === 'due today' ||
      s === 'follow-up required' ||
      s === 'late' ||
      s === 'half-day' ||
      s === 'at risk'
    ) {
      return 'badge-warning';
    }

    // Primary / In Progress / Sent / Ready / In Transit / Issued / Manufactured / Scheduled
    if (
      s === 'ready for dispatch' ||
      s === 'in transit' ||
      s === 'issued' ||
      s === 'sent' ||
      s === 'picked & packed' ||
      s === 'manufactured' ||
      s === 'converted' ||
      s === 'scheduled' ||
      s === 'in progress'
    ) {
      return 'badge-primary';
    }

    // Info / Resale / Low / Waiting for Customer / Approved Leave
    if (
      s === 'bought for resale' ||
      s === 'both' ||
      s === 'confirmed' ||
      s === 'received' ||
      s === 'low' ||
      s === 'waiting for customer' ||
      s === 'approved leave' ||
      s === 'leave'
    ) {
      return 'badge-info';
    }

    // Neutral / Draft / Submitted / Closed / Not Started
    if (s === 'draft' || s === 'submitted' || s === 'closed' || s === 'not started') {
      return 'badge-neutral';
    }

    return 'badge-default';
  };

  const badgeClass = getBadgeClass(status);
  const sizeClass = size === 'small' ? 'badge-sm' : '';

  return (
    <span className={`status-badge ${badgeClass} ${sizeClass}`}>
      <span className="badge-dot" aria-hidden="true"></span>
      {status}
    </span>
  );
}
