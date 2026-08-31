import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * POST /api/cron/master  —  Master Cron Multiplexer
 * ===============================================
 *
 * SINGLE Vercel Cron entry point that fans out to all daily + monthly cron
 * endpoints in sequence. This bypasses Vercel Hobby's 1-cron-job limit:
 * configure ONE cron in vercel.json pointing here, and this route dispatches
 * to every sub-cron internally.
 *
 * WHAT IT RUNS:
 *   Daily (every time it fires):
 *     1. marketplace-settlement   — release escrow → provider Stripe payout
 *     2. archive-old-won-deals    — archive won deals >14 days old
 *     3. recurring-jobs           — generate jobs from recurring schedules
 *     4. overdue-detector         — mark overdue invoices + enqueue reminders
 *     5. trial-reminders          — send 3-day trial-ending emails
 *     6. pre-charge-reminder      — send "card charged tomorrow" email
 *     7. recurring-invoices       — generate + send recurring invoices
 *     8. trial-expire             — expire trials past trialEndsAt
 *     9. renewal                  — apply downgrades, PayPal sync, mark expired
 *
 *   Monthly (ONLY on the 1st of each month, via date guard):
 *    10. sms-quota-reset          — zero smsUsageCount + emailUsageCount
 *
 * HIGH-FREQUENCY CRONS (NOT run by this master):
 *   These need 5-min / 15-min / hourly cadence and CANNOT be served by a
 *   daily Vercel cron. Configure them separately on cron-job.org (FREE):
 *     - scheduled-messages        → every 5 min
 *     - scheduled-executions      → every 5 min
 *     - campaigns                 → every 15 min
 *     - appointment-reminders     → every hour
 *   See README-cron-setup.md for the cron-job.org import guide.
 *
 * AUTH: shared secret via `x-cron-secret` header, `Authorization: Bearer`,
 * or ``x-cron-secret` header or `Authorization: Bearer` header`/``x-cron-secret` header or `Authorization: Bearer` header` query param. Must match CRON_SECRET env var.
 *
 * SCHEDULE (in vercel.json):
 *   "0 2 * * *"  → daily at 02:00 UTC (07:30 IST)
 *
 * ERROR ISOLATION:
 *   Each sub-cron runs in its own try/catch. If one fails, the others still
 *   run. The response body contains per-cron status + duration for debugging.
 *
 * Vercel Hobby timeout is 60s for cron routes. If the total run exceeds 60s,
 * Vercel kills the request — but the sub-cron fetches continue server-side
 * (fire-and-forget). For safety, each sub-cron fetch has a 30s timeout so
 * 9 daily crons × 30s worst case = 270s. If your tenant count is large,
 * consider upgrading to Vercel Pro (300s timeout) or moving more crons to
 * cron-job.org.
 */

// ── Daily cron endpoints (run every time the master fires) ──────────────
const DAILY_CRONS: Array<{ name: string; path: string; description: string }> = [
  {
    name: 'marketplace-settlement',
    path: '/api/cron/marketplace-settlement',
    description: 'Releases escrowed marketplace funds to providers',
  },
  {
    name: 'archive-old-won-deals',
    path: '/api/cron/archive-old-won-deals',
    description: 'Archives won deals older than 14 days (Kanban cleanup)',
  },
  {
    name: 'recurring-jobs',
    path: '/api/cron/recurring-jobs',
    description: 'Generates jobs from due RecurringJobSchedule rows',
  },
  {
    name: 'overdue-detector',
    path: '/api/cron/overdue-detector',
    description: 'Marks overdue invoices + enqueues reminder messages',
  },
  {
    name: 'trial-reminders',
    path: '/api/cron/trial-reminders',
    description: 'Sends 3-day trial-ending reminder emails',
  },
  {
    name: 'pre-charge-reminder',
    path: '/api/cron/pre-charge-reminder',
    description: 'Sends pre-charge warning email (reduces disputes)',
  },
  {
    name: 'recurring-invoices',
    path: '/api/cron/recurring-invoices',
    description: 'Generates + sends due recurring invoices',
  },
  {
    name: 'trial-expire',
    path: '/api/cron/trial-expire',
    description: 'Expires trials past their trialEndsAt date',
  },
  {
    name: 'renewal',
    path: '/api/cron/renewal',
    description: 'Applies downgrades, PayPal sync, marks expired subs',
  },
]

