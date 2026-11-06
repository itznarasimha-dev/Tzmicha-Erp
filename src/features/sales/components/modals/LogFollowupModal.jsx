import { useState } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function LogFollowupModal({ isOpen, onClose }) {
  const { customers, addFollowup } = useSales();
  const { showToast } = useToast();

  const [customerId, setCustomerId] = useState('');
  const [contactMethod, setContactMethod] = useState('Phone Call');
  const [subject, setSubject] = useState('');
  const [relatedRef, setRelatedRef] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-10-22');
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!customerId) errs.customerId = 'Please select a customer';
    if (!subject.trim()) errs.subject = 'Subject / Purpose is required';
    if (!followUpDate) errs.followUpDate = 'Follow-up date is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    addFollowup({
      customerId,
      customerName: selectedCustomer ? selectedCustomer.name : 'Customer',
      contactMethod,
      subject,
      relatedRef: relatedRef || 'General Account Review',
      followUpDate,
      priority,
      notes,
    });

    showToast('Sales follow-up logged successfully!', 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="normal"
      title="Log Sales Call or Follow-up"
      subtitle="Schedule a customer follow-up, meeting note, or payment reminder"
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Save Follow-up
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="followup-form">
        <FormField label="Customer" id="flw-cust" required error={errors.customerId}>
          <select
            id="flw-cust"
            className="form-select"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city})
              </option>
            ))}
          </select>
        </FormField>

        <div className="form-grid-2">
          <FormField label="Contact Method" id="flw-method">
            <select
              id="flw-method"
              className="form-select"
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
            >
              <option value="Phone Call">Phone Call</option>
              <option value="In-Person Visit">In-Person Visit</option>
              <option value="Video Meeting">Video Meeting</option>
              <option value="WhatsApp">WhatsApp Chat</option>
              <option value="Email">Email Communication</option>
            </select>
          </FormField>

          <FormField label="Priority" id="flw-priority">
            <select
              id="flw-priority"
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </FormField>
        </div>

        <FormField label="Subject / Purpose" id="flw-subject" required error={errors.subject}>
          <input
            type="text"
            id="flw-subject"
            className="form-input"
            placeholder="e.g. Quotation validity check, payment reminder..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </FormField>

        <div className="form-grid-2">
          <FormField label="Follow-up Due Date" id="flw-date" required error={errors.followUpDate}>
            <input
              type="date"
              id="flw-date"
              className="form-input"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </FormField>

          <FormField label="Related Document Reference" id="flw-ref" helperText="e.g. Quote # or Order #">
            <input
              type="text"
              id="flw-ref"
              className="form-input"
              placeholder="e.g. Quotation QT-2026-083"
              value={relatedRef}
              onChange={(e) => setRelatedRef(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Discussion Points & Notes" id="flw-notes">
          <textarea
            id="flw-notes"
            className="form-textarea"
            rows="3"
            placeholder="Key discussion points, customer feedback, next commitments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
