# ApexFlow — Modern Glassmorphism Manufacturing & Regional Distribution ERP

An enterprise-grade, responsive platform for **Manufacturing, Regional Distribution, Field Sales, Warehouse Operations, Finance, Field Service, and HR Management**, designed with a clean, unified enterprise aesthetic.

Built with **React, TypeScript, Vite, Tailwind CSS, Lucide React, Zustand (with LocalStorage persistence), React Router, Recharts, Prisma ORM v6, and PostgreSQL / Supabase**.

> 📚 **Looking for the complete developer & architecture guide?**  
> Check out the [**Developer & Contributor Guide (DEVELOPER_GUIDE.md)**](./DEVELOPER_GUIDE.md) for full documentation on all 8 roles, database schema, Prisma workflows, strict typography standards, and local development setup.

---

## 🌟 Key Features & Role Breakdown

### 👑 1. Role: Executive Administrator
- **Organization-Wide Visibility**: Toggle between All Regions (India) or drill down to North, West, or South regions.
- **Product Master & Landed Cost**: Manage confidential landed/manufacturing costs, standard selling prices, and floor pricing limits.
- **Strict Financial Privacy**: Full company-wide **P&L, Cost of Goods Sold (COGS), Gross Profit Margins, Stock Asset Valuation, Accounts Receivable, and Consolidated Operating Expenses** accessible *strictly* to Admin. Non-admin roles attempting access are redirected with an Access Denied barrier.
- **Delegated Discount Governance**: Define maximum discount authority per sales rep (e.g. Vikram Malhotra 8%, Amit Desai 10%).
- **Governance & Approvals Center**: Approve or reject discount exceptions exceeding rep limits, field expense claims, and stock write-offs.
- **System Audit Trail**: Complete immutable event log of all transactions, price updates, order dispatches, and approvals.
- **Financial Export**: Export reconciled financial P&L statements directly to CSV.

### 💼 2. Role: Field Sales
- **Territory-Scoped Sales Desk**: Scoped to North territory (Noida Central Hub).
- **Approved Product Catalogue**: View standard approved selling prices, floor prices, and permitted discount headroom. **Actual product landed cost is strictly hidden**.
- **Real-Time Stock Availability**: Check real-time physical availability in regional warehouses before promising delivery.
- **Interactive Quotations & Sales Orders**:
  - Live stock verification prevents ordering unavailable quantities.
  - Real-time line item tax (18% GST), discount, and net total calculation.
  - Automatic discount validation: discounts within limit immediately confirm and reserve stock in warehouse picking queue; discounts exceeding limit automatically route to Admin for approval.
- **Customer Directory**: Manage dealers, distributors, credit limits, and outstanding accounts receivable.
- **Payment Collection**: Record customer payments against orders with automatic balance reconciliation.
- **Sales Targets & Incentives**: Track monthly target progress, order counts, and projected commission bonuses.
- **Personal Wallet & Expenses**: Company-issued travel advances, fuel/entertainment expense claims, and settlement ledger.

### 🎯 3. Role: Physical Field Marketing (Ground Operations Only)
- **100% Physical On-Ground Focus**: Strictly focuses on ground-level visits, dealer acquisition, contractor engagement, and physical sampling. (No online social media/Meta ads/email marketing clutter).
- **Visit Planner & Attendance Simulation**:
  - Instant ground Check-In timestamp and store address logging.
  - Check-Out with outcome notes, competitor brands observed, follow-up dates, and photo upload placeholder.
  - Track physical promotional sample dispensing (e.g. 500ml sample primer tins).
- **Dealer & Prospect Acquisition**: Onboard new prospective retail outlets and dealer accounts.
- **Competitor Shelf Pricing Intelligence**: Survey local retailer shelf prices of competitors (Asian Paints PPG, Berger, Pidilite) vs our equivalent products, variance calculation, and dealer sentiment.
- **Field Marketing Targets**: Physical visit quotas and dealer onboarding progress bars.
- **Field Expense Claims**: Submit fuel, mileage, and promotional sample claims against company advances.

### 📦 4. Role: Store Management / Warehouse Management
- **Region-Aware Warehouse Management**: Scoped to Noida Central Distribution Hub and regional depots.
- **Physical Product & Batch Inventory**: View quantities by product, batch number, expiry date, and storage bay.
- **Goods Inward Workflow**:
  - Expected Consignment → Physical Inspection → Batch Registration → Active Available Stock.
  - Captures supplier invoice number, gate pass, batch number, manufacturing date, and expiry date.
  - Posting inward immediately increases available stock for Sales and Admin.
- **Outward Dispatch Queue (Multi-Batch Fulfillment)**:
  - Orders reserved by Sales appear in the picking queue.
  - Supports allocating quantities across **multiple batches** for a single customer order!
  - Outward dispatch confirmation deducts stock, records outward movement, and notifies Sales rep.
- **Inter-Warehouse Transfers**: Dual-entry stock transfers between distribution hubs with quantity validation.
- **Damage & Discrepancy Reporting**: Log physical leakages, spillage, and count variances with reason codes.
- **Immutable Movements Ledger**: Comprehensive audit trail of every inward, outward, transfer, and adjustment event.

---

## ⚡ The Shared Source of Truth (Instant Cross-Role Reactivity)

