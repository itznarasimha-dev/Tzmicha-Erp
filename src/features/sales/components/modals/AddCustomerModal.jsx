import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function AddCustomerModal({ isOpen, onClose }) {
  const { addCustomer, userProfile } = useSales();
  const { showToast } = useToast();

  const emptyState = {
    name: '',
    contactPerson: '',
    designation: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    region: 'Western Region (Maharashtra)',
    type: 'Corporate OEM',
    gstin: '',
    creditLimit: '1000000',
    address: '',
    remarks: '',
  };

  const [formData, setFormData] = useState(emptyState);
  const [errors, setErrors] = useState({});

  // Ensure the creation form starts completely empty whenever opened
  useEffect(() => {
    if (isOpen) {
      setFormData(emptyState);
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};

    if (!formData.name.trim()) errs.name = 'Business / Customer name is required';
    if (!formData.contactPerson.trim()) errs.contactPerson = 'Contact person is required';

    // Phone validation
    const cleanPhone = formData.phone.replace(/[\s-]/g, '');
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^[+]?[0-9]{10,13}$/.test(cleanPhone)) {
      errs.phone = 'Enter a valid 10-digit Indian phone number';
    }

    // Email validation
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Enter a valid email address';
    }

    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.remarks.trim()) errs.remarks = 'Initial reason for contacting the company is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const newCust = addCustomer({
      ...formData,
      creditLimit: Number(formData.creditLimit) || 0,
      whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
      assignedTo: userProfile.fullName,
      assignedEmployeeId: userProfile.employeeId,
    });

    showToast(`Customer "${newCust.name}" (${newCust.customerId}) added successfully!`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Add New Customer"
      subtitle="Register a new commercial dealer, OEM, or corporate account"
      footer={
        <div className="modal-actions-bar">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Save Customer
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="customer-form">
        <div className="form-grid-2">
          <FormField label="Customer / Business Name" id="cust-name" required error={errors.name}>
            <input
              type="text"
              id="cust-name"
              className="form-input"
              placeholder="e.g. Bharat Precision Tools Pvt Ltd"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </FormField>

          <FormField label="Contact Person" id="cust-contact" required error={errors.contactPerson}>
            <input
              type="text"
              id="cust-contact"
              className="form-input"
              placeholder="e.g. Ramesh Joshi"
              value={formData.contactPerson}
              onChange={(e) => handleChange('contactPerson', e.target.value)}
            />
          </FormField>
        </div>

        <div className="form-grid-3">
          <FormField label="Designation / Role" id="cust-desig">
            <input
              type="text"
              id="cust-desig"
              className="form-input"
              placeholder="e.g. Head of Purchasing"
              value={formData.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
            />
          </FormField>

          <FormField label="Phone Number" id="cust-phone" required error={errors.phone}>
            <input
              type="tel"
              id="cust-phone"
              className="form-input"
              placeholder="+91 98200 12345"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </FormField>

          <FormField label="WhatsApp Number" id="cust-wa">
            <input
              type="tel"
              id="cust-wa"
              className="form-input"
              placeholder="+91 98200 12345 (Optional if same as phone)"
              value={formData.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
            />
          </FormField>
        </div>

        <div className="form-grid-2">
          <FormField label="Email Address" id="cust-email" required error={errors.email}>
            <input
              type="email"
              id="cust-email"
              className="form-input"
              placeholder="name@company.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </FormField>

          <FormField label="City" id="cust-city" required error={errors.city}>
            <input
              type="text"
              id="cust-city"
              className="form-input"
              placeholder="e.g. Pune, Mumbai, Delhi"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </FormField>
        </div>

        <div className="form-grid-3">
          <FormField label="Customer Classification" id="cust-type">
            <select
              id="cust-type"
              className="form-select"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="Corporate OEM">Corporate OEM</option>
              <option value="Dealer">Authorized Dealer / Reseller</option>
              <option value="Retail Distributor">Retail Distributor</option>
              <option value="Institutional">Institutional Client</option>
            </select>
          </FormField>

          <FormField label="Region" id="cust-region">
            <select
              id="cust-region"
              className="form-select"
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
            >
              <option value="Western Region (Maharashtra)">Western Region (Maharashtra)</option>
              <option value="Western Region (Gujarat)">Western Region (Gujarat)</option>
              <option value="Northern Region (Delhi NCR)">Northern Region (Delhi NCR)</option>
              <option value="Northern Region (UP/NCR)">Northern Region (UP/NCR)</option>
              <option value="Southern Region (Karnataka)">Southern Region (Karnataka)</option>
              <option value="Southern Region (Tamil Nadu)">Southern Region (Tamil Nadu)</option>
            </select>
          </FormField>

          <FormField label="Credit Limit (₹)" id="cust-credit">
            <input
              type="number"
              id="cust-credit"
              className="form-input"
              min="0"
              step="50000"
              value={formData.creditLimit}
              onChange={(e) => handleChange('creditLimit', e.target.value)}
            />
          </FormField>
        </div>

        <div className="form-grid-2">
          <FormField label="GSTIN Identification" id="cust-gstin" helperText="15-character alphanumeric GST format">
            <input
              type="text"
              id="cust-gstin"
              className="form-input uppercase"
              placeholder="27AAACB1234F1Z5"
              value={formData.gstin}
              onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
            />
          </FormField>

          <FormField label="Registered Billing / Factory Address" id="cust-address">
            <input
              type="text"
              id="cust-address"
              className="form-input"
              placeholder="Industrial plot, MIDC sector, street, pin code..."
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </FormField>
        </div>

        <div style={{ marginTop: '14px' }}>
          <FormField
            label="Initial Reason for Contacting Company (Remarks)"
            id="cust-remarks"
            required
            error={errors.remarks}
            helperText="Record the original source/intent of contact (e.g. Expo inquiry, tender requirement, dealership application, or cold referral)"
          >
            <textarea
              id="cust-remarks"
              className="form-input"
              rows={2}
              placeholder="e.g. Inbound inquiry from procurement lead following IMTEX 2026 expo for high-pressure hydraulic valve requirements..."
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
