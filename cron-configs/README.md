# Cron Jobs — 3rd-Party Scheduler Setup

This project has **12 cron routes** under `/api/cron/*`. Vercel Hobby plan only allows 2 daily crons, so **all 12 must run via a 3rd-party scheduler**.

## Quick Setup (cron-job.org — recommended)

1. **Generate a secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Set it as env var** on your Next.js deployment:
   ```
   CRON_SECRET=<your-generated-secret>
   ```

3. **Sign up** at [cron-job.org](https://cron-job.org) (free, supports sub-minute schedules)

4. **Create 12 jobs** using the config in `cron-job-org-import.json`. For each job:
   - **URL:** `https://YOUR-DOMAIN.com/api/cron/{name}`
   - **Schedule:** the cron expression from the JSON
   - **Method:** POST (or GET — all routes accept both)
   - **Request Header:** `x-cron-secret: YOUR_CRON_SECRET`
   - **Timeout:** 300 seconds (some jobs like campaigns take a while)

5. **Test** one job manually from the cron-job.org dashboard → check response is `{"success":true,...}`

## Alternative: GitHub Actions

Use `.github/workflows/cron-jobs.yml` — it defines all 12 jobs as scheduled workflows. **Requires repo secrets:**
- `APP_URL` — your deployed app URL (e.g. `https://yourapp.vercel.app`)
- `CRON_SECRET` — the secret you generated

⚠️ **GitHub Actions caveat:** Free tier limits scheduled workflows to 5-min minimum interval and throttles aggressively. The 4 high-frequency jobs (every 15 min) may be delayed. For production, prefer cron-job.org.

## All 12 Cron Jobs (Reference)

| # | Endpoint | Schedule (UTC) | Frequency | Purpose |
|---|---|---|---|---|
| 1 | `/api/cron/marketplace-settlement` | `0 2 * * *` | Daily 02:00 | Release escrow funds to providers |
| 2 | `/api/cron/trial-expire` | `30 0 * * *` | Daily 00:30 | Expire ended trials |
| 3 | `/api/cron/trial-reminders` | `0 9 * * *` | Daily 09:00 | Trial-ending reminders |
| 4 | `/api/cron/renewal` | `0 3 * * *` | Daily 03:00 | Subscription renewals |
| 5 | `/api/cron/pre-charge-reminder` | `0 8 * * *` | Daily 08:00 | Pre-charge warning |
| 6 | `/api/cron/recurring-invoices` | `0 1 * * *` | Daily 01:00 | Generate recurring invoices |
| 7 | `/api/cron/recurring-jobs` | `0 6 * * *` | Daily 06:00 | Generate recurring jobs |
| 8 | `/api/cron/overdue-detector` | `0 8 * * *` | Daily 08:00 | Detect overdue invoices |
| 9 | `/api/cron/campaigns` | `*/15 * * * *` | Every 15 min | Dispatch scheduled campaigns |
| 10 | `/api/cron/scheduled-messages` | `*/15 * * * *` | Every 15 min | Send reminders (appt/payment/overdue) |
| 11 | `/api/cron/scheduled-executions` | `*/15 * * * *` | Every 15 min | Run delayed workflow automations |
| 12 | `/api/cron/appointment-reminders` | `0 */6 * * *` | Every 6 hours | Schedule visit reminders |

## Authentication

All routes accept the secret via any of:
- **Header:** `x-cron-secret: <secret>` (preferred)
- **Header:** `Authorization: Bearer <secret>`
- **Query:** `?key=<secret>` or `?secret=<secret>`

## Staggering (optional, recommended)

To avoid all daily jobs hitting at once, you can stagger the 8 daily jobs across the early morning:
- 00:30 → trial-expire
- 01:00 → recurring-invoices
- 02:00 → marketplace-settlement
- 03:00 → renewal
- 06:00 → recurring-jobs
- 08:00 → pre-charge-reminder + overdue-detector (can run together)
- 09:00 → trial-reminders

The 4 high-frequency jobs (every 15 min / 6 hours) should stay on their original schedule.
