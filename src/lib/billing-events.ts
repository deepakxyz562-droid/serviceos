/**
 * Billing Event Audit Log helper.
 *
 * Every billing-related action (PayPal capture, refund, cancel, fail, trial
 * reminder sent, trial expired, plan change, proration, downgrade scheduled,
 * renewal, payment method added) writes ONE append-only row here. This is the
 * single source of truth for "what happened with this tenant's money" — used
 * for dispute defense, revenue debugging, and the sidebar Subscription page's
 * audit log panel.
 *
 * Never update or delete rows — always append. Status field captures
 * success/failed/pending so the same event type can record both outcomes.
 */
import { db } from '@/lib/db';

export type BillingEventType =
  | 'capture'
  | 'refund'
  | 'cancel'
  | 'fail'
  | 'trial_reminder'
  | 'trial_expired'
  | 'plan_change'
  | 'proration'
  | 'downgrade_scheduled'
  | 'downgrade_applied'
  | 'renewal'
  | 'payment_method_added'
  | 'subscription_created';

export interface LogBillingEventInput {
  tenantId: string;
  subscriptionId?: string | null;
  type: BillingEventType;
  amount?: number;
  currency?: string;
  status?: 'success' | 'failed' | 'pending';
  description?: string;
  providerResponse?: unknown; // any JSON-serializable value
  paymentProvider?: string;
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  payerEmail?: string | null;
  invoiceNumber?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append a billing event to the audit log. Best-effort: never throws — a
 * logging failure should NOT break the parent operation (e.g. capturing a
 * PayPal payment). Errors are logged to console instead.
 */
export async function logBillingEvent(input: LogBillingEventInput): Promise<void> {
  try {
    const safeResponse = input.providerResponse
      ? JSON.stringify(input.providerResponse).slice(0, 8000) // cap size
      : '{}';
    const safeMeta = input.metadata ? JSON.stringify(input.metadata) : '{}';

    await db.billingEvent.create({
      data: {
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId ?? null,
        type: input.type,
        amount: input.amount ?? 0,
        currency: input.currency ?? 'USD',
        status: input.status ?? 'success',
        description: input.description ?? null,
        providerResponse: safeResponse,
        paymentProvider: input.paymentProvider ?? 'paypal',
        paypalOrderId: input.paypalOrderId ?? null,
        paypalCaptureId: input.paypalCaptureId ?? null,
        payerEmail: input.payerEmail ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        metadata: safeMeta,
      },
    });
  } catch (err) {
    // Audit-log failures must never break the parent flow.
    console.error('[billing-events] Failed to log event:', input.type, err);
  }
}
