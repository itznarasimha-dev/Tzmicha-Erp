import React from 'react';

/**
 * StatusBadge Component
 * Semantic badge styling for all Service & ERP states (matching Sales design)
 */
export default function StatusBadge({ status, size = 'normal' }) {
  if (!status) return null;

  const getBadgeClass = (val) => {
    const s = String(val).toLowerCase().trim();

    // Success / Completed / Paid / In Stock / Delivered / Active / Approved / Resolved
    if (
      s === 'active' ||
      s === 'paid' ||
      s === 'in stock' ||
      s === 'delivered' ||
      s === 'accepted' ||
      s === 'approved' ||
      s === 'completed' ||
      s === 'resolved' ||
      s === 'work completed' ||
      s === 'verified'
    ) {
      return 'badge-success';
    }

    // Priority: Very High (Replaces critical across application)
    if (s === 'very high' || s === 'very-high') {
      return 'badge-danger badge-priority-very-high';
    }

    // Priority: High
    if (s === 'high') {
      return 'badge-warning badge-priority-high';
    }

    // Priority: Medium
    if (s === 'medium') {
      return 'badge-info badge-priority-medium';
    }

    // Priority: Low
    if (s === 'low') {
      return 'badge-neutral badge-priority-low';
    }

    // Danger / Overdue / Rejected / Expired / Out of Stock / Cancelled
    if (
      s === 'overdue' ||
      s === 'rejected' ||
      s === 'cancelled' ||
      s === 'expired' ||
      s === 'out of stock' ||
      s === 'conflict flagged'
    ) {
      return 'badge-danger';
    }

    // Warning / Pending / Unassigned / On Hold / Medium / Expiring Soon / Checking
    if (
      s === 'unassigned' ||
      s === 'pending' ||
      s === 'pending review' ||
      s === 'pending approval' ||
      s === 'on hold' ||
      s === 'waiting for parts' ||
      s === 'low stock' ||
      s === 'medium' ||
      s === 'expiring soon' ||
      s === 'rescheduled' ||
      s === 'under review'
    ) {
      return 'badge-warning';
    }

    // Primary / In Progress / Assigned / Scheduled / Field Visit
    if (
      s === 'assigned' ||
      s === 'in progress' ||
      s === 'scheduled' ||
      s === 'issued' ||
      s === 'dispatched' ||
      s === 'in field'
    ) {
      return 'badge-primary';
    }

    // Info / New / Received / Low / Preventive
    if (
      s === 'new' ||
      s === 'received' ||
      s === 'low' ||
      s === 'open' ||
      s === 'preventive' ||
      s === 'routine'
    ) {
      return 'badge-info';
    }

    // Neutral / Draft / Closed
    if (s === 'draft' || s === 'closed') {
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
