import React, { useState, useMemo } from 'react';
import { X, Package, Send, AlertCircle, Building, CheckCircle2, Truck, ShoppingBag } from 'lucide-react';
import { useSchedule } from '../../../context/ScheduleContext';
import { useRole } from '../../../context/RoleContext';

export default function NewPartRequestModal({ isOpen, onClose, onSubmit, defaultServiceRequestId = null }) {
  const { serviceRequests, spareParts, products } = useSchedule();
  const { roleId, currentRole } = useRole();

  const [serviceRequestId, setServiceRequestId] = useState(
    defaultServiceRequestId || serviceRequests[0]?.id || 'SR-2026-001'
  );

  // Dependent Category & Equipment Selection
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('All');
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [partId, setPartId] = useState(spareParts[0]?.id || 'SP-101');
  const [requestedQty, setRequestedQty] = useState('1');
  const [requiredDate, setRequiredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );

  // Fulfilment Method: 'engineer_collect' | 'store_deliver'
  const [fulfilmentMethod, setFulfilmentMethod] = useState('engineer_collect');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedSR = serviceRequests.find((s) => s.id === serviceRequestId) || serviceRequests[0];

  // Distinct categories
  const categories = ['All', ...Array.from(new Set(spareParts.map((p) => p.category)))];

  // Compatible equipment filtered by category
  const availableEquipment = useMemo(() => {
    let eqList = products;
    if (selectedCategory !== 'All') {
      const partsInCat = spareParts.filter((p) => p.category === selectedCategory);
      const prodIds = new Set(partsInCat.map((p) => p.compatibleProductId));
      eqList = products.filter((p) => prodIds.has(p.id));
    }
    return eqList;
  }, [selectedCategory, products, spareParts]);

  // Filtered parts based on dependent category, equipment & search query
  const filteredParts = useMemo(() => {
    return spareParts.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesEq = selectedEquipmentId === 'All' || p.compatibleProductId === selectedEquipmentId;
      const q = partSearchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.specification && p.specification.toLowerCase().includes(q));
      return matchesCat && matchesEq && matchesQuery;
    });
  }, [spareParts, selectedCategory, selectedEquipmentId, partSearchQuery]);

  if (!isOpen) return null;

  const selectedPart = spareParts.find((p) => p.id === partId) || filteredParts[0] || spareParts[0];

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setSelectedEquipmentId('All');
    const partsInCat = cat === 'All' ? spareParts : spareParts.filter((p) => p.category === cat);
    if (partsInCat.length > 0) {
      setPartId(partsInCat[0].id);
    }
  };

  const handleEquipmentChange = (eqId) => {
    setSelectedEquipmentId(eqId);
    const partsWithEq = spareParts.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesEq = eqId === 'All' || p.compatibleProductId === eqId;
      return matchesCat && matchesEq;
    });
    if (partsWithEq.length > 0) {
      setPartId(partsWithEq[0].id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPart) {
      setError('Please select a valid inventory spare part.');
      return;
    }
    if (Number(requestedQty) <= 0) {
      setError('Requested quantity must be at least 1.');
      return;
    }

    if (onSubmit) {
      onSubmit(
        {
          serviceRequestId: selectedSR.id,
          customerId: selectedSR.customerId,
          customerName: selectedSR.customerName,
          productName: selectedSR.productName,
          requestedBy: `${currentRole.profile.name} (${currentRole.label})`,
          partId: selectedPart.id,
          partCode: selectedPart.code || selectedPart.id,
          partName: selectedPart.name,
          specification: selectedPart.specification,
          uom: selectedPart.uom || 'Pcs',
          requestedQty: Number(requestedQty),
          requiredDate,
          fulfilmentMethod,
          deliveryAddress: fulfilmentMethod === 'store_deliver' ? (deliveryAddress || selectedSR.serviceLocation) : 'Store Collection',
          reason: reason || 'Required for ticket troubleshooting and component replacement.',
          remarks
        },
        roleId
      );
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '760px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Request Parts for Job
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Requisition existing inventory items for customer service execution
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Material Request Submitted!
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Requisition recorded under <strong>{selectedSR.id}</strong>. Sent for{' '}
              {roleId === 'manager' || roleId === 'coordinator' ? 'Store Manager Approval' : 'Manager Approval'}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#b91c1c' }}>
                  {error}
                </div>
              )}

              {/* SECTION A: SERVICE DETAILS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  Section A: Service Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Linked Service Request *
                    </label>
                    <select
                      className="form-control"
                      value={serviceRequestId}
                      onChange={(e) => setServiceRequestId(e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      {serviceRequests.map((sr) => (
                        <option key={sr.id} value={sr.id}>
                          {sr.id} — {sr.customerName} ({sr.serviceCategory})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Required By Date *
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={requiredDate}
                      onChange={(e) => setRequiredDate(e.target.value)}
                      required
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Customer ID & Name
                    </label>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                      <span style={{ color: '#2563eb', fontFamily: 'monospace' }}>{selectedSR.customerId}</span> — {selectedSR.customerName}
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Equipment & Assigned Engineer
                    </label>
                    <div style={{ fontSize: '12px', color: '#334155' }}>
                      <strong>{selectedSR.productName}</strong> • {selectedSR.assignedEngineerName || 'Unassigned'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: MATERIAL DETAILS (With Dependent Category & Equipment Selection) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', backgroundColor: '#ffffff' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  Section B: Material Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      1. Part Category (Dependent Filter)
                    </label>
                    <select
                      className="form-control"
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c === 'All' ? 'All Categories' : c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      2. Compatible Equipment Filter
                    </label>
                    <select
                      className="form-control"
                      value={selectedEquipmentId}
                      onChange={(e) => handleEquipmentChange(e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      <option value="All">All Compatible Equipment</option>
                      {availableEquipment.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} ({eq.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Search Bar for Inventory Parts */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Search Inventory Parts (Filter by Code, Name, or Specification)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by part code, keyword or specification (e.g. SP-101, Seal, Valve, Filter)..."
                    value={partSearchQuery}
                    onChange={(e) => setPartSearchQuery(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      3. Select Available Spare Part *
                    </label>
                    <select
                      className="form-control"
                      value={partId}
                      onChange={(e) => setPartId(e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      {filteredParts.length === 0 ? (
                        <option disabled>No parts found for selected filters</option>
                      ) : (
                        filteredParts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code || p.id} — {p.name} ({p.specification}) • In Stock: {p.availableQty} {p.uom || 'units'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Requested Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={requestedQty}
                      onChange={(e) => setRequestedQty(e.target.value)}
                      required
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                </div>

                {/* 10-Field Compliance Overview Card */}
                {selectedPart && (
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Part Code / ID</span>
                      <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{selectedPart.code || selectedPart.id}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Part Name</span>
                      <strong style={{ color: '#0f172a' }}>{selectedPart.name}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Specification</span>
                      <strong style={{ color: '#0f172a' }}>{selectedPart.specification || 'Standard Industrial Grade'}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Part Category</span>
                      <strong style={{ color: '#0f172a' }}>{selectedPart.category}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Compatible Equipment</span>
                      <strong style={{ color: '#0f172a' }}>{selectedPart.compatibleProductName || 'Multi-Product Compatibility'}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Available In Store</span>
                      <strong style={{ color: selectedPart.availableQty > 0 ? '#16a34a' : '#dc2626' }}>
                        {selectedPart.availableQty} {selectedPart.uom || 'Pcs'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION C: FULFILMENT METHOD (Option A vs Option B) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', backgroundColor: '#ffffff' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  Section C: Fulfilment Method
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <label
                    style={{
                      border: `1.5px solid ${fulfilmentMethod === 'engineer_collect' ? '#2563eb' : '#cbd5e1'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      backgroundColor: fulfilmentMethod === 'engineer_collect' ? '#eff6ff' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <input
                      type="radio"
                      name="fulfilmentMethod"
                      value="engineer_collect"
                      checked={fulfilmentMethod === 'engineer_collect'}
                      onChange={() => setFulfilmentMethod('engineer_collect')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShoppingBag size={14} className="text-primary" />
                        Option A — Engineer Collects from Store
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                        The field engineer collects approved parts from the company store and carries them to the site. Tracked via Collection Checklist.
                      </p>
                    </div>
                  </label>

                  <label
                    style={{
                      border: `1.5px solid ${fulfilmentMethod === 'store_deliver' ? '#2563eb' : '#cbd5e1'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      backgroundColor: fulfilmentMethod === 'store_deliver' ? '#eff6ff' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <input
                      type="radio"
                      name="fulfilmentMethod"
                      value="store_deliver"
                      checked={fulfilmentMethod === 'store_deliver'}
                      onChange={() => setFulfilmentMethod('store_deliver')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Truck size={14} className="text-primary" />
                        Option B — Store Delivers to Customer
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                        The Store Manager arranges dispatch and delivery of approved spare parts directly to the customer service site.
                      </p>
                    </div>
                  </label>
                </div>

                {fulfilmentMethod === 'store_deliver' && (
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      Delivery Site Address
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={selectedSR.serviceLocation || 'Customer site address'}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                )}
              </div>

              {/* Justification & Remarks */}
              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  Reason for Material Requisition *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Labyrinth seal burst, replacement spool required for pressure calibration"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  Additional Remarks / Instructions
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g., Critical emergency line stop; immediate issue requested."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#f8fafc'
              }}
            >
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '13px' }}>
                Submit Requisition
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
