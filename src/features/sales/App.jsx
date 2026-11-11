import { useState, useMemo } from 'react';
import { ToastProvider } from './context/ToastContext';
import { SalesProvider, useSales } from './context/SalesContext';
import Layout from './components/layout/Layout';

// 12 Core Enterprise Pages (Strict Section 4 Order)
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
import AttendanceWorkUpdatesPage from './pages/AttendanceWorkUpdatesPage';
import AttendancePage from './pages/AttendancePage';
import WorkUpdatesPage from './pages/WorkUpdatesPage';
import ExpensesPage from './pages/ExpensesPage';
import TeamSchedulePage from './pages/TeamSchedulePage';

// Global Modals
import CreateOrderModal from './components/modals/CreateOrderModal';
import CreateQuotationModal from './components/modals/CreateQuotationModal';
import AddExpenseModal from './components/modals/AddExpenseModal';
import QuotationDetailModal from './components/modals/QuotationDetailModal';
import OrderDetailModal from './components/modals/OrderDetailModal';
import InvoiceDetailModal from './components/modals/InvoiceDetailModal';
import ExpenseDetailModal from './components/modals/ExpenseDetailModal';
import RecordPaymentModal from './components/modals/RecordPaymentModal';
import ProfileModal from './components/modals/ProfileModal';
import ProfileSettingsModal from './components/modals/ProfileSettingsModal';
import AuthModal from './components/modals/AuthModal';

function AppContent() {
  const { activePage, pageFilter, quotations, userRole, navigateTo } = useSales();

  // Global modal triggers accessible from Header, Dashboard, or Pages
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState(false);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');

  // Inspection modals
  const [inspectQuoteId, setInspectQuoteId] = useState(null);
  const inspectQuote = useMemo(() => {
    return quotations.find((q) => q.id === inspectQuoteId) || null;
  }, [quotations, inspectQuoteId]);
  const [inspectOrder, setInspectOrder] = useState(null);
  const [inspectInvoice, setInspectInvoice] = useState(null);
  const [inspectExpense, setInspectExpense] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);

  // Render current page component matching exact Section 4 navigation IDs
  const renderCurrentPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onOpenNewOrder={() => setIsNewOrderOpen(true)}
            onOpenNewQuotation={() => setIsNewQuotationOpen(true)}
            onOpenNewExpense={() => setIsNewExpenseOpen(true)}
            onViewQuote={(q) => setInspectQuoteId(q.id)}
            onViewOrder={(o) => setInspectOrder(o)}
            onViewInvoice={(i) => setInspectInvoice(i)}
          />
        );
      case 'products':
        return <ProductsStockPage />;
      case 'customers':
      case 'sales-customers':
        return <CustomersPage />;
      case 'marketing-leads':
        return <MarketingLeadsPage />;
      case 'quotations':
        return <QuotationsPage preselectedFilter={pageFilter} />;
      case 'sales-orders':
        return <SalesOrdersPage />;
      case 'sales-pipeline':
        return <SalesPipelinePage onOpenNewOrder={() => setIsNewOrderOpen(true)} />;
      case 'action-plan':
      case 'schedule':
      case 'team-schedule':
      case 'my-schedule':
        return <TeamSchedulePage />;
      case 'attendance':
        return <AttendancePage />;
      case 'work-updates':
        return <WorkUpdatesPage />;
      case 'dispatch':
        return <DispatchDeliveryPage />;
      case 'invoices-payments':
        return <InvoicesPaymentsPage initialTab={pageFilter === 'payments' ? 'payments' : 'invoices'} />;
      case 'returns':
        return <ReturnsPage />;
      case 'calls-followups':
        return <CustomersPage />;
      case 'targets-reports':
      case 'sales-performance':
        return <TargetsReportsPage />;
      case 'attendance-work':
      case 'attendance-action-plan':
        return <AttendancePage />;
      case 'expenses':
      case 'travelling-expenses':
        return <ExpensesPage preselectedFilter={pageFilter} />;
      default:
        return (
          <DashboardPage
            onOpenNewOrder={() => setIsNewOrderOpen(true)}
            onOpenNewQuotation={() => setIsNewQuotationOpen(true)}
            onOpenNewExpense={() => setIsNewExpenseOpen(true)}
            onViewQuote={(q) => setInspectQuoteId(q.id)}
            onViewOrder={(o) => setInspectOrder(o)}
            onViewInvoice={(i) => setInspectInvoice(i)}
          />
        );
    }
  };

  return (
    <Layout
      onOpenNewOrder={() => setIsNewOrderOpen(true)}
      onOpenNewQuotation={() => setIsNewQuotationOpen(true)}
      onOpenNewExpense={() => setIsNewExpenseOpen(true)}
      onOpenProfile={() => setIsProfileOpen(true)}
      onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
      onOpenSignIn={() => {
        setAuthMode('signin');
        setIsAuthOpen(true);
      }}
      onOpenSignUp={() => {
        setAuthMode('signup');
        setIsAuthOpen(true);
      }}
    >
      {renderCurrentPage()}

      {/* Global Modals */}
      <CreateOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
      />

      <CreateQuotationModal
        isOpen={isNewQuotationOpen}
        onClose={() => setIsNewQuotationOpen(false)}
      />

      <AddExpenseModal
        isOpen={isNewExpenseOpen}
        onClose={() => setIsNewExpenseOpen(false)}
      />

      <QuotationDetailModal
        isOpen={Boolean(inspectQuote)}
        onClose={() => setInspectQuoteId(null)}
        quotation={inspectQuote}
      />

      <OrderDetailModal
        isOpen={Boolean(inspectOrder)}
        onClose={() => setInspectOrder(null)}
        order={inspectOrder}
      />

      <InvoiceDetailModal
        isOpen={Boolean(inspectInvoice)}
        onClose={() => setInspectInvoice(null)}
        invoice={inspectInvoice}
        onOpenPaymentModal={(inv) => {
          setInspectInvoice(null);
          setPaymentInvoice(inv);
        }}
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

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SalesProvider>
        <AppContent />
      </SalesProvider>
    </ToastProvider>
  );
}
