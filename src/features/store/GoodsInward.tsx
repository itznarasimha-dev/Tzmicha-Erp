import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { InwardReceipt } from '../../types';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { PackageCheck, Plus, CheckCircle2, Truck, AlertCircle, FileText, ArrowRight } from 'lucide-react';

export const GoodsInward: React.FC = () => {
  const {
    inwardReceipts,
    products,
    warehouses,
    currentUser,
    createInwardReceipt,
    processInwardReceipt,
  } = useErpStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  // Form states for scheduling new inward
  const [supplierName, setSupplierName] = useState('ChemTech Specialties India');
  const [supplierInvoice, setSupplierInvoice] = useState('INV-CTS-9920');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState(`B-2610-${Math.floor(10 + Math.random() * 89)}`);
  const [receivedQty, setReceivedQty] = useState('100');
  const [storageLocationId, setStorageLocationId] = useState('loc-n1-a1');
  const [manufacturingDate, setManufacturingDate] = useState('2026-10-15');
  const [expiryDate, setExpiryDate] = useState('2027-10-15');
  const [notes, setNotes] = useState('Consignment received with manufacturer test certificate.');

  const regionalWarehouses = warehouses.filter((w) => w.regionId === currentUser.assignedRegionId);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(regionalWarehouses[0]?.id || 'wh-north-01');

  const myReceipts = inwardReceipts.filter((r) => r.regionId === currentUser.assignedRegionId);

  const handleProcessReceipt = (receiptId: string) => {
    const result = processInwardReceipt(receiptId);
    if (result.success) {
      setSuccessBanner(result.message);
      setTimeout(() => setSuccessBanner(''), 4500);
    }
  };

  const handleCreateInward = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    createInwardReceipt({
      date: new Date().toISOString().split('T')[0],
      supplierName,
      supplierInvoiceNumber: supplierInvoice,
      regionId: currentUser.assignedRegionId,
      warehouseId: selectedWarehouseId,
      storageLocationId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      batchNumber,
      manufacturingDate,
      expiryDate,
      receivedQuantity: parseFloat(receivedQty) || 50,
      unit: product.unit,
      actualUnitCost: product.actualCost, // Restrained pass-through
      status: 'expected',
      receivedByUserId: currentUser.id,
      receivedByUserName: currentUser.name,
      attachmentFileName: 'delivery_challan_scan.pdf',
      notes,
    });

    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Goods Inward & Physical Batch Registration
            <Badge variant="warning" size="sm">Noida Warehouse</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Expected Receipt → Physical Inspection → Batch Registration → Stock Active & Available.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Schedule Expected Inward
        </Button>
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{successBanner}</span>
        </div>
      )}

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Inward Receipts Ledger</CardTitle>
            <CardDescription>
              Stock is posted to regional available inventory only after physical receipt verification.
            </CardDescription>
          </div>
        </CardHeader>

        <div className="space-y-4">
          {myReceipts.map((r) => {
            const isCompleted = r.status === 'stock_available';
            return (
              <div
                key={r.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCompleted ? 'border-slate-200 bg-white/70' : 'border-amber-300 bg-amber-50/20'
                } space-y-3`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 font-mono">{r.receiptNumber}</span>
                      <Badge variant={isCompleted ? 'success' : 'warning'} size="sm">
                        {isCompleted ? 'Stock Active & Available' : 'Consignment Expected / At Gate'}
                      </Badge>
                      <span className="text-xs text-slate-400">Date: {r.date}</span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1">
                      Supplier: <strong className="text-slate-900">{r.supplierName}</strong> (Invoice: {r.supplierInvoiceNumber})
                    </div>
                  </div>

                  {!isCompleted ? (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleProcessReceipt(r.id)}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Receive & Post to Active Stock
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Posted to Inventory</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 rounded-lg bg-slate-50 border">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Product & SKU</span>
                    <div className="font-bold text-slate-900">{r.productName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.productSku}</div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Batch Registered</span>
                    <div className="font-extrabold text-indigo-700 font-mono">{r.batchNumber}</div>
                    <div className="text-[10px] text-slate-500">Exp: {r.expiryDate}</div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Quantity Received</span>
                    <div className="font-extrabold text-slate-900">{r.receivedQuantity} {r.unit}</div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Storage Bin</span>
                    <div className="font-semibold text-slate-800">{r.storageLocationId}</div>
                    <div className="text-[10px] text-slate-400">Recorded by {r.receivedByUserName}</div>
                  </div>
                </div>

                {r.notes && (
                  <p className="text-xs text-slate-500 italic">Notes: {r.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Schedule Inward Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register Inward Consignment & Batch"
        description="Captures supplier delivery details, manufacturing batch code, and quantity for physical gate check."
      >
        <form onSubmit={handleCreateInward} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Supplier Name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
            />
            <Input
              label="Supplier Invoice / Delivery Challan #"
              value={supplierInvoice}
              onChange={(e) => setSupplierInvoice(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Product Received"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              options={products.map((p) => ({ label: `${p.name} (${p.unit})`, value: p.id }))}
            />
            <Select
              label="Destination Warehouse"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              options={regionalWarehouses.map((w) => ({ label: w.name, value: w.id }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Manufacturing Batch Number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. B-2610-95"
              required
            />
            <Input
              label="Received Quantity"
              type="number"
              value={receivedQty}
              onChange={(e) => setReceivedQty(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Manufacturing Date"
              type="date"
              value={manufacturingDate}
              onChange={(e) => setManufacturingDate(e.target.value)}
              required
            />
            <Input
              label="Expiry Date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Storage Bay / Location Bin"
            value={storageLocationId}
            onChange={(e) => setStorageLocationId(e.target.value)}
            placeholder="e.g. AISLE-02-BAY-B"
            required
          />

          <Input
            label="Inward Notes & Quality Observations"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Register Consignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
