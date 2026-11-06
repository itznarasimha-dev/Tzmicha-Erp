import { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, Target, Link2, CalendarCheck } from 'lucide-react';

export default function SubmitWorkUpdateModal({ isOpen, onClose }) {
  const { addWorkUpdate, targets = [], quotations = [], orders = [], customers = [], activities = [], userProfile } = useSales();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState('In Progress');
  const [progressPercentage, setProgressPercentage] = useState('50');
  const [blockers, setBlockers] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [targetId, setTargetId] = useState('');
  const [moduleRef, setModuleRef] = useState('');
  const [activityId, setActivityId] = useState('');
  const [activityRef, setActivityRef] = useState('');
  const [errors, setErrors] = useState({});

  // Relevant activities for this user to link from Action Plan
  const userActivities = useMemo(() => {
    return activities.filter((a) => {
      if (!userProfile?.employeeId) return true;
      return a.assignedEmployeeId === userProfile.employeeId ||
        (userProfile.fullName && a.assignedEmployeeName?.toLowerCase() === userProfile.fullName.toLowerCase());
    });
  }, [activities, userProfile]);

  const handleSelectActivity = (e) => {
    const actId = e.target.value;
    setActivityId(actId);
    if (!actId) {
      setActivityRef('');
      return;
    }
    const act = activities.find((a) => (a.activityId || a.id) === actId);
    if (act) {
      const refStr = `[${act.activityId || act.id}] ${act.activityType} – ${act.customerName} (${act.scheduledDate})`;
      setActivityRef(refStr);
      if (!title) {
        setTitle(`${act.activityType} with ${act.customerName}`);
      }
      if (!moduleRef) {
        setModuleRef(act.customerDisplayId || act.customerId || act.refQuotationId || act.refOrderId || '');
      }
    }
  };

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Work/task title is required';
    if (!description.trim()) errs.description = 'Description of work completed is required';
    if (progress === 'Blocked' && !blockers.trim()) {
      errs.blockers = 'Please describe the blockers or issues preventing progress';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please fix the errors before submitting', 'danger');
      return;
    }

    try {
      const selectedTarget = targets.find((t) => t.id === targetId);
      addWorkUpdate({
        title,
        description,
        progress,
        progressPercentage: parseInt(progressPercentage, 10) || 0,
        blockers,
        nextSteps,
        targetId: targetId || null,
        targetPeriod: selectedTarget?.period || null,
        moduleRef: moduleRef || null,
        activityRef: activityRef || null,
        activityId: activityId || null,
      });

      showToast('Daily work update submitted successfully!', 'success');
      handleClose();
    } catch (err) {
      showToast(err.message || 'Failed to submit work update', 'danger');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setProgress('In Progress');
    setProgressPercentage('50');
    setBlockers('');
    setNextSteps('');
    setTargetId('');
    setModuleRef('');
    setActivityId('');
    setActivityRef('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="large"
      title="Submit Daily Work Update"
      subtitle="Log your completed deliverables, ongoing activities, blockers, and target milestones"
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Submit Work Update
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Work Title */}
        <FormField
          label="Work / Task Title"
          name="title"
          required
          placeholder="e.g. Technical review & commercial quotation follow-up with Kaveri Precision"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        {/* Description of Work */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Description of Work Completed <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Provide specific details of the tasks achieved, client discussions, technical audits, or logistics coordination..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
          />
          {errors.description && (
            <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {errors.description}
            </span>
          )}
        </div>

        {/* Progress Status and Percentage Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Current Progress Status <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-control"
              value={progress}
              onChange={(e) => {
                const newProg = e.target.value;
                setProgress(newProg);
                if (newProg === 'Completed') setProgressPercentage('100');
                if (newProg === 'Not Started') setProgressPercentage('0');
              }}
              style={{ width: '100%' }}
            >
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked (Requires Assistance)</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: 0 }}>
                Progress Percentage
              </label>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                {progressPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressPercentage}
              onChange={(e) => setProgressPercentage(e.target.value)}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Issues or Blockers */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <AlertTriangle size={14} className={progress === 'Blocked' ? 'text-danger' : 'text-muted'} />
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', margin: 0 }}>
              Issues / Blockers {progress === 'Blocked' && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
          </div>
          <textarea
            className="form-control"
            rows={2}
            placeholder={
              progress === 'Blocked'
                ? 'Specify the exact blocker (e.g. factory tooling delay, customer signatory unavailable, pending credit approval)...'
                : 'Any operational hurdles, material delays, or dependencies (leave empty if none)...'
            }
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
          />
          {errors.blockers && (
            <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {errors.blockers}
            </span>
          )}
        </div>

        {/* Next Steps */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Planned Next Steps
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Follow up on signed purchase order by Thursday 11:00 AM"
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Linkage to Targets & Reports & Action Plan */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <CalendarCheck size={16} className="text-primary" />
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              Action Plan &amp; Workflow Linkage
            </strong>
          </div>

          {/* Action Plan Activity Reference */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
              Action Plan Activity Reference (Scheduled Tasks &amp; Visits)
            </label>
            <select
              className="form-control"
              value={activityId}
              onChange={handleSelectActivity}
              style={{ width: '100%', fontSize: '12px' }}
            >
              <option value="">— Select Scheduled Activity from Action Plan (Optional) —</option>
              {userActivities.map((act) => (
                <option key={act.id} value={act.activityId || act.id}>
                  [{act.activityId || act.id}] {act.scheduledDate} ({act.scheduledTime}) – {act.activityType}: {act.customerName} [{act.status}]
                </option>
              ))}
            </select>
            {activityRef && (
              <span style={{ fontSize: '11px', color: '#2563eb', marginTop: '3px', display: 'block', fontWeight: 500 }}>
                Linked: {activityRef}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Link to Assigned Target
              </label>
              <select
                className="form-control"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                style={{ width: '100%', fontSize: '12px' }}
              >
                <option value="">— Select Target (Optional) —</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.period}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Relevant Module / Record Reference
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. QT-2026-081, SO-2026-041, CUS-000001"
                value={moduleRef}
                onChange={(e) => setModuleRef(e.target.value)}
                style={{ width: '100%', fontSize: '12px' }}
                list="module-refs-list"
              />
              <datalist id="module-refs-list">
                {quotations.slice(0, 5).map((q) => (
                  <option key={q.quotationNo} value={q.quotationNo}>
                    {q.customerName}
                  </option>
                ))}
                {orders.slice(0, 5).map((o) => (
                  <option key={o.orderNo} value={o.orderNo}>
                    {o.customerName}
                  </option>
                ))}
                {customers.slice(0, 5).map((c) => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.name}
                  </option>
                ))}
              </datalist>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
