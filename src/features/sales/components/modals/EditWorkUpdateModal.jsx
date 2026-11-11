import { useState } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, Target, History } from 'lucide-react';

export default function EditWorkUpdateModal({ isOpen, onClose, update }) {
  const { editWorkUpdate, targets = [], quotations = [], orders = [], customers = [] } = useSales();
  const { showToast } = useToast();

  if (!isOpen || !update) return null;

  return (
    <EditWorkUpdateModalContent
      isOpen={isOpen}
      onClose={onClose}
      update={update}
      editWorkUpdate={editWorkUpdate}
      targets={targets}
      quotations={quotations}
      orders={orders}
      customers={customers}
      showToast={showToast}
    />
  );
}

function EditWorkUpdateModalContent({
  isOpen,
  onClose,
  update,
  editWorkUpdate,
  targets,
  quotations,
  orders,
  customers,
  showToast,
}) {
  const [title, setTitle] = useState(() => update.title || '');
  const [description, setDescription] = useState(() => update.description || '');
  const [progress, setProgress] = useState(() => update.progress || 'In Progress');
  const [progressPercentage, setProgressPercentage] = useState(() => (update.progressPercentage ?? 50).toString());
  const [blockers, setBlockers] = useState(() => update.blockers || '');
  const [nextSteps, setNextSteps] = useState(() => update.nextSteps || '');
  const [targetId, setTargetId] = useState(() => update.targetId || '');
  const [moduleRef, setModuleRef] = useState(() => update.moduleRef || '');
  const [changeSummary, setChangeSummary] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Work/task title is required';
    if (!description.trim()) errs.description = 'Description of work completed is required';
    if (progress === 'Blocked' && !blockers.trim()) {
      errs.blockers = 'Please specify the blockers/issues preventing progress';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please fix the errors before saving', 'danger');
      return;
    }

    try {
      const selectedTarget = targets.find((t) => t.id === targetId);
      editWorkUpdate(update.id, {
        title,
        description,
        progress,
        progressPercentage: parseInt(progressPercentage, 10) || 0,
        blockers,
        nextSteps,
        targetId: targetId || null,
        targetPeriod: selectedTarget?.period || null,
        moduleRef: moduleRef || null,
        changeSummary: changeSummary.trim() || 'Work update corrected with updated progress details',
      });

      showToast(`Work update ${update.id} updated and audit version recorded!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update work update', 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={`Edit Work Update: ${update.id}`}
      subtitle={`Submitted by ${update.employeeName} on ${update.date}`}
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Save Changes &amp; Record Audit
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        {/* Audit Notice */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          <History size={16} className="text-primary shrink-0" />
          <span>
            <strong>Audit Preservation:</strong> Updating this work report archives the prior version snapshot in the immutable audit log.
          </span>
        </div>

        {/* Work Title */}
        <FormField
          label="Work / Task Title"
          name="title"
          required
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

        {/* Progress and Percentage */}
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
              <option value="Blocked">Blocked</option>
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

        {/* Blockers */}
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
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Target and Module Reference Linkage */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Linked Assigned Target
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
                Module Reference
              </label>
              <input
                type="text"
                className="form-control"
                value={moduleRef}
                onChange={(e) => setModuleRef(e.target.value)}
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* Reason for Correction */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Audit Change Summary / Correction Note
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Updated progress after client meeting and resolved blocker"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </form>
    </Modal>
  );
}
