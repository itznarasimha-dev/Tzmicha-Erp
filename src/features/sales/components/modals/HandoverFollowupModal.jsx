import { useState } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { UserCheck } from 'lucide-react';

const TEAM_MEMBERS = [
  { name: 'Vikram Mehta', role: 'Senior Sales Representative (Western Region)' },
  { name: 'Rahul Deshpande', role: 'Sales Executive (OEM & Key Accounts)' },
  { name: 'Pooja Nair', role: 'Technical Sales Specialist (Southern Region)' },
  { name: 'Amit Sharma', role: 'Account Manager (Northern Region)' },
];

export default function HandoverFollowupModal({ isOpen, onClose, followup }) {
  const { userProfile, updateFollowup } = useSales();
  const { showToast } = useToast();

  const currentEmployee = userProfile?.fullName || 'Vikram Mehta';
  const [newAssignee, setNewAssignee] = useState(
    TEAM_MEMBERS.find((m) => m.name !== (followup?.assignedTo || followup?.owner))?.name || 'Rahul Deshpande'
  );
  const [handoverNote, setHandoverNote] = useState('');

  if (!followup) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newAssignee) return;

    const today = new Date().toISOString().split('T')[0];
    const updatedNotes = handoverNote.trim()
      ? `${followup.notes || ''} [Handed over from ${currentEmployee} to ${newAssignee} on ${today}: ${handoverNote.trim()}]`
      : `${followup.notes || ''} [Reassigned from ${currentEmployee} to ${newAssignee} on ${today}]`;

    updateFollowup(followup.id, {
      owner: newAssignee,
      assignedTo: newAssignee,
      notes: updatedNotes,
    });

    showToast(`Activity successfully handed over to ${newAssignee}. Full conversation history preserved.`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="normal"
      title="Team Handover / Reassign Follow-up"
      subtitle={`Customer: ${followup.customerName} • Subject: ${followup.subject}`}
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-icon-text" onClick={handleSubmit}>
            <UserCheck size={15} />
            <span>Confirm Handover</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs">
          <div className="text-slate-600 mb-1">
            Current Owner: <strong>{followup.assignedTo || followup.owner || currentEmployee}</strong>
          </div>
          <div className="text-slate-600">
            Reference: <strong>{followup.relatedRef || 'Direct Account Follow-up'}</strong>
          </div>
        </div>

        <FormField label="Assign To Team Member *" id="handover-member" required>
          <select
            id="handover-member"
            className="form-select"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
          >
            {TEAM_MEMBERS.map((tm) => (
              <option key={tm.name} value={tm.name}>
                {tm.name} — {tm.role}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Handover Remarks &amp; Briefing Notes"
          id="handover-notes"
          helperText="Add instructions, client temperament, commitments made, or pending approvals for the new assignee."
        >
          <textarea
            id="handover-notes"
            className="form-textarea"
            rows={3}
            placeholder="e.g. Briefed on client pricing sensitivity. Needs quotation revised by 28 Oct. Mr. Deshmukh prefers phone calls in the morning..."
            value={handoverNote}
            onChange={(e) => setHandoverNote(e.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
