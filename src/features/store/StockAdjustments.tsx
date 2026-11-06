import React, { useState } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { SlidersHorizontal, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StockAdjustment } from '../../types';

export const StockAdjustments: React.FC = () => {
  const { stockAdjustments, batches, currentUser, requestStockAdjustment } = useErpStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [difference, setDifference] = useState('-2');
  const [reason, setReason] = useState<StockAdjustment['reason']>('damage');
  const [notes, setNotes] = useState('Forklift handling accident caused drum puncture in Bay-B');

  const myBatches = batches.filter((b) => b.regionId === currentUser.assignedRegionId);
  const myAdjustments = stockAdjustments.filter((a) => a.regionId === currentUser.assignedRegionId);

  const handleOpenModal = () => {
    if (myBatches.length > 0) setSelectedBatchId(myBatches[0].id);
    setModalOpen(true);
  };

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !difference) return;

    requestStockAdjustment(selectedBatchId, parseInt(difference), reason, notes);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Stock Adjustments & Physical Discrepancies
            <Badge variant="warning" size="sm">Audit Reconciliation</Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log physical damages, chemical leakages, container punctures, or periodic physical count variances.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Report Discrepancy / Write-off
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Discrepancy & Adjustment Log</CardTitle>
            <CardDescription>
              All adjustments require Admin approval before permanently reducing ledger stock balances.
            </CardDescription>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {myAdjustments.map((a) => (
            <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-white/70 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900 font-mono">{a.adjustmentNumber}</span>
                  <Badge
                    size="sm"
                    variant={a.status === 'approved' ? 'success' : 'warning'}
                    className="capitalize"
                  >
                    {a.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-[11px] text-slate-400 capitalize">Reason: {a.reason}</span>
                </div>

                <div className="text-right">
                  <span className={`font-extrabold text-sm ${a.difference < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {a.difference > 0 ? `+${a.difference}` : a.difference} units
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (Prev: {a.previousQuantity} → Final: {a.newQuantity})
                  </span>
                </div>
              </div>

              <div className="text-slate-700">
                Product: <strong className="text-slate-900">{a.productName}</strong> (Batch: {a.batchNumber})
              </div>

              <p className="text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                Reason & Notes: {a.notes}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Report Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Report Stock Discrepancy / Damage"
        description="Records physical variance and routes request to Admin for write-off approval."
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <Select
            label="Select Affected Batch"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            options={myBatches.map((b) => ({
              label: `${b.productName} — Batch ${b.batchNumber} (${b.availableQuantity} available)`,
              value: b.id,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity Difference (+ / -)"
              type="number"
              value={difference}
              onChange={(e) => setDifference(e.target.value)}
              hint="Use negative value for damage/spillage (e.g. -2)"
              required
            />
            <Select
              label="Discrepancy Cause"
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              options={[
                { label: 'Container Damage / Handling', value: 'damage' },
                { label: 'Chemical Leakage / Puncture', value: 'leakage' },
                { label: 'Physical Spillage during Decanting', value: 'spillage' },
                { label: 'Physical Count Discrepancy', value: 'count_discrepancy' },
                { label: 'Promotional Sample Dispensed', value: 'sample_dispensed' },
                { label: 'Expired Product Write-off', value: 'expired_writeoff' },
              ]}
            />
          </div>

          <Input
            label="Detailed Incident Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Pallet slipped during loading in Bay-A"
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Discrepancy Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
