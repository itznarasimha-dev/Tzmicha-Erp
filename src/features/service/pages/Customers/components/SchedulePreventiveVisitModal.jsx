import React, { useState } from 'react';
import { X, Calendar, User, Clock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { formatDate } from '../../../utils/formatters';

export default function SchedulePreventiveVisitModal({
  isOpen,
  onClose,
  coverageRecord,
  coverageType = 'warranty' // 'warranty' | 'amc'
}) {
  const { engineers = [], schedulePreventiveVisit } = useSchedule();

  const [scheduledDate, setScheduledDate] = useState(
    coverageRecord?.nextScheduledVisit ||
    coverageRecord?.nextScheduledMaintenance ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [engineerId, setEngineerId] = useState(engineers[0]?.id || 'ENG-01');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [expectedEndTime, setExpectedEndTime] = useState('01:30 PM');
  const [remarks, setRemarks] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !coverageRecord) return null;

  const selectedEngineer = engineers.find((e) => e.id === engineerId) || engineers[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!scheduledDate) {
      setError('Please select a valid scheduled service date.');
      return;
    }

    try {
      schedulePreventiveVisit(coverageType, coverageRecord.id, {
        scheduledDate,
        engineerId: selectedEngineer.id,
        engineerName: selectedEngineer.name,
        startTime,
        expectedEndTime,
        remarks: remarks || `Periodic preventive maintenance visit scheduled under ${coverageRecord.id}.`
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1400);
    } catch (err) {
      setError('Failed to schedule visit. Please verify details.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1300 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '95vw',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Schedule Preventive Service Visit
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                {coverageType === 'warranty' ? 'Warranty Coverage' : 'AMC Contract'}: <strong>{coverageRecord.id}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Preventive Visit Scheduled!
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Field visit created in Action Plan schedule and assigned to <strong>{selectedEngineer.name}</strong> on <strong>{formatDate(scheduledDate)}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#b91c1c' }}>
                  {error}
                </div>
              )}

              {/* Coverage Summary Box */}
              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Customer</span>
                    <strong style={{ color: '#0f172a' }}>{coverageRecord.customerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Equipment / Machine</span>
                    <strong style={{ color: '#0f172a' }}>{coverageRecord.productName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Visit Frequency</span>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>{coverageRecord.visitFrequency || 'Every 6 Months'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Visits Status</span>
                    <span style={{ color: '#047857', fontWeight: 600 }}>
                      {coverageRecord.visitsCompleted || 0} completed / {coverageRecord.remainingVisits || 0} remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* Schedule Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Scheduled Visit Date *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Assigned Field Engineer *
                  </label>
                  <select
                    className="form-control"
                    value={engineerId}
                    onChange={(e) => setEngineerId(e.target.value)}
                    style={{ fontSize: '13px' }}
                  >
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} ({eng.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Window */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Planned Start Time
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="10:00 AM"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Expected End Time
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="01:30 PM"
                    value={expectedEndTime}
                    onChange={(e) => setExpectedEndTime(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Preventive Maintenance Instructions
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g., Check hydraulic spool pressure, replace seals, inspect raceway."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#f8fafc'
              }}
            >
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '13px' }}>
                Confirm & Create Schedule
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
