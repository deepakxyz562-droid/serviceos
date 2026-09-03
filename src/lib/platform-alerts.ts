/**
 * Platform billing-failure alerts.
 *
 * Centralised helper invoked by every payment-webhook failure handler
 * (PayPal `PAYMENT.SALE.DENIED`, Creem `subscription.payment_failed`,
 * add-on `subscription.payment_failed`, and the `BILLING.SUBSCRIPTION.SUSPENDED`
 * path). One call does the following — ALL best-effort, none of them may
 * break the parent webhook (a 500 would cause PayPal/Creem to retry the
 * webhook, duplicating alerts):
 *
 *   1. Optionally write a `SubscriptionPayment { status: 'failed' }` row
 *      so the failure shows up in the tenant's Billing History table
 *      (previously only `BillingEvent` rows were written, which the tenant
 *      never sees in their "Billing History" card).
 *   2. `EventBus.emit('payment.failed', ...)` — this auto-writes an
 *      `AuditLog` row AND triggers the lifecycle-push-dispatcher, which
 *      sends an in-app bell notification + web push to the tenant owner
 *      and every admin of the failing tenant.
 *   3. Send a transactional email to the platform owner(s) so the
 *      SuperAdmin / platform operator is proactively alerted (not just
 *      the tenant). Recipients resolved by `getPlatformBillingAlertEmails()`.
 *
 * Why a single helper?
 *   - Keeps the four webhook handlers DRY — each handler only needs to
 *     supply its domain-specific context (which provider, which sub,
 *     which reason).
 *   - Centralises the "never throw" contract — every step is wrapped in
 *     try/catch so a notification failure can't break the webhook.
 *   - Single place to extend later (e.g. add Slack, PagerDuty, SMS to
 *     the platform owner).
 */
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { sendEmail } from '@/lib/email-send';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PaymentFailureContext {
  tenantId: string;
  /** SaaS Subscription.id (NOT the provider's subscription id). Null for add-on failures. */
  subscriptionId?: string | null;
  /** TenantAddonSubscription.id — set when the failure is for an add-on, not the base SaaS sub. */
  addonSubscriptionId?: string | null;
  plan: string;
  billingCycle: string;
  amount: number;
  currency?: string;
  paymentProvider: 'paypal' | 'creem' | 'stripe' | 'manual';
  /** Provider's subscription id (PayPal `I-xxx` or Creem `sub_xxx`). */
  providerSubscriptionId?: string | null;
  /** Provider's sale/charge id (PayPal sale id, etc.) — used as paypalOrderId on the failed row. */
  providerSaleId?: string | null;
  payerEmail?: string | null;
  /** The raw webhook event name from the provider, e.g. `PAYMENT.SALE.DENIED`. */
  errorCode: string;
  /** Human-readable reason, e.g. "Recurring payment denied by PayPal". */
  declineReason: string;
  /** Longer description used for the BillingEvent row (already written by the caller). */
  description?: string;
  /** Tenant's display name (for the platform-owner email subject/body). */
  tenantName?: string | null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Fire all payment-failure alerts for a single failed-payment event.
 *
 * EVERY step is wrapped in its own try/catch — a failure in any one
 * channel (email down, EventBus handler throws, SubscriptionPayment
 * insert fails) MUST NOT propagate to the caller. The caller is always
 * a webhook handler, and an unhandled throw would cause the webhook to
 * return 500, which makes PayPal/Creem retry the webhook → duplicate
 * alerts.
 *
 * Usage from a webhook handler:
 *
 *   await logBillingEvent({ ... });                    // already there
 *   await firePaymentFailureAlerts({                   // NEW — single call
 *     tenantId: local.tenantId,
 *     subscriptionId: local.id,
 *     plan: local.plan,
 *     billingCycle: local.billingCycle,
 *     amount: local.amount,
 *     currency: local.currency,
 *     paymentProvider: 'paypal',
 *     providerSubscriptionId: subId,
 *     errorCode: 'PAYMENT.SALE.DENIED',
 *     declineReason: 'Recurring payment denied by PayPal',
 *     tenantName: tenantName,
 *   }).catch(() => {});  // belt + suspendures
 */
export async function firePaymentFailureAlerts(ctx: PaymentFailureContext): Promise<void> {
  // Run the three independent channels in parallel — none depends on the others,
  // and Promise.allSettled means a rejection in one doesn't skip the others.
  await Promise.allSettled([
    writeFailedSubscriptionPayment(ctx),
    emitPaymentFailedEvent(ctx),
    sendPlatformOwnerAlert(ctx),
  ]);
}

// ── Channel 1: SubscriptionPayment { status: 'failed' } row ────────────────

/**
 * Write a `SubscriptionPayment` row with `status: 'failed'` so the failure
 * shows up in the tenant's Billing History table (which queries
 * SubscriptionPayment, not BillingEvent).
 *
 * Skipped for add-on failures (no SaaS `subscriptionId` to attach to) —
 * add-on failures already get a `BillingEvent` row + the tenant sees the
 * "Past Due" badge on the add-on in their billing page.
 *
 * `paidAt` is explicitly set to `null` — the schema's `@default(now())`
 * would otherwise stamp "now" on a payment that didn't happen.
 *
 * `invoiceNumber` is OMITTED (nullable) so we don't consume a sequence
 * number for a failed payment — keeps the paid-row invoice sequence clean.
 */
async function writeFailedSubscriptionPayment(ctx: PaymentFailureContext): Promise<void> {
  // Only write for SaaS subscription failures (not add-ons).
  if (!ctx.subscriptionId) return;

  try {
    const planLabel = ctx.plan.charAt(0).toUpperCase() + ctx.plan.slice(1);
    await db.subscriptionPayment.create({
      data: {
        tenantId: ctx.tenantId,
        subscriptionId: ctx.subscriptionId,
        // invoiceNumber intentionally omitted — don't consume a sequence number for a failed payment.
        amount: ctx.amount,
        currency: ctx.currency || 'USD',
        status: 'failed',
        description: `${planLabel} Plan - ${ctx.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} (PAYMENT FAILED: ${ctx.errorCode})`,
        plan: ctx.plan,
        billingCycle: ctx.billingCycle,
        paymentProvider: ctx.paymentProvider,
        paypalOrderId: ctx.providerSaleId || null,
        payerEmail: ctx.payerEmail || null,
        paidAt: null, // <-- no payment was made
      },
    });
  } catch (err) {
    console.error('[platform-alerts] Failed to record failed SubscriptionPayment row:', err);
  }
}

// ── Channel 2: EventBus.emit('payment.failed') ─────────────────────────────

/**
 * Emit the `payment.failed` service event. This:
 *   - Auto-writes an AuditLog row (EventBus does this internally).
 *   - Triggers the lifecycle-push-dispatcher (already registered for
 *     'payment.failed' — see LIFECYCLE_EVENTS in lifecycle-push-dispatcher.ts)
 *     which sends in-app bell + web push to the tenant owner + admins.
 *
 * The dispatcher's `case 'payment.failed'` reads `invoiceNumber`,
 * `customerName`, `reason` from the payload — we supply all three so the
 * push notification body is meaningful.
 */
async function emitPaymentFailedEvent(ctx: PaymentFailureContext): Promise<void> {
  try {
    await EventBus.emit(
      'payment.failed',
      {
        tenantId: ctx.tenantId,
        subscriptionId: ctx.subscriptionId,
        addonSubscriptionId: ctx.addonSubscriptionId,
        amount: ctx.amount,
        currency: ctx.currency || 'USD',
        plan: ctx.plan,
        billingCycle: ctx.billingCycle,
        paymentProvider: ctx.paymentProvider,
        providerSubscriptionId: ctx.providerSubscriptionId,
        errorCode: ctx.errorCode,
        reason: ctx.declineReason,
        // Fields the lifecycle-push-dispatcher's `case 'payment.failed'` reads:
        invoiceNumber: null, // we don't mint an invoice number for failed payments
        customerName: ctx.tenantName || ctx.payerEmail || 'Tenant',
        resourceType: ctx.subscriptionId ? 'subscription' : 'addon_subscription',
        resourceId: ctx.subscriptionId || ctx.addonSubscriptionId || ctx.tenantId,
        summary: `Payment failed: ${ctx.plan} (${ctx.billingCycle}) — tenant ${ctx.tenantName || ctx.tenantId}`,
      },
      { tenantId: ctx.tenantId },
    );
  } catch (err) {
    console.error('[platform-alerts] Failed to emit payment.failed event:', err);
  }
}

// ── Channel 3: Platform-owner email alert ──────────────────────────────────

/**
 * Send a transactional email to the platform owner(s) so the SuperAdmin /
 * platform operator is proactively alerted about a tenant's payment failure.
 *
 * Recipients resolved by `getPlatformBillingAlertEmails()`:
 *   - `PLATFORM_BILLING_ALERT_EMAIL` env var (comma-separated list), OR
 *   - fallback: every `User.isSuperAdmin = true` user's email.
 *
 * `tenantId` is deliberately NOT passed to `sendEmail` — that bypasses the
 * per-tenant email-quota gate (correct behaviour for platform-owner alerts,
 * which should never be throttled by a tenant's quota).
 */
async function sendPlatformOwnerAlert(ctx: PaymentFailureContext): Promise<void> {
  try {
    const recipients = await getPlatformBillingAlertEmails();
    if (recipients.length === 0) {
      console.warn('[platform-alerts] No platform billing alert email configured — skipping platform-owner alert.');
      return;
    }

    const tenantLabel = ctx.tenantName || ctx.tenantId;
    const amount = `${ctx.currency || 'USD'} ${ctx.amount}`;
    const subject = `[Billing Alert] Payment failed — ${tenantLabel} (${ctx.plan})`;

    const html = [
      `<h2>⚠️ Recurring payment failed</h2>`,
      `<p>A tenant's recurring payment failed and their subscription has been marked <code>past_due</code>.</p>`,
      `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">`,
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Tenant:</td><td><strong>${escapeHtml(tenantLabel)}</strong> (${escapeHtml(ctx.tenantId)})</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Plan:</td><td>${escapeHtml(ctx.plan)} (${escapeHtml(ctx.billingCycle)})</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Amount:</td><td><strong>${escapeHtml(amount)}</strong></td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Provider:</td><td>${escapeHtml(ctx.paymentProvider)}${ctx.providerSubscriptionId ? ` (sub ${escapeHtml(ctx.providerSubscriptionId)})` : ''}</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Error code:</td><td><code>${escapeHtml(ctx.errorCode)}</code></td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Reason:</td><td>${escapeHtml(ctx.declineReason)}</td></tr>`,
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Time:</td><td>${new Date().toISOString()}</td></tr>`,
      `</table>`,
      `<p style="margin-top:16px;">The tenant owner has been notified in-app. Action may be needed if the tenant doesn't update their payment method within the grace period.</p>`,
      `<p style="margin-top:12px;font-size:12px;color:#6b7280;">View all failed payments in SuperAdmin → Failed Payments.</p>`,
    ].join('\n');

    const text = [
      `Recurring payment failed`,
      ``,
      `Tenant: ${tenantLabel} (${ctx.tenantId})`,
      `Plan: ${ctx.plan} (${ctx.billingCycle})`,
      `Amount: ${amount}`,
      `Provider: ${ctx.paymentProvider}${ctx.providerSubscriptionId ? ` (sub ${ctx.providerSubscriptionId})` : ''}`,
      `Error code: ${ctx.errorCode}`,
      `Reason: ${ctx.declineReason}`,
      `Time: ${new Date().toISOString()}`,
      ``,
      `The tenant owner has been notified in-app. View all failed payments in SuperAdmin → Failed Payments.`,
    ].join('\n');

    // Send to each recipient in parallel. sendEmail() takes a single `to`,
    // so we fire one email per recipient (small N — usually 1-3 superadmins).
    await Promise.allSettled(
      recipients.map((to) =>
        sendEmail({
          to,
          subject,
          html,
          text,
          usageType: 'transactional',
          // No tenantId → bypasses per-tenant email-quota gate.
        }),
      ),
    );
  } catch (err) {
    console.error('[platform-alerts] Failed to send platform-owner payment-failure alert:', err);
  }
}

// ── Recipients resolver ─────────────────────────────────────────────────────

/**
 * Resolve the list of email addresses to alert when any tenant's payment fails.
 *
 * Resolution order:
 *   1. `PLATFORM_BILLING_ALERT_EMAIL` env var (comma-separated list).
 *      Operators set this to a PagerDuty email, a shared inbox, or a specific
 *      admin alias. Example: `alerts@fieseros.com,billing@fieseros.com`.
 *   2. Fallback: every `User.isSuperAdmin = true` user's email.
 *      Ensures alerts flow even if the env var isn't set.
 *
 * Returns a deduplicated list. Empty array = no recipients (alerts skipped
 * with a console warning — see caller).
 */
export async function getPlatformBillingAlertEmails(): Promise<string[]> {
  // 1. Env var (preferred — explicit operator intent).
  const envList = process.env.PLATFORM_BILLING_ALERT_EMAIL;
  if (envList && envList.trim()) {
    const emails = envList
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));
    if (emails.length > 0) return dedupe(emails);
  }

  // 2. Fallback: all superadmin users.
  try {
    const supers = await db.user.findMany({
      where: { isSuperAdmin: true },
      select: { email: true },
    });
    const emails = supers
      .map((u) => u.email)
      .filter((e): e is string => !!e && e.includes('@'));
    return dedupe(emails);
  } catch (err) {
    console.error('[platform-alerts] Failed to resolve superadmin alert emails:', err);
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list.map((e) => e.toLowerCase())));
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
