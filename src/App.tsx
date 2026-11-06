import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { SignInPage } from './features/shared/SignInPage';
import { RegisterOrganizationPage } from './features/shared/RegisterOrganizationPage';
import { AccessDeniedPage } from './features/shared/AccessDeniedPage';

// Admin Views (Core Production Module)
import { ExecutiveDashboard } from './features/admin/ExecutiveDashboard';
import { ProductMaster } from './features/admin/ProductMaster';
import { PricingPolicies } from './features/admin/PricingPolicies';
import { UserManagement } from './features/admin/UserManagement';
import { AdminStockOverview } from './features/admin/AdminStockOverview';
import { AdminOrdersView } from './features/admin/AdminOrdersView';
import { ApprovalsView } from './features/admin/ApprovalsView';
import { AdminFieldMarketingView } from './features/admin/AdminFieldMarketingView';
import { AuditLogsView } from './features/admin/AuditLogsView';
import { RegionsManagement } from './features/admin/RegionsManagement';
import { SalesDiscountMatrix } from './features/admin/SalesDiscountMatrix';
import { FieldExpensesSettlement } from './features/admin/FieldExpensesSettlement';
import { TargetsManagement } from './features/admin/TargetsManagement';
import { AllRolesActivityTracking } from './features/admin/AllRolesActivityTracking';
import { QuotationsManagement } from './features/admin/QuotationsManagement';
import { SalesPersonLedgers } from './features/admin/SalesPersonLedgers';
import { AdminInwardReceivingView } from './features/admin/AdminInwardReceivingView';
import { AdminSuppliersView } from './features/admin/AdminSuppliersView';
import { AdminWarehouseTransfersAudits } from './features/admin/AdminWarehouseTransfersAudits';
import { AdminCustomerCreditLedger } from './features/admin/AdminCustomerCreditLedger';
import { AdminSalesPerformanceCommissions } from './features/admin/AdminSalesPerformanceCommissions';
import { AdminOrganizationsOverview } from './features/admin/AdminOrganizationsOverview';
import { SubscriptionBillingView } from './features/admin/SubscriptionBillingView';
import { ManagerDashboard } from './features/manager/ManagerDashboard';
import { AdminAttendanceLeaveView } from './features/admin/AdminAttendanceLeaveView';
import { AdminInvoicesView } from './features/admin/AdminInvoicesView';
import { CustomersDirectoryView } from './features/shared/CustomersDirectoryView';
import { FinanceComingSoonView } from './features/shared/FinanceComingSoonView';
import { ServiceComingSoonView } from './features/shared/ServiceComingSoonView';
import { RoleQueriesChatView } from './features/shared/RoleQueriesChatView';

// Dedicated Finance Role Portal Views
import { FinanceDashboard } from './features/finance/FinanceDashboard';
import { FinanceReceivablesPaymentsView } from './features/finance/FinanceReceivablesPaymentsView';
import { FinanceInvoicesQuotationsView } from './features/finance/FinanceInvoicesQuotationsView';
import { FinanceSuppliersPayablesView } from './features/finance/FinanceSuppliersPayablesView';
import { FinanceRefundsClaimsView } from './features/finance/FinanceRefundsClaimsView';
import { FinancePayrollAttendanceView } from './features/finance/FinancePayrollAttendanceView';
import { FinanceIncentivesSettlementsView } from './features/finance/FinanceIncentivesSettlementsView';
import { FinanceEmployeeExpensesView } from './features/finance/FinanceEmployeeExpensesView';
import { FinanceDeliveryCostsView } from './features/finance/FinanceDeliveryCostsView';
import { FinanceBudgetRequestsView } from './features/finance/FinanceBudgetRequestsView';
import { FinanceGeneralLedgerView } from './features/finance/FinanceGeneralLedgerView';
import { FinanceReportsAuditView } from './features/finance/FinanceReportsAuditView';
import { useErpStore } from './store/useErpStore';

import { RoleGuard } from './components/auth/RoleGuard';

// Dedicated Sales Role Portal (12-Page Standalone Workspace)
import { SalesPortalLayout } from './features/sales/SalesPortalLayout';

