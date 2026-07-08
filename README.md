# Star Fibre

A Next.js / React billing and account management scaffold for Starfibre Communications (Pty) Ltd.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.


## Supabase setup

The app now loads public site content, offerings, contacts, customers, invoices, payments, settings and tickets from Supabase instead of hardcoded page arrays. Run `supabase/schema.sql` in the Supabase SQL editor before deploying so the required tables, public-content policies and seed rows exist.

Default public client values are configured in `lib/supabase.ts` for the supplied project URL and publishable key. For production, you can override them with GitHub Actions secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Build and deployment

This repository includes a GitHub Actions workflow at `.github/workflows/deploy-github-pages.yml` that installs dependencies and verifies the server-capable Next.js build. Because the dashboard now uses API routes, production deployment should target a server-capable platform such as Vercel, Netlify functions, a Node server or container hosting.

### One-time GitHub setup

1. Push this branch to GitHub and merge it into `main`.
2. Configure a server-capable deployment target for the Next.js app.
3. Add Supabase secrets to that target and, for GitHub build verification, to **Settings → Secrets and variables → Actions**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` for server-only API/job routes
   - `JOB_SECRET` for protected scheduler endpoints
4. Push to `main` or manually run **Actions → Build Star Fibre → Run workflow**.

`GITHUB_PAGES=true` now only controls the optional repository `basePath`. It does not enable static export. Only set `STATIC_EXPORT=true` for a separate marketing-only build where API routes, background jobs and custom headers are not required.

## Deployment notes

- The workflow uses Node.js 24 and `npm install`, so it works before a `package-lock.json` has been committed. After the first successful local install, you can commit a lockfile and switch the workflow to `npm ci` if desired.
- API-backed dashboard deployments should not use `output: 'export'` because Next.js static export cannot run API routes.
- If you intentionally build a marketing-only static export, set `STATIC_EXPORT=true`; image optimization and custom headers are disabled for that mode because static hosting cannot run the optimizer or custom route handlers.
- If deploying to a custom domain or user/organization root page, unset `GITHUB_PAGES` or adjust `basePath` in `next.config.mjs`.

## Launch hardening and observability

Operational dashboard reads for customers, invoices, payments, tickets and manager summaries now go through `/api/dashboard?page=1&pageSize=25`. The route applies bounded pagination, server-side caching for public content, short private cache headers for dashboard payloads, and server logging with stable event names.

Apply the latest `supabase/schema.sql` before launch. It replaces broad authenticated operational reads with strict RLS policies: customers can read only their own account rows, while manager, finance and support reads are gated through `admin_memberships` roles.

Recommended launch monitors:

- Uptime monitor: poll `/api/observability/health` every minute and alert on non-2xx responses or high latency.
- Error tracking: connect platform log drains/Sentry to events such as `dashboard_api_error` and `healthcheck_failed`.
- Payment reconciliation alerts: poll `/api/observability/reconciliation` and alert when `status` is `alert` or stale proof-of-payment records are present.
- Audit dashboard: expose `/api/observability/audit` only to internal admins at the edge/reverse proxy and review recent `audit_trail` actions daily.

## Scale readiness

- Image delivery uses Next.js image optimization with AVIF/WebP formats, long immutable cache headers, and optional CDN asset routing through `NEXT_PUBLIC_IMAGE_CDN_HOST`. `STATIC_EXPORT=true` disables optimizer-dependent features for marketing-only static builds.
- High-cardinality billing fields now have dedicated indexes for invoice month/status, unpaid due dates, customer billing lookups, payment reconciliation state, account numbers and customer status/plan filters.
- Background work is available through protected job endpoints:
  - `POST /api/jobs/reminders` queues overdue invoice reminders in `reminder_queue`.
  - `POST /api/jobs/payment-allocation` runs oldest-first allocation for approved payments in batches.
- Set `JOB_SECRET` in production and call job endpoints with `Authorization: Bearer <JOB_SECRET>` from a scheduler such as Vercel Cron, Supabase scheduled functions or a platform worker. The SQL file also includes commented `pg_cron` schedules for Supabase projects that enable the extension.

## Visual and accessibility quality gates

Run these checks before brand-affecting changes:

```bash
npm run test:visual
npm run test:a11y
```

`test:visual` captures the full premium homepage in Chromium and stores/compares Playwright screenshots. `test:a11y` runs Axe WCAG checks and fails on critical accessibility violations.
