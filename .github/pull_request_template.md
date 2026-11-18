## Pull Request Description

### Summary of Changes
<!-- Provide a clear and concise summary of the changes introduced in this PR. -->

### Related Issue / Ticket
<!-- Link any relevant issues or task references. -->

---

## Pre-Merge Quality & Safety Checklist

Please check all applicable boxes before requesting a review:

### Git & Branch Discipline
- [ ] This PR branches from and targets `develop` (not `main` directly).
- [ ] I ran `git pull --rebase origin develop` and resolved any conflicts cleanly.
- [ ] No force pushes were executed on shared branches.
- [ ] Commits are atomic with conventional commit titles (`feat:`, `fix:`, `chore:`, etc.).

### Secrets & Security
- [ ] No `.env`, `.env.*`, API keys, tokens, or credentials are committed.
- [ ] No database dumps, `.dump` files, or binary artifacts are tracked.
- [ ] Backend route guards strictly enforce permissions (HTTP 403 on unauthorized access).

### Code Quality & Build Checks
- [ ] Linter passed with 0 errors (`npm run lint`).
- [ ] Frontend build completed cleanly (`npx vite build`).
- [ ] Backend TypeScript build completed cleanly (`npm run build --prefix server`).
- [ ] All frontend and backend tests pass (`npm test` and `npm test --prefix server`).
- [ ] API Route coverage test passed (all frontend API paths have mounted backend routes).

### Database & Migrations (If Applicable)
- [ ] Migration is strictly **ADDITIVE** (new tables, new nullable/defaulted columns, new indexes).
- [ ] NO destructive operations (`DROP`, `TRUNCATE`, rename column, column re-type, `prisma db push --force-reset`).
- [ ] Migration file is sequentially numbered and timestamped.
- [ ] Database backup plan verified and dry-run executed on test/staging database.

### UI & UX Integrity
- [ ] Standardized sidebar layout, theme tokens, and **Inter** font typography preserved.
- [ ] Existing pages and components updated in place without creating duplicates.