// Dedicated Store Keeper Role Portal (8 Workspaces)
import { StoreKeeperPortalLayout } from './features/store-manager/StoreKeeperPortalLayout';

// Dedicated Marketing Role Portal (Multi-Tier Hierarchical & Field Workspaces)
import { MarketingPortalLayout } from './features/marketing/MarketingPortalLayout';

// Dedicated Human Resources Role Portal (14 Workspaces)
import { HRPortalLayout } from './features/hr/HRPortalLayout';

const RoleBasedRedirect: React.FC = () => {
  const { currentRole } = useErpStore();
  if (currentRole === 'manager') return <Navigate to="/manager/dashboard" replace />;
  if (currentRole === 'sales') return <Navigate to="/sales/dashboard" replace />;
  if (currentRole === 'store_manager') return <Navigate to="/store-manager/overview" replace />;
  if (currentRole === 'marketing') return <Navigate to="/marketing" replace />;
  if (currentRole === 'finance') return <Navigate to="/finance" replace />;
  if (currentRole === 'service') return <Navigate to="/service" replace />;
  if (currentRole === 'hr') return <Navigate to="/hr" replace />;
  return <Navigate to="/admin/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public / Entry Routes */}
        <Route path="/login" element={<SignInPage />} />
        <Route path="/register" element={<RegisterOrganizationPage />} />
        <Route path="/register-organization" element={<RegisterOrganizationPage />} />
        <Route path="/register-team" element={<RegisterOrganizationPage />} />
        <Route path="/create-organization" element={<RegisterOrganizationPage />} />
        <Route path="/create-team" element={<RegisterOrganizationPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Authenticated Application Shell (All Roles: Admin, Manager, Sales, Store Keeper, Marketing, Finance, Service) */}
        <Route
          path="/"
          element={
            <RoleGuard allowedRoles={['admin', 'manager', 'sales', 'store_manager', 'marketing', 'finance', 'service', 'hr']}>
              <AppLayout />
            </RoleGuard>
          }
        >
          <Route index element={<RoleBasedRedirect />} />

          {/* Manager Operations Workspaces */}
          <Route path="manager/dashboard" element={<ManagerDashboard />} />
          <Route path="manager" element={<Navigate to="/manager/dashboard" replace />} />

          {/* Sales Role Workspaces */}
          <Route
            path="sales/*"
            element={
              <RoleGuard allowedRoles={['sales', 'admin', 'manager']}>
                <SalesPortalLayout />
              </RoleGuard>
            }
          />
          <Route
            path="sales"
            element={
              <RoleGuard allowedRoles={['sales', 'admin', 'manager']}>
                <SalesPortalLayout />
              </RoleGuard>
            }
          />

          {/* Store Keeper Role Workspaces (8 Workspaces) */}
          <Route
            path="store-manager/*"
            element={
              <RoleGuard allowedRoles={['store_manager', 'admin', 'manager']}>
                <StoreKeeperPortalLayout />
              </RoleGuard>
            }
          />
          <Route path="store-manager" element={<Navigate to="/store-manager/overview" replace />} />
          <Route
            path="store/*"
            element={
              <RoleGuard allowedRoles={['store_manager', 'admin', 'manager']}>
                <StoreKeeperPortalLayout />
              </RoleGuard>
            }
          />
          <Route path="store" element={<Navigate to="/store-manager/overview" replace />} />

          {/* Field Marketing Role Workspaces (6 Workspaces) */}
          <Route
            path="marketing/*"
            element={
              <RoleGuard allowedRoles={['marketing', 'admin', 'manager']}>
                <MarketingPortalLayout />
              </RoleGuard>
            }
          />
          <Route
            path="marketing"
            element={
              <RoleGuard allowedRoles={['marketing', 'admin', 'manager']}>
                <MarketingPortalLayout />
              </RoleGuard>
            }
          />

          {/* Finance Role Dedicated Portal */}
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="finance/dashboard" element={<FinanceDashboard />} />
          <Route path="finance/receivables" element={<FinanceReceivablesPaymentsView />} />
          <Route path="finance/payments" element={<Navigate to="/finance/receivables" replace />} />
          <Route path="finance/invoices" element={<FinanceInvoicesQuotationsView />} />
          <Route path="finance/quotations" element={<FinanceInvoicesQuotationsView />} />
          <Route path="finance/payables" element={<FinanceSuppliersPayablesView />} />
          <Route path="finance/suppliers" element={<Navigate to="/finance/payables" replace />} />
          <Route path="finance/refunds" element={<FinanceRefundsClaimsView />} />
          <Route path="finance/claims" element={<Navigate to="/finance/refunds" replace />} />
          <Route path="finance/payroll" element={<FinancePayrollAttendanceView />} />
          <Route path="finance/attendance" element={<FinancePayrollAttendanceView />} />
          <Route path="finance/incentives" element={<FinanceIncentivesSettlementsView />} />
          <Route path="finance/settlements" element={<Navigate to="/finance/incentives" replace />} />
          <Route path="finance/expenses" element={<FinanceEmployeeExpensesView />} />
          <Route path="finance/delivery-costs" element={<FinanceDeliveryCostsView />} />
          <Route path="finance/logistics" element={<Navigate to="/finance/delivery-costs" replace />} />
          <Route path="finance/budget-requests" element={<FinanceBudgetRequestsView />} />
          <Route path="finance/general-ledger" element={<FinanceGeneralLedgerView />} />
          <Route path="finance/ledger" element={<Navigate to="/finance/general-ledger" replace />} />
          <Route path="finance/reports" element={<FinanceReportsAuditView />} />
          <Route path="finance/audit-trail" element={<FinanceReportsAuditView />} />

          {/* Service Role Dedicated Portal (Coming Soon Experience) */}
          <Route path="service/*" element={<ServiceComingSoonView />} />
          <Route path="service" element={<ServiceComingSoonView />} />

          {/* Human Resources Role Portal (14 Workspaces) */}
          <Route
            path="hr/*"
            element={
              <RoleGuard allowedRoles={['hr', 'admin', 'manager']}>
                <HRPortalLayout />
              </RoleGuard>
            }
          />
          <Route
            path="hr"
            element={
              <RoleGuard allowedRoles={['hr', 'admin', 'manager']}>
                <HRPortalLayout />
              </RoleGuard>
            }
          />

          {/* Admin Core Production Routes */}
          <Route path="admin/dashboard" element={<ExecutiveDashboard />} />
          <Route path="admin/finance" element={<Navigate to="/finance" replace />} />
          <Route path="admin/products" element={<ProductMaster />} />
          <Route path="admin/pricing-policies" element={<PricingPolicies />} />
          <Route path="admin/discounts" element={<SalesDiscountMatrix />} />
          <Route path="admin/discount-matrix" element={<Navigate to="/admin/discounts" replace />} />
          <Route path="discounts" element={<Navigate to="/admin/discounts" replace />} />
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="users" element={<Navigate to="/admin/users" replace />} />
          <Route path="employees" element={<Navigate to="/admin/users" replace />} />
          <Route path="admin/organizations" element={<AdminOrganizationsOverview />} />
          <Route path="admin/organization" element={<Navigate to="/admin/organizations" replace />} />
          <Route path="organization" element={<Navigate to="/admin/organizations" replace />} />
          <Route path="admin/create-organization" element={<Navigate to="/admin/organizations" replace />} />
          <Route path="admin/customers" element={<CustomersDirectoryView role="admin" />} />
          <Route path="customers" element={<Navigate to="/admin/customers" replace />} />
          <Route path="admin/targets" element={<TargetsManagement />} />
          <Route path="targets" element={<Navigate to="/admin/targets" replace />} />
          <Route path="admin/regions" element={<RegionsManagement />} />
          <Route path="admin/stock" element={<AdminStockOverview />} />
          <Route path="admin/suppliers" element={<AdminSuppliersView />} />
          <Route path="suppliers" element={<Navigate to="/admin/suppliers" replace />} />
          <Route path="admin/inward-receipts" element={<AdminInwardReceivingView />} />
          <Route path="admin/grn" element={<Navigate to="/admin/inward-receipts" replace />} />
          <Route path="inward" element={<Navigate to="/admin/inward-receipts" replace />} />
          <Route path="admin/transfers-audits" element={<AdminWarehouseTransfersAudits />} />
          <Route path="admin/transfers" element={<Navigate to="/admin/transfers-audits" replace />} />
          <Route path="transfers" element={<Navigate to="/admin/transfers-audits" replace />} />
          <Route path="admin/orders" element={<AdminOrdersView />} />
          <Route path="orders" element={<Navigate to="/admin/orders" replace />} />
          <Route path="admin/quotations" element={<QuotationsManagement />} />
          <Route path="quotations" element={<Navigate to="/admin/quotations" replace />} />
          <Route path="admin/sales-ledger" element={<SalesPersonLedgers />} />
          <Route path="admin/collections-ledger" element={<Navigate to="/admin/sales-ledger" replace />} />
          <Route path="sales-ledger" element={<Navigate to="/admin/sales-ledger" replace />} />
          <Route path="admin/customer-credit" element={<AdminCustomerCreditLedger />} />
          <Route path="admin/credit" element={<Navigate to="/admin/customer-credit" replace />} />
          <Route path="credit" element={<Navigate to="/admin/customer-credit" replace />} />
          <Route path="admin/sales-performance" element={<AdminSalesPerformanceCommissions />} />
          <Route path="admin/commissions" element={<Navigate to="/admin/sales-performance" replace />} />
          <Route path="performance" element={<Navigate to="/admin/sales-performance" replace />} />
          <Route path="admin/approvals" element={<ApprovalsView />} />
          <Route path="admin/field-marketing" element={<AdminFieldMarketingView />} />
          <Route path="admin/expenses" element={<FieldExpensesSettlement />} />
          <Route path="admin/settlements" element={<Navigate to="/admin/expenses" replace />} />
          <Route path="admin/activity" element={<AllRolesActivityTracking />} />
          <Route path="admin/activity-tracking" element={<Navigate to="/admin/activity" replace />} />
          <Route path="activity" element={<Navigate to="/admin/activity" replace />} />
          <Route path="admin/audit-logs" element={<RoleGuard allowedRoles={['admin']}><AuditLogsView /></RoleGuard>} />
          <Route path="admin/subscription" element={<RoleGuard allowedRoles={['admin']}><SubscriptionBillingView /></RoleGuard>} />
          <Route path="subscription" element={<Navigate to="/admin/subscription" replace />} />
          <Route path="admin/invoices" element={<AdminInvoicesView />} />
          <Route path="invoices" element={<Navigate to="/admin/invoices" replace />} />
          <Route path="admin/billing" element={<Navigate to="/admin/invoices" replace />} />
          <Route path="billing" element={<Navigate to="/admin/invoices" replace />} />
          <Route path="admin/attendance" element={<AdminAttendanceLeaveView />} />
          <Route path="admin/leaves" element={<AdminAttendanceLeaveView />} />
          <Route path="attendance" element={<Navigate to="/admin/attendance" replace />} />
          <Route path="leaves" element={<Navigate to="/admin/leaves" replace />} />

          {/* Role Queries & Helpdesk Chat Module (All Roles) */}
          <Route path="queries" element={<RoleQueriesChatView />} />
          <Route path="chat" element={<RoleQueriesChatView />} />
          <Route path="admin/queries" element={<RoleQueriesChatView roleContext="admin" />} />
          <Route path="admin/chat" element={<Navigate to="/admin/queries" replace />} />
          <Route path="manager/queries" element={<RoleQueriesChatView roleContext="manager" />} />
          <Route path="manager/chat" element={<Navigate to="/manager/queries" replace />} />
          <Route path="service/queries" element={<RoleQueriesChatView roleContext="service" />} />
          <Route path="service/chat" element={<Navigate to="/service/queries" replace />} />
          <Route path="finance/queries" element={<RoleQueriesChatView roleContext="finance" />} />
          <Route path="finance/chat" element={<Navigate to="/finance/queries" replace />} />

          {/* Legacy / Direct shortcuts */}
          <Route path="admin/sales/*" element={<Navigate to="/sales" replace />} />
          <Route path="admin/sales" element={<Navigate to="/sales" replace />} />
          <Route path="approvals" element={<Navigate to="/admin/approvals" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
