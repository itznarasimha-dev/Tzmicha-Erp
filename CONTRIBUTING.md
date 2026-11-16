# ERP System — Team Workflow & Contribution Guide

This guide establishes strict team workflow standards to eliminate merge conflicts, prevent reverted UI changes, and protect production database integrity. Every developer contributing to this repository must follow these rules.

---

## 1. Branching Strategy & Workflow

1. **Shared Trunk Branches**:
   - `develop`: Active integration branch for all team features.
   - `main`: Production release branch.
   - **Rule**: Direct pushes to `develop` and `main` are strictly forbidden. All changes must arrive via reviewed Pull Requests (PRs).

2. **Feature Branch Naming Convention**:
   - `feature/<short-description>` (e.g., `feature/finance-gl-ledger`)
   - `bugfix/<short-description>` (e.g., `bugfix/sales-order-calc`)
   - `restore/<short-description>` (e.g., `restore/ui-changes`)

3. **Branch Creation & Synchronization**:
   ```bash
   # Always start from the latest develop
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name

   # Before opening or updating a PR, ALWAYS rebase onto latest develop:
   git fetch origin
   git pull --rebase origin develop
   ```
   *Why `--rebase`?* Rebasing puts your commits cleanly on top of coworkers' latest work, eliminating accidental merge conflicts where "accept theirs/ours" silently deletes changes.

4. **Git Safety Rules (Non-Negotiable)**:
   - **NEVER** run `git push --force` or `git push --force-with-lease` on shared branches (`develop`, `main`).
   - **NEVER** run `git reset --hard` or `git clean -fd` on shared history.
   - Make small, atomic, logically independent commits with clear conventional commit messages:
     - `feat: add quotation pdf export`
     - `fix: resolve sales lead update permission guard`
     - `chore: update dependency lockfile`

---

## 2. Secrets & Environment Configuration

1. **NEVER commit secrets or environment files**:
   - `.env`, `.env.*`, `backend/.env`, `server/.env`, and Supabase secret keys must stay in `.gitignore`.
   - Backups, `.dump` files, uploads, and local database snapshots must NEVER be tracked in git.
2. **Safe Environment Templates**:
   - Always maintain `.env.example` in root and `server/.env.example` with sanitized placeholder values.
   - When introducing a new environment variable, document it in `.env.example` with descriptive comments.

---

## 3. Database Migration Governance (Production-Safe)

Our database runs on Supabase PostgreSQL with live production data. Follow these zero-data-loss rules:

1. **Additive Migrations Only**:
   - Allowed: `CREATE TABLE`, `ALTER TABLE ... ADD COLUMN ... DEFAULT ...`, `CREATE INDEX`, additive RLS policies.
   - Strictly Forbidden: `prisma db push`, `migrate reset`, `--force-reset`, `--accept-data-loss`, `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `ALTER COLUMN TYPE` without safe staging, and `DELETE` without a `WHERE` clause.
2. **Sequential Migration Rule (Single Owner)**:
   - **Only one developer merges schema migrations at a time.**
   - Migrations are timestamped and sequentially numbered (e.g. `supabase/migrations/033_*.sql`).
   - If two branches create migrations with conflicting numbers, **never edit an already applied migration**. Re-generate the migration with the next sequential number.
3. **Migration Execution Protocol**:
   - 1. Take a `pg_dump -Fc` full backup before any schema change.
   - 2. Test the migration, back-fill, and rollback on an isolated staging database.
   - 3. Verify row counts on critical tables (`leads`, `customers`, `quotations`, `invoices`, `users`, `sales_orders`).
   - 4. Apply to production only after explicit team sign-off.

---

## 4. Backend Route Registration & Role Permissions

1. **API Parity Requirement**:
   - Any API endpoint called by the frontend (`src/`) must have a corresponding route implemented and mounted in `server/src/app.ts`.
   - Never register routes in isolated branch files without mounting them to the main Express router.
2. **Backend Permission Enforcement**:
   - Security permissions are enforced on the **backend (HTTP 403)** via `requirePermission(...)`, never solely in the UI.
   - For shared entities (e.g., Leads handed over from Marketing to Sales), configure route guards to accept both roles:
     `requirePermission('marketing.lead.update', 'sales.lead.update')`
3. **Automated Verification**:
   - Run the automated route coverage test before pushing:
     ```bash
     npm test --prefix server
     ```
   - This test fails automatically if any frontend endpoint has no backend handler.

---

## 5. UI, Theme & Typography Standards

1. **Design System & Typography**:
   - The ERP interface uses **Inter** and **Plus Jakarta Sans** typography (`--font-sans: 'Inter', 'Plus Jakarta Sans', system-ui...`).
   - Maintain the sidebar layout, slate/indigo design tokens, and modern ERP workspace aesthetic.
2. **Upgrade in Place**:
   - Never create duplicate files or competing page implementations. Upgrade existing pages in place.
   - Keep UI components decoupled and connected to live API stores (`useErpStore`, `src/api/*`).

---

## 6. GitHub Branch Protection Recommendations

Repository administrators must configure the following protections on `develop` and `main`:
1. **Require pull request before merging**: Require at least 1 approving review.
2. **Require status checks to pass before merging**:
   - `lint` (Oxlint)
   - `typecheck` (`tsc --noEmit`)
   - `build` (`vite build` & `server build`)
   - `test` (Frontend Vitest & Backend Vitest route coverage)
3. **Require branches to be up to date before merging** (Enforce `--rebase`).
4. **Do not allow bypassing the above settings**.
5. **Block force pushes** and **Block branch deletions**.
