import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { ArrowRightLeft, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export const StockTransfers: React.FC = () => {
  const { batches, warehouses, currentUser, transferStock, stockMovements } = useErpStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [sourceBatchId, setSourceBatchId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [notes, setNotes] = useState('Replenish buffer stock at secondary depot');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const myBatches = batches.filter((b) => b.regionId === currentUser.assignedRegionId && b.availableQuantity > 0);
  const allWarehouses = warehouses;

  const transferMovements = stockMovements.filter(
    (m) => m.referenceType === 'transfer' && (m.regionId === currentUser.assignedRegionId || m.performedByUserId === currentUser.id)
  );

  const handleOpenModal = () => {
    if (myBatches.length > 0) {
      setSourceBatchId(myBatches[0].id);
      const otherWh = allWarehouses.find((w) => w.id !== myBatches[0].warehouseId);
      if (otherWh) setDestWarehouseId(otherWh.id);
    }
    setModalOpen(true);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBatchId || !destWarehouseId || parseFloat(quantity) <= 0) return;

    const result = transferStock(sourceBatchId, destWarehouseId, parseFloat(quantity), notes);
    if (result.success) {
      setFeedbackMsg(result.message);
      setTimeout(() => setFeedbackMsg(''), 4500);
      setModalOpen(false);
    } else {
      alert(result.message);
    }
  };

  const selectedSourceBatch = batches.find((b) => b.id === sourceBatchId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Inter-Warehouse Stock Transfers
            <Badge variant="warning" size="sm">Logistics Transfer</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Initiate and record stock transfers between regional distribution hubs with dual-entry audit ledgers.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Initiate Stock Transfer
        </Button>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{feedbackMsg}</span>
        </div>
      )}

      {/* Transfer History Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Transfer History & Dual Ledger Logs</CardTitle>
            <CardDescription>Records paired outward and inward movements between warehouses</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Transfer Ref #</th>
                <th className="pb-3">Product Name</th>
                <th className="pb-3">Batch Number</th>
                <th className="pb-3">Movement Type</th>
                <th className="pb-3">Warehouse Involved</th>
                <th className="pb-3 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {transferMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No transfers initiated yet.
                  </td>
                </tr>
              ) : (
                transferMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 font-mono text-indigo-700 font-bold">{m.referenceId}</td>
                    <td className="py-3 font-semibold text-slate-900">{m.productName}</td>
                    <td className="py-3 font-mono text-slate-700">{m.batchNumber}</td>
                    <td className="py-3">
                      <Badge
                        variant={m.movementType === 'transfer_in' ? 'success' : 'primary'}
                        size="sm"
                        className="capitalize"
                      >
                        {m.movementType.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-800">{m.warehouseName}</td>
                    <td className="py-3 text-right font-extrabold text-slate-900">
                      {m.quantity} units
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transfer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Initiate Inter-Warehouse Transfer"
        description="Select source batch and destination warehouse. Quantities will be transferred immediately."
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          <Select
            label="Source Product & Batch"
            value={sourceBatchId}
            onChange={(e) => setSourceBatchId(e.target.value)}
            options={myBatches.map((b) => ({
              label: `${b.productName} — Batch ${b.batchNumber} (${b.availableQuantity} avail in ${warehouses.find(w => w.id === b.warehouseId)?.name})`,
              value: b.id,
            }))}
          />

          <Select
            label="Destination Warehouse"
            value={destWarehouseId}
            onChange={(e) => setDestWarehouseId(e.target.value)}
            options={allWarehouses
              .filter((w) => w.id !== selectedSourceBatch?.warehouseId)
              .map((w) => ({
                label: `${w.name} (${w.address})`,
                value: w.id,
              }))}
          />

          <Input
            label="Transfer Quantity"
            type="number"
            min="1"
            max={selectedSourceBatch?.availableQuantity || 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            hint={`Available in source batch: ${selectedSourceBatch?.availableQuantity || 0} units`}
            required
          />

          <Input
            label="Transfer Reason / Delivery Note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" icon={<ArrowRightLeft className="w-4 h-4" />}>
              Confirm Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
