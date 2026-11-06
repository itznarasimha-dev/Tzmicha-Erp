import { User, Mail, Phone, Briefcase, Building, MapPin, Edit3 } from 'lucide-react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';

export default function ProfileModal({ isOpen, onClose, onOpenSettings }) {
  const { userProfile, userRole } = useSales();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile"
      subtitle="Commercial sales credentials and organizational role"
      maxWidth="max-w-md"
    >
      <div className="profile-view-body" style={{ textAlign: 'center', padding: '10px 0' }}>
        {/* Avatar */}
        <div style={{ margin: '0 auto 16px auto', width: '80px', height: '80px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800' }}>
          {userProfile.avatarUrl ? (
            <img src={userProfile.avatarUrl} alt={userProfile.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : <User size={36} />
          )}
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
          {userProfile.fullName || 'Vikram Mehta'}
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
          {userProfile.jobTitle || 'Senior Sales Representative'} • {userProfile.employeeId || 'APX-EMP-4091'}
        </p>

        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: userRole === 'sales_manager' ? '#ede9fe' : '#e0f2fe', color: userRole === 'sales_manager' ? '#6d28d9' : '#0369a1', marginBottom: '24px' }}>
          Role: {userRole === 'sales_manager' ? 'Sales Manager / Elevated' : 'Sales Representative'}
        </span>

        {/* Info Grid */}
        <div style={{ textAlign: 'left', background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={16} color="#64748b" />
            <span style={{ color: '#475569' }}>{userProfile.email || 'vikram.mehta@apexerpsolutions.demo'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Phone size={16} color="#64748b" />
            <span style={{ color: '#475569' }}>{userProfile.phone || '+91 98200 45678'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building size={16} color="#64748b" />
            <span style={{ color: '#475569' }}>{userProfile.department || 'Industrial Sales & Distribution'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={16} color="#64748b" />
            <span style={{ color: '#475569' }}>Reports to: {userProfile.reportingManager || 'Ananya Roy'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={16} color="#64748b" />
            <span style={{ color: '#475569' }}>{userProfile.officeLocation || 'Pune Regional HQ (MIDC Bhosari)'}</span>
          </div>
        </div>

        {userProfile.bio && (
          <div style={{ textAlign: 'left', marginTop: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
            <strong>Summary:</strong> {userProfile.bio}
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary btn-icon-text"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
          >
            <Edit3 size={14} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
