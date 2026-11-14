import React, { useState, useMemo } from 'react';
import { useErpStore } from '../../store/useErpStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Input';
import {
  Building2,
  Landmark,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Eye,
  EyeOff,
  QrCode,
  Sparkles,
  ShieldCheck,
  Receipt,
  HelpCircle,
  Copy,
  Check,
  Palette,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { CompanyProfile, CompanyBankAccount, DocumentTemplate } from '../../types';
import { formatINR, numberToIndianWords, maskAccountNumber } from '../../services/formatters';
import { validateGstin, validatePan, calculateGstTaxes, INDIAN_GST_STATES } from '../../services/gstService';
import { generateDocumentNumber, getCurrentFiscalYear } from '../../services/documentNumberingService';

export const FinanceCompanyProfilesView: React.FC = () => {
  const {
    companyProfiles,
    activeCompanyProfileId,
    documentTemplates,
    numberingSeries,
    setActiveCompanyProfile,
    addCompanyProfile,
    updateCompanyProfile,
    addCompanyBankAccount,
    updateCompanyBankAccount,
    updateDocumentTemplate,
  } = useErpStore();

  const [activeTab, setActiveTab] = useState<'profiles' | 'banks' | 'numbering' | 'templates' | 'gst_testbench'>('profiles');
  const [showFullAccountMap, setShowFullAccountMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter / Active Entity Selection
  const activeProfile = useMemo(() => {
    return (companyProfiles || []).find((c) => c.id === activeCompanyProfileId) || companyProfiles?.[0];
  }, [companyProfiles, activeCompanyProfileId]);

  // Modal States
  const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
  const [newBankModalOpen, setNewBankModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    documentTemplates?.[0]?.id || 'tmpl-glass-inv-01'
  );

  // New Profile Form
  const [formLegalName, setFormLegalName] = useState('');
  const [formTradeName, setFormTradeName] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formCin, setFormCin] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formStateCode, setFormStateCode] = useState('07');
  const [formPincode, setFormPincode] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // GST Validation on Form
  const gstinValidation = useMemo(() => validateGstin(formGstin), [formGstin]);
  const panValidation = useMemo(() => validatePan(formPan), [formPan]);

  // New Bank Account Form
  const [targetCompanyId, setTargetCompanyId] = useState(activeProfile?.id || '');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [branch, setBranch] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isDefaultForInv, setIsDefaultForInv] = useState(false);

  // GST Test Bench State
  const [testCompanyState, setTestCompanyState] = useState('07');
  const [testCustomerState, setTestCustomerState] = useState('07');
  const [testAmount, setTestAmount] = useState('100000');
  const [testGstRate, setTestGstRate] = useState('18');
  const [testDiscount, setTestDiscount] = useState('0');

  const testGstResult = useMemo(() => {
    const rawItems = [
      {
        name: 'Industrial Epoxy Primer Coating',
        hsnCode: '3208',
        quantity: 1,
        unitPrice: parseFloat(testAmount) || 0,
        discountAmount: parseFloat(testDiscount) || 0,
        gstRate: parseFloat(testGstRate) || 18,
      },
    ];
    return calculateGstTaxes(testCompanyState, testCustomerState, rawItems);
  }, [testCompanyState, testCustomerState, testAmount, testGstRate, testDiscount]);

  const activeTemplate = useMemo(() => {
    return (documentTemplates || []).find((t) => t.id === selectedTemplateId) || documentTemplates?.[0];
  }, [documentTemplates, selectedTemplateId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gstinValidation.isValid) return;
    const stateObj = INDIAN_GST_STATES.find((s) => s.code === formStateCode);
    addCompanyProfile({
      orgId: 'org-apex',
      legalName: formLegalName,
      tradeName: formTradeName || formLegalName,
      gstin: formGstin.toUpperCase(),
      pan: formPan.toUpperCase(),
      cin: formCin || undefined,
      addressLine1: formAddress,
      city: formCity,
      state: stateObj?.name || 'Delhi',
      stateCode: formStateCode,
      pincode: formPincode,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      defaultCurrency: 'INR',
      fiscalYearStartMonth: 4,
      bankAccounts: [],
      isDefault: false,
      isActive: true,
    });
    setNewProfileModalOpen(false);
    // Reset Form
    setFormLegalName('');
    setFormTradeName('');
    setFormGstin('');
    setFormPan('');
    setFormAddress('');
  };

  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !ifsc) return;
    addCompanyBankAccount(targetCompanyId || activeProfile.id, {
      companyProfileId: targetCompanyId || activeProfile.id,
      bankName,
      accountName: accountName || activeProfile.legalName,
      accountNumber,
      ifsc: ifsc.toUpperCase(),
      branch,
      upiId: upiId || undefined,
      qrCodeUrl: upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${upiId}` : undefined,
      isDefaultForInvoices: isDefaultForInv,
      isDefaultForQuotations: isDefaultForInv,
      isActive: true,
    });
    setNewBankModalOpen(false);
    setBankName('');
    setAccountNumber('');
    setIfsc('');
    setBranch('');
    setUpiId('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header & Entity Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Company Profiles & Document Templates
            </h1>
            <Badge variant="purple" size="sm">
              Multi-Entity
            </Badge>
          </div>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
            Manage legal entities, Indian GST credentials, bank accounts, and invoice templates with immutable versioning.
          </p>
        </div>

        {/* Legal Entity Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Building2 className="w-4 h-4 text-slate-400 ml-2" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Entity:</span>
          <select
            value={activeCompanyProfileId}
            onChange={(e) => setActiveCompanyProfile(e.target.value)}
            className="text-xs font-semibold bg-transparent text-slate-900 dark:text-white border-0 focus:ring-0 cursor-pointer pr-4"
          >
            {(companyProfiles || []).map((cp) => (
              <option key={cp.id} value={cp.id} className="dark:bg-slate-900">
                {cp.tradeName || cp.legalName} ({cp.state}) {cp.isDefault ? '★' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'profiles'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Legal Company Profiles ({(companyProfiles || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banks')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'banks'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Bank Accounts & Escrow</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('numbering')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'numbering'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Numbering Series (GST Rule 46)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Document Templates Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gst_testbench')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'gst_testbench'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>GST Place of Supply Test Bench</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: COMPANY PROFILES */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Registered Legal Entities</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every business unit operates under its own state GSTIN and issues distinct invoice series.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setNewProfileModalOpen(true)}
            >
              + Register New Legal Entity
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(companyProfiles || []).map((cp) => (
              <div
                key={cp.id}
                className={`rounded-2xl border p-5 backdrop-blur-xl transition-all relative ${
                  cp.id === activeCompanyProfileId
                    ? 'bg-white/90 dark:bg-slate-900/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {cp.isDefault && (
                  <span className="absolute top-4 right-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    Primary Entity
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                    {cp.legalName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 pr-14">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={cp.legalName}>
                      {cp.tradeName || cp.legalName}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{cp.legalName}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">GSTIN:</span>
                    <div className="flex items-center gap-1 font-mono font-semibold text-slate-900 dark:text-white">
                      <span>{cp.gstin}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(cp.gstin, `gstin-${cp.id}`)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        {copiedId === `gstin-${cp.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">State & Code:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {cp.state} (Code {cp.stateCode})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">PAN:</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{cp.pan}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Registered City:</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{cp.city}, {cp.pincode}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bank Accounts:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {(cp.bankAccounts || []).length} Configured
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCompanyProfile(cp.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      cp.id === activeCompanyProfileId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {cp.id === activeCompanyProfileId ? 'Active Entity' : 'Select Entity'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCompanyProfile(cp.id);
                      setActiveTab('banks');
                    }}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Manage Banks <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: BANK ACCOUNTS & ESCROW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'banks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Bank Accounts for {activeProfile.tradeName || activeProfile.legalName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Account numbers are masked in lists for security. Default accounts automatically embed on invoices & quotes.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setTargetCompanyId(activeProfile.id);
                setNewBankModalOpen(true);
              }}
            >
              + Add Bank Account
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(activeProfile.bankAccounts || []).map((bank) => {
              const isUnmasked = showFullAccountMap[bank.id];
              return (
                <div
                  key={bank.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 shadow-xs relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{bank.bankName}</h3>
                        <p className="text-xs text-slate-500">{bank.accountName}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {bank.isDefaultForInvoices && (
                        <Badge variant="success" size="sm">
                          Default for Invoices
                        </Badge>
                      )}
                      {bank.isDefaultForQuotations && (
                        <Badge variant="purple" size="sm">
                          Default for Quotes
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Account Number:</span>
                      <div className="flex items-center gap-2 font-mono font-semibold text-slate-900 dark:text-white">
                        <span>{isUnmasked ? bank.accountNumber : maskAccountNumber(bank.accountNumber)}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setShowFullAccountMap((prev) => ({ ...prev, [bank.id]: !prev[bank.id] }))
                          }
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title={isUnmasked ? 'Mask Account Number' : 'Reveal Full Account Number'}
                        >
                          {isUnmasked ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">IFSC Code:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{bank.ifsc}</span>
                    </div>

                    {bank.branch && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Branch Location:</span>
                        <span className="text-slate-700 dark:text-slate-300">{bank.branch}</span>
                      </div>
                    )}

                    {bank.upiId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">UPI VPA:</span>
                        <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">{bank.upiId}</span>
                      </div>
                    )}
                  </div>

                  {bank.qrCodeUrl && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <QrCode className="w-4 h-4 text-slate-400" />
                        <span>Dynamic UPI QR Code Ready</span>
                      </div>
                      <a
                        href={bank.qrCodeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        Preview QR <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: NUMBERING SERIES & GST RULE 46 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'numbering' && (
        <div className="space-y-6">
          <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-4 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
              <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                Indian GST Rule 46(b) Numbering Mandate:
              </p>
              <p>
                A Tax Invoice must contain a consecutive serial number not exceeding <strong>16 characters</strong>, in one or multiple series, containing alphabets, numerals and special characters hyphen or dash (-) and slash (/), unique for a Financial Year.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Document Type</th>
                  <th className="px-4 py-3 text-left">Company Entity</th>
                  <th className="px-4 py-3 text-left">Fiscal Year</th>
                  <th className="px-4 py-3 text-left">Configured Prefix</th>
                  <th className="px-4 py-3 text-right">Last Sequence</th>
                  <th className="px-4 py-3 text-left">Next Generated Number</th>
                  <th className="px-4 py-3 text-center">GST Compliance (&le; 16 Chars)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(numberingSeries || []).map((s) => {
                  const comp = (companyProfiles || []).find((c) => c.id === s.companyProfileId);
                  const sample = generateDocumentNumber(s.prefix, s.currentNumber + 1, s.paddingLength);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white capitalize">
                        {s.docType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {comp?.tradeName || comp?.legalName || 'Default'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{s.fiscalYear}</td>
                      <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {s.prefix}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {s.currentNumber}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {sample.documentNumber}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sample.isGstCompliant ? (
                          <Badge variant="success" size="sm">
                            Compliant ({sample.length} chars)
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm" title={sample.warning}>
                            Too Long ({sample.length} chars)
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: DOCUMENT TEMPLATES STUDIO */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Controls */}
          <div className="space-y-5 lg:col-span-1 min-w-0">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-600" />
                Template Styling Controls
              </h3>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Select Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {(documentTemplates || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.docType}) {t.isDefault ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {activeTemplate && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      Layout Style
                    </label>
                    <select
                      value={activeTemplate.layoutDesign}
                      onChange={(e) =>
                        updateDocumentTemplate(activeTemplate.id, {
                          layoutDesign: e.target.value as any,
                        })
                      }
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                    >
                      <option value="modern_glass">Modern Glassmorphic Enterprise</option>
                      <option value="classic_enterprise">Classic Corporate Ledger</option>
                      <option value="minimalist_clean">Minimalist High-Contrast Clean</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeTemplate.accentColor}
                        onChange={(e) =>
                          updateDocumentTemplate(activeTemplate.id, { accentColor: e.target.value })
                        }
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {activeTemplate.accentColor}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      Toggle Document Sections:
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={activeTemplate.showBankDetails}
                        onChange={(e) =>
                          updateDocumentTemplate(activeTemplate.id, { showBankDetails: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Show Bank Account Details</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={activeTemplate.showQrCode}
                        onChange={(e) =>
                          updateDocumentTemplate(activeTemplate.id, { showQrCode: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Show Dynamic UPI Payment QR</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={activeTemplate.showHsnSummary}
                        onChange={(e) =>
                          updateDocumentTemplate(activeTemplate.id, { showHsnSummary: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Show HSN / SAC Tax Summary Table</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={activeTemplate.showAmountInWords}
                        onChange={(e) =>
                          updateDocumentTemplate(activeTemplate.id, { showAmountInWords: e.target.checked })
                        }
                        className="rounded text-indigo-600"
                      />
                      <span>Show Amount in Words (Indian Rupees)</span>
                    </label>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Right Live Interactive Document Preview */}
          <div className="lg:col-span-2 min-w-0">
            <div className="rounded-2xl border border-slate-300 bg-white text-slate-900 p-4 sm:p-6 lg:p-8 shadow-md space-y-6 min-h-[600px] text-xs overflow-hidden">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <div
                    className="inline-block px-2.5 py-1 rounded text-white font-bold text-xs uppercase tracking-wider mb-2"
                    style={{ backgroundColor: activeTemplate?.accentColor || '#4f46e5' }}
                  >
                    TAX INVOICE
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{activeProfile.legalName}</h2>
                  <p className="text-slate-500">{activeProfile.addressLine1}, {activeProfile.city} - {activeProfile.pincode}</p>
                  <p className="font-mono mt-1">
                    <strong>GSTIN:</strong> {activeProfile.gstin} • <strong>State:</strong> {activeProfile.state} ({activeProfile.stateCode})
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-base font-bold text-indigo-700">TZM/26-27/0014</div>
                  <div className="text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</div>
                  <div className="text-slate-500">Place of Supply: Delhi (07)</div>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Billed To (Customer):</span>
                  <p className="font-bold text-slate-900 mt-0.5">Premier Infrastructure Ltd</p>
                  <p className="text-slate-600">Plot 18, Phase 2, Okhla, New Delhi - 110020</p>
                  <p className="font-mono text-slate-700">GSTIN: 07AAACP9921B1Z2 (Delhi)</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Payment Terms:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">Net 30 Days (Due in 30 Days)</p>
                  <p className="text-slate-600">Dispatched via: V-Trans Cargo</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="w-full overflow-x-auto -mx-1 px-1 pb-1">
                <table className="w-full min-w-[500px] divide-y divide-slate-200 text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 font-semibold">
                      <th className="py-2 text-left whitespace-nowrap">#</th>
                      <th className="py-2 text-left whitespace-nowrap">Item Description</th>
                      <th className="py-2 text-left whitespace-nowrap">HSN/SAC</th>
                      <th className="py-2 text-right whitespace-nowrap">Qty</th>
                      <th className="py-2 text-right whitespace-nowrap">Unit Rate</th>
                      <th className="py-2 text-right whitespace-nowrap">Taxable Val</th>
                      <th className="py-2 text-right whitespace-nowrap">GST Rate</th>
                      <th className="py-2 text-right whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 text-slate-400">1</td>
                      <td className="py-2 font-medium text-slate-900">UltraCoat Epoxy Primer 500 (Drums 200L)</td>
                      <td className="py-2 font-mono text-slate-600">3208</td>
                      <td className="py-2 text-right">10</td>
                      <td className="py-2 text-right font-mono">₹10,000.00</td>
                      <td className="py-2 text-right font-mono font-semibold">₹1,00,000.00</td>
                      <td className="py-2 text-right font-mono">18%</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">₹1,18,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals & Calculations */}
              <div className="flex justify-end pt-3 border-t border-slate-200">
                <div className="w-64 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span>₹1,00,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9.0%):</span>
                    <span>₹9,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9.0%):</span>
                    <span>₹9,000.00</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                    <span>Invoice Total:</span>
                    <span className="text-indigo-600">₹1,18,000.00</span>
                  </div>
                </div>
              </div>

              {/* Amount in words */}
              {activeTemplate?.showAmountInWords && (
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700 italic">
                  <strong>Amount in Words:</strong> {numberToIndianWords(118000)}
                </div>
              )}

              {/* HSN Summary */}
              {activeTemplate?.showHsnSummary && (
                <div className="space-y-1 pt-2">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                    HSN/SAC Tax Breakup:
                  </span>
                  <div className="w-full overflow-x-auto pb-1">
                    <table className="w-full min-w-[500px] text-[11px] border border-slate-200 text-center font-mono">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="py-1 border whitespace-nowrap">HSN/SAC</th>
                          <th className="py-1 border whitespace-nowrap">Taxable Value</th>
                          <th className="py-1 border whitespace-nowrap">CGST Rate</th>
                          <th className="py-1 border whitespace-nowrap">CGST Amt</th>
                          <th className="py-1 border whitespace-nowrap">SGST Rate</th>
                          <th className="py-1 border whitespace-nowrap">SGST Amt</th>
                          <th className="py-1 border whitespace-nowrap">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-1 border">3208</td>
                          <td className="py-1 border">₹1,00,000.00</td>
                          <td className="py-1 border">9.0%</td>
                          <td className="py-1 border">₹9,000.00</td>
                          <td className="py-1 border">9.0%</td>
                          <td className="py-1 border">₹9,000.00</td>
                          <td className="py-1 border font-bold">₹18,000.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bank Details & QR & Signature */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 items-end">
                {activeTemplate?.showBankDetails && activeProfile.bankAccounts?.[0] && (
                  <div className="space-y-1 text-slate-600">
                    <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider block">
                      Bank Settlement Details:
                    </span>
                    <p>Bank: {activeProfile.bankAccounts[0].bankName}</p>
                    <p>A/c Name: {activeProfile.bankAccounts[0].accountName}</p>
                    <p className="font-mono">A/c No: {maskAccountNumber(activeProfile.bankAccounts[0].accountNumber)}</p>
                    <p className="font-mono">IFSC: {activeProfile.bankAccounts[0].ifsc}</p>
                  </div>
                )}

                <div className="text-right space-y-4">
                  {activeTemplate?.showQrCode && (
                    <div className="inline-block p-1 border rounded bg-white">
                      <QrCode className="w-12 h-12 text-slate-700 inline-block" />
                    </div>
                  )}
                  <p className="font-semibold text-slate-800 text-[11px]">
                    {activeTemplate?.signatoryTitle || 'For Tzmicha ERP & Manufacturing Pvt Ltd'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 5: GST PLACE OF SUPPLY TEST BENCH */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'gst_testbench' && (
        <div className="space-y-6">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Interactive GST Place of Supply Calculator
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Test and verify the automatic intra-state (CGST+SGST) vs. inter-state (IGST) tax logic across any two Indian states.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Supplier Entity State:
                </label>
                <select
                  value={testCompanyState}
                  onChange={(e) => setTestCompanyState(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {INDIAN_GST_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer / Destination State:
                </label>
                <select
                  value={testCustomerState}
                  onChange={(e) => setTestCustomerState(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  {INDIAN_GST_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Taxable Value (₹):
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GST Rate (%):
                </label>
                <select
                  value={testGstRate}
                  onChange={(e) => setTestGstRate(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5"
                >
                  <option value="0">0% (Nil)</option>
                  <option value="5">5% (Essential)</option>
                  <option value="12">12% (Standard)</option>
                  <option value="18">18% (Chemicals / Industrial)</option>
                  <option value="28">28% (Luxury / Specific)</option>
                </select>
              </div>
            </div>

            {/* Result Box */}
            <div className="mt-6 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-200/80 dark:border-indigo-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                    Tax Rule Applied:
                  </span>
                  <Badge variant={testGstResult.isInterstate ? 'purple' : 'success'}>
                    {testGstResult.isInterstate ? 'Inter-State Transaction (IGST)' : 'Intra-State Transaction (CGST + SGST)'}
                  </Badge>
                </div>
                <div className="text-xs text-indigo-800 dark:text-indigo-300">
                  {testGstResult.isInterstate
                    ? 'Different state codes detected. 100% tax allocated to Integrated GST.'
                    : 'Same state codes detected. Tax split 50/50 into Central GST and State GST.'}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block">Subtotal:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatINR(testGstResult.subtotal)}
                  </span>
                </div>
                {testGstResult.isInterstate ? (
                  <div>
                    <span className="text-slate-500 block">IGST ({testGstRate}%):</span>
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {formatINR(testGstResult.igstTotal)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-500 block">CGST ({Number(testGstRate) / 2}%):</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatINR(testGstResult.cgstTotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SGST ({Number(testGstRate) / 2}%):</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatINR(testGstResult.sgstTotal)}
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-slate-500 block">Total Invoiced Amount:</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {formatINR(testGstResult.grandTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/60 text-xs italic text-slate-600 dark:text-slate-300">
                <strong>In Words:</strong> {numberToIndianWords(testGstResult.grandTotal)}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: REGISTER NEW LEGAL ENTITY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={newProfileModalOpen}
        onClose={() => setNewProfileModalOpen(false)}
        title="Register New Legal Company Profile"
      >
        <form onSubmit={handleCreateProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Legal Registered Name *
              </label>
              <input
                type="text"
                required
                value={formLegalName}
                onChange={(e) => setFormLegalName(e.target.value)}
                placeholder="e.g. Tzmicha Chemicals Ltd"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Trade Name (DBA)
              </label>
              <input
                type="text"
                value={formTradeName}
                onChange={(e) => setFormTradeName(e.target.value)}
                placeholder="e.g. ApexFlow Chemicals"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                GSTIN (15 Chars) *
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={formGstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormGstin(val);
                  if (val.length >= 2) {
                    setFormStateCode(val.substring(0, 2));
                  }
                }}
                placeholder="e.g. 07AABCT1234F1Z5"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 font-mono uppercase bg-white dark:bg-slate-900"
              />
              <span className={`text-[11px] mt-0.5 block ${gstinValidation.isValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                {formGstin ? gstinValidation.message : 'Enter 15-digit GSTIN with 2-digit state prefix'}
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                PAN (10 Chars) *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={formPan}
                onChange={(e) => setFormPan(e.target.value.toUpperCase())}
                placeholder="e.g. AABCT1234F"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 font-mono uppercase bg-white dark:bg-slate-900"
              />
              <span className={`text-[11px] mt-0.5 block ${panValidation.isValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                {formPan ? panValidation.message : 'Enter 10-character Permanent Account Number'}
              </span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Registered Street Address *
            </label>
            <input
              type="text"
              required
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="e.g. Plot 18, Industrial Area"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="e.g. New Delhi"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                GST State & Code *
              </label>
              <select
                value={formStateCode}
                onChange={(e) => setFormStateCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900 text-xs"
              >
                {INDIAN_GST_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Pincode *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={formPincode}
                onChange={(e) => setFormPincode(e.target.value)}
                placeholder="e.g. 110020"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setNewProfileModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!gstinValidation.isValid || !panValidation.isValid}>
              Save Legal Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD BANK ACCOUNT */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={newBankModalOpen}
        onClose={() => setNewBankModalOpen(false)}
        title="Add Bank Account"
      >
        <form onSubmit={handleAddBankAccount} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank Ltd"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Account Number *
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 502000889921"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 font-mono bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                IFSC Code (11 Chars) *
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0000128"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 font-mono uppercase bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Branch Location
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Okhla Phase 3 Branch"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                UPI ID (Virtual Payment Address)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. tzmicha@hdfcbank"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 font-mono bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
            <input
              type="checkbox"
              checked={isDefaultForInv}
              onChange={(e) => setIsDefaultForInv(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>Set as primary default bank for customer invoices & quotes</span>
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setNewBankModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
