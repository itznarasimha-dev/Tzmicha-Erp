import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { SalesProvider, useSales } from './context/SalesContext';
import { useErpStore } from '../../store/useErpStore';
import './sales.css';

// 16 Core Sales Pages
import DashboardPage from './pages/DashboardPage';
import ProductsStockPage from './pages/ProductsStockPage';
import CustomersPage from './pages/CustomersPage';
import MarketingLeadsPage from './pages/MarketingLeadsPage';
import QuotationsPage from './pages/QuotationsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import SalesPipelinePage from './pages/SalesPipelinePage';
import DispatchDeliveryPage from './pages/DispatchDeliveryPage';
import InvoicesPaymentsPage from './pages/InvoicesPaymentsPage';
import ReturnsPage from './pages/ReturnsPage';
import TargetsReportsPage from './pages/TargetsReportsPage';
import TeamSchedulePage from './pages/TeamSchedulePage';
import AttendancePage from './pages/AttendancePage';
import WorkUpdatesPage from './pages/WorkUpdatesPage';
import ExpensesPage from './pages/ExpensesPage';
import { RoleQueriesChatView } from '../shared/RoleQueriesChatView';

// Global Sales Modals
import CreateOrderModal from './components/modals/CreateOrderModal';
import CreateQuotationModal from './components/modals/CreateQuotationModal';
import CreateInvoiceModal from './components/modals/CreateInvoiceModal';
import AddExpenseModal from './components/modals/AddExpenseModal';
import QuotationDetailModal from './components/modals/QuotationDetailModal';
import OrderDetailModal from './components/modals/OrderDetailModal';
import InvoiceDetailModal from './components/modals/InvoiceDetailModal';
import InvoiceDocumentPreviewModal from './components/modals/InvoiceDocumentPreviewModal';
import ExpenseDetailModal from './components/modals/ExpenseDetailModal';
import RecordPaymentModal from './components/modals/RecordPaymentModal';
import PaymentReminderModal from './components/modals/PaymentReminderModal';
import CreateDispatchModal from './components/modals/CreateDispatchModal';
import AssignToServiceModal from './components/modals/AssignToServiceModal';
import ProfileModal from './components/modals/ProfileModal';
import ProfileSettingsModal from './components/modals/ProfileSettingsModal';

