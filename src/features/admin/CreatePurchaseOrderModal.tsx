import React, { useState, useEffect } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { PurchaseOrder, PurchaseOrderLine } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Plus, Trash2, Building2, Package, Calendar, UserCheck, MapPin } from 'lucide-react';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSupplierId?: string;
  onCreated?: (po: PurchaseOrder) => void;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  initialSupplierId,
  onCreated,
}) => {
  const {
    suppliers,
    products,
    regions,
    warehouses,
    users,
    currentUser,
    createPurchaseOrder,
  } = useErpStore();

  const storekeepers = users.filter((u) => u.role === 'store_manager' || u.role === 'admin');

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId || '');
  const [destinationRegionId, setDestinationRegionId] = useState('reg-north');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('wh-north-01');
  const [assignedStorekeeperId, setAssignedStorekeeperId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [expectedTransportCharges, setExpectedTransportCharges] = useState(2500);
  const [notes, setNotes] = useState('');
  const [initialStatus, setInitialStatus] = useState<'draft' | 'pending_approval' | 'approved'>('pending_approval');

  // Line Items
  const [lines, setLines] = useState<
    Array<{
      productId: string;
      orderedQty: number;
      unitPrice: number;
      taxRatePercent: number;
    }>
  >([
    {
      productId: products[0]?.id || 'prod-001',
      orderedQty: 50,
      unitPrice: products[0]?.standardPurchaseCost || 11200,
      taxRatePercent: 18,
    },
  ]);

  const [formError, setFormError] = useState('');

  // Sync initial supplier if provided
  useEffect(() => {
    if (initialSupplierId) {
      setSelectedSupplierId(initialSupplierId);
    } else if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [initialSupplierId, suppliers]);

  // Sync warehouse when region changes
  useEffect(() => {
    const regionWhs = warehouses.filter((w) => w.regionId === destinationRegionId);
    if (regionWhs.length > 0) {
      setDestinationWarehouseId(regionWhs[0].id);
    }
  }, [destinationRegionId, warehouses]);

  // Sync storekeeper default
  useEffect(() => {
    if (storekeepers.length > 0 && !assignedStorekeeperId) {
      setAssignedStorekeeperId(storekeepers[0].id);
    }
  }, [storekeepers]);

  const handleAddLine = () => {
    const p = products[0];
    setLines([
      ...lines,
      {
        productId: p?.id || '',
        orderedQty: 10,
        unitPrice: p?.standardPurchaseCost || 2000,
        taxRatePercent: 18,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    field: 'productId' | 'orderedQty' | 'unitPrice' | 'taxRatePercent',
    value: any
  ) => {
    const updated = [...lines];
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === value);
      updated[idx] = {
        ...updated[idx],
        productId: value,
        unitPrice: p?.standardPurchaseCost || p?.actualCost || 1000,
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setLines(updated);
  };

  // Calculations
  const calculatedLines: PurchaseOrderLine[] = lines.map((l, idx) => {
    const prod = products.find((p) => p.id === l.productId);
    const subtotal = l.orderedQty * l.unitPrice;
    const taxAmount = Math.round((subtotal * l.taxRatePercent) / 100);
    const lineTotal = subtotal + taxAmount;
    return {
      id: `pol-tmp-${idx}`,
      productId: l.productId,
      productSku: prod?.sku || 'SKU-GEN',
      productName: prod?.name || 'Standard Product',
      orderedQty: l.orderedQty,
      receivedQty: 0,
      acceptedQty: 0,
      shortageQty: 0,
      damagedQty: 0,
      unit: prod?.unit || 'Units',
      purchaseUnitPrice: l.unitPrice,
      expectedLandedUnitCost: Math.round(l.unitPrice * 1.05),
      taxRatePercent: l.taxRatePercent,
      taxAmount,
      lineTotal,
    };
  });

  const subtotal = calculatedLines.reduce((sum, l) => sum + l.orderedQty * l.purchaseUnitPrice, 0);
  const totalTax = calculatedLines.reduce((sum, l) => sum + (l.taxAmount || 0), 0);
  const grandTotal = subtotal + totalTax + Number(expectedTransportCharges || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const supp = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supp) {
      setFormError('Please select a valid supplier.');
      return;
    }

    if (calculatedLines.length === 0 || calculatedLines.some((l) => l.orderedQty <= 0)) {
      setFormError('All line items must have an ordered quantity greater than zero.');
      return;
    }

    const assignedSk = storekeepers.find((u) => u.id === assignedStorekeeperId);
    const orderDate = new Date().toISOString().split('T')[0];

    const newPo = createPurchaseOrder({
      supplierId: supp.id,
      supplierName: supp.name,
      orderDate,
      expectedDeliveryDate,
      destinationRegionId,
      destinationWarehouseId,
      assignedStorekeeperId: assignedSk?.id,
      assignedStorekeeperName: assignedSk?.name,
      lines: calculatedLines,
      subtotal,
      expectedTransportCharges: Number(expectedTransportCharges || 0),
      taxAmount: totalTax,
      totalCost: grandTotal,
      status: initialStatus,
      notes,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      activityHistory: [
        {
          date: new Date().toISOString(),
          action: initialStatus === 'draft' ? 'PO Draft Created' : 'PO Submitted for Approval',
          performedBy: currentUser.name,
          notes: notes || 'Purchase Order generated through Procurement Portal.',
        },
      ],
    });

    if (onCreated) {
      onCreated(newPo);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Inbound Purchase Order (PO)"
      description="Issue a formal purchase order to a contracted raw material or finished chemical supplier with regional inward routing."
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
            {formError}
          </div>
        )}

        {/* Section 1: Supplier & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Vendor / Supplier *
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white"
              required
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Expected Inward Date *
            </label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Initial Order Status</label>
            <select
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as any)}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white font-bold"
            >
              <option value="pending_approval">Pending Approval (Admin Review)</option>
              <option value="approved">Approved (Ready for Supplier)</option>
              <option value="draft">Draft (Unsubmitted)</option>
            </select>
          </div>
        </div>

        {/* Section 2: Destination Depot & Assigned Receiving Storekeeper */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Destination Region *
            </label>
            <select
              value={destinationRegionId}
              onChange={(e) => setDestinationRegionId(e.target.value)}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white"
              required
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Destination Depot *</label>
            <select
              value={destinationWarehouseId}
              onChange={(e) => setDestinationWarehouseId(e.target.value)}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white"
              required
            >
              {warehouses
                .filter((w) => w.regionId === destinationRegionId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              Assigned Storekeeper *
            </label>
            <select
              value={assignedStorekeeperId}
              onChange={(e) => setAssignedStorekeeperId(e.target.value)}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white"
              required
            >
              {storekeepers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.employeeId || u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: Ordered Products & Line Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              Ordered SKUs &amp; Unit Rates ({lines.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              icon={<Plus className="w-3 h-3" />}
            >
              Add Line
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Product / Formulation</th>
                  <th className="py-2 px-3 w-24">Qty</th>
                  <th className="py-2 px-3 w-32">Unit Price (₹)</th>
                  <th className="py-2 px-3 w-20">Tax %</th>
                  <th className="py-2 px-3 text-right w-32">Line Total</th>
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, idx) => {
                  const currentProd = products.find((p) => p.id === l.productId);
                  const lineSub = l.orderedQty * l.unitPrice;
                  const lineTotal = lineSub + Math.round((lineSub * l.taxRatePercent) / 100);

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <select
                          value={l.productId}
                          onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                          className="glass-input w-full rounded-lg px-2 py-1 text-xs text-slate-800 bg-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={l.orderedQty}
                          onChange={(e) => handleLineChange(idx, 'orderedQty', Number(e.target.value))}
                          className="glass-input w-full rounded-lg px-2 py-1 text-xs text-slate-900 font-bold"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          value={l.unitPrice}
                          onChange={(e) => handleLineChange(idx, 'unitPrice', Number(e.target.value))}
                          className="glass-input w-full rounded-lg px-2 py-1 text-xs text-slate-900 font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={l.taxRatePercent}
                          onChange={(e) => handleLineChange(idx, 'taxRatePercent', Number(e.target.value))}
                          className="glass-input w-full rounded-lg px-1.5 py-1 text-xs text-slate-800"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Freight & Logistics + Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Estimated Freight &amp; Transport Charges (₹)
            </label>
            <input
              type="number"
              min="0"
              value={expectedTransportCharges}
              onChange={(e) => setExpectedTransportCharges(Number(e.target.value))}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Incurred by carrier line haul; tracked separately from unit purchase price.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Commercial Order Notes &amp; Terms
            </label>
            <input
              type="text"
              placeholder="e.g. Test certificate required, bay 3 delivery, Net 30 days payment."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="glass-input w-full rounded-xl px-2.5 py-1.5 text-xs text-slate-800 bg-white"
            />
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-indigo-700">Order Financial Impact</span>
            <div className="text-[11px] text-slate-600">
              Subtotal: <span className="font-mono font-bold">₹{subtotal.toLocaleString('en-IN')}</span> • GST: <span className="font-mono font-bold">₹{totalTax.toLocaleString('en-IN')}</span> • Freight: <span className="font-mono font-bold">₹{Number(expectedTransportCharges || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total PO Commitment</span>
            <div className="text-lg font-bold text-indigo-900 font-mono">
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Generate Purchase Order
          </Button>
        </div>
      </form>
    </Modal>
  );
};