// ── Monthly cron (only runs on the 1st of each month) ────────────────────
const MONTHLY_CRONS: Array<{ name: string; path: string; description: string }> = [
  {
    name: 'sms-quota-reset',
    path: '/api/cron/sms-quota-reset',
    description: 'Resets smsUsageCount + emailUsageCount to 0 on all subscriptions',
  },
]

// ── Per-fetch timeout (ms). Prevents one slow cron from blocking the rest ──
const SUBCRON_TIMEOUT_MS = 30_000

interface CronResult {
  name: string
  path: string
  description: string
  status: 'success' | 'failed' | 'error' | 'skipped'
  statusCode: number | null
  durationMs: number
  error: string | null
  responsePreview: string | null
}

/**
 * Resolve the base URL for internal fetch calls.
 * Priority: VERCEL_URL (auto-set by Vercel) → NEXT_PUBLIC_APP_URL →
 * derive from the incoming request URL.
 *
 * On Vercel, `VERCEL_URL` is automatically set to the deployment URL
 * (e.g. `my-app-abc123.vercel.app`). We prepend `https://` if missing.
 */
function getBaseUrl(request: NextRequest): string {
  // 1. VERCEL_URL (auto-set on Vercel deployments)
  if (process.env.VERCEL_URL) {
    const v = process.env.VERCEL_URL
    return v.startsWith('http') ? v : `https://${v}`
  }
  // 2. Explicit app URL override
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  // 3. Derive from the incoming request (works for custom domains)
  const requestUrl = new URL(request.url)
  return `${requestUrl.protocol}//${requestUrl.host}`
}

/**
 * Call a single sub-cron endpoint with a timeout. Never throws — returns a
 * CronResult with status='error' on failure.
 */
