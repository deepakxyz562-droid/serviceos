/**
 * Trial-lifecycle helpers — shared by the trial-reminders, trial-expire, and
 * pre-charge-reminder cron jobs.
 *
 * Trial schedule (14-day trial):
 *   Day 0  → trial-started email sent (at signup, not by cron)
 *   Day 4  → trial-ending-3-day... wait, that's 3 days before end (= Day 11)
 *
 * Actually, the user's spec says:
 *   Day 4 of 14 → first reminder (10 days away from end)
 *   Day 6 of 14 → second reminder (8 days away from end)
 *   Day 13 of 14 → pre-charge reminder (1 day before auto-charge)
 *   Day 14+ → trial expired
 *
 * We compute "days until trial ends" and send the matching template. Using
 * daysRemaining (rather than absolute day-of-trial) makes the logic robust to
 * clock skew and lets us catch up if a cron run was missed.
 */
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email-send';
import { renderTrialTemplate } from '@/lib/billing-seed';
import { logBillingEvent } from '@/lib/billing-events';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'ServiceOS';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

export interface TrialReminderResult {
  tenantId: string;
  tenantName: string;
  email: string;
  templateSlug: string;
  daysRemaining: number;
  sent: boolean;
  error?: string;
}

/**
 * Find all tenants whose trial is active and ends within the given day-window.
 * Returns tenants with trialEndsAt between (now + minDays) and (now + maxDays).
 * `planStatus === 'trial'` is required so we don't email active/cancelled/expired tenants.
 */
export async function findTenantsInTrialWindow(minDays: number, maxDays: number) {
  const now = new Date();
  const minDate = new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

  return db.tenant.findMany({
    where: {
      planStatus: 'trial',
      trialEndsAt: {
        gte: minDate,
        lte: maxDate,
      },
    },
    include: {
      users: {
        where: { role: 'owner', isActive: true },
        take: 1,
      },
    },
  });
}

/** Find all tenants whose trial has expired (trialEndsAt < now) but planStatus is still 'trial'. */
export async function findExpiredTrials() {
  const now = new Date();
  return db.tenant.findMany({
    where: {
      planStatus: 'trial',
      trialEndsAt: { lt: now },
    },
    include: {
      users: {
        where: { role: 'owner', isActive: true },
        take: 1,
      },
    },
  });
}

/**
 * Send a trial reminder email to a tenant's owner.
 * Logs a BillingEvent of type 'trial_reminder' regardless of send success
 * (so we can see in the audit log which reminders were attempted).
 */
export async function sendTrialReminder(
  tenant: {
    id: string;
    name: string;
    email: string | null;
    trialEndsAt: Date | null;
    users: { email: string; name: string | null }[];
  },
  templateSlug: 'trial-started' | 'trial-ending-3-day' | 'trial-ending-1-day' | 'trial-expired',
  daysRemaining: number
): Promise<TrialReminderResult> {
  const owner = tenant.users[0];
  const recipientEmail = owner?.email || tenant.email || '';
  const result: TrialReminderResult = {
    tenantId: tenant.id,
    tenantName: tenant.name,
    email: recipientEmail,
    templateSlug,
    daysRemaining,
    sent: false,
  };

  if (!recipientEmail) {
    result.error = 'No owner email on file';
    await logBillingEvent({
      tenantId: tenant.id,
      type: 'trial_reminder',
      status: 'failed',
      description: `Failed to send ${templateSlug}: no owner email`,
      metadata: { templateSlug, daysRemaining, reason: 'no_email' },
    });
    return result;
  }

  const trialEndsAtStr = tenant.trialEndsAt
    ? new Date(tenant.trialEndsAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'soon';

  // Data preservation date = 30 days after trial expiry
  const dataPreservedUntil = tenant.trialEndsAt
    ? new Date(new Date(tenant.trialEndsAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '30 days from expiry';

  const rendered = await renderTrialTemplate(templateSlug, {
    tenantName: tenant.name,
    trialEndsAt: trialEndsAtStr,
    appName: APP_NAME,
    loginUrl: APP_URL,
    billingUrl: `${APP_URL}/billing`,
    planName: 'Growth',
    planPrice: '$79/month',
    dataPreservedUntil,
  });

  if (!rendered) {
    result.error = `Template ${templateSlug} not found`;
    await logBillingEvent({
      tenantId: tenant.id,
      type: 'trial_reminder',
      status: 'failed',
      description: `Template ${templateSlug} not seeded`,
      metadata: { templateSlug, daysRemaining, reason: 'missing_template' },
    });
    return result;
  }

  try {
    const sendResult = await sendEmail({
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      usageType: 'transactional',
    });

    if (sendResult.success) {
      result.sent = true;
      await logBillingEvent({
        tenantId: tenant.id,
        type: 'trial_reminder',
        status: 'success',
        description: `Sent ${templateSlug} email to ${recipientEmail}`,
        payerEmail: recipientEmail,
        metadata: { templateSlug, daysRemaining, simulated: sendResult.simulated ?? false },
      });
    } else {
      result.error = sendResult.error || 'Email send failed';
      await logBillingEvent({
        tenantId: tenant.id,
        type: 'trial_reminder',
        status: 'failed',
        description: `Failed to send ${templateSlug}: ${sendResult.error}`,
        payerEmail: recipientEmail,
        metadata: { templateSlug, daysRemaining, error: sendResult.error },
      });
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    await logBillingEvent({
      tenantId: tenant.id,
      type: 'trial_reminder',
      status: 'failed',
      description: `Exception sending ${templateSlug}: ${result.error}`,
      payerEmail: recipientEmail,
      metadata: { templateSlug, daysRemaining, error: result.error },
    });
  }

  return result;
}

/**
 * Expire a tenant's trial: set planStatus='expired' and clear trialEndsAt.
 * The trial-expiry paywall middleware will then redirect them to /billing.
 * Logs a BillingEvent of type 'trial_expired'.
 */
export async function expireTenantTrial(tenantId: string): Promise<void> {
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      planStatus: 'expired',
    },
  });

  await logBillingEvent({
    tenantId,
    type: 'trial_expired',
    status: 'success',
    description: 'Trial expired — access restricted (paywall active)',
    metadata: { expiredAt: new Date().toISOString() },
  });
}

/**
 * Compute days remaining in a tenant's trial (rounded up). Returns 0 if
 * trialEndsAt is null or in the past.
 */
export function getDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
