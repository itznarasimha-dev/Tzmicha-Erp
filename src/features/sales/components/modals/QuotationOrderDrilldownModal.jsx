import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { formatINR, formatDate } from '../../utils/formatters';
import { BarChart3, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useSales } from '../../context/SalesContext';

export default function QuotationOrderDrilldownModal({ isOpen, onClose, cohortData }) {
  const { navigateTo } = useSales();

  if (!cohortData) return null;

  const {
    month = 'October',
    year = 2026,
    quotationsGenerated = 0,
    quotationsConverted = 0,
    ordersWon = 0,
    quotationsLost = 0,
    conversionRate = 0,
    quotes = [],
  } = cohortData;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Quotation & Order Detailed Drill-Down — ${month} ${year}`}
      subtitle={`Conversion efficiency: ${conversionRate}% (${quotationsConverted} converted of ${quotationsGenerated} eligible quotations)`}
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Drill-Down
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* KPI Cohort Summary Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 14px',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>QUOTATIONS GENERATED</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{quotationsGenerated}</div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CONVERTED TO ORDERS</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{quotationsConverted}</div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CONFIRMED ORDERS WON</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{ordersWon}</div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>QUOTATIONS LOST</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>{quotationsLost}</div>
          </div>

          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CONVERSION EFFICIENCY</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: conversionRate >= 70 ? '#16a34a' : '#d97706' }}>
              {conversionRate}%
            </div>
          </div>
        </div>

        {/* Detailed Quotations Cohort Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table className="enterprise-table table-compact" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Quotation ID</th>
                <th>Customer Name &amp; ID</th>
                <th style={{ textAlign: 'center' }}>Date</th>
                <th style={{ textAlign: 'right' }}>Value (₹)</th>
                <th style={{ textAlign: 'center' }}>Quotation Status</th>
                <th style={{ textAlign: 'center' }}>Converted to Order?</th>
                <th>Linked Order ID</th>
                <th>Lost Reason / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No individual quotation records logged for this selected cohort.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span className="font-semibold text-xs text-primary">{q.id}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-xs text-slate-800 block">{q.customerName}</span>
                      <span className="text-xs text-muted font-mono" style={{ fontSize: '11px' }}>
                        ID: {q.customerId}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '12px' }}>{formatDate(q.createdDate)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '12px' }}>
                      {formatINR(q.value)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={q.status} size="small" />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {q.convertedToOrder ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#16a34a',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#dcfce7',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Yes</span>
                        </span>
                      ) : q.status === 'Lost' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#dc2626',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#fee2e2',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          <XCircle size={12} />
                          <span>Lost</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted">In Pipeline</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {q.orderId ? (
                        <span className="font-mono font-semibold text-slate-800">{q.orderId}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {q.lostReason ? (
                        <span style={{ color: '#b91c1c', fontWeight: 500 }} title={q.lostReason}>
                          {q.lostReason}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Audit Methodology Note */}
        <div style={{ fontSize: '11.5px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
          <strong>Conversion Calculation Formula:</strong>{' '}
          <code>Conversion Rate = (Eligible quotations converted into confirmed Sales Orders / Eligible quotations issued) × 100</code>. Drafts and duplicate quotes are excluded.
        </div>
      </div>
    </Modal>
  );
}
