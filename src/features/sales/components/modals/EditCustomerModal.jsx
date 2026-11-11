import { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function EditCustomerModal({ isOpen, onClose, customer }) {
  const { customers, updateCustomer, userRole } = useSales();
  const { showToast } = useToast();

  const canManageCreditAndStatus = userRole === 'sales_manager' || userRole === 'sales_coordinator' || userRole === 'admin';

  // Fetch the latest saved record from database by ID or Customer ID
  const customerRecord = useMemo(() => {
    if (!customer) return null;
    const lookupId = customer.id || customer.customerId || customer.code;
    return (
      customers.find(
        (c) =>
          c.id === lookupId ||
          c.customerId === lookupId ||
          c.code === lookupId ||
          (c.name && customer.name && c.name.trim().toLowerCase() === customer.name.trim().toLowerCase())
      ) || customer
    );
  }, [customer, customers]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Distributor/Dealer',
    contactPerson: '',
    designation: '',
    phone: '',
    whatsapp: '',
    email: '',
    gstin: '',
    creditLimit: 500000,
    city: '',
    region: '',
    status: 'Active',
    address: '',
    remarks: '',
  });

  const [errors, setErrors] = useState({});

  // Populate form with the selected customer's saved details whenever modal opens or customer changes
  useEffect(() => {
    if (customerRecord && isOpen) {
      const extractedDesignation =
        customerRecord.designation || (customerRecord.contactPerson?.match(/\((.*?)\)/)?.[1] || '');
      const cleanContactPerson = customerRecord.contactPerson
        ? customerRecord.contactPerson.replace(/\s*\(.*?\)/, '').trim()
        : '';

      setFormData({
        name: customerRecord.name || '',
        type: customerRecord.type || 'Distributor/Dealer',
        contactPerson: cleanContactPerson,
        designation: extractedDesignation,
        phone: customerRecord.phone || '',
        whatsapp: customerRecord.whatsapp || '',
        email: customerRecord.email || '',
        gstin: customerRecord.gstin || '',
        creditLimit: customerRecord.creditLimit ?? 500000,
        city: customerRecord.city || '',
        region: customerRecord.region || '',
        status: customerRecord.status || 'Active',
        address: customerRecord.address || '',
        remarks: customerRecord.remarks || '',
      });
      setErrors({});
    }
  }, [customerRecord, isOpen]);

  if (!customerRecord) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Business name is required';
    if (!formData.contactPerson.trim()) errs.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    if (!formData.email.trim()) errs.email = 'Email address is required';
    if (!formData.city.trim()) errs.city = 'City is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please fix the errors in the customer form', 'danger');
      return;
    }

    try {
      const fullContact = formData.designation
        ? `${formData.contactPerson} (${formData.designation})`
        : formData.contactPerson;

      const payload = {
        ...formData,
        contactPerson: fullContact,
        designation: formData.designation,
        gstin: formData.gstin ? formData.gstin.trim() : '',
        creditLimit: canManageCreditAndStatus ? Number(formData.creditLimit) : customerRecord.creditLimit,
        status: canManageCreditAndStatus ? formData.status : customerRecord.status || 'Active',
      };

      updateCustomer(customerRecord.id, payload);
      showToast(`Customer "${formData.name}" updated successfully`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update customer', 'danger');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Customer: ${customerRecord.name}`}
      subtitle={`Customer ID: ${customerRecord.customerId || customerRecord.code || customerRecord.id} • ${customerRecord.city || ''}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="customer-form">
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <FormField
            label="Customer / Business Name *"
            name="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Customer Type *
            </label>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="Distributor/Dealer">Distributor/Dealer</option>
              <option value="Retailer">Retailer</option>
              <option value="End Customer">End Customer</option>
              <option value="Corporate/Institutional Customer">Corporate/Institutional Customer</option>
              <option value="Corporate OEM">Corporate OEM</option>
            </select>
          </div>

          <FormField
            label="Contact Person *"
            name="contactPerson"
            required
            placeholder="e.g. Rajesh Deshmukh"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            error={errors.contactPerson}
          />

          <FormField
            label="Designation / Role"
            name="designation"
            placeholder="e.g. VP Procurement, Sourcing Lead"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
          />

          <FormField
            label="Phone Number *"
            name="phone"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone}
          />

          <FormField
            label="WhatsApp Number"
            name="whatsapp"
            placeholder="+91 98XXX XXXXX"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          />

          <FormField
            label="Email Address *"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />

          <FormField
            label="City *"
            name="city"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            error={errors.city}
          />

          <FormField
            label="Region / State"
            name="region"
            placeholder="e.g. Western Region (Maharashtra)"
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          />

          {/* GST Details - Editable across all sales roles */}
          <FormField
            label="GSTIN / Tax ID"
            name="gstin"
            placeholder="e.g. 27AABCM8291F1Z8"
            value={formData.gstin}
            onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
          />

          {/* Credit Limit & Status */}
          {canManageCreditAndStatus ? (
            <>
              <FormField
                label="Credit Limit (₹)"
                name="creditLimit"
                type="number"
                min="0"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              />

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Account Status *
                </label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold (Credit Review)</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Credit Limit (₹)
                </label>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                  value={Number(customerRecord.creditLimit || 0).toLocaleString('en-IN')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  Account Status
                </label>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                  value={customerRecord.status || 'Active'}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
            Remarks (Initial Reason for Contact)
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Record initial reason for contacting the company, core requirements, or reference notes"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            style={{ width: '100%', fontSize: '13px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
            Registered Address
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            style={{ width: '100%', fontSize: '13px' }}
          />
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Customer Details
          </button>
        </div>
      </form>
    </Modal>
  );
}