import {
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

const SUB_ROLES = [
  {
    id: 'sales_manager',
    userId: 'usr-sales-mgr',
    level: 'Level 1',
    title: 'Sales Manager',
    person: 'Ananya Roy',
    badge: 'Company-wide Authority',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    desc: 'Full team data • Quote final approver • Multi-region oversight • All returns & leaves',
  },
  {
    id: 'sales_coordinator',
    userId: 'usr-sales-coord',
    level: 'Level 2',
    title: 'Sales Coordinator',
    person: 'Sneha Patil',
    badge: 'Regional Operations',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    desc: 'Hyderabad & Deccan region • Assign visits & tasks • Quote approver for Reps & Juniors',
  },
  {
    id: 'sales_rep',
    userId: 'usr-sales-01',
    level: 'Level 3',
    title: 'Senior Sales Executive',
    person: 'Vikram Mehta',
    badge: 'Direct Field Accounts',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'Assigned customer accounts • Orders & Dispatches • Self-discount limit 12% • Field visits',
  },
  {
    id: 'junior_sales',
    userId: 'usr-sales-jr',
    level: 'Level 4',
    title: 'Junior Sales Executive',
    person: 'Aditya Joshi',
    badge: 'Entry Field Associate',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    desc: 'Lead generation & assigned accounts • Quotes require supervisor approval • Self-discount 8%',
  },
];

const SalesPortalInner: React.FC = () => {
  const sales = (useSales as any)();
  const { userRole, setUserRole, userProfile, activePage, navigateTo } = sales;
  const { currentUser, switchUser } = useErpStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Modals state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

  // Inspection modals
  const [inspectQuote, setInspectQuote] = useState<any>(null);
  const [quoteToEdit, setQuoteToEdit] = useState<any>(null);
  const [inspectOrder, setInspectOrder] = useState<any>(null);
  const [dispatchOrder, setDispatchOrder] = useState<any>(null);
  const [serviceOrder, setServiceOrder] = useState<any>(null);
  const [inspectInvoice, setInspectInvoice] = useState<any>(null);
  const [previewDocInvoice, setPreviewDocInvoice] = useState<any>(null);
  const [reminderInvoice, setReminderInvoice] = useState<any>(null);
  const [inspectExpense, setInspectExpense] = useState<any>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);

  // Sync ERP currentUser salesSubRole with SalesContext userRole
  useEffect(() => {
    if (currentUser?.salesSubRole && currentUser.salesSubRole !== userRole) {
      setUserRole(currentUser.salesSubRole);
    }
  }, [currentUser?.salesSubRole]);

  // Sync location.pathname with activePage
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'sales') {
      const pageName = parts[1];
      if (pageName && pageName !== activePage) {
        navigateTo(pageName);
      }
    }
  }, [location.pathname]);

  const handleSubRoleSwitch = (subRoleId: string, userId: string) => {
    setUserRole(subRoleId);
    if (userId) {
      switchUser(userId);
    }
  };

  const activeSubRoleInfo = SUB_ROLES.find((r) => r.id === userRole) || SUB_ROLES[2];

  return (
    <div className="sales-portal-workspace w-full max-w-[1600px] mx-auto pb-16 font-sans">
      {/* ─── Sales Route Outlet ─── */}
      <div className="sales-content-viewport">
        <Routes>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <DashboardPage
                onOpenNewOrder={() => setIsNewOrderOpen(true)}
                onOpenNewQuotation={() => setIsNewQuotationOpen(true)}
                onOpenNewExpense={() => setIsNewExpenseOpen(true)}
                onViewQuote={(q: any) => setInspectQuote(q)}
                onViewOrder={(o: any) => setInspectOrder(o)}
                onViewInvoice={(i: any) => setInspectInvoice(i)}
              />
            }
          />
          <Route path="products" element={<ProductsStockPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/sales-customers" element={<CustomersPage />} />
          <Route path="customers/marketing-leads" element={<MarketingLeadsPage />} />
          <Route path="sales-customers" element={<CustomersPage />} />
          <Route path="marketing-leads" element={<MarketingLeadsPage />} />
          <Route path="quotations" element={<QuotationsPage />} />
          <Route path="orders" element={<SalesOrdersPage />} />
          <Route path="sales-orders" element={<SalesOrdersPage />} />
          <Route path="pipeline" element={<SalesPipelinePage />} />
          <Route path="sales-pipeline" element={<SalesPipelinePage />} />
          <Route path="dispatch" element={<DispatchDeliveryPage />} />
          <Route path="invoices" element={<InvoicesPaymentsPage />} />
          <Route path="invoices-payments" element={<InvoicesPaymentsPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="schedule" element={<TeamSchedulePage />} />
          <Route path="team-schedule" element={<TeamSchedulePage />} />
          <Route path="my-schedule" element={<TeamSchedulePage />} />
          <Route path="action-plan" element={<TeamSchedulePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="work-updates" element={<WorkUpdatesPage />} />
          <Route path="attendance-work" element={<AttendancePage />} />
          <Route path="followups" element={<CustomersPage />} />
          <Route path="calls-followups" element={<CustomersPage />} />
          <Route path="targets" element={<TargetsReportsPage />} />
          <Route path="targets-reports" element={<TargetsReportsPage />} />
          <Route path="performance" element={<TargetsReportsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="travelling-expenses" element={<ExpensesPage />} />
          <Route path="queries" element={<RoleQueriesChatView roleContext="sales" />} />
          <Route path="chat" element={<RoleQueriesChatView roleContext="sales" />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>

      {/* ─── Global Modals Mounted for Operational Workflows ─── */}
      <CreateOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
      />

      <CreateQuotationModal
        isOpen={isNewQuotationOpen || Boolean(quoteToEdit)}
        onClose={() => {
          setIsNewQuotationOpen(false);
          setQuoteToEdit(null);
        }}
        quotationToEdit={quoteToEdit}
      />

      <CreateInvoiceModal
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
      />

      <AddExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => setIsNewExpenseOpen(false)}
      />

      <QuotationDetailModal
        isOpen={Boolean(inspectQuote)}
        onClose={() => setInspectQuote(null)}
        quotation={inspectQuote}
        onEditQuotation={(q: any) => {
          setInspectQuote(null);
          setQuoteToEdit(q);
        }}
      />

      <OrderDetailModal
        isOpen={Boolean(inspectOrder)}
        onClose={() => setInspectOrder(null)}
        order={inspectOrder}
        onOpenDispatchModal={(o: any) => {
          setInspectOrder(null);
          setDispatchOrder(o || inspectOrder);
        }}
        onOpenAssignService={(o: any) => {
          setInspectOrder(null);
          setServiceOrder(o || inspectOrder);
        }}
      />

      <InvoiceDetailModal
        isOpen={Boolean(inspectInvoice)}
        onClose={() => setInspectInvoice(null)}
        invoice={inspectInvoice}
        onOpenReminderModal={(inv: any) => {
          setInspectInvoice(null);
          setReminderInvoice(inv);
        }}
      />

      <InvoiceDocumentPreviewModal
        isOpen={Boolean(previewDocInvoice)}
        onClose={() => setPreviewDocInvoice(null)}
        invoice={previewDocInvoice}
      />

      <PaymentReminderModal
        isOpen={Boolean(reminderInvoice)}
        onClose={() => setReminderInvoice(null)}
        invoice={reminderInvoice}
      />

      <CreateDispatchModal
        isOpen={Boolean(dispatchOrder)}
        onClose={() => setDispatchOrder(null)}
        preselectedOrder={dispatchOrder}
      />

      <AssignToServiceModal
        isOpen={Boolean(serviceOrder)}
        onClose={() => setServiceOrder(null)}
        order={serviceOrder}
        onSuccess={() => setServiceOrder(null)}
      />

      <ExpenseDetailModal
        isOpen={Boolean(inspectExpense)}
        onClose={() => setInspectExpense(null)}
        expense={inspectExpense}
      />

      <RecordPaymentModal
        isOpen={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
        preselectedInvoice={paymentInvoice}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenSettings={() => {
          setIsProfileOpen(false);
          setIsProfileSettingsOpen(true);
        }}
      />

      <ProfileSettingsModal
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
      />
    </div>
  );
};

export const SalesPortalLayout: React.FC = () => {
  return (
    <ToastProvider>
      <SalesProvider>
        <SalesPortalInner />
      </SalesProvider>
    </ToastProvider>
  );
};

export default SalesPortalLayout;
