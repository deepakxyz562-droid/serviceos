# Cron Jobs — Coolify/Hostinger Setup (cron-job.org)

This project has **6 cron jobs** that must be triggered externally via [cron-job.org](https://cron-job.org). On Coolify/Hostinger, `vercel.json` crons are ignored — **all crons must run via an external HTTP cron service.**

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  cron-job.org (external scheduler — FREE)                   │
│                                                             │
│  6 jobs:                                                    │
│    1. daily-master        → /api/cron/master (daily 02:00)  │
│    2. scheduled-messages  → /api/cron/scheduled-messages    │
│    3. scheduled-executions → /api/cron/scheduled-executions │
│    4. campaigns           → /api/cron/campaigns             │
│    5. appointment-reminders → /api/cron/appointment-reminders│
│    6. featured-location   → /api/cron/featured-location     │
└─────────────────────────────────────────────────────────────┘
                        ↓ HTTP POST with x-cron-secret header
┌─────────────────────────────────────────────────────────────┐
│  Coolify Docker Container (Next.js app)                     │
│                                                             │
│  /api/cron/master fans out to 9 daily sub-crons +           │
│  sitemap regeneration (incremental — only dirty files)      │
└─────────────────────────────────────────────────────────────┘
```

The **daily master cron** (`/api/cron/master`) is the key — it internally runs:
- marketplace-settlement (escrow release)
- archive-old-won-deals (Kanban cleanup)
- recurring-jobs (generate jobs from schedules)
- overdue-detector (mark overdue invoices)
- trial-reminders (3-day trial-ending emails)
- pre-charge-reminder (card charged tomorrow email)
- recurring-invoices (generate + send recurring invoices)
- trial-expire (expire trials past trialEndsAt)
- renewal (downgrades, PayPal sync, expired subs)
- **sitemap regeneration** (incremental — only dirty files, 7-day safety net)
- sms-quota-reset (monthly — only on the 1st of each month)

## Quick Setup (cron-job.org)

### 1. Verify `CRON_SECRET` is set in Coolify

Coolify Dashboard → your project → Environment Variables → confirm `CRON_SECRET` is set.

If not set, generate one:
```bash
openssl rand -hex 32
```
Add it to Coolify → Environment Variables → `CRON_SECRET=<your-secret>` → Redeploy.

### 2. Create 6 jobs on cron-job.org

Sign up at [cron-job.org](https://cron-job.org) (free). Create each job using the config in `cron-job-org-import.json`:

For each job:
- **URL:** `https://YOUR-DOMAIN.com/api/cron/{name}` (replace YOUR-DOMAIN.com with `fieseros.com`)
- **Schedule:** the cron expression from the JSON
- **Method:** POST
- **Request Header:** `x-cron-secret: YOUR_CRON_SECRET`
- **Timeout:** 300 seconds for `daily-master`; 60 seconds for others
- **Notify on failure:** ✅ enabled

### 3. The 6 jobs to create

| # | Name | URL | Schedule | Timeout |
|---|---|---|---|---|
| 1 | **daily-master** | `https://fieseros.com/api/cron/master` | `0 2 * * *` (daily 02:00 UTC) | 300s |
| 2 | scheduled-messages | `https://fieseros.com/api/cron/scheduled-messages` | `*/5 * * * *` (every 5 min) | 60s |
| 3 | scheduled-executions | `https://fieseros.com/api/cron/scheduled-executions` | `*/5 * * * *` (every 5 min) | 60s |
| 4 | campaigns | `https://fieseros.com/api/cron/campaigns` | `*/15 * * * *` (every 15 min) | 60s |
| 5 | appointment-reminders | `https://fieseros.com/api/cron/appointment-reminders` | `0 * * * *` (hourly) | 60s |
| 6 | featured-location | `https://fieseros.com/api/cron/featured-location` | `0 * * * *` (hourly) | 60s |

### 4. Test manually

Test the daily master cron (it should return a JSON response with `success: true` + a `sitemap` field):
```bash
curl -X POST https://fieseros.com/api/cron/master \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "ranAt": "2026-08-27T02:00:00.000Z",
  "summary": { "total": 9, "succeeded": 9, "failed": 0, "errored": 0 },
  "sitemap": {
    "ran": true,
    "fullRegen": true,
    "dirtyFiles": [0,1,2,3,4,5,6,7,8,9,10],
    "durationMs": 45000
  }
}
```

## Why cron-job.org (not built-in cron)?

The Docker container could run `node-cron` internally, but:
1. **Multiple containers** — if Coolify scales to 2+ containers, each runs its own cron → duplicate execution
2. **Container restarts** — if the container restarts mid-cron, the cron is lost
3. **No external monitoring** — cron-job.org emails you on failure; built-in cron silently fails

External cron is the correct approach for Coolify deployments.

## What happens if the daily master cron is NOT set up?

If you deploy to Coolify without setting up the daily master cron on cron-job.org:
- ❌ Sitemaps won't regenerate (Google won't see new businesses)
- ❌ Recurring invoices won't generate (billing breaks)
- ❌ Trial reminders won't send (poor UX)
- ❌ Overdue invoices won't be detected (revenue leak)
- ❌ Marketplace escrow won't settle (provider payouts delayed)
- ❌ Subscriptions won't renew/downgrade automatically

**The daily master cron is critical for the app to function correctly.**

## vercel.json is ignored on Coolify

The `vercel.json` file in this repo is only used when deploying to Vercel. On Coolify, it has no effect — that's why you MUST set up the external cron via cron-job.org.

If you ever migrate back to Vercel, the `vercel.json` cron config will work automatically (and you can remove the `daily-master` job from cron-job.org to avoid double-execution).
