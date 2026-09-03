import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCronAuth } from '@/lib/cron-auth';
import { logBillingEvent } from '@/lib/billing-events';
import { getPlatformBillingAlertEmails } from '@/lib/platform-alerts';
import { sendEmail } from '@/lib/email-send';

/**
 * POST /api/cron/past-due-escalation
 *
 * Runs daily. Scans for tenants whose `planStatus === 'past_due'` and
 * escalates based on how long they've been past due:
 *
 *   - 1 day past due:   re-send "payment failed" reminder to the tenant
 *                       owner (in case they missed the in-app banner).
 *   - 3 days past due:  send a "urgent — service at risk" reminder.
 *   - 7 days past due:  send a final "service suspended" notice + flip
 *                       tenant.planStatus to 'suspended' (hard lockout).
 *                       (SaaS sub only — add-ons have their own grace
 *                       period logic in addon-billing-service.ts.)
 *
 * Also sends a daily digest email to the platform owner summarising all
 * tenants currently in `past_due` state, so the platform operator has a
 * single morning email with the full picture.
 *
 * Auth: shared secret (CRON_SECRET env).
 *
 * Schedule: daily at 8:00 AM tenant-local time (configure in your cron
 * provider — e.g. cron-job.org, QStash, Vercel Cron).
 *   0 8 * * *  curl -X POST https://your-app/api/cron/past-due-escalation \
 *             -H "x-cron-secret: $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const now = new Date();
    const results: Array<{
      tenantId: string;
      tenantName: string;
      daysPastDue: number;
      action: 'reminder' | 'urgent' | 'suspended' | 'none';
      emailSent: boolean;
      error?: string;
    }> = [];

    // ── 1. Find all tenants currently in 'past_due' state ───────────────
    // We look at the Subscription table (where status='past_due') + Tenant
    // (where planStatus='past_due'). Either signal means the tenant is past due.
    const pastDueSubs = await db.subscription.findMany({
      where: { status: 'past_due' },
      select: {
        id: true,
        tenantId: true,
        plan: true,
        billingCycle: true,
        amount: true,
        currency: true,
        paypalSubscriptionId: true,
        paypalPayerEmail: true,
        updatedAt: true,
      },
    });

    // Deduplicate by tenantId (a tenant could have multiple past_due subs)
    const tenantSubMap = new Map<string, typeof pastDueSubs[number]>();
    for (const sub of pastDueSubs) {
      // keep the most-recently-updated sub per tenant
      const existing = tenantSubMap.get(sub.tenantId);
      if (!existing || sub.updatedAt > existing.updatedAt) {
        tenantSubMap.set(sub.tenantId, sub);
      }
    }

    // Fetch tenant details for all affected tenants
    const tenantIds = Array.from(tenantSubMap.keys());
    const tenants = tenantIds.length
      ? await db.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true, email: true, planStatus: true },
        })
      : [];
    const tenantMap = new Map(tenants.map((t) => [t.id, t]));

    // ── 2. For each past-due tenant, escalate based on days past due ────
    // `daysPastDue` is computed from the Subscription's `updatedAt` — the
    // last time the webhook flipped it to 'past_due'. This is a rough proxy
    // (PayPal may have retried in between, resetting updatedAt), but it's
    // the best signal we have without a dedicated `pastDueSince` column.
    for (const [tenantId, sub] of tenantSubMap.entries()) {
      const tenant = tenantMap.get(tenantId);
      if (!tenant) continue;

      const daysPastDue = Math.floor(
        (now.getTime() - new Date(sub.updatedAt).getTime()) / (24 * 60 * 60 * 1000),
      );

      let action: 'reminder' | 'urgent' | 'suspended' | 'none' = 'none';
      let emailSent = false;

      try {
        // ── 7-day escalation: suspend the tenant ──────────────────────
        // After 7 days past due with no successful payment, we hard-suspend.
        // The webhook handlers only set planStatus='past_due'; this is the
        // ONLY place that transitions a tenant to 'suspended' for non-payment.
        if (daysPastDue >= 7 && tenant.planStatus !== 'suspended') {
          await db.tenant.update({
            where: { id: tenantId },
            data: { planStatus: 'suspended' },
          });
          await db.subscription.update({
            where: { id: sub.id },
            data: { status: 'suspended' },
          });
          action = 'suspended';

          await logBillingEvent({
            tenantId,
            subscriptionId: sub.id,
            type: 'cancel',
            status: 'failed',
            amount: sub.amount,
            description: `Tenant suspended after ${daysPastDue} days past due (cron escalation)`,
            paymentProvider: 'paypal', // or creem — we don't track per-sub here
            errorCode: 'SUSPENDED_AFTER_GRACE',
            declineReason: `Subscription suspended after ${daysPastDue} days past due`,
            metadata: { daysPastDue, cronJob: 'past-due-escalation' },
          });

          // Send final-notice email to tenant
          if (tenant.email) {
            const r = await sendEmail({
              to: tenant.email,
              subject: `Action required: your ${tenant.name} account has been suspended`,
              html: `<h2>Your account has been suspended</h2>
                     <p>Your subscription has been past due for ${daysPastDue} days. Your access to ${tenant.name} has been suspended.</p>
                     <p>To restore access, log in and update your payment method.</p>`,
              text: `Your ${tenant.name} account has been suspended after ${daysPastDue} days past due. Log in and update your payment method to restore access.`,
              usageType: 'transactional',
            });
            emailSent = r.success;
          }
        }
        // ── 3-day escalation: urgent reminder ─────────────────────────
        else if (daysPastDue >= 3 && daysPastDue < 7) {
          action = 'urgent';
          if (tenant.email) {
            const r = await sendEmail({
              to: tenant.email,
              subject: `Urgent: your ${tenant.name} subscription is past due`,
              html: `<h2>⚠️ Action needed — service at risk</h2>
                     <p>Your recurring payment failed ${daysPastDue} days ago. Your subscription is past due and your service will be suspended in ${7 - daysPastDue} days if the payment is not updated.</p>
                     <p>Please log in and update your payment method to avoid interruption.</p>`,
              text: `Your ${tenant.name} subscription is past due (failed ${daysPastDue} days ago). Update your payment method within ${7 - daysPastDue} days to avoid suspension.`,
              usageType: 'transactional',
            });
            emailSent = r.success;
          }
        }
        // ── 1-day escalation: first reminder ──────────────────────────
        else if (daysPastDue >= 1) {
          action = 'reminder';
          if (tenant.email) {
            const r = await sendEmail({
              to: tenant.email,
              subject: `Payment failed — please update your payment method`,
              html: `<h2>Your recent payment failed</h2>
                     <p>We were unable to process your recurring payment for your ${tenant.name} subscription (${sub.plan} plan).</p>
                     <p>Please log in and update your payment method. We'll automatically retry the charge — if it succeeds, no action is needed.</p>`,
              text: `Your recurring payment for ${tenant.name} (${sub.plan} plan) failed. Please update your payment method. We'll retry automatically.`,
              usageType: 'transactional',
            });
            emailSent = r.success;
          }
        }
      } catch (err) {
        console.error(`[cron/past-due-escalation] Error processing tenant ${tenantId}:`, err);
      }

      results.push({
        tenantId,
        tenantName: tenant.name,
        daysPastDue,
        action,
        emailSent,
      });
    }

    // ── 3. Send a daily digest to the platform owner(s) ─────────────────
    // Summarises the full past-due picture so the platform operator gets one
    // morning email instead of one alert per failure (which can be noisy).
    if (results.length > 0) {
      try {
        const recipients = await getPlatformBillingAlertEmails();
        if (recipients.length > 0) {
          const suspendedCount = results.filter((r) => r.action === 'suspended').length;
          const urgentCount = results.filter((r) => r.action === 'urgent').length;
          const reminderCount = results.filter((r) => r.action === 'reminder').length;

          const rows = results
            .map(
              (r) =>
                `<tr><td style="padding:4px 8px;">${escapeHtml(r.tenantName)}</td><td style="padding:4px 8px;">${r.daysPastDue}</td><td style="padding:4px 8px;">${r.action}</td><td style="padding:4px 8px;">${r.emailSent ? '✅' : '—'}</td></tr>`,
            )
            .join('');

          const html = `<h2>Daily past-due digest</h2>
            <p>${results.length} tenant(s) currently past due:</p>
            <ul>
              <li><strong>${reminderCount}</strong> first reminder sent (1+ days)</li>
              <li><strong>${urgentCount}</strong> urgent notice sent (3+ days)</li>
              <li><strong>${suspendedCount}</strong> suspended (7+ days)</li>
            </ul>
            <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:13px;margin-top:12px;">
              <thead><tr style="background:#f3f4f6;">
                <th style="padding:6px 8px;text-align:left;">Tenant</th>
                <th style="padding:6px 8px;text-align:left;">Days past due</th>
                <th style="padding:6px 8px;text-align:left;">Action</th>
                <th style="padding:6px 8px;text-align:left;">Email sent</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:12px;font-size:12px;color:#6b7280;">View full details in SuperAdmin → Failed Payments.</p>`;

          const text = `Daily past-due digest\n\n${results.length} tenant(s) currently past due:\n- ${reminderCount} first reminder (1+ days)\n- ${urgentCount} urgent (3+ days)\n- ${suspendedCount} suspended (7+ days)\n\nView details in SuperAdmin → Failed Payments.`;

          await Promise.allSettled(
            recipients.map((to) =>
              sendEmail({
                to,
                subject: `[Daily Digest] ${results.length} tenant(s) past due`,
                html,
                text,
                usageType: 'transactional',
              }),
            ),
          );
        }
      } catch (err) {
        console.error('[cron/past-due-escalation] Failed to send daily digest:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: pastDueSubs.length,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('[cron/past-due-escalation] Fatal error:', err);
    return NextResponse.json(
      { ok: false, error: 'Past-due escalation failed', detail: String(err) },
      { status: 500 },
    );
  }
}

// GET alias — some cron providers (Vercel Cron) use GET instead of POST.
export async function GET(request: NextRequest) {
  return POST(request);
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