async function runSubCron(
  baseUrl: string,
  cron: { name: string; path: string; description: string },
  cronSecret: string,
): Promise<CronResult> {
  const start = Date.now()
  const fullUrl = `${baseUrl}${cron.path}`
  const result: CronResult = {
    name: cron.name,
    path: cron.path,
    description: cron.description,
    status: 'pending',
    statusCode: null,
    durationMs: 0,
    error: null,
    responsePreview: null,
  }

  try {
    // Use AbortController to enforce a per-cron timeout. This prevents one
    // slow cron (e.g., a huge marketplace-settlement run) from blocking the
    // entire master cron past Vercel's 60s Hobby limit.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SUBCRON_TIMEOUT_MS)

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret,
        'content-type': 'application/json',
        'user-agent': 'vercel-master-cron/1.0',
      },
      body: JSON.stringify({
        source: 'vercel-master-cron',
        triggeredAt: new Date().toISOString(),
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    const text = await res.text().catch(() => '')
    result.statusCode = res.status
    result.status = res.ok ? 'success' : 'failed'
    result.responsePreview = text.slice(0, 500)
    result.durationMs = Date.now() - start

    if (!res.ok) {
      result.error = `HTTP ${res.status}`
      console.error(`[master-cron] ⚠️  ${cron.name}: ${res.status} — ${text.slice(0, 200)}`)
    } else {
      console.log(`[master-cron] ✅ ${cron.name}: ${res.status} (${result.durationMs}ms)`)
    }
  } catch (err) {
    result.status = 'error'
    result.error = err instanceof Error ? err.message : String(err)
    result.durationMs = Date.now() - start
    // Distinguish timeout aborts from other errors for easier debugging
    if (err instanceof Error && err.name === 'AbortError') {
      result.error = `Timed out after ${SUBCRON_TIMEOUT_MS / 1000}s`
    }
    console.error(`[master-cron] ❌ ${cron.name}: ${result.error}`)
  }

  return result
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // ── Auth ──────────────────────────────────────────────────────────────
  const auth = verifyCronAuth(request)
  if (!auth.ok) return auth.response

  // ── Config validation ────────────────────────────────────────────────
  const baseUrl = getBaseUrl(request)
  const cronSecret = process.env.CRON_SECRET || ''

  if (!baseUrl) {
    console.error('[master-cron] ❌ Could not resolve base URL. Set VERCEL_URL or NEXT_PUBLIC_APP_URL.')
    return NextResponse.json(
      { error: 'Base URL not configured' },
      { status: 500 },
    )
  }

  if (!cronSecret) {
    console.error('[master-cron] ❌ CRON_SECRET not set. Sub-crons will reject with 401.')
  }

  // ── Date guard for monthly crons ──────────────────────────────────────
  // sms-quota-reset should ONLY run on the 1st of each month (UTC).
  // Running it on any other day would wipe legitimate usage mid-month,
  // letting over-quota tenants send more SMS than their plan allows.
  const now = new Date()
  const isMonthlyResetDay = now.getUTCDate() === 1
  const cronsToRun = [
    ...DAILY_CRONS,
    ...(isMonthlyResetDay ? MONTHLY_CRONS : []),
  ]

  console.log(`[master-cron] 🚀 Starting at ${now.toISOString()}`)
  console.log(`[master-cron] Base URL: ${baseUrl}`)
  console.log(`[master-cron] Crons to run: ${cronsToRun.length} (${DAILY_CRONS.length} daily${isMonthlyResetDay ? ` + ${MONTHLY_CRONS.length} monthly` : ''})`)

  // ── Run each sub-cron sequentially with error isolation ──────────────
  const results: CronResult[] = []
  for (const cron of cronsToRun) {
    const result = await runSubCron(baseUrl, cron, cronSecret)
    results.push(result)
  }

  // ── Sitemap regeneration (direct call — no HTTP fetch) ────────────────
  // Runs AFTER all sub-crons so it doesn't block time-sensitive crons.
  // Uses a lock + atomic dirty-file clearing — safe to run every day.
  // Only regenerates files that have new/changed businesses (incremental).
  let sitemapResult: { ran: boolean; reason?: string; fullRegen: boolean; dirtyFiles: number[]; durationMs: number } | null = null
  try {
    const { regenerateSitemaps } = await import('@/lib/sitemap')
    const sr = await regenerateSitemaps()
    sitemapResult = sr
    console.log(
      `[master-cron] 🗺️ Sitemap: ${sr.ran ? 'ran' : 'skipped'} — ` +
      `${sr.dirtyFiles.length} dirty files, ${sr.results.filter((r) => r.ok).length}/${sr.results.length} regenerated` +
      (sr.fullRegen ? ' (full regen)' : '') +
      ` in ${sr.durationMs}ms`,
    )
  } catch (sitemapErr) {
    console.error('[master-cron] Sitemap regeneration failed:', sitemapErr)
    sitemapResult = { ran: false, reason: String(sitemapErr), fullRegen: false, dirtyFiles: [], durationMs: 0 }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const totalMs = Date.now() - startTime
  const succeeded = results.filter((r) => r.status === 'success').length
  const failed = results.filter((r) => r.status === 'failed').length
  const errored = results.filter((r) => r.status === 'error').length

  console.log(
    `[master-cron] 🏁 Done in ${totalMs}ms — ✅ ${succeeded} succeeded, ⚠️ ${failed} failed, ❌ ${errored} errored`,
  )

  return NextResponse.json({
    success: errored === 0 && failed === 0,
    ranAt: now.toISOString(),
    totalDurationMs: totalMs,
    baseUrl,
    monthlyResetRun: isMonthlyResetDay,
    summary: {
      total: results.length,
      succeeded,
      failed,
      errored,
    },
    results,
    sitemap: sitemapResult,
  })
}

// GET alias — allows easy browser/curl testing + cron-job.org GET triggers
export async function GET(request: NextRequest) {
  return POST(request)
}
