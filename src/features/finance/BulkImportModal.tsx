import React, { useState } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatINR } from '../../services/formatters';

export type DocumentType = 'quotation' | 'invoice' | 'sales_order' | 'purchase_order';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: DocumentType;
  onSuccess?: (batchResult: any) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'invoice',
  onSuccess,
}) => {
  const [docType, setDocType] = useState<DocumentType>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const resetState = () => {
    setFile(null);
    setCsvText('');
    setPreviewResult(null);
    setErrorMessage(null);
    setSuccessResult(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const url = `/api/finance/imports/templates/${docType}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${docType}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setErrorMessage('Please upload a valid .csv spreadsheet file.');
      return;
    }

    setFile(selected);
    setErrorMessage(null);
    setSuccessResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      await runPreview(content, selected.name);
    };
    reader.readAsText(selected);
  };

  const runPreview = async (csvData: string, fileName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('supabase_access_token') || '';
      const res = await fetch('/api/finance/imports/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          documentType: docType,
          fileName,
          csvData,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to preview CSV file');
      }

      setPreviewResult(json.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error parsing CSV upload.');
      setPreviewResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult || !previewResult.rows || previewResult.rows.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('supabase_access_token') || '';
      const res = await fetch('/api/finance/imports/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          documentType: docType,
          fileName: previewResult.fileName,
          fileHash: previewResult.fileHash,
          rows: previewResult.rows.map((r: any) => ({
            ...r.data,
            rowNumber: r.rowNumber,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to execute import batch');
      }

      setSuccessResult(json.data);
      if (onSuccess) onSuccess(json.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error confirming import.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Commercial Financial Bulk Import"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs text-slate-800">
        {/* Document Type Selector & Download Template */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
              Document Type:
            </span>
            <select
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value as DocumentType);
                if (file && csvText) {
                  runPreview(csvText, file.name);
                }
              }}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="invoice">Tax Invoice</option>
              <option value="quotation">Sales Quotation</option>
              <option value="sales_order">Sales Order</option>
              <option value="purchase_order">Purchase Order</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV Template
          </Button>
        </div>

        {/* Upload Dropzone */}
        {!successResult && (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50/50 transition-colors">
            <input
              type="file"
              id="bulk-csv-upload"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="bulk-csv-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="w-8 h-8 text-indigo-600 mb-2" />
              <span className="font-bold text-slate-900 text-sm">
                {file ? file.name : 'Select or Drop CSV Spreadsheet'}
              </span>
              <span className="text-slate-500 text-[11px] mt-1">
                Supports multi-line documents, GSTIN validations, and sanitizes against spreadsheet formula injection.
              </span>
            </label>
          </div>
        )}

        {/* Error banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Success result banner */}
        {successResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-sm">
                Batch {successResult.batchNumber} Processed Successfully!
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Rows</span>
                <span className="text-base font-bold font-mono text-slate-900">{successResult.totalRows}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Imported Docs</span>
                <span className="text-base font-bold font-mono text-emerald-800">{successResult.importedDocuments}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">Failed Docs</span>
                <span className="text-base font-bold font-mono text-rose-800">{successResult.failedDocuments}</span>
              </div>
            </div>
          </div>
        )}

        {/* Validation Summary Metrics */}
        {previewResult && !successResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-100 p-2 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Rows</span>
                <span className="text-sm font-bold font-mono text-slate-900">{previewResult.summary.totalRows}</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Valid Rows</span>
                <span className="text-sm font-bold font-mono text-emerald-900">{previewResult.summary.validRows}</span>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Warnings</span>
                <span className="text-sm font-bold font-mono text-amber-900">{previewResult.summary.warningRows}</span>
              </div>
              <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">Errors</span>
                <span className="text-sm font-bold font-mono text-rose-900">{previewResult.summary.errorRows}</span>
              </div>
            </div>

            {previewResult.isDuplicateAlreadyImported && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Idempotency Warning:</strong> This exact file hash has previously been imported under Batch {previewResult.duplicateBatchNumber}. Re-importing may be rejected by the server.
                </span>
              </div>
            )}

            {/* Preview Table */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="py-1.5 px-2">#</th>
                    <th className="py-1.5 px-2">Status</th>
                    <th className="py-1.5 px-2">Ref</th>
                    <th className="py-1.5 px-2">Party</th>
                    <th className="py-1.5 px-2">GSTIN</th>
                    <th className="py-1.5 px-2 text-right">Qty</th>
                    <th className="py-1.5 px-2 text-right">Rate</th>
                    <th className="py-1.5 px-2 text-right">Total</th>
                    <th className="py-1.5 px-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.rows.map((r: any) => (
                    <tr key={r.rowNumber} className={r.status === 'error' ? 'bg-rose-50/50' : r.status === 'warning' ? 'bg-amber-50/50' : ''}>
                      <td className="py-1.5 px-2 font-mono text-slate-400">{r.rowNumber}</td>
                      <td className="py-1.5 px-2">
                        <Badge
                          size="sm"
                          variant={r.status === 'valid' ? 'success' : r.status === 'warning' ? 'warning' : 'danger'}
                        >
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-2 font-mono font-bold text-slate-900">{r.docReference}</td>
                      <td className="py-1.5 px-2 font-medium">{r.data.partyName}</td>
                      <td className="py-1.5 px-2 font-mono text-[10px] text-slate-500">{r.data.gstin || '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{r.data.quantity}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{formatINR(r.data.unitPrice)}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">{formatINR(r.data.lineTotal)}</td>
                      <td className="py-1.5 px-2 text-[10px] text-slate-500">
                        {r.messages.length > 0 ? r.messages.join('; ') : 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {successResult ? 'Done' : 'Cancel'}
          </Button>

          {!successResult && previewResult && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmImport}
              disabled={isLoading || previewResult.summary.errorRows > 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Importing...
                </>
              ) : (
                `Confirm Import (${previewResult.summary.estimatedDocuments} Documents)`
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
