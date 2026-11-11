import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { UserCheck, ShieldAlert, CheckCircle } from 'lucide-react';

const ELIGIBLE_SALES_REPRESENTATIVES = [
  {
    employeeId: 'APX-EMP-4091',
    name: 'Vikram Mehta',
    role: 'sales_rep',
    title: 'Senior Sales Representative',
    territory: 'Hyderabad Central & Industrial Corridors',
    activeLeads: 4,
  },
  {
    employeeId: 'APX-EMP-4092',
    name: 'Rohan Sharma',
    role: 'sales_rep',
    title: 'Sales Representative',
    territory: 'Secunderabad & North Zone',
    activeLeads: 2,
  },
  {
    employeeId: 'APX-EMP-4093',
    name: 'Priya Nair',
    role: 'sales_rep',
    title: 'Sales Representative',
    territory: 'Hitec City & Software/Pharma Corridors',
    activeLeads: 3,
  },
];

export default function AssignLeadModal({ isOpen, onClose, lead, onAssigned }) {
  const { assignMarketingLead, userRole } = useSales();
  const { showToast } = useToast();
  const [selectedRepId, setSelectedRepId] = useState(
    lead?.assignedEmployeeId || ELIGIBLE_SALES_REPRESENTATIVES[0].employeeId
  );
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && lead) {
      setSelectedRepId(lead.assignedEmployeeId || ELIGIBLE_SALES_REPRESENTATIVES[0].employeeId);
      setInstructions(lead.assignmentInstructions || '');
      setError('');
    }
  }, [isOpen, lead]);

  if (!lead) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const rep = ELIGIBLE_SALES_REPRESENTATIVES.find((r) => r.employeeId === selectedRepId);
    if (!rep) {
      setError('Please select an eligible Sales Representative');
      return;
    }

    try {
      assignMarketingLead(lead.leadId, {
        employeeId: rep.employeeId,
        employeeName: rep.name,
        employeeRole: rep.role,
        instructions: instructions.trim(),
      });
      showToast(`Lead ${lead.leadId} assigned to ${rep.name} successfully`, 'success');
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign lead');
    }
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="btn btn-primary" onClick={handleSubmit}>
        <UserCheck size={15} style={{ marginRight: '6px' }} />
        Confirm Assignment
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Marketing Lead — ${lead.leadId}`}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Inbound Customer</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
            {lead.companyName} ({lead.customerName})
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
            Requirement: {lead.interestedProduct || 'Inbound Sales'} • City: {lead.location}
          </div>
        </div>

        {/* Governance banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '10px 12px',
            marginBottom: '16px',
          }}
        >
          <ShieldAlert size={18} className="text-blue-600 shrink-0" style={{ marginTop: '2px' }} />
          <div style={{ fontSize: '12px', color: '#1e40af', lineHeight: '1.4' }}>
            <strong>Hierarchy Rule:</strong> Leads may only be assigned to certified Sales Representatives. Junior
            Sales Employees (Amit Verma) are restricted from direct lead routing.
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            Select Sales Representative <span style={{ color: '#e11d48' }}>*</span>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ELIGIBLE_SALES_REPRESENTATIVES.map((rep) => {
              const isSelected = selectedRepId === rep.employeeId;
              return (
                <div
                  key={rep.employeeId}
                  onClick={() => setSelectedRepId(rep.employeeId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f7ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isSelected ? '5px solid #2563eb' : '2px solid #94a3b8',
                        background: '#ffffff',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{rep.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {rep.employeeId} • {rep.territory}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}
                  >
                    {rep.activeLeads} active leads
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Assignment Instructions & Follow-up Expectations
          </label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="e.g., High-priority inquiry. Please conduct discovery call within 24 hours and share valve catalog..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ color: '#e11d48', fontSize: '12px', fontWeight: 500, marginTop: '6px' }}>{error}</div>
        )}
      </form>
    </Modal>
  );
}
