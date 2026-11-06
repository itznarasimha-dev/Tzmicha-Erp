import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Users,
  DollarSign,
  Calendar,
  FileText,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Building2,
  TrendingUp,
  Percent,
  Download,
  CreditCard,
  UserCheck,
  UserX,
} from 'lucide-react';
import { PayrollRecord, EmployeeAttendanceRecord, LeaveRequest } from '../../types';

export const FinancePayrollAttendanceView: React.FC = () => {
  const {
    payrollRecords,
    attendanceRecords,
    leaveRequests,
    users,
    approvePayrollRecord,
    disbursePayrollRecord,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'payroll' | 'attendance'>('payroll');
  const [selectedMonth, setSelectedMonth] = useState('October 2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [disburseRef, setDisburseRef] = useState('');
  const [disburseMode, setDisburseMode] = useState('HDFC Bank Corporate Salary NEFT');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── Filtered Payroll ───
  const filteredPayroll = useMemo(() => {
    return payrollRecords.filter((p) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          p.employeeName.toLowerCase().includes(q) ||
          p.employeeId.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          p.roleTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [payrollRecords, searchTerm]);

  // ─── Filtered Attendance Summaries ───
  const attendanceSummaries = useMemo(() => {
    return users.map((u) => {
      const records = attendanceRecords.filter((a) => a.userId === u.id);
      const leaves = leaveRequests.filter((l) => l.userId === u.id && l.status === 'approved');

      const presentCount = records.filter((r) => r.status === 'present').length;
      const lateCount = records.filter((r) => r.status === 'late').length;
      const halfDayCount = records.filter((r) => r.status === 'half_day').length;
      const leaveDays = leaves.reduce((s, l: any) => s + (l.totalDays || l.daysCount || 1), 0);

      // Total standard working days in October = 26
      const standardDays = 26;
      const presentEquivalent = presentCount + lateCount + (halfDayCount * 0.5);
      const payableWorkingDays = Math.min(standardDays, presentEquivalent + leaveDays);
      const unpaidAbsenceDays = Math.max(0, standardDays - payableWorkingDays);

      return {
        user: u,
        recordsCount: records.length,
        presentCount,
        lateCount,
        halfDayCount,
        approvedLeaveDays: leaveDays,
        payableWorkingDays,
        unpaidAbsenceDays,
        standardDays,
      };
    }).filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.user.name.toLowerCase().includes(q) ||
          (item.user.department?.toLowerCase().includes(q) ?? false) ||
          (item.user.designation?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [users, attendanceRecords, leaveRequests, searchTerm]);

  // Payroll Metrics
  const payrollMetrics = useMemo(() => {
    const grossTotal = payrollRecords.reduce((s, p) => s + p.grossSalary, 0);
    const deductionsTotal = payrollRecords.reduce((s, p) => s + p.totalDeductions, 0);
    const netPayableTotal = payrollRecords.reduce((s, p) => s + p.netPayableSalary, 0);
    const disbursedTotal = payrollRecords
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.netPayableSalary, 0);
    const pendingTotal = payrollRecords
      .filter((p) => p.status !== 'paid')
      .reduce((s, p) => s + p.netPayableSalary, 0);

    return { grossTotal, deductionsTotal, netPayableTotal, disbursedTotal, pendingTotal };
  }, [payrollRecords]);

  const handleApprovePayroll = (p: PayrollRecord) => {
    approvePayrollRecord(p.id);
    setToastMessage(`Payroll for ${p.employeeName} approved by Finance.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenDisburse = (p: PayrollRecord) => {
    setSelectedPayroll(p);
    setDisburseRef(`SAL-NEFT-${Date.now().toString().slice(-6)}`);
    setDisburseModalOpen(true);
  };

  const handleConfirmDisburse = () => {
    if (!selectedPayroll || !disburseRef.trim()) return;

    disbursePayrollRecord(selectedPayroll.id, disburseRef, disburseMode);
    setToastMessage(`Salary of ₹${selectedPayroll.netPayableSalary.toLocaleString('en-IN')} disbursed to ${selectedPayroll.employeeName}. Ref: ${disburseRef}`);
    setTimeout(() => setToastMessage(null), 4000);
    setDisburseModalOpen(false);
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <Badge variant="success" size="sm">Payroll Settled</Badge>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Payroll, Salaries &amp; Attendance Verification
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Salary structure compensation, statutory deductions (PF/ESI/TDS), attendance review, and bank disbursements for {selectedMonth}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'payroll' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payroll Master ({payrollRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'attendance' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance &amp; Working Days Review
            </button>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40">
          <span className="text-[10px] font-bold uppercase text-purple-800 block">Gross Salary Pool</span>
          <div className="text-xl font-black text-purple-950 font-mono mt-0.5">
            ₹{payrollMetrics.grossTotal.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-purple-700">Before statutory deductions</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Statutory Deductions &amp; TDS</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
            ₹{payrollMetrics.deductionsTotal.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-700">PF, ESI &amp; TDS withholdings</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40">
          <span className="text-[10px] font-bold uppercase text-indigo-800 block">Total Net Salary Payable</span>
          <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">
            ₹{payrollMetrics.netPayableTotal.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-indigo-600">Net take-home liability</span>
        </div>
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[10px] font-bold uppercase text-emerald-800 block">Disbursed to Bank</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
            ₹{payrollMetrics.disbursedTotal.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700">
            ₹{payrollMetrics.pendingTotal.toLocaleString('en-IN')} pending transfer
          </span>
        </div>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200">
        <SearchInput
          value={searchTerm}
          onChange={(val) => setSearchTerm(val)}
          placeholder={activeTab === 'payroll' ? "Search employee name, ID, role, department..." : "Search staff member, designation, department..."}
          className="text-xs"
        />
      </div>

      {/* ─── TAB 1: PAYROLL MASTER TABLE ─── */}
      {activeTab === 'payroll' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Employee Details</th>
                  <th className="py-3 px-4 text-center">Payable Days</th>
                  <th className="py-3 px-4 text-right">Basic + HRA</th>
                  <th className="py-3 px-4 text-right">Gross Salary</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Incentives &amp; Claims</th>
                  <th className="py-3 px-4 text-right">Net Payable Salary</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredPayroll.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No payroll records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayroll.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={p.employeeName}
                            className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{p.employeeName}</span>
                            <span className="text-[10px] text-slate-400 block">{p.employeeId} • {p.roleTitle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {p.payableDays} / {p.workingDays}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        ₹{(p.baseSalary + p.hra).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{p.grossSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                        -₹{p.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                        +₹{(p.earnedIncentives + p.approvedReimbursements).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-indigo-950 text-sm">
                        ₹{p.netPayableSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          size="sm"
                          variant={
                            p.status === 'paid'
                              ? 'success'
                              : p.status === 'approved'
                              ? 'primary'
                              : 'warning'
                          }
                        >
                          {p.status === 'paid' ? 'Disbursed' : p.status === 'approved' ? 'Approved' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedPayroll(p)}
                            className="h-7 text-xs px-2"
                            title="Inspect Detailed Salary Slip"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Payslip
                          </Button>

                          {p.status === 'draft_calculated' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovePayroll(p)}
                              className="h-7 text-xs px-2"
                            >
                              Approve
                            </Button>
                          )}

                          {p.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenDisburse(p)}
                              className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Disburse
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── TAB 2: ATTENDANCE & WORKING DAYS REVIEW ─── */}
      {activeTab === 'attendance' && (
        <Card>
          <div className="p-3 bg-indigo-50 border-b border-indigo-100 text-[11px] text-indigo-900 flex items-center justify-between">
            <span>
              <strong>Finance Read-Only Attendance Review:</strong> Cross-verify payable working days against biometric logs and authorized leave before monthly payroll approval. Official attendance punches cannot be altered here.
            </span>
            <Badge variant="primary" size="sm">Audit Mode</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/60">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Department &amp; Role</th>
                  <th className="py-3 px-4 text-center">Standard Days</th>
                  <th className="py-3 px-4 text-center">Present / On Time</th>
                  <th className="py-3 px-4 text-center">Late Arrivals</th>
                  <th className="py-3 px-4 text-center">Approved Leaves</th>
                  <th className="py-3 px-4 text-center">Unpaid Absences</th>
                  <th className="py-3 px-4 text-center">Payable Working Days</th>
                  <th className="py-3 px-4 text-center">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {attendanceSummaries.map((att) => {
                  const isFull = att.payableWorkingDays >= att.standardDays;
                  return (
                    <tr key={att.user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {att.user.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 block">{att.user.department}</span>
                        <span className="text-[10px] text-slate-400">{att.user.designation}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {att.standardDays}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        {att.presentCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-700">
                        {att.lateCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-indigo-700 font-semibold">
                        {att.approvedLeaveDays}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-rose-600 font-bold">
                        {att.unpaidAbsenceDays}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sm text-indigo-950">
                        {att.payableWorkingDays} Days
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge size="sm" variant={isFull ? 'success' : 'warning'}>
                          {isFull ? '100% Present' : `${att.unpaidAbsenceDays} Days Loss of Pay`}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── PAYSLIP PREVIEW MODAL ─── */}
      {selectedPayroll && !disburseModalOpen && (
        <Modal
          isOpen={!!selectedPayroll}
          onClose={() => setSelectedPayroll(null)}
          title={`Salary Payslip: ${selectedPayroll.employeeName} (${selectedPayroll.month})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedPayroll.employeeName}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedPayroll.roleTitle} • {selectedPayroll.department}
                </p>
                <p className="text-[10px] text-indigo-600 font-mono mt-0.5">
                  Emp ID: {selectedPayroll.employeeId} • Month: {selectedPayroll.month}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant={selectedPayroll.status === 'paid' ? 'success' : selectedPayroll.status === 'approved' ? 'primary' : 'warning'}
                  size="md"
                >
                  {selectedPayroll.status.toUpperCase()}
                </Badge>
                {selectedPayroll.paymentReference && (
                  <span className="text-[10px] text-emerald-700 font-mono block mt-1">
                    Ref: {selectedPayroll.paymentReference}
                  </span>
                )}
              </div>
            </div>

            {/* Attendance Days */}
            <div className="grid grid-cols-4 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Working Days</span>
                <span className="font-bold text-slate-900 font-mono">{selectedPayroll.workingDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Present Days</span>
                <span className="font-bold text-emerald-700 font-mono">{selectedPayroll.presentDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Paid Leave</span>
                <span className="font-bold text-indigo-700 font-mono">{selectedPayroll.paidLeaveDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Payable Days</span>
                <span className="font-black text-indigo-950 font-mono">{selectedPayroll.payableDays}</span>
              </div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-2 gap-3">
              {/* Earnings */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-2 font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Earnings Structure
                </div>
                <div className="p-2 space-y-1 text-slate-700 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span>Basic Salary:</span>
                    <span className="font-mono">₹{selectedPayroll.baseSalary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span>House Rent Allowance (HRA):</span>
                    <span className="font-mono">₹{selectedPayroll.hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span>Special Allowance:</span>
                    <span className="font-mono">₹{selectedPayroll.specialAllowance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span>Travel / Conveyance:</span>
                    <span className="font-mono">₹{selectedPayroll.travelAllowance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100 text-emerald-700 font-semibold">
                    <span>Earned Incentives:</span>
                    <span className="font-mono">₹{selectedPayroll.earnedIncentives.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-emerald-700 font-semibold">
                    <span>Approved Expenses:</span>
                    <span className="font-mono">₹{selectedPayroll.approvedReimbursements.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 p-2 font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Statutory &amp; Float Deductions
                </div>
                <div className="p-2 space-y-1 text-slate-700 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span>Provident Fund (PF):</span>
                    <span className="font-mono text-rose-600">₹{selectedPayroll.pfDeduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span>Employee State Ins. (ESI):</span>
                    <span className="font-mono text-rose-600">₹{selectedPayroll.esiDeduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span>Tax Deducted at Source (TDS):</span>
                    <span className="font-mono text-rose-600">₹{selectedPayroll.tdsDeduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span>Salary Float Advances:</span>
                    <span className="font-mono text-rose-600">₹{selectedPayroll.advancesDeduction.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Calculation */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Gross Earnings: ₹{(selectedPayroll.grossSalary + selectedPayroll.earnedIncentives + selectedPayroll.approvedReimbursements).toLocaleString('en-IN')}</span>
                <span className="text-rose-600 block">Total Deductions: -₹{selectedPayroll.totalDeductions.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-indigo-700 uppercase font-bold block">Net Take-Home Salary</span>
                <span className="text-xl font-black text-indigo-950 font-mono">
                  ₹{selectedPayroll.netPayableSalary.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={handlePrintPayslip}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Payslip
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPayroll(null)}>
                  Close
                </Button>
                {selectedPayroll.status === 'approved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedPayroll(null);
                      handleOpenDisburse(selectedPayroll);
                    }}
                  >
                    Disburse Salary
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DISBURSE SALARY MODAL ─── */}
      {disburseModalOpen && selectedPayroll && (
        <Modal
          isOpen={disburseModalOpen}
          onClose={() => setDisburseModalOpen(false)}
          title={`Disburse Salary: ${selectedPayroll.employeeName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold">
                <span>Employee Name:</span>
                <span>{selectedPayroll.employeeName} ({selectedPayroll.employeeId})</span>
              </div>
              <div className="flex justify-between">
                <span>Month:</span>
                <span>{selectedPayroll.month}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold text-sm">
                <span>Net Transfer Amount:</span>
                <span className="font-mono">₹{selectedPayroll.netPayableSalary.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Payment Mode</label>
              <select
                value={disburseMode}
                onChange={(e) => setDisburseMode(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="HDFC Bank Corporate Salary NEFT">HDFC Bank Corporate Salary NEFT</option>
                <option value="ICICI Direct Salary Transfer">ICICI Direct Salary Transfer</option>
                <option value="SBI Corporate Account RTGS">SBI Corporate Account RTGS</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block">Bank Wire Reference / UTR #</label>
              <input
                type="text"
                value={disburseRef}
                onChange={(e) => setDisburseRef(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDisburseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmDisburse}>
                <Check className="w-4 h-4 mr-1" />
                Confirm Salary Disbursement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
