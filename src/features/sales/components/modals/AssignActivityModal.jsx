import { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Building2,
  AlertTriangle,
  Info,
  MapPin,
  CheckCircle2,
  Search,
} from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { TEAM_ROSTER } from '../../data/mockData';

const ACTIVITY_TYPES = [
  'Customer Visit',
  'Product Demo',
  'Quotation Follow-up',
  'Payment Collection',
  'Lead Qualification',
  'Distributor Meeting',
  'Document Delivery',
  'Other',
];

const TIME_SLOTS = [
  '09:30 AM',
  '10:30 AM',
  '11:30 AM',
  '12:30 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
];

const PRIORITIES = [
  { id: 'Low', label: 'Low' },
  { id: 'Normal', label: 'Normal / Medium' },
  { id: 'High', label: 'High' },
  { id: 'Urgent', label: 'Urgent' },
];

export default function AssignActivityModal({ isOpen, onClose, activityToEdit = null }) {
  const {
    customers = [],
    activities = [],
    assignActivity,
    updateActivity,
    userProfile,
    userRole,
  } = useSales();

  const { showToast } = useToast();

  // Eligible field staff: Sales Representatives and Junior Sales Employees
  const eligibleStaff = useMemo(() => {
    return TEAM_ROSTER.filter(
      (m) => m.role === 'sales_rep' || m.role === 'junior_sales'
    );
  }, []);

  // Form states
  const [activityId, setActivityId] = useState('');
  const [enteredCustomerId, setEnteredCustomerId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lookupError, setLookupError] = useState('');

  const [assignedEmployeeId, setAssignedEmployeeId] = useState(eligibleStaff[0]?.id || 'APX-EMP-4091');
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0]);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState(TIME_SLOTS[1]); // 10:30 AM
  const [estimatedDuration, setEstimatedDuration] = useState('1 Hour');
  const [priority, setPriority] = useState('Normal');
  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [territoryId, setTerritoryId] = useState('TERR-HYD-A');
  const [errors, setErrors] = useState({});

  // Initialize or generate ID
  useEffect(() => {
    if (activityToEdit) {
      setActivityId(activityToEdit.activityId || activityToEdit.id);
      setSelectedCustomerId(activityToEdit.customerId || '');
      setEnteredCustomerId(activityToEdit.customerDisplayId || activityToEdit.customerId || '');
      setAssignedEmployeeId(activityToEdit.assignedEmployeeId || eligibleStaff[0]?.id);
      setActivityType(activityToEdit.activityType || ACTIVITY_TYPES[0]);
      setScheduledDate(activityToEdit.scheduledDate || '');
      setScheduledTime(activityToEdit.scheduledTime || TIME_SLOTS[1]);
      setPriority(activityToEdit.priority || 'Normal');
      setPurpose(activityToEdit.purpose || '');
      setInstructions(activityToEdit.instructions || '');
      setTerritoryId(activityToEdit.territoryId || 'TERR-HYD-A');
    } else {
      // Auto-generate activity ID
      const existingNos = activities
        .map((a) => {
          const m = (a.activityId || a.id || '').match(/ACT-2026-(\d+)/);
          return m ? parseInt(m[1], 10) : 0;
        })
        .filter(Boolean);
      const nextNo = existingNos.length > 0 ? Math.max(...existingNos) + 1 : 106;
      setActivityId(`ACT-2026-${String(nextNo).padStart(3, '0')}`);
      if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
        setEnteredCustomerId(customers[0].customerId || customers[0].code || customers[0].id);
      }
    }
  }, [activityToEdit, isOpen, activities, customers, eligibleStaff]);

  // Customer resolution
  const matchedCustomer = useMemo(() => {
    return customers.find(
      (c) =>
        c.id === selectedCustomerId ||
        c.customerId === selectedCustomerId ||
        c.code === selectedCustomerId
    );
  }, [customers, selectedCustomerId]);

  // Set territory from customer if available
  useEffect(() => {
    if (matchedCustomer) {
      if (matchedCustomer.territoryId) {
        setTerritoryId(matchedCustomer.territoryId);
      } else if (matchedCustomer.id === 'CUST-007' || matchedCustomer.id === 'CUST-005') {
        setTerritoryId('TERR-HYD-C');
      } else if (matchedCustomer.id === 'CUST-006' || matchedCustomer.id === 'CUST-002') {
        setTerritoryId('TERR-HYD-B');
      } else {
        setTerritoryId('TERR-HYD-A');
      }
    }
  }, [matchedCustomer]);

  const handleCustomerIdLookup = () => {
    setLookupError('');
    const query = enteredCustomerId.trim().toUpperCase();
    if (!query) {
      setLookupError('Please enter a Customer ID to look up.');
      return;
    }
    const found = customers.find(
      (c) =>
        (c.customerId && c.customerId.toUpperCase() === query) ||
        (c.code && c.code.toUpperCase() === query) ||
        (c.id && c.id.toUpperCase() === query) ||
        (c.name && c.name.toLowerCase().includes(query.toLowerCase()))
    );
    if (found) {
      setSelectedCustomerId(found.id);
      setEnteredCustomerId(found.customerId || found.code || found.id);
      showToast(`Customer resolved: ${found.name} (${found.customerId || found.code})`, 'success');
    } else {
      setLookupError(`No customer found with ID or name "${query}".`);
    }
  };

  const handleSelectCustomer = (id) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setEnteredCustomerId(found.customerId || found.code || found.id);
      setLookupError('');
    }
  };

  // Selected staff object
  const selectedStaff = useMemo(() => {
    return eligibleStaff.find((s) => s.id === assignedEmployeeId) || eligibleStaff[0];
  }, [eligibleStaff, assignedEmployeeId]);

  // Conflict detection: Same employee scheduled at same date & time
  const conflictActivity = useMemo(() => {
    if (!scheduledDate || !scheduledTime || !assignedEmployeeId) return null;
    return activities.find((a) => {
      if (activityToEdit && (a.id === activityToEdit.id || a.activityId === activityToEdit.activityId)) {
        return false;
      }
      return (
        a.assignedEmployeeId === assignedEmployeeId &&
        a.scheduledDate === scheduledDate &&
        a.scheduledTime === scheduledTime &&
        a.status !== 'Cancelled'
      );
    });
  }, [activities, assignedEmployeeId, scheduledDate, scheduledTime, activityToEdit]);

  // Duplicate assignment detection: Same employee assigned to same customer on the same date
  const duplicateActivity = useMemo(() => {
    if (!scheduledDate || !matchedCustomer || !assignedEmployeeId) return null;
    return activities.find((a) => {
      if (activityToEdit && (a.id === activityToEdit.id || a.activityId === activityToEdit.activityId)) {
        return false;
      }
      return (
        a.assignedEmployeeId === assignedEmployeeId &&
        a.customerId === matchedCustomer.id &&
        a.scheduledDate === scheduledDate &&
        a.status !== 'Cancelled'
      );
    });
  }, [activities, assignedEmployeeId, matchedCustomer, scheduledDate, activityToEdit]);

  // Submit Handler
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const errs = {};
    if (!matchedCustomer) errs.customer = 'A valid customer must be selected or resolved via Customer ID';
    if (!assignedEmployeeId) errs.employee = 'Assigned field staff member is required';
    if (!scheduledDate) errs.scheduledDate = 'Scheduled visit date is required';
    if (!purpose.trim()) errs.purpose = 'Purpose of field activity is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const territoryNames = {
      'TERR-HYD-A': 'Distributor Territory A (Kukatpally, Jubilee Hills, Gachibowli)',
      'TERR-HYD-B': 'Distributor Territory B (Uppal, Narapally, Boduppal)',
      'TERR-HYD-C': 'Distributor Territory C (ECIL, Kapra, Sainikpuri)',
    };

    const payload = {
      activityId,
      customerId: matchedCustomer.id,
      customerDisplayId: matchedCustomer.customerId || matchedCustomer.code || matchedCustomer.id,
      customerName: matchedCustomer.name,
      contactPerson: matchedCustomer.contactPerson || matchedCustomer.contactName || 'Procurement In-Charge',
      contactPhone: matchedCustomer.phone || matchedCustomer.mobile || '—',
      contactEmail: matchedCustomer.email || '—',
      customerAddress: matchedCustomer.address || `${matchedCustomer.city || 'Regional Hub'}`,
      territoryId,
      territoryName: territoryNames[territoryId] || 'Regional Operations',
      regionId: matchedCustomer.regionId || 'REG-HYD',
      assignedEmployeeId: selectedStaff?.id || assignedEmployeeId,
      assignedEmployeeName: selectedStaff?.fullName || 'Assigned Staff',
      assignedEmployeeRole: selectedStaff?.role || 'sales_rep',
      activityType,
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      dueDate: scheduledDate,
      priority,
      purpose: purpose.trim(),
      instructions: instructions.trim(),
      status: activityToEdit?.status || 'Pending',
      outcomeRemarks: activityToEdit?.outcomeRemarks || '',
      nextFollowUpDate: activityToEdit?.nextFollowUpDate || null,
      assignedBy: `${userProfile?.fullName || 'Sneha Patil'} (${userProfile?.designation || 'Sales Coordinator'})`,
    };

    try {
      if (activityToEdit) {
        updateActivity(activityToEdit.id, payload);
        showToast(`Activity ${activityId} updated successfully!`, 'success');
      } else {
        assignActivity(payload);
        showToast(`Activity ${activityId} scheduled & assigned to ${payload.assignedEmployeeName}!`, 'success');
      }
      onClose();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={activityToEdit ? `Edit Scheduled Activity: ${activityId}` : 'Schedule & Assign Customer Activity'}
      subtitle="Coordinate customer visits, product demonstrations, and field tasks across regional territories"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            {activityToEdit ? 'Save Changes' : 'Confirm Assignment'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Activity Identification Bar */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
              System Activity ID
            </span>
            <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '15px', color: '#1e40af' }}>
              {activityId}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
              Assigning Authority
            </span>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
              {userProfile?.fullName || 'Sneha Patil'} ({userProfile?.designation || 'Sales Coordinator'})
            </div>
          </div>
        </div>

        {/* Customer Information with Instant Lookup */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} className="text-primary" /> Customer Information &amp; Territory
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Enter or Paste Customer ID
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CUS-000004 or CUST-004"
                  value={enteredCustomerId}
                  onChange={(e) => setEnteredCustomerId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCustomerIdLookup();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCustomerIdLookup}
                  title="Search & resolve customer details"
                >
                  <Search size={14} />
                </button>
              </div>
              {lookupError && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>{lookupError}</div>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Or Select from Customer Directory *
              </label>
              <select
                className="form-select"
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerId || c.code || c.id})
                  </option>
                ))}
              </select>
              {errors.customer && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>{errors.customer}</div>}
            </div>
          </div>

          {/* Matched Customer Summary Card */}
          {matchedCustomer && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ color: '#1e40af', fontWeight: '700', display: 'block' }}>Customer Name:</span>
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{matchedCustomer.name}</span>
                <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {matchedCustomer.customerId || matchedCustomer.code}</div>
              </div>
              <div>
                <span style={{ color: '#1e40af', fontWeight: '700', display: 'block' }}>Primary Contact:</span>
                <span>{matchedCustomer.contactPerson || 'Procurement Manager'}</span>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{matchedCustomer.phone || 'No phone'}</div>
              </div>
              <div>
                <span style={{ color: '#1e40af', fontWeight: '700', display: 'block' }}>Site Address:</span>
                <div style={{ fontSize: '11px', color: '#334155', maxHeight: '36px', overflow: 'hidden' }}>
                  {matchedCustomer.address || matchedCustomer.city || 'Regional Premises'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assigned Staff and Distributor Territory */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={16} className="text-primary" /> Assigned Field Employee &amp; Territory
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Assigned Employee (Rep or Junior) *
              </label>
              <select
                className="form-select"
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
              >
                <optgroup label="Sales Representatives (Level 3)">
                  {eligibleStaff
                    .filter((s) => s.role === 'sales_rep')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.id}) — Sales Representative
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Junior Sales Employees (Level 4)">
                  {eligibleStaff
                    .filter((s) => s.role === 'junior_sales')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.id}) — Junior Sales Employee
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Distributor Territory *
              </label>
              <select
                className="form-select"
                value={territoryId}
                onChange={(e) => setTerritoryId(e.target.value)}
              >
                <option value="TERR-HYD-A">Territory A — Kukatpally, Jubilee Hills, Gachibowli</option>
                <option value="TERR-HYD-B">Territory B — Uppal, Narapally, Boduppal</option>
                <option value="TERR-HYD-C">Territory C — ECIL, Kapra, Sainikpuri</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Details, Schedule & Priority */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} className="text-primary" /> Scheduling Details &amp; Conflict Checks
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Activity Type *
              </label>
              <select
                className="form-select"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Scheduled Date *
              </label>
              <input
                type="date"
                className="form-input"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
              {errors.scheduledDate && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>{errors.scheduledDate}</div>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Scheduled Time Slot *
              </label>
              <select
                className="form-select"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Priority *
              </label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Conflict Alert */}
          {conflictActivity && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
              <div>
                <strong>Schedule Conflict Alert:</strong> {selectedStaff?.fullName} already has an activity scheduled for <strong>{scheduledDate} at {scheduledTime}</strong>.
                <div style={{ marginTop: '2px', fontSize: '11px' }}>
                  Existing Assignment: <strong>{conflictActivity.activityId}</strong> — {conflictActivity.customerName} ({conflictActivity.activityType}). You may proceed to override or adjust the time slot.
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Assignment Alert */}
          {duplicateActivity && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
              <div>
                <strong>Duplicate Assignment Warning:</strong> {selectedStaff?.fullName} is already assigned to visit <strong>{matchedCustomer?.name}</strong> on <strong>{scheduledDate}</strong> ({duplicateActivity.activityId}). Ensure this visit has a distinct purpose.
              </div>
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              Purpose of Activity / Meeting Agenda *
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Conduct on-site technical inspection, collect GSTIN certificate copy, demonstrate high-pressure valve models"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            />
            {errors.purpose && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>{errors.purpose}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Instructions / Materials for Field Employee
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Hand over hard copy of ISO compliance certificate; check inventory stock level in client stockroom"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}