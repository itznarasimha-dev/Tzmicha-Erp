# 📖 ApexFlow ERP — Developer & Contributor Guide

Welcome to the **ApexFlow / Tzmicha ERP** repository! This document serves as the comprehensive onboarding and architectural manual for all developers, frontend engineers, backend engineers, and database administrators collaborating on the project.

---

## 📑 Table of Contents

1. [Project Overview & Core Principles](#1-project-overview--core-principles)
2. [Technology Stack](#2-technology-stack)
3. [The 8 Roles & System Capabilities](#3-the-8-roles--system-capabilities)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Database Architecture & Supabase Integration](#5-database-architecture--supabase-integration)
6. [Prisma ORM Setup & Daily Usage](#6-prisma-orm-setup--daily-usage)
7. [Design System & Typography Standards (STRICT)](#7-design-system--typography-standards-strict)
8. [Responsive Layout & UI Consistency Guidelines](#8-responsive-layout--ui-consistency-guidelines)
9. [Getting Started & Local Development Workflow](#9-getting-started--local-development-workflow)
10. [Git Conventions & Remotes Sync](#10-git-conventions--remotes-sync)
11. [Common Troubleshooting & FAQs](#11-common-troubleshooting--faqs)

---

## 1. Project Overview & Core Principles

ApexFlow is an enterprise-grade ERP designed for **Manufacturing, Regional Distribution, Field Sales, Warehouse Operations, Finance, Field Engineering, and Human Resources**.

### Core Architecture Principles

1. **Customer & Party 360**: One single identity per real-world party (customer, distributor, supplier, prospect).
2. **Header + Line Pattern**: Quotations, Sales Orders, Purchase Orders, Goods Receipt Notes (GRN), Dispatches, and Invoices *always* follow a Header + Line structure. Never combine line items into a single flat record.
3. **Financial Precision**: All monetary amounts are stored as exact `NUMERIC(14,2)` or `NUMERIC(16,4)`. Floating point calculations are strictly forbidden. Balances are derived, not drifting counters.
4. **Append-Only Ledgers**: Critical business events (`stock_movements`, `audit_logs`, posted journal entries) are strictly append-only. They are never updated or deleted in place.
5. **Strict Secret & Cost Isolation**: Sensitive financial figures (manufacturing landed costs, floor pricing margins, executive salaries) reside in isolated tables protected by role-based access rules. Sales and marketing personas are strictly blocked from viewing actual costs.
6. **Multi-Tenancy & Auditability**: Every core record contains `org_id` (UUID) for tenant isolation, `created_by`, `updated_by`, `created_at`, `updated_at`, and an optimistic concurrency `version` integer.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18 / 19, TypeScript (strict mode) |
| **Bundler & Tooling** | Vite 8, PostCSS, Autoprefixer |
| **Styling & Icons** | Tailwind CSS 3, Lucide React icons |
| **State Management** | Centralized Zustand Store (`src/store/useErpStore.ts`) with `localStorage` persistence |
| **Routing** | React Router v6 with `RoleProtectedRoute` guard |
| **Charts & Data Viz** | Recharts, Framer Motion |
| **Database & Auth** | PostgreSQL 14+ (via Supabase), Row-Level Security (RLS), Supabase Storage |
| **ORM / Data Access** | Prisma ORM v6 (`@prisma/client@^6.19.3`) targeting the isolated `erp` PostgreSQL schema |

---

## 3. The 7 Core Roles & System Capabilities

Every persona in ApexFlow has an isolated, purpose-built navigation sidebar, role-specific dashboard, and granular permissions.

### 👑 1. Executive Administrator (`admin`)
- **Scope**: Organization-wide (all regions: North, West, South).
- **Core Features**:
  - Full financial P&L, Cost of Goods Sold (COGS), Gross Margins, and Stock Asset Valuation.
  - Landed Cost & Standard Pricing Master (`product_cost_secrets`).
  - Governance & Approvals Center (discount exceptions $>8\%$, field expense claims, stock write-offs).
  - Delegated sales discount authority configuration per sales rep.
  - Comprehensive, immutable system audit logs with CSV export.
  - User and role management across all branches.

### 💼 2. Field Sales (`sales`)
- **Scope**: Scoped to assigned territory (e.g. North Region / Noida Central Hub).
- **Core Features**:
  - Approved product catalog with standard selling prices and floor price bounds (landed manufacturing costs are strictly hidden).
  - Real-time regional warehouse stock check before confirming orders.
  - Sales Orders & Quotations with automatic 18% GST calculation, discount headroom checks, and automatic routing to Admin if discount $> 8\%$.
  - Customer / Dealer Directory with credit limits and outstanding receivables.
  - Payment Collection recording with automatic invoice reconciliation.
  - Monthly sales quota tracker and travel expense claim wallet.

### 🎯 3. Marketing (`marketing`)
Contains three **isolated role logins** with separate workflows:
1. **Field Marketing Agent (`marketing_agent`)**:
   - 100% on-ground physical visits (Check-In / Check-Out with GPS timestamp).
   - Retail dealer acquisition and new store prospecting.
   - Competitor shelf pricing surveys (Asian Paints, Berger, Pidilite) vs our equivalents.
   - Physical promotional sample distribution (e.g. 500ml primer tins).
   - Daily travel mileage, fuel, and sample expense claims.
2. **Digital Marketing Specialist (`marketing_digital`)**:
   - Digital lead acquisition tracking, campaign planning, and channel attribution (Google Ads, Meta, SEO).
   - Cost-per-lead (CPL) and channel conversion analysis.
3. **Marketing Performance Analyst (`marketing_analyst`)**:
   - High-level Marketing ROI, Customer Acquisition Cost (CAC), and regional lead conversion funnel.

### 📦 4. Store / Warehouse Manager (`store_manager`)
- **Scope**: Scoped to physical distribution hubs (e.g. Noida Central Hub, Mumbai Depot).
- **Core Features**:
  - Physical batch & bin management (batch number, manufacturing date, expiry, storage bay).
  - **Goods Inward (GRN)**: Expected Consignment $\rightarrow$ Quality Inspection $\rightarrow$ Batch Registration $\rightarrow$ Live Stock posting.
  - **Outward Picking & Dispatch**: Multi-batch order picking allocation (split line items across multiple batches), dispatch confirmation, and auto-notification to Sales.
  - Inter-warehouse stock transfers with double-entry validation.
  - Physical damage, leakage, and discrepancy write-off reporting with reason codes.
  - Immutable stock movements ledger.

### 💳 5. Finance & Accounts (`finance`)
- **Scope**: Organization-wide financial operations.
- **Core Features**:
  - Tax invoice generation, credit notes, and debit notes.
  - Accounts Receivable (AR) & Accounts Payable (AP) aging reports (0-30, 31-60, 61-90, 90+ days).
  - Customer payment allocations and bank reconciliation.
  - Vendor bill settlements against Purchase Orders.
  - Chart of accounts, journal entries, and GST returns reporting.

### 🛠️ 6. Field Service / Engineer (`service`)
- **Scope**: Regional customer service tickets & on-site technical support.
- **Core Features**:
  - Service tickets lifecycle (Open, Assigned, Scheduled, In-Progress, Resolved).
  - On-site engineer dispatch schedule, GPS check-in, and service reports.
  - Warranty validation and spare parts consumption tracking.
  - Customer digital signature / OTP sign-off upon completion.

### 👥 7. Human Resources & Payroll (`hr`)
- **Scope**: Organization-wide employee lifecycle.
- **Core Features**:
  - Employee directory, employment contracts, and department assignments.
  - Leave management, attendance logging, and holiday calendars.
  - Monthly payroll generation, salary structures, deductions, and payslip generation.
  - Performance appraisal reviews and onboarding checklists.

---

## 4. Project Directory Structure

```
├── .env.example              # Template for environment variables (Supabase URLs)
├── .gitignore                # Protects secrets (.env, node_modules, build outputs)
├── prisma/
│   └── schema.prisma         # Complete 85-model Prisma schema targeting "erp" schema
├── src/
│   ├── components/
│   │   ├── layout/           # AppLayout, Header, Sidebar, RoleSwitcherBar, GlobalSearchModal
│   │   └── ui/               # Reusable UI primitives (Button, Card, StatCard, Badge, Modal, Input, Tabs)
│   ├── features/             # Domain modules scoped by role:
│   │   ├── admin/            # Executive Admin views (Finance, Pricing, Approvals, Users, Audit)
│   │   ├── manager/          # Operations / General Manager views
│   │   ├── sales/            # Field Sales views (Catalog, Orders, Customers, Targets, Expenses)
│   │   ├── marketing/        # Marketing views (Field Agent, Digital, Analyst)
│   │   ├── store/            # Store / Warehouse views (Inward, Dispatch, Transfers, Ledger)
│   │   ├── finance/          # Finance views (Invoices, AR/AP, Payments, Ledger)
│   │   ├── service/          # Field Service views (Tickets, Engineers, Spare Parts)
│   │   ├── hr/               # HR & Payroll views (Employees, Leaves, Payroll)
│   │   └── shared/           # SignInPage, AccessDeniedPage, NotFoundPage
│   ├── lib/
│   │   └── prisma.ts         # Singleton PrismaClient instance (prevents connection leaks)
│   ├── mock-data/            # Realistic seed datasets for development & demo switcher
│   ├── routes/               # AppRoutes & RoleProtectedRoute navigation guard
│   ├── services/             # Frontend calculation engines (pricing, inventory, finance)
│   ├── store/                # Zustand store (useErpStore.ts) managing reactive mock state
│   └── types/                # Domain TypeScript models & enum interfaces
├── package.json              # Scripts, dependencies, and configuration
├── tailwind.config.js        # Design tokens, custom colors, animations
├── tsconfig.json             # TypeScript project references & compiler options
└── vite.config.ts            # Vite build configuration
```

---

## 5. Database Architecture & Supabase Integration

ApexFlow uses PostgreSQL 14+ on **Supabase**. All ERP business entities are isolated in their own schema named **`erp`** to keep them separate from Supabase internal schemas (`auth`, `storage`, `vault`).

### 1. Dual Connection Strings
In Supabase, two connection endpoints are required:
- **Transaction Pooler (`DATABASE_URL`) on port `6543`**: Uses Supavisor/PgBouncer for application queries and runtime execution. Requires `?pgbouncer=true&schema=erp`.
- **Direct Connection (`DIRECT_URL`) on port `5432`**: Bypasses the pooler for DDL migrations (`prisma migrate dev`, `prisma db push`).

### 2. Primary Keys vs Human-Facing Business Codes
- **Every table has an internal UUID primary key**:
  ```sql
  id uuid primary key default gen_random_uuid()
  ```
- **Business codes are user-facing, deterministic, sequential strings**:
  - `SO-2026-0001` (Sales Orders)
  - `INV-2026-0001` (Invoices)
  - `GRN-2026-0001` (Goods Receipt Notes)
  - `PRD-001` (Products)
  - `BAT-2026-001` (Batches)
  - *Never use sequential auto-incrementing integers as foreign keys!* Always link foreign keys by `UUID`.

### 3. Supabase Auth Sync Trigger
When a user signs up or is created via Supabase Auth (`auth.users`), a database trigger automatically synchronizes their record into `erp.users`:
```sql
create or replace function erp.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into erp.users (id, org_id, email, full_name, role_code, is_active)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'org_id')::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role_code', 'sales_rep'),
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure erp.handle_new_auth_user();
```

---

## 6. Prisma ORM Setup & Daily Usage

ApexFlow is configured with **Prisma ORM v6** targeting the `erp` schema.

### Configuration (`prisma/schema.prisma`)
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["erp"]
}

generator client {
  provider = "prisma-client-js"
}
```

Every model includes `@@schema("erp")` and `@@map("table_name")` to guarantee clean mapping to PostgreSQL.

### Type-Safe Singleton Client (`src/lib/prisma.ts`)
To prevent connection exhaustion during Vite Hot-Module-Reloading (HMR):
```typescript
import { prisma } from '@/lib/prisma';

// Example: Query active products
const products = await prisma.product.findMany({
  where: { isActive: true },
  include: { category: true }
});
```

### Essential Prisma Commands
```bash
# 1. Regenerate TypeScript client types after editing prisma/schema.prisma
npm run prisma:generate

# 2. Push schema changes directly to development database
npm run prisma:push

# 3. Create a versioned SQL migration file
npm run prisma:migrate

# 4. Open Prisma Studio visual database browser (runs on http://localhost:5555)
npm run prisma:studio
```

---

## 7. Design System & Typography Standards (STRICT)

> [!IMPORTANT]
> **Strict Typography Mandate**: Never import, change, or introduce any new font family. The existing typography hierarchy is standardized across all 8 roles and must be strictly preserved.

### Typography Hierarchy Reference

| UI Element | CSS Classes | Font Size | Weight |
|---|---|---:|---:|
| **Main Page Title** | `text-2xl font-bold tracking-tight text-slate-900 dark:text-white` | 24px | 700 |
| **Page Description** | `text-sm font-normal text-slate-500 dark:text-slate-400` | 14px | 400 |
| **Section Heading** | `text-lg font-semibold text-slate-900 dark:text-white` | 18px | 600 |
| **Subsection Heading** | `text-base font-semibold text-slate-800 dark:text-slate-100` | 16px | 600 |
| **Card Heading / Title** | `text-sm font-semibold text-slate-900 dark:text-white` | 14px | 600 |
| **Dashboard KPI Metric** | `text-[26px] font-bold leading-tight font-mono tracking-tight tabular-nums` | 26px | 700 |
| **KPI Subtitle / Label** | `text-[13px] font-medium text-slate-500 dark:text-slate-400` | 13px | 500 |
| **Table Column Headers** | `text-xs font-semibold text-slate-500 uppercase tracking-wider` | 12px | 600 |
| **Table Row Content** | `text-[13px] font-normal text-slate-700 dark:text-slate-300` | 13px | 400 |
| **Important Table Values**| `text-[13px] font-semibold text-slate-900 dark:text-white tabular-nums` | 13px | 600 |
| **Form Input Labels** | `text-[13px] font-medium text-slate-700 dark:text-slate-300` | 13px | 500 |
| **Form Input Text** | `text-sm font-normal text-slate-900 dark:text-white` | 14px | 400 |
| **Placeholder Text** | `placeholder:text-[13px] placeholder:font-normal placeholder:text-slate-400` | 13px | 400 |
| **Button Text** | `text-[13px] font-semibold tracking-wide` | 13px | 600 |
| **Sidebar Nav Link** | `text-sm font-medium text-slate-600 hover:text-slate-900` | 14px | 500 |
| **Active Sidebar Link** | `text-sm font-semibold text-indigo-600 bg-indigo-50/80` | 14px | 600 |
| **Status Badges** | `text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase` | 11px | 600 |
| **Helper / Caption Text** | `text-xs font-normal text-slate-400` | 12px | 400 |
| **Validation Errors** | `text-xs font-medium text-rose-500` | 12px | 500 |
| **Modal / Dialog Title** | `text-xl font-bold text-slate-900 dark:text-white` | 20px | 700 |

### Font Weight Consistency Rules
- **400 (`font-normal`)**: Body content, descriptions, general table text, placeholders.
- **500 (`font-medium`)**: Form labels, navigation links, secondary badges, tabs.
- **600 (`font-semibold`)**: Card headings, buttons, section subheadings, table headers, key metrics.
- **700 (`font-bold`)**: Main page titles, modal titles, primary KPI numbers.

---

## 8. Responsive Layout & UI Consistency Guidelines

Every screen must look unified and professional, following the clean enterprise styling established in the Admin module.

### Responsive Standards
1. **Header & Action Bar**:
   - Use `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4` so page titles and action buttons stack neatly on mobile screens.
2. **KPI Metric Grid**:
   - Always use responsive CSS grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
3. **Data Tables & Lists**:
   - Wrap all tables in an overflow container:
     ```html
     <div class="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-md">
       <table class="min-w-full divide-y divide-slate-200">...</table>
     </div>
     ```
   - Set table headers with `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500`.
4. **Cards & Containers**:
   - Cards should use `bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm`.

---

## 9. Getting Started & Local Development Workflow

### Prerequisites
- **Node.js**: v18.x or v20.x+ (Recommended: Node v20 LTS)
- **NPM**: v9.x or higher
- **PostgreSQL Database**: Free Supabase project or local PostgreSQL 14+ instance

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itznarasimha-dev/Tzmicha-Erp.git
   cd Tzmicha-Erp
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Open `.env` in your editor and enter your Supabase connection strings:
   ```env
   DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&schema=erp"
   DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?schema=erp"
   ```

4. **Generate the Prisma client**:
   ```bash
   npm run prisma:generate
   ```

5. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

6. **Validate types and production build before submitting changes**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```

---

## 10. Git Conventions & Remotes Sync

This repository is maintained across two synchronized remotes:
- **Personal / Development remote**: `https://github.com/itznarasimha-dev/Tzmicha-Erp.git`
- **Main / Upstream remote**: `https://github.com/tzmichasureshmd-bit/ERP.git`

### Recommended Git Workflow
```bash
# 1. Pull latest changes from both remotes
git pull origin main

# 2. Create a feature branch
git checkout -b feat/your-feature-name

# 3. Commit your changes using conventional commit style
# Examples:
# feat(sales): add customer credit limit validation
# fix(store): resolve batch allocation split bug
# style(typography): standardize card heading weights
git commit -m "feat(module): description of changes"

# 4. Push and create a pull request
git push -u origin feat/your-feature-name
```

---

## 11. Common Troubleshooting & FAQs

### Q: `PrismaClientInitializationError: Can't reach database server`
- **Fix**: Check your network connection. If using Supabase, ensure port `6543` is reachable and that your IP address is not blocked by firewall rules. Verify that `?pgbouncer=true&schema=erp` is attached to `DATABASE_URL`.

### Q: `TypeScript error: Cannot find module '@prisma/client'`
- **Fix**: Run `npm run prisma:generate` to compile the Prisma client into `node_modules/@prisma/client`.

### Q: How do I switch roles during frontend testing?
- **Answer**: Use the interactive **Persona Switcher Banner** at the top of the application screen. It allows one-click switching between Admin, Sales, Marketing Sub-roles, Store Manager, Finance, and HR. You can also click **Reset Demo** to reset all mock records to the initial seed state.

### Q: How do I run Prisma Studio to inspect the database?
- **Answer**: Run `npm run prisma:studio`. It opens an interactive visual explorer at `http://localhost:5555` where you can view, filter, and edit records in all 85 tables.

---

*For additional assistance or questions, please open an issue on the repository or contact the lead maintainer.*
