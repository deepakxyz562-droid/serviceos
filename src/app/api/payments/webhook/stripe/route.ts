import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/webhook/stripe
 *
 * Stripe webhook handler for form payment events.
 *
 * Receives Stripe webhook events → updates FormResponse payment status.
 *
 * Key events:
 *   payment_intent.succeeded → mark FormResponse as paid
 *   payment_intent.payment_failed → mark FormResponse as failed
 *   charge.refunded → mark FormResponse as refunded
 *   charge.dispute.created → mark FormResponse as disputed
 *
 * Configure webhook endpoint in Stripe Dashboard:
 *   URL: https://yourdomain.com/api/payments/webhook/stripe
 *   Events: payment_intent.succeeded, payment_intent.payment_failed,
 *           charge.refunded, charge.dispute.created
 */
export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 },
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    // Verify the webhook signature (if secret is configured)
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      // In development without webhook secret, parse directly
      event = JSON.parse(payload) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const formResponseId = paymentIntent.metadata?.formResponseId;

        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'succeeded',
              transactionId: paymentIntent.id,
              paidAt: new Date(),
            },
          }).catch(() => {
            // DB might be unavailable
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const formResponseId = paymentIntent.metadata?.formResponseId;

        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'failed',
              transactionId: paymentIntent.id,
            },
          }).catch(() => {});
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const formResponseId = charge.metadata?.formResponseId;

        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'refunded',
            },
          }).catch(() => {});
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const formResponseId = dispute.metadata?.formResponseId;

        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'disputed',
            },
          }).catch(() => {});
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error: any) {
    console.error('[stripe-webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook event' },
      { status: 500 },
    );
  }
}
