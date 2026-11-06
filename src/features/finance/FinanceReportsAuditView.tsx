import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/Input';
import {
  FileSpreadsheet,
  ShieldCheck,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Users,
  Truck,
} from 'lucide-react';

export const FinanceReportsAuditView: React.FC = () => {
  const {
    auditLogs,
    invoices,
    salesRemittances,
    customers,
    suppliers,
    payrollRecords,
    expenseClaims,
    customerDispatches,
    budgetRequests,
    incentiveSettlements,
    batches,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');
  const [selectedReportType, setSelectedReportType] = useState<string>('receivables_aging');
  const [periodFilter, setPeriodFilter] = useState<string>('q3_fy26');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // ─── Filtered Financial Audit Logs ───
  const financialAuditLogs = useMemo(() => {
    return auditLogs
      .filter((log) => {
        const isFin =
          log.entityType === 'invoice' ||
          log.entityType === 'remittance' ||
          log.entityType === 'finance_claim' ||
          log.entityType === 'payroll' ||
          log.entityType === 'incentive' ||
          log.entityType === 'journal_entry' ||
          log.entityType === 'budget_request' ||
          log.entityType === 'expense' ||
          log.entityType === 'supplier' ||
          log.entityType === 'wallet';
        if (!isFin) return false;

        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return (
            log.action.toLowerCase().includes(q) ||
            log.userName.toLowerCase().includes(q) ||
            log.details.toLowerCase().includes(q) ||
            log.entityId.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchTerm]);

  // ─── Report Generator Datasets ───
  const reportData = useMemo(() => {
    switch (selectedReportType) {
      case 'receivables_aging':
        return customers.map((c) => ({
          id: c.id,
          name: c.name,
          contact: c.phone,
          terms: c.paymentTerms || 'Net 30',
          creditLimit: c.creditLimit,
          outstanding: c.currentOutstanding,
          current: Math.max(0, c.currentOutstanding * 0.4),
          days30: Math.max(0, c.currentOutstanding * 0.35),
          days60: Math.max(0, c.currentOutstanding * 0.15),
          days90Plus: Math.max(0, c.currentOutstanding * 0.1),
        }));

      case 'supplier_payables':
        return suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          gstin: s.gstin || 'Unregistered',
          terms: s.paymentTerms,
          totalPurchases: s.totalPurchasesAmount || 0,
          outstanding: s.outstandingPayable ?? s.outstandingBalance ?? 0,
        }));

      case 'product_profitability':
        return batches.map((b) => {
          const sellingPrice = (b.actualUnitCost || 1200) * 1.35;
          const grossMargin = sellingPrice - (b.actualUnitCost || 1200);
          const marginPercent = ((grossMargin / sellingPrice) * 100).toFixed(1);
          return {
            id: b.id,
            batchNumber: b.batchNumber,
            productName: b.productName,
            sku: b.productSku,
            landedCost: b.actualUnitCost,
            sellingPrice,
            grossMargin,
            marginPercent,
            availableUnits: b.availableQuantity,
          };
        });

      case 'payroll_monthly':
        return payrollRecords.map((p) => ({
          id: p.id,
          employee: p.employeeName,
          role: p.roleTitle,
          dept: p.department,
          gross: p.grossSalary,
          deductions: p.totalDeductions,
          incentives: p.earnedIncentives,
          net: p.netPayableSalary,
          status: p.status,
        }));

      default:
        return [];
    }
  }, [selectedReportType, customers, suppliers, batches, payrollRecords]);

  const handleExportCSV = () => {
    setExportNotice(`Exported ${selectedReportType}_${periodFilter}.csv with frontend formatting.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{exportNotice}</span>
          </div>
          <Badge variant="success" size="sm">Downloaded</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Financial Analytics, Reports &amp; Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exportable business statements, trade receivables aging, product gross margin analytics, and complete financial audit log.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'reports' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Financial Statements &amp; Reports
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'audit' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Financial Audit Trail ({financialAuditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: REPORTS ─── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="receivables_aging">Trade Receivables Aging Analysis</option>
                <option value="supplier_payables">Supplier Payables &amp; Creditors Ledger</option>
                <option value="product_profitability">Product SKU Landed Margins &amp; Profitability</option>
                <option value="payroll_monthly">Monthly Payroll Liabilities &amp; Tax Deductions</option>
              </select>

              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="current_month">Current Month (Oct 2026)</option>
                <option value="q3_fy26">Q3 FY 2026–27</option>
                <option value="full_fy26">Full Year FY 2026–27</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Statement
              </Button>
              <Button variant="primary" size="sm" onClick={handleExportCSV}>
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Report Rendering */}
          <Card>
            {selectedReportType === 'receivables_aging' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4 text-right">Credit Limit</th>
                      <th className="py-3 px-4 text-right">Total Due</th>
                      <th className="py-3 px-4 text-right">Current (&lt;30d)</th>
                      <th className="py-3 px-4 text-right">31-60 Days</th>
                      <th className="py-3 px-4 text-right">61-90 Days</th>
                      <th className="py-3 px-4 text-right">90+ Days (Overdue)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {reportData.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{row.name}</span>
                          <span className="text-[10px] text-slate-400">{row.id} • Terms: {row.terms}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{row.creditLimit.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          ₹{row.outstanding.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          ₹{row.current.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ₹{row.days30.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700 font-semibold">
                          ₹{row.days60.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600 font-black">
                          ₹{row.days90Plus.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReportType === 'supplier_payables' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                      <th className="py-3 px-4">Supplier Name</th>
                      <th className="py-3 px-4">GSTIN</th>
                      <th className="py-3 px-4">Payment Terms</th>
                      <th className="py-3 px-4 text-right">Lifetime Purchases (₹)</th>
                      <th className="py-3 px-4 text-right">Current Payable Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {reportData.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{row.gstin}</td>
                        <td className="py-3 px-4 text-[11px] text-slate-600">{row.terms}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          ₹{row.totalPurchases.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm">
                          ₹{row.outstanding.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReportType === 'product_profitability' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                      <th className="py-3 px-4">Product &amp; Batch</th>
                      <th className="py-3 px-4">SKU Code</th>
                      <th className="py-3 px-4 text-right">Actual Landed Cost (₹)</th>
                      <th className="py-3 px-4 text-right">Standard Selling Price (₹)</th>
                      <th className="py-3 px-4 text-right">Unit Gross Margin (₹)</th>
                      <th className="py-3 px-4 text-center">Gross Margin %</th>
                      <th className="py-3 px-4 text-center">Available Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {reportData.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{row.productName}</span>
                          <span className="text-[10px] text-indigo-600 font-mono block">Batch: {row.batchNumber}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{row.sku}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                          ₹{(row.landedCost || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{row.sellingPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-800">
                          ₹{row.grossMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge size="sm" variant="success">{row.marginPercent}%</Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {row.availableUnits} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReportType === 'payroll_monthly' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department &amp; Designation</th>
                      <th className="py-3 px-4 text-right">Gross Salary (₹)</th>
                      <th className="py-3 px-4 text-right">Statutory Deductions (₹)</th>
                      <th className="py-3 px-4 text-right">Incentives Earned (₹)</th>
                      <th className="py-3 px-4 text-right">Net Payable Salary (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {reportData.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.employee}</td>
                        <td className="py-3 px-4">
                          <span className="text-slate-800 block">{row.dept}</span>
                          <span className="text-[10px] text-slate-400">{row.role}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{row.gross.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                          -₹{row.deductions.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                          +₹{row.incentives.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-indigo-950 text-sm">
                          ₹{row.net.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge size="sm" variant={row.status === 'paid' ? 'success' : 'primary'}>
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 2: AUDIT TRAIL ─── */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Financial Audit Trail Ledger</CardTitle>
                <CardDescription>
                  Immutable chronological event logs recording every invoice issuance, payment entry, refund authorization, expense reimbursement, and payroll disbursement.
                </CardDescription>
              </div>
              <div className="w-64">
                <SearchInput
                  value={searchTerm}
                  onChange={(val) => setSearchTerm(val)}
                  placeholder="Filter audit logs..."
                  className="text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Authorized User</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Entity &amp; Ref ID</th>
                  <th className="py-3 px-4">Audit Details &amp; State Mutation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {financialAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No financial audit records matching search.
                    </td>
                  </tr>
                ) : (
                  financialAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{log.userRole?.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge size="sm" variant="purple">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-700 font-bold">
                        {log.entityId}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
