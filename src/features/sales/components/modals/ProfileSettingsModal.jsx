import { useState, useEffect } from 'react';
import { User, Camera } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const { userProfile, updateUserProfile } = useSales();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: userProfile.fullName || '',
    employeeId: userProfile.employeeId || '',
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    jobTitle: userProfile.jobTitle || '',
    department: userProfile.department || '',
    reportingManager: userProfile.reportingManager || '',
    officeLocation: userProfile.officeLocation || '',
    role: userProfile.role || 'Sales Representative',
    bio: userProfile.bio || '',
    avatarUrl: userProfile.avatarUrl || '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        fullName: userProfile.fullName || '',
        employeeId: userProfile.employeeId || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        jobTitle: userProfile.jobTitle || '',
        department: userProfile.department || '',
        reportingManager: userProfile.reportingManager || '',
        officeLocation: userProfile.officeLocation || '',
        role: userProfile.role || 'Sales Representative',
        bio: userProfile.bio || '',
        avatarUrl: userProfile.avatarUrl || '',
      });
      setErrors({});
    }
  }, [isOpen, userProfile]);

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please fix the errors in the profile form', 'danger');
      return;
    }

    updateUserProfile(formData);
    showToast('Profile settings updated successfully', 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profile Settings"
      subtitle="Update your employee profile, contact details, and department assignment"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="profile-settings-form">
        {/* Avatar Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', flexShrink: 0 }}>
            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : <User size={28} />}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Profile Photo URL / Avatar
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="https://example.com/photo.jpg (Optional image URL)"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                title="Simulate photo upload"
                onClick={() => {
                  setFormData({ ...formData, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' });
                  showToast('Sample profile picture loaded', 'info');
                }}
              >
                <Camera size={14} />
              </button>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              JPEG, PNG or public web image URL
            </span>
          </div>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <FormField
            label="Full Name"
            name="fullName"
            required
            placeholder="e.g. Vikram Mehta"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            error={errors.fullName}
          />

          <FormField
            label="Employee ID"
            name="employeeId"
            required
            placeholder="e.g. APX-EMP-4091"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            error={errors.employeeId}
          />

          <FormField
            label="Email Address"
            name="email"
            type="email"
            required
            placeholder="e.g. vikram.mehta@apexerpsolutions.demo"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />

          <FormField
            label="Phone Number"
            name="phone"
            placeholder="e.g. +91 98200 45678"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <FormField
            label="Job Title"
            name="jobTitle"
            required
            placeholder="e.g. Senior Sales Representative"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            error={errors.jobTitle}
          />

          <FormField
            label="Department"
            name="department"
            placeholder="e.g. Industrial Sales & Distribution"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />

          <FormField
            label="Reporting Manager"
            name="reportingManager"
            placeholder="e.g. Ananya Roy (Head of Commercial Sales)"
            value={formData.reportingManager}
            onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
          />

          <FormField
            label="Office / Region Location"
            name="officeLocation"
            placeholder="e.g. Pune Regional HQ (MIDC Bhosari)"
            value={formData.officeLocation}
            onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            Professional Summary / Bio
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Enter brief description of professional responsibilities or territory..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
