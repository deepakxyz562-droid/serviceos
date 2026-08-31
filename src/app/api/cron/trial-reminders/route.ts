import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  findTenantsInTrialWindow,
  sendTrialReminder,
  getDaysRemaining,
} from '@/lib/trial-lifecycle'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * POST /api/cron/trial-reminders
 *
 * Runs daily. Sends the 3-day trial-ending reminder email to tenants whose
 * trial ends in ~3 days.
 *
 * ⚠️  The 1-day reminder is NO LONGER sent by this cron. It is now sent
 * exclusively by /api/cron/pre-charge-reminder, which includes the actual
 * plan price in the email (better for reducing disputes/chargebacks).
 * Previously BOTH crons sent the same trial-ending-1-day template to the
 * same 0.5–1.5-day window → tenants received DUPLICATE emails. This fix
 * removes that duplication.
 *
 * DEDUP: Before sending, we check whether a trial_reminder BillingEvent for
 * this tenant + template was already logged today. If so, we skip. This
 * prevents duplicate sends if the cron is triggered twice in one day
 * (manual retry, double-trigger, master-cron re-run, etc.).
 *
 * Auth: shared secret in x-cron-secret header or `x-cron-secret` header or `Authorization: Bearer` header query (CRON_SECRET env).
 *
 * Schedule: daily at 09:00 UTC (via /api/cron/master on Vercel).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request)
    if (!auth.ok) return auth.response

    const results: Array<{
      tenantId: string
      tenantName: string
      sent: boolean
      skipped: boolean
      reason?: string
      error?: string
    }> = []

    // 3-day reminder window only (1-day is handled by pre-charge-reminder)
    const threeDayTenants = await findTenantsInTrialWindow(2.5, 3.5)

    // ── Dedup window: start of today (UTC) ──────────────────────────────
    // We consider a reminder "already sent today" if a BillingEvent with
    // type='trial_reminder' + the matching templateSlug exists for this
    // tenant since midnight UTC. This makes the cron safe to re-run.
    const startOfTodayUtc = new Date()
    startOfTodayUtc.setUTCHours(0, 0, 0, 0)

    for (const tenant of threeDayTenants) {
      // ── Dedup check ──────────────────────────────────────────────────
      try {
        const alreadySentToday = await db.billingEvent.findFirst({
          where: {
            tenantId: tenant.id,
            type: 'trial_reminder',
            createdAt: { gte: startOfTodayUtc },
            // metadataJson stores { templateSlug: 'trial-ending-3-day', ... }
            // We use a contains match because metadataJson is a JSON string,
            // not a structured JSON column on all DB backends.
            metadataJson: { contains: 'trial-ending-3-day' },
          },
          select: { id: true },
        })
        if (alreadySentToday) {
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            sent: false,
            skipped: true,
            reason: 'Already sent today (dedup)',
          })
          continue
        }
      } catch (dedupErr) {
        // Non-blocking — if the dedup check fails (e.g., BillingEvent table
        // doesn't exist in this env), we still send the email. Better to
        // risk a duplicate than to skip a legitimate reminder.
        console.warn(`[trial-reminders] Dedup check failed for tenant ${tenant.id}:`, dedupErr)
      }

      // ── Send the reminder ────────────────────────────────────────────
      const daysRemaining = getDaysRemaining(tenant.trialEndsAt)
      const r = await sendTrialReminder(tenant, 'trial-ending-3-day', daysRemaining)
      results.push({
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        sent: r.sent,
        skipped: false,
        error: r.error,
      })
    }

    const sentCount = results.filter((r) => r.sent).length
    const skippedCount = results.filter((r) => r.skipped).length

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      window: '2.5-3.5 days (3-day reminder only — 1-day is handled by pre-charge-reminder)',
      candidates: results.length,
      sent: sentCount,
      skipped: skippedCount,
      results,
    })
  } catch (error) {
    console.error('Cron trial-reminders error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Cron run failed', details: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
