import { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, Briefcase, ShieldAlert } from 'lucide-react';
import Modal from '../common/Modal';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const { signIn, signUp, userProfile } = useSales();
  const { showToast } = useToast();

  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
  const [formData, setFormData] = useState({
    email: userProfile.email || 'vikram.mehta@apexerpsolutions.demo',
    password: 'demoPassword123',
    fullName: '',
    employeeId: '',
    jobTitle: '',
  });

  const handleSignIn = (e) => {
    e.preventDefault();
    if (!formData.email) {
      showToast('Please enter your work email', 'danger');
      return;
    }
    signIn();
    showToast(`Welcome back, ${userProfile.fullName || 'User'}! Simulated session active.`, 'success');
    onClose();
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) {
      showToast('Full name and work email are required', 'danger');
      return;
    }
    signUp({
      fullName: formData.fullName,
      email: formData.email,
      employeeId: formData.employeeId || 'APX-EMP-NEW',
      jobTitle: formData.jobTitle || 'Sales Representative',
    });
    showToast(`Account created for ${formData.fullName}! Simulated session active.`, 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'signin' ? 'Sign In to ApexERP' : 'Register New Employee Account'}
      subtitle="Sales & Distribution Enterprise Portal"
      maxWidth="max-w-md"
    >
      <div style={{ marginBottom: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <ShieldAlert size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span style={{ fontSize: '12px', color: '#1e40af' }}>
          <strong>Frontend Demonstration:</strong> This operates a browser-simulated session without remote server authentication.
        </span>
      </div>

      {mode === 'signin' ? (
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Work Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '34px' }}
                placeholder="name@company.demo"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              ERP Access Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '34px' }}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Default demo password prefilled
            </span>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', cursor: 'pointer', padding: 0 }}
              onClick={() => setMode('signup')}
            >
              Don&apos;t have an account? Sign Up
            </button>
            <button type="submit" className="btn btn-primary btn-icon-text">
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                required
                className="form-input"
                style={{ paddingLeft: '34px' }}
                placeholder="e.g. Ramesh Kumar"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Work Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '34px' }}
                placeholder="ramesh@company.demo"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
              Job Title
            </label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '34px' }}
                placeholder="e.g. Sales Executive"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', cursor: 'pointer', padding: 0 }}
              onClick={() => setMode('signin')}
            >
              Already registered? Sign In
            </button>
            <button type="submit" className="btn btn-primary btn-icon-text">
              <UserPlus size={14} />
              <span>Create Account</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
