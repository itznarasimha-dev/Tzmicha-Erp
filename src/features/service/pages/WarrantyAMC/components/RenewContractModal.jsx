import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import { formatDate } from '../../../utils/formatters';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function RenewContractModal({ isOpen, onClose, contract, onConfirm }) {
  const [extensionMonths, setExtensionMonths] = useState('12');
  const [amcType, setAmcType] = useState('Comprehensive AMC');
  const [additionalVisits, setAdditionalVisits] = useState('4');

  useEffect(() => {
    if (contract) {
      setAmcType(contract.amcType && contract.amcType !== 'No AMC (Per-Call Basis)' ? contract.amcType : 'Comprehensive AMC');
      setExtensionMonths('12');
      setAdditionalVisits('4');
    }
  }, [contract]);

  if (!isOpen || !contract) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(contract.id, {
      extensionMonths: Number(extensionMonths),
      newAmcType: amcType,
      additionalVisits: Number(additionalVisits)
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Renew AMC Contract — ${contract.customerName}`}
      size="medium"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Covered Asset</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{contract.productName}</div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
            Contract #: <strong className="font-mono text-primary">{contract.contractNumber || contract.amcContractNo || contract.id}</strong>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="extensionMonths">Extension Duration:</label>
          <select
            id="extensionMonths"
            className="form-control"
            value={extensionMonths}
            onChange={(e) => setExtensionMonths(e.target.value)}
            required
          >
            <option value="6">6 Months Extension</option>
            <option value="12">12 Months (1 Year Standard)</option>
            <option value="24">24 Months (2 Year Comprehensive)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="amcType">Maintenance Plan Tier:</label>
          <select
            id="amcType"
            className="form-control"
            value={amcType}
            onChange={(e) => setAmcType(e.target.value)}
            required
          >
            <option value="Comprehensive (Parts + Labour)">Comprehensive (All Parts & Labour Included)</option>
            <option value="Non-Comprehensive AMC">Non-Comprehensive (Labour Free, Parts Charged)</option>
            <option value="Standard Inspection Only">Standard Inspection & Routine Tune-up</option>
            <option value="Calibration & Traceability Plan">Calibration & ISO Traceability Plan</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="additionalVisits">Covered Periodic Service Visits:</label>
          <input
            id="additionalVisits"
            type="number"
            min="1"
            max="24"
            className="form-control"
            value={additionalVisits}
            onChange={(e) => setAdditionalVisits(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm btn-icon-text">
            <ShieldCheck size={15} />
            <span>Confirm Agreement Renewal</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
