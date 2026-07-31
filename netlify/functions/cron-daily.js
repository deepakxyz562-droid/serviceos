/**
 * Netlify Scheduled Function — Daily Cron Master (OPTIONAL)
 * ===============================================
 *
 * ⚠️  NOTE: This file is ONLY relevant if you deploy to Netlify.
 * If you deploy elsewhere (Vercel, Render, etc.), ignore this file and use
 * the 3rd-party cron configs in `/cron-configs/` instead (cron-job.org or
 * GitHub Actions).
 *
 * Runs every day at 09:00 UTC (~2:30 PM IST) and triggers ALL cron endpoints
 * on the deployed Next.js site as a daily safety-net.
 *
 * IMPORTANT: This daily run is a SAFETY-NET only. The 4 high-frequency jobs
 * (campaigns, scheduled-messages, scheduled-executions, appointment-reminders)
 * need 15-min / 6-hour cadence. For those, use cron-job.org or GitHub Actions
 * with the schedules defined in `/cron-configs/cron-job-org-import.json`.
 *
 * Why a single master function?
 *   - One cold start per day (cheaper, faster)
 *   - One place to configure the schedule
 *   - Each endpoint runs independently — if one fails, the others still run
 *   - Full results are returned in the response body for Netlify logs
 *
 * REQUIRED ENV VARS (set in Netlify Dashboard → Site settings → Environment variables):
 *   - CRON_SECRET  → must match the CRON_SECRET the Next.js app expects
 *   - SITE_URL     → your Netlify site URL (e.g. https://your-site.netlify.app)
 *                    (Netlify auto-sets process.env.URL, but we use SITE_URL
 *                     as an explicit override in case URL is a deploy-specific
 *                     URL that isn't stable.)
 *
 * HOW TO CHANGE THE SCHEDULE:
 *   Edit the `schedule` export below. Cron syntax: MIN HOUR DOM MON DOW (UTC).
 *   Examples:
 *     "0 9 * * *"     → 09:00 UTC daily
 *     "0 4 * * *"     → 04:00 UTC daily (~9:30 AM IST)
 *     "0 */6 * * *"   → every 6 hours
 *     "0 0 * * 1"     → every Monday 00:00 UTC
 *
 * LOCAL TESTING:
 *   netlify functions:serve   (then POST to the local function URL)
 *   Or trigger via Netlify dashboard after deploy.
 */

// ── Schedule: 09:00 UTC every day ──────────────────────────────────────────
export const schedule = '0 9 * * *';

// ── The 5 ServiceOS daily cron endpoints ───────────────────────────────────
const CRON_ENDPOINTS = [
  {
    name: 'trial-reminders',
    path: '/api/cron/trial-reminders',
    description: 'Sends 3-day and 1-day trial-ending reminder emails',
  },
  {
    name: 'pre-charge-reminder',
    path: '/api/cron/pre-charge-reminder',
    description: 'Sends pre-charge reminder before subscription renewal',
  },
  {
    name: 'marketplace-settlement',
    path: '/api/cron/marketplace-settlement',
    description: 'Releases escrowed marketplace funds to providers once the linked Job is completed',
  },
  {
    name: 'renewal',
    path: '/api/cron/renewal',
    description: 'Processes subscription renewals + applies pending downgrades',
  },
  {
    name: 'trial-expire',
    path: '/api/cron/trial-expire',
    description: 'Expires trials that have passed their end date',
  },
  {
    name: 'recurring-invoices',
    path: '/api/cron/recurring-invoices',
    description: 'Auto-generates recurring invoices that are due today',
  },
  {
    name: 'recurring-jobs',
    path: '/api/cron/recurring-jobs',
    description: 'Auto-generates jobs + JobVisits for due RecurringJobSchedule rows (weekly / monthly / contract maintenance)',
  },
  // ── Reminders & Follow-up Engine (PHASE4-REMINDERS) ───────────────────
  // The scheduled-messages / scheduled-executions endpoints run every 15
  // minutes via Vercel Cron on Vercel deployments. On Netlify we still call
  // them once a day here as a safety net (a daily run is better than zero),
  // but for true 15-minute cadence on Netlify, configure a separate
  // scheduled function or external scheduler.
  {
    name: 'scheduled-messages',
    path: '/api/cron/scheduled-messages',
    description: 'Dispatches due ScheduledMessage rows (appointment / payment / overdue / follow-up reminders)',
  },
  {
    name: 'scheduled-executions',
    path: '/api/cron/scheduled-executions',
    description: 'Fires due delayed workflow automations (replaces setTimeout in trigger-engine)',
  },
  {
    name: 'overdue-detector',
    path: '/api/cron/overdue-detector',
    description: 'Detects overdue invoices and emits invoice.overdue events + creates overdue reminder messages',
  },
  {
    name: 'appointment-reminders',
    path: '/api/cron/appointment-reminders',
    description: 'Schedules customer reminders for upcoming JobVisits based on teamReminder (1h / 24h / 2d)',
  },
  {
    name: 'campaigns',
    path: '/api/cron/campaigns',
    description: 'Dispatches scheduled email campaigns whose scheduledAt has passed (15-min cadence on Vercel; daily safety-net here)',
  },
];