All 4 roles connect to a single **Zustand store** (`src/store/useErpStore.ts`) persisted in `localStorage`:
1. When Store Management receives goods into batch $\rightarrow$ available stock increases across Sales catalog and Admin valuation immediately.
2. When Sales places an order $\rightarrow$ available stock is verified and reserved; Store Management sees it in the dispatch queue.
3. If Sales applies discount $> 8\%$ $\rightarrow$ order status becomes `pending_discount_approval` and Admin sees it in the Approvals queue. Dispatch is blocked until Admin approves!
4. When Store confirms dispatch $\rightarrow$ outward movement is posted, sales order updates to `dispatched`, and Admin COGS/Revenue reconcile immediately without a page refresh!

---

## 🚀 Setup and Run Instructions

### Prerequisites
- Node.js >= 18 (Tested on Node v20 / v22)
- npm >= 9
- PostgreSQL 14+ or Supabase account

### Installation
```bash
# Navigate to project directory
cd "c:\Users\HP\OneDrive\Desktop\ERP System"

# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your Supabase connection strings

# 3. Generate Prisma client types
npm run prisma:generate
```

### Running Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Database Studio (Visual Table Browser)
```bash
npm run prisma:studio
```
Opens interactive UI at [http://localhost:5555](http://localhost:5555) for all 85 ERP tables.

### Building for Production
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory.

---

## 🧭 Interactive Persona Switcher

Use the **interactive banner at the very top of the screen** to switch between all roles anytime:
- **👑 Admin**: Rajesh Verma (`usr-admin-01`, Org-wide)
- **📊 Manager**: Operational & Regional Supervision
- **💼 Sales Rep**: Vikram Malhotra (`usr-sales-01`, North, 8% Limit)
- **🎯 Field Marketing**: Ananya Sharma (`usr-mkt-01`, Ground Visits & Shelf Audits)
- **💻 Digital Marketing**: Campaign Management & Lead Tracking
- **📈 Marketing Analyst**: ROI & Funnel Analytics
- **📦 Store Manager**: Devendra Rawat (`usr-store-01`, Noida Hub)
- **💳 Finance**: Invoicing, AR/AP & Payment Allocation
- **🛠️ Service**: Field Tickets & Engineer Dispatch
- **👥 HR & Payroll**: Employee Records & Monthly Payroll

You can also click **Reset Demo** in the top bar to revert all mock data back to its clean initial state anytime. For full architectural specifications, consult [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md).

---

## 📁 Project Architecture

```
src/
├── types/                 # Domain TypeScript interfaces (Products, Batches, Orders, Movements, Claims)
├── mock-data/             # Interconnected realistic seed data for 3 regions
├── store/                 # Centralized Zustand store with localStorage persistence
├── services/              # Business logic (inventoryService, financeService, pricingService)
├── routes/                # Route definitions & RoleProtectedRoute
├── components/
│   ├── layout/            # AppLayout, Header, Sidebar, RoleSwitcherBar, GlobalSearchModal
│   └── ui/                # Glassmorphic primitives (Button, Card, StatCard, Badge, Modal, Input, Tabs)
└── features/
    ├── shared/            # SignInPage, AccessDeniedPage
    ├── admin/             # ExecutiveDashboard, FinanceDashboard, ProductMaster, PricingPolicies, ApprovalsView, UserManagement, AdminStockOverview, AdminOrdersView, AuditLogsView
    ├── sales/             # SalesDashboard, ProductCatalog, CreateOrderPage, SalesOrdersList, RegionalStockAvailability, SalesCustomers, SalesTargets, SalesExpensesAndWallet
    ├── field-marketing/   # FieldMarketingDashboard, VisitPlanner, DealerProspectDirectory, MarketSurveys, MarketingTargets, MarketingWalletAndExpenses
    └── store/             # StoreDashboard, GoodsInward, DispatchQueue, WarehouseStock, StockTransfers, StockAdjustments, StockMovementsLedger
```

---

## 📋 Features Checklist

- [x] Four distinct roles with independent navigation, screens, and permissions
- [x] Centralized Zustand store with zero-reload cross-role reactivity
- [x] Inward Workflow (Expected $\rightarrow$ Received $\rightarrow$ Batch Recorded $\rightarrow$ Stock Available)
- [x] Outward Workflow (Order $\rightarrow$ Stock Verification $\rightarrow$ Reservation $\rightarrow$ Multi-Batch Allocation $\rightarrow$ Dispatch)
- [x] Actual landed cost strictly hidden from Sales and Marketing roles
- [x] Delegated discount limit check and automated Admin approval workflow
- [x] Physical-only Field Marketing module (Visit check-ins/outs, dealer acquisition, competitor surveys)
- [x] Regional warehouse scoping (Store Managers scoped to authorized locations)
- [x] Admin-only financial statement (Reconciled P&L, COGS, Stock Valuation, Receivables, CSV export)
- [x] Protected routes preventing unauthorized access via URL manipulation
- [x] Interactive Global Search modal (⌘K)
- [x] System Notifications drawer and audit transaction ledger
- [x] Premium glassmorphism design system (frosted translucent cards, subtle gradients, accessible contrast)
- [x] Clean production build with 0 TypeScript errors
