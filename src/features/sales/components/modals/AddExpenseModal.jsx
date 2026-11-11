import { useState, useMemo } from 'react';
import { Info, Upload, Edit3, Image as ImageIcon, CheckCircle, Hotel, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useSales } from '../../context/SalesContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/formatters';

export default function AddExpenseModal({ isOpen, onClose }) {
  const { customers, addExpense, employeeBudgets = [], userProfile = {} } = useSales();
  const { showToast } = useToast();

  const myBudget = useMemo(() => {
    return (
      employeeBudgets.find((b) => b.employeeId === userProfile.employeeId) || {
        employeeName: userProfile.fullName || 'Vikram Mehta',
        allocatedBudget: 35000,
        amountUsed: 12450,
        remainingBudget: 22550,
        assignedArea: 'Territory A (Hyderabad)',
      }
    );
  }, [employeeBudgets, userProfile]);

  const [entryMode, setEntryMode] = useState('upload'); // 'upload' or 'manual'
  const [tripDate, setTripDate] = useState('2026-10-21');
  const [expenseMonth, setExpenseMonth] = useState('2026-10');
  const [origin, setOrigin] = useState('Pune HQ');
  const [destination, setDestination] = useState('');
  const [isNonCustomer, setIsNonCustomer] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [category, setCategory] = useState('Fuel');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Personal UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Accommodation Specific Mandatory Fields
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('2026-10-21');
  const [gstin, setGstin] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerAddress, setProviderAddress] = useState('');

  // Fixed Allowance Selector
  const [isFixedAllowance, setIsFixedAllowance] = useState(false);
  const [allowanceType, setAllowanceType] = useState('Daily Field Allowance');

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (newCat === 'Daily Field Allowance') {
      setIsFixedAllowance(true);
      setAllowanceType('Daily Field Allowance');
      setAmount('800');
      setPurpose('Standard daily field visit allowance');
    } else if (newCat === 'Local Travel Allowance') {
      setIsFixedAllowance(true);
      setAllowanceType('Local Travel Allowance');
      setAmount('500');
      setPurpose('Local intracity travel allowance');
    } else if (newCat === 'Food Allowance') {
      setIsFixedAllowance(true);
      setAllowanceType('Food Allowance');
      setAmount('450');
      setPurpose('Field meal and food allowance');
    } else {
      setIsFixedAllowance(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: 'File exceeds 5MB limit' }));
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, receipt: 'Please upload a PDF or JPG/PNG image' }));
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    setReceiptFile({
      name: file.name,
      size: sizeFormatted,
    });

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    } else {
      setReceiptPreviewUrl('');
    }

    setErrors((prev) => ({ ...prev, receipt: null }));
    showToast(`Attached ${file.name}. Please verify transaction details below.`, 'info');
  };

  const handleSimulateSampleReceipt = () => {
    if (category === 'Accommodation') {
      setReceiptFile({
        name: 'peenya_hotel_tax_invoice.pdf',
        size: '850 KB',
      });
      setBillNumber('HTL-BLR-2026-881');
      setBillDate('2026-10-21');
      setGstin('29AABCP1234F1Z8');
      setProviderName('Peenya Business Hotel & Suites');
      setProviderAddress('Plot 44, Peenya Industrial Area Phase 1, Bengaluru');
      setAmount('5400');
      setPurpose('2 nights lodging during Kaveri Precision OEM meeting');
      setDestination('Peenya, Bengaluru');
      setPaymentMethod('Company Card');
      showToast('Loaded valid hotel tax invoice with GSTIN & provider details.', 'info');
      return;
    }

    setReceiptFile({
      name: 'hpcl_fuel_voucher_21oct.jpg',
      size: '820 KB',
    });
    setReceiptPreviewUrl('https://images.unsplash.com/photo-1554415707-9e49fe832807?w=300');
    setCategory('Fuel');
    setAmount('1450');
    setPurpose('Client site visit and valve sample delivery');
    setDestination('MIDC Bhosari, Pune');
    setPaymentMethod('Personal UPI');
    setReferenceNo('UPI-AXIS-992104');
    showToast('Loaded sample receipt image with verified details.', 'info');
  };

  const handleSubmit = (asDraft = false) => {
    const errs = {};
    if (!tripDate) errs.tripDate = 'Expense date is required';
    if (!origin.trim()) errs.origin = 'Origin location is required';
    if (!destination.trim()) errs.destination = 'Destination is required';
    if (!isNonCustomer && !customerId) errs.customerId = 'Please select the customer visited';
    if (!purpose.trim()) errs.purpose = 'Business purpose is required';

    const amtNum = Number(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      errs.amount = 'Amount must be greater than ₹0';
    }

    // Accommodation Mandatory GST Bill Validation
    if (category === 'Accommodation') {
      if (!billNumber.trim()) errs.billNumber = 'Accommodation bill number is required';
      if (!billDate) errs.billDate = 'Accommodation bill date is required';
      if (!providerName.trim()) errs.providerName = 'Hotel / lodging provider name is required';
      if (!gstin.trim()) errs.gstin = 'Provider GSTIN is required';
      if (!receiptFile && !receiptPreviewUrl) {
        errs.receipt = 'Mandatory accommodation bill (image or PDF) upload is required before submission.';
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const isExceeding = amtNum > Number(myBudget.remainingBudget || 0);

    const newClaim = addExpense({
      employeeId: userProfile.employeeId || 'APX-EMP-4091',
      employeeName: userProfile.fullName || 'Vikram Mehta',
      tripDate,
      expenseMonth,
      reimbursementMonth: '2026-11',
      origin,
      destination,
      customerId: isNonCustomer ? null : customerId,
      customerName: isNonCustomer
        ? 'Internal / Non-Customer Visit'
        : selectedCustomer?.name || 'Customer Visit',
      purpose,
      category,
      distanceKm: distanceKm ? Number(distanceKm) : null,
      amount: amtNum,
      paymentMethod,
      referenceNo: referenceNo || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      notes,
      isFixedAllowance,
      allowanceType: isFixedAllowance ? allowanceType : null,
      claimType: isExceeding ? 'Additional Request' : 'Within Budget',
      // Accommodation details
      hasMandatoryGSTBill: category === 'Accommodation',
      billNumber: category === 'Accommodation' ? billNumber : undefined,
      billDate: category === 'Accommodation' ? billDate : undefined,
      billAmount: category === 'Accommodation' ? amtNum : undefined,
      gstin: category === 'Accommodation' ? gstin : undefined,
      providerName: category === 'Accommodation' ? providerName : undefined,
      providerAddress: category === 'Accommodation' ? providerAddress : undefined,
      approvalStatus: asDraft ? 'Draft' : isExceeding ? 'Additional Approval Required' : 'Submitted',
      receiptFileName: receiptFile?.name || (category === 'Accommodation' ? 'hotel_gst_bill.pdf' : 'manual_voucher.pdf'),
      receiptFileSize: receiptFile?.size || 'Direct Entry',
      receiptPreviewUrl,
    });

    if (asDraft) {
      showToast(`Expense claim ${newClaim.id} saved as Draft`, 'info');
    } else if (isExceeding) {
      showToast(`Expense claim ${newClaim.id} submitted as Additional Budget Request for Manager/Finance approval!`, 'warning');
    } else {
      showToast(`Expense claim ${newClaim.id} submitted within assigned budget!`, 'success');
    }

    onClose();
  };

  const amtNum = Number(amount || 0);
  const remainingBudget = Number(myBudget.remainingBudget || 0);
  const isOverBudget = amtNum > remainingBudget && amtNum > 0;
  const excessAmount = isOverBudget ? amtNum - remainingBudget : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Add New Expense"
      subtitle="Log business travel, meals, fuel, tolls, or lodging claims with receipt verification"
      footer={
        <div className="modal-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <div className="modal-actions-right" style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleSubmit(true)}
            >
              Save Draft
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSubmit(false)}
            >
              Submit for Approval
            </button>
          </div>
        </div>
      }
    >
      <div className="expense-form">
        {/* Entry Method Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '4px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: entryMode === 'upload' ? '#ffffff' : 'transparent',
              color: entryMode === 'upload' ? '#2563eb' : '#64748b',
              fontWeight: entryMode === 'upload' ? '700' : '500',
              boxShadow: entryMode === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '13px',
            }}
            onClick={() => setEntryMode('upload')}
          >
            <Upload size={15} />
            <span>Method 1: Upload Receipt / Image</span>
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: entryMode === 'manual' ? '#ffffff' : 'transparent',
              color: entryMode === 'manual' ? '#2563eb' : '#64748b',
              fontWeight: entryMode === 'manual' ? '700' : '500',
              boxShadow: entryMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '13px',
            }}
            onClick={() => setEntryMode('manual')}
          >
            <Edit3 size={15} />
            <span>Method 2: Manual Entry</span>
          </button>
        </div>

        {/* Pre-Assigned Employee Budget Summary Strip */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Assigned Territory
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {myBudget.assignedArea || 'Regional Territory'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Allocated Budget
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
              {formatINR(myBudget.allocatedBudget)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Budget Utilized
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#d97706', marginTop: '2px' }}>
              {formatINR(myBudget.amountUsed)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Remaining Available
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: remainingBudget > 0 ? '#16a34a' : '#dc2626', marginTop: '2px' }}>
              {formatINR(remainingBudget)}
            </div>
          </div>
        </div>

        {/* Excess Budget Alert Banner */}
        {isOverBudget && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#92400e' }}>
              <strong>Budget Limit Exceeded:</strong> This claim of <strong>{formatINR(amtNum)}</strong> exceeds your remaining assigned monthly budget of <strong>{formatINR(remainingBudget)}</strong> by <strong>{formatINR(excessAmount)}</strong>.
              <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#b45309' }}>
                This expense will be submitted as an <strong>&ldquo;Additional Amount Request&rdquo;</strong> requiring dual review and approval from your Sales Manager and Finance.
              </div>
            </div>
          </div>
        )}

        {/* Receipt Upload Banner if in Upload Mode */}
        {entryMode === 'upload' && (
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} color="#2563eb" />
                <span>Select or Take Receipt Photo</span>
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSimulateSampleReceipt}
                style={{ fontSize: '11px' }}
              >
                Load Sample Receipt Image
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="form-input"
                  style={{ padding: '8px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Supports JPEG, PNG or PDF receipts up to 5MB. Manual verification of details is required below.
                </span>
              </div>

              {receiptPreviewUrl && (
                <div style={{ width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0, position: 'relative' }}>
                  <img src={receiptPreviewUrl} alt="Receipt preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {receiptFile && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} />
                <span>Attached: <strong>{receiptFile.name}</strong> ({receiptFile.size})</span>
              </div>
            )}
          </div>
        )}

        {/* Month & Date Row */}
        <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Expense Month *
            </label>
            <select
              className="form-select"
              value={expenseMonth}
              onChange={(e) => setExpenseMonth(e.target.value)}
            >
              <option value="2026-10">October 2026 (Current)</option>
              <option value="2026-09">September 2026 (Prior)</option>
              <option value="2026-08">August 2026</option>
            </select>
          </div>

          <FormField label="Expense Date *" id="exp-date" required error={errors.tripDate}>
            <input
              type="date"
              id="exp-date"
              className="form-input"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
            />
          </FormField>

          <FormField label="Origin / Starting Bay" id="exp-origin" required error={errors.origin}>
            <input
              type="text"
              id="exp-origin"
              className="form-input"
              placeholder="e.g. Pune Office or Home"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </FormField>
        </div>

        {/* Customer & Route */}
        <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Customer Visited {!isNonCustomer && '*'}
            </label>
            <select
              className="form-select"
              disabled={isNonCustomer}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select customer visited...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="non-cust"
                checked={isNonCustomer}
                onChange={(e) => setIsNonCustomer(e.target.checked)}
              />
              <label htmlFor="non-cust" style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                Internal meeting / non-customer territory visit
              </label>
            </div>
            {errors.customerId && <span className="field-error-msg">{errors.customerId}</span>}
          </div>

          <FormField label="Destination / Route *" id="exp-dest" required error={errors.destination}>
            <input
              type="text"
              id="exp-dest"
              className="form-input"
              placeholder="e.g. Okhla Industrial Area Phase 2, New Delhi"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </FormField>
        </div>

        {/* Purpose */}
        <div style={{ marginBottom: '16px' }}>
          <FormField label="Business Purpose *" id="exp-purpose" required error={errors.purpose}>
            <input
              type="text"
              id="exp-purpose"
              className="form-input"
              placeholder="e.g. Technical valve demonstration, dealer renewal negotiation, sample handover..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </FormField>
        </div>

        {/* Financial Details */}
        <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Category *
            </label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <optgroup label="Standard Field Allowances">
                <option value="Daily Field Allowance">Daily Field Allowance (₹800/day)</option>
                <option value="Local Travel Allowance">Local Travel Allowance (₹500/day)</option>
                <option value="Food Allowance">Food Allowance (₹450/day)</option>
              </optgroup>
              <optgroup label="Reimbursable Travel & Lodging">
                <option value="Fuel">Fuel (Mileage)</option>
                <option value="Taxi/local transport">Taxi / Local Transport (Ola/Uber)</option>
                <option value="Tolls">Tolls / FASTag</option>
                <option value="Accommodation">Accommodation / Hotel (Mandatory GST Bill)</option>
                <option value="Business meals">Business Meals &amp; Dining</option>
                <option value="Parking">Parking Charges</option>
                <option value="Other approved business expenses">Other Approved Business Expenses</option>
              </optgroup>
            </select>
          </div>

          <FormField label="Amount in INR (₹) *" id="exp-amount" required error={errors.amount}>
            <input
              type="number"
              id="exp-amount"
              className="form-input font-bold"
              placeholder="0.00"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isFixedAllowance}
            />
            {isFixedAllowance && (
              <span style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px', display: 'block' }}>
                Pre-fixed company allowance rate
              </span>
            )}
          </FormField>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Payment Method *
            </label>
            <select
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Personal UPI">Personal UPI (GPay / PhonePe)</option>
              <option value="Company Card">Company Corporate Card</option>
              <option value="Cash">Cash Out of Pocket</option>
              <option value="Bank Transfer">Bank Transfer / Net Banking</option>
              <option value="FASTag Auto-Debit">FASTag Auto-Debit</option>
            </select>
          </div>
        </div>

        {/* Accommodation Mandatory GST Invoice Section */}
        {category === 'Accommodation' && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#faf5ff',
              border: '1.5px solid #d8b4fe',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Hotel size={18} color="#7e22ce" />
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#581c87', margin: 0 }}>
                  Mandatory Accommodation GST Invoice Details
                </h4>
                <p style={{ fontSize: '11px', color: '#7e22ce', margin: 0 }}>
                  Lodging claims require a verified GSTIN tax invoice and hotel bill attachment
                </p>
              </div>
            </div>

            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <FormField label="Hotel / Lodging Provider Name *" id="acc-provider" required error={errors.providerName}>
                <input
                  type="text"
                  id="acc-provider"
                  className="form-input"
                  placeholder="e.g. Peenya Business Hotel & Suites"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                />
              </FormField>

              <FormField label="Provider GSTIN (15 Digits) *" id="acc-gstin" required error={errors.gstin}>
                <input
                  type="text"
                  id="acc-gstin"
                  className="form-input font-mono"
                  placeholder="e.g. 29AABCP1234F1Z8"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                />
              </FormField>
            </div>

            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <FormField label="Bill / Tax Invoice Number *" id="acc-bill-no" required error={errors.billNumber}>
                <input
                  type="text"
                  id="acc-bill-no"
                  className="form-input font-mono"
                  placeholder="e.g. HTL-BLR-2026-881"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                />
              </FormField>

              <FormField label="Bill Date *" id="acc-bill-date" required error={errors.billDate}>
                <input
                  type="date"
                  id="acc-bill-date"
                  className="form-input"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Hotel Address / Location" id="acc-address">
              <input
                type="text"
                id="acc-address"
                className="form-input"
                placeholder="e.g. Plot 44, Peenya Industrial Area Phase 1, Bengaluru"
                value={providerAddress}
                onChange={(e) => setProviderAddress(e.target.value)}
              />
            </FormField>

            {errors.receipt && (
              <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#dc2626', fontWeight: '600' }}>
                {errors.receipt}
              </div>
            )}
          </div>
        )}

        {/* Ref number & Distance */}
        <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <FormField
            label="Transaction / Reference Number"
            id="exp-ref"
            helperText="e.g. UPI UTR number, credit card auth code, fuel bill number"
          >
            <input
              type="text"
              id="exp-ref"
              className="form-input font-mono"
              placeholder="e.g. UPI-AXIS-992104"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </FormField>

          <FormField
            label="Distance Travelled (km, optional)"
            id="exp-dist"
            helperText="Applicable for vehicle mileage reimbursement claims"
          >
            <input
              type="number"
              id="exp-dist"
              className="form-input"
              placeholder="e.g. 42"
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </FormField>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
            Additional Notes &amp; Justification
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Special justification or itinerary details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', fontSize: '12px' }}
          />
        </div>

        <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1e40af' }}>
          <Info size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          <span>
            <strong>Reimbursement Rule:</strong> Approved claims are queued for disbursement with the monthly payroll batch. The expense month ({expenseMonth}) is tracked separately from the payout month.
          </span>
        </div>
      </div>
    </Modal>
  );
}
