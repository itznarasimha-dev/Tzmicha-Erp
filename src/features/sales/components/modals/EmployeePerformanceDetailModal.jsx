import Modal from '../common/Modal';
import { formatINR } from '../../utils/formatters';
import { Award, Briefcase, CheckCircle2, TrendingUp, Users, MapPin, BarChart2 } from 'lucide-react';

export default function EmployeePerformanceDetailModal({ isOpen, onClose, employee, reportingPeriod = '2026' }) {
  if (!employee) return null;

  const quotaVal = Number(employee.quotaValue || 0);
  const achievedVal = Number(employee.achievedValue || 0);
  const remainingVal = Number(employee.remainingValue || 0);
  const quotaQty = Number(employee.quotaQty || 0);
  const achievedQty = Number(employee.achievedQty || 0);
  const remainingQty = Number(employee.remainingQty || 0);

  const pct = quotaVal > 0 ? Math.round((achievedVal / quotaVal) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      title={`Employee Performance Detail: ${employee.fullName}`}
      subtitle={`${employee.employeeId} • ${employee.role} • ${employee.territoryName || 'Regional Scope'}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header Profile Strip */}
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} className="text-primary" />
              <strong style={{ fontSize: '14px', color: '#1e40af' }}>{employee.fullName}</strong>
              <span className="font-mono text-xs text-primary bg-white px-2 py-0.5 rounded border border-blue-200">
                {employee.employeeId}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px', display: 'block' }}>
              Role: <strong>{employee.role}</strong> • Territory: <strong>{employee.territoryName}</strong>
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#1e40af', display: 'block' }}>Quota Achievement</span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: pct >= 100 ? '#15803d' : '#1d4ed8',
                backgroundColor: pct >= 100 ? '#dcfce7' : '#dbeafe',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {pct}%
            </span>
          </div>
        </div>

        {/* 3 Summary Quota KPI Cards (Quantity & Value) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          {/* Assigned Quota */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Assigned Sales Quota</span>
            <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{formatINR(quotaVal)}</strong>
            <span style={{ fontSize: '11px', color: '#2563eb', display: 'block', marginTop: '2px', fontWeight: 600 }}>
              {quotaQty} units
            </span>
          </div>

          {/* Achieved Net Sales */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px' }}>
            <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>Achieved Net Sales</span>
            <strong style={{ fontSize: '13.5px', color: '#15803d' }}>{formatINR(achievedVal)}</strong>
            <span style={{ fontSize: '11px', color: '#15803d', display: 'block', marginTop: '2px', fontWeight: 600 }}>
              {achievedQty} units
            </span>
          </div>

          {/* Remaining Sales */}
          <div style={{ background: remainingVal === 0 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${remainingVal === 0 ? '#bbf7d0' : '#fde68a'}`, borderRadius: '6px', padding: '10px 12px' }}>
            <span style={{ fontSize: '11px', color: '#92400e', display: 'block' }}>Remaining Sales</span>
            <strong style={{ fontSize: '13.5px', color: remainingVal === 0 ? '#15803d' : '#b45309' }}>
              {remainingVal === 0 ? 'Quota Met' : formatINR(remainingVal)}
            </strong>
            <span style={{ fontSize: '11px', color: remainingVal === 0 ? '#15803d' : '#b45309', display: 'block', marginTop: '2px', fontWeight: 600 }}>
              {remainingQty} units
            </span>
          </div>
        </div>

        {/* Quotation & Order Conversion Efficiency */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
            Quotation Pipeline &amp; Conversion Metrics — Conversion Breakdown
          </strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', textAlign: 'center' }}>
            <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>Generated</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{employee.quotationsGenerated}</strong>
            </div>
            <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#1d4ed8', display: 'block' }}>Converted</span>
              <strong style={{ fontSize: '14px', color: '#2563eb' }}>{employee.quotationsConverted}</strong>
            </div>
            <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#15803d', display: 'block' }}>Orders Won</span>
              <strong style={{ fontSize: '14px', color: '#16a34a' }}>{employee.ordersWon}</strong>
            </div>
            <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#b91c1c', display: 'block' }}>Quotes Lost</span>
              <strong style={{ fontSize: '14px', color: '#dc2626' }}>{employee.quotationsLost}</strong>
            </div>
            <div style={{ padding: '8px', background: '#faf5ff', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#7e22ce', display: 'block' }}>Conversion %</span>
              <strong style={{ fontSize: '14px', color: '#7c3aed' }}>{employee.conversionRate}%</strong>
            </div>
          </div>
        </div>

        {/* Earned Commission Details */}
        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#6b21a8' }}>Earned Commission Total</strong>
              <p style={{ margin: 0, fontSize: '11px', color: '#7e22ce' }}>
                Calculated on sales exceeding assigned quota per company policy
              </p>
            </div>
            <strong style={{ fontSize: '16px', color: '#7c3aed' }}>
              {formatINR(employee.commissionEarned || 0)}
            </strong>
          </div>
        </div>
      </div>
    </Modal>
  );
}