/**
 * Resolve the base URL of the deployed site.
 * Priority: SITE_URL > NETLIFY_URL > URL > NEXT_PUBLIC_APP_URL
 */
function getBaseUrl() {
  return (
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''
  ).replace(/\/$/, ''); // strip trailing slash
}

/**
 * Handler for the scheduled event.
 * Netlify calls this with (event, context) where event.rawUrl etc. are set.
 */
export const handler = async function (event, context) {
  const startTime = Date.now();
  const baseUrl = getBaseUrl();
  const cronSecret = process.env.CRON_SECRET;

  // ── Validate config ───────────────────────────────────────────────────
  if (!baseUrl) {
    console.error('[cron-daily] ❌ No site URL configured. Set SITE_URL env var.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SITE_URL not configured' }),
    };
  }

  if (!cronSecret) {
    console.error('[cron-daily] ❌ CRON_SECRET not set. Endpoints will reject with 401.');
    // Don't abort — still try, so the 401 shows up clearly in logs
  }

  console.log(`[cron-daily] 🚀 Starting daily cron at ${new Date().toISOString()}`);
  console.log(`[cron-daily] Base URL: ${baseUrl}`);
  console.log(`[cron-daily] Endpoints to trigger: ${CRON_ENDPOINTS.length}`);

  // ── Call each endpoint sequentially ───────────────────────────────────
  const results = [];

  for (const endpoint of CRON_ENDPOINTS) {
    const endpointStart = Date.now();
    const fullUrl = `${baseUrl}${endpoint.path}`;
    const result = {
      name: endpoint.name,
      path: endpoint.path,
      url: fullUrl,
      description: endpoint.description,
      status: 'pending',
      statusCode: null,
      responsePreview: null,
      durationMs: 0,
      error: null,
    };

    try {
      console.log(`[cron-daily] → POST ${fullUrl}`);

      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'x-cron-secret': cronSecret || '',
          'content-type': 'application/json',
          'user-agent': 'netlify-scheduled-function/cron-daily',
        },
        // Short body so the endpoint knows it's a scheduled call
        body: JSON.stringify({ source: 'netlify-scheduled', triggeredAt: new Date().toISOString() }),
      });

      const text = await res.text().catch(() => '');
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* keep as text */ }

      result.statusCode = res.status;
      result.status = res.ok ? 'success' : 'failed';
      result.responsePreview = parsed || text.substring(0, 500);
      result.durationMs = Date.now() - endpointStart;

      if (res.ok) {
        console.log(`[cron-daily] ✅ ${endpoint.name}: ${res.status} (${result.durationMs}ms)`);
      } else {
        console.error(`[cron-daily] ⚠️  ${endpoint.name}: ${res.status} — ${text.substring(0, 200)}`);
        result.error = `HTTP ${res.status}`;
      }
    } catch (err) {
      result.status = 'error';
      result.error = err?.message || String(err);
      result.durationMs = Date.now() - endpointStart;
      console.error(`[cron-daily] ❌ ${endpoint.name}: ${result.error}`);
    }

    results.push(result);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const totalMs = Date.now() - startTime;
  const succeeded = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const errored = results.filter((r) => r.status === 'error').length;

  const summary = {
    triggeredAt: new Date().toISOString(),
    totalDurationMs: totalMs,
    baseUrl,
    summary: { total: results.length, succeeded, failed, errored },
    results,
  };

  console.log(`[cron-daily] 🏁 Done in ${totalMs}ms — ✅ ${succeeded} succeeded, ⚠️ ${failed} failed, ❌ ${errored} errored`);

  return {
    statusCode: errored > 0 ? 500 : 200,
    body: JSON.stringify(summary, null, 2),
  };
};

// Default export for ESM compatibility
export default handler;
