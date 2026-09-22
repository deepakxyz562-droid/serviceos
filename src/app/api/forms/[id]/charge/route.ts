import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/forms/[id]/charge
 *
 * Processes a real payment for a form submission.
 *
 * Body:
 *   gatewayId  — e.g. 'stripe_checkout', 'paypal_complete', 'razorpay'
 *   amount     — amount to charge (in major currency units, e.g. 49.00)
 *   currency   — 'USD', 'EUR', 'INR', etc.
 *   customer   — { name, email }
 *   paymentMethodId — Stripe payment method ID (from Stripe.js frontend)
 *   formResponseId  — the FormResponse ID (if already created)
 *
 * Returns: { success, transactionId, paymentStatus, clientSecret? }
 *
 * Currently implements Stripe. Other gateways return a 501 with guidance
 * to use the gateway's native checkout flow.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: formId } = await params;
    const body = await req.json();
    const {
      gatewayId,
      amount,
      currency = 'USD',
      customer,
      paymentMethodId,
      formResponseId,
    } = body;

    if (!gatewayId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'gatewayId and a positive amount are required' },
        { status: 400 },
      );
    }

    // ─── Stripe (covers stripe_elements, stripe_checkout, stripe_ach) ────────
    if (gatewayId.startsWith('stripe')) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return NextResponse.json(
          {
            error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.',
            gatewayId,
          },
          { status: 503 },
        );
      }

      const stripe = new Stripe(stripeSecretKey);
      const amountInCents = Math.round(Number(amount) * 100);

      try {
        // Create a PaymentIntent (for Stripe Elements / direct charge)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: currency.toLowerCase(),
          payment_method: paymentMethodId || undefined,
          confirm: Boolean(paymentMethodId),
          receipt_email: customer?.email || undefined,
          metadata: {
            formId,
            formResponseId: formResponseId || '',
            gatewayId,
            customerName: customer?.name || '',
          },
          description: `Form payment - ${formId}`,
        });

        // If formResponseId exists, update it with the payment info
        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
              transactionId: paymentIntent.id,
              paymentMethod: 'stripe',
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
              paidAt: paymentIntent.status === 'succeeded' ? new Date() : null,
            },
          }).catch(() => {
            // DB might be unavailable — don't fail the charge
          });
        }

        return NextResponse.json({
          success: true,
          transactionId: paymentIntent.id,
          paymentStatus: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
          clientSecret: paymentIntent.client_secret,
          gateway: 'stripe',
        });
      } catch (stripeError: any) {
        console.error('[forms/charge] Stripe error:', stripeError);
        return NextResponse.json(
          {
            error: 'Stripe payment failed',
            details: stripeError.message,
            code: stripeError.code,
          },
          { status: 402 },
        );
      }
    }

    // ─── eCheck.Net (via Authorize.Net) ────────────────────────────────────
    if (gatewayId === 'echeck_net') {
      // Authorize.Net eCheck requires the Accept.js SDK to tokenize bank details.
      // The frontend sends paymentMethodId as `echeck:routing:account` — we'd
      // call Authorize.Net's createTransaction API here. For now, return 501
      // with guidance.
      return NextResponse.json({
        success: false,
        error: 'eCheck.Net real charges require Authorize.Net API credentials (apiLoginId + transactionKey) configured on the server.',
        gatewayId,
        flow: 'server_side',
      }, { status: 501 });
    }

    // ─── Chargify (subscription billing) ────────────────────────────────────
    if (gatewayId === 'chargify') {
      return NextResponse.json({
        success: false,
        error: 'Chargify real subscription creation requires Chargify API credentials (apiKey + subdomain) configured on the server.',
        gatewayId,
        flow: 'server_side',
      }, { status: 501 });
    }

    // ─── Authorize.Net (via Accept.js opaque token) ────────────────────────
    if (gatewayId === 'authorize_net') {
      const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
      const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
      if (!apiLoginId || !transactionKey) {
        return NextResponse.json({
          success: false,
          error: 'Authorize.Net is not configured. Set AUTHORIZE_NET_API_LOGIN_ID and AUTHORIZE_NET_TRANSACTION_KEY in your environment.',
          gatewayId,
        }, { status: 503 });
      }
      // The frontend sends paymentMethodId as `${dataDescriptor}:${dataValue}`
      // — both are opaque tokens from Accept.js, not raw card details.
      const [dataDescriptor, dataValue] = String(paymentMethodId || '').split(':');
      if (!dataDescriptor || !dataValue) {
        return NextResponse.json({
          success: false,
          error: 'Missing Accept.js opaque data (dataDescriptor:dataValue).',
          gatewayId,
        }, { status: 400 });
      }
      try {
        const env = process.env.AUTHORIZE_NET_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
        const apiBase = env === 'production'
          ? 'https://api.authorize.net/xml/v1/request.api'
          : 'https://apitest.authorize.net/xml/v1/request.api';
        const amountStr = Number(amount).toFixed(2);
        const res = await fetch(apiBase, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({
            createTransactionRequest: {
              merchantAuthentication: { name: apiLoginId, transactionKey },
              transactionRequest: {
                transactionType: 'authCaptureTransaction',
                amount: amountStr,
                payment: { opaqueData: { dataDescriptor, dataValue } },
                order: { description: `Form payment - ${formId}` },
              },
            },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            success: false,
            error: `Authorize.Net request failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const text = await res.text();
        // Authorize.Net returns XML-ish JSON with a BOM; strip it.
        const clean = text.replace(/^\uFEFF/, '');
        const data = JSON.parse(clean);
        const txResponse = data?.transactionResponse;
        if (data?.messages?.resultCode === 'Ok' && txResponse?.transId) {
          if (formResponseId) {
            await db.formResponse.update({
              where: { id: formResponseId },
              data: {
                paymentStatus: 'succeeded',
                transactionId: String(txResponse.transId),
                paymentMethod: 'authorize_net',
                paymentAmount: Number(amount),
                paymentCurrency: currency,
                paymentGatewayId: gatewayId,
                paidAt: new Date(),
              },
            }).catch(() => { /* noop */ });
          }
          return NextResponse.json({
            success: true,
            transactionId: String(txResponse.transId),
            paymentStatus: 'succeeded',
            gateway: 'authorize_net',
          });
        }
        return NextResponse.json({
          success: false,
          error: data?.messages?.message?.[0]?.text || 'Authorize.Net declined the payment.',
          gatewayId,
        }, { status: 402 });
      } catch (authNetError: any) {
        console.error('[forms/charge] Authorize.Net error:', authNetError);
        return NextResponse.json({
          success: false,
          error: 'Authorize.Net payment failed',
          details: authNetError.message,
        }, { status: 402 });
      }
    }

    // ─── PayPal ──────────────────────────────────────────────────────────────
    if (gatewayId.startsWith('paypal')) {
      // PayPal requires client-side PayPal SDK → create order → capture
      // The frontend's PayPal.Buttons().createOrder() creates the order
      // directly via the PayPal SDK; this endpoint is called only for
      // server-side capture if needed.
      return NextResponse.json({
        success: false,
        error: 'PayPal payments are handled entirely client-side via the PayPal SDK. Use the PayPal JS SDK to create an order, then capture via /api/payments/paypal/capture.',
        gatewayId,
        flow: 'client_side',
      }, { status: 501 });
    }

    // ─── Razorpay ────────────────────────────────────────────────────────────
    if (gatewayId.startsWith('razorpay')) {
      // Razorpay requires creating an order on the backend (using keyId +
      // keySecret) so that the client-side Checkout modal can reference it.
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return NextResponse.json({
          success: false,
          error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.',
          gatewayId,
        }, { status: 503 });
      }
      try {
        // Razorpay order amount is in the smallest currency unit (paise for INR).
        const amountInSmallestUnit = currency === 'INR'
          ? Math.round(Number(amount) * 100)
          : Math.round(Number(amount) * 100);
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInSmallestUnit,
            currency,
            receipt: `form_${formId}_${Date.now()}`,
            notes: { formId, gatewayId },
          }),
        });
        if (!orderRes.ok) {
          const errText = await orderRes.text();
          return NextResponse.json({
            success: false,
            error: `Razorpay order creation failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const order = await orderRes.json();
        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'pending',
              transactionId: order.id,
              paymentMethod: 'razorpay',
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
            },
          }).catch(() => { /* DB might be unavailable */ });
        }
        return NextResponse.json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          gateway: 'razorpay',
        });
      } catch (razorpayError: any) {
        console.error('[forms/charge] Razorpay error:', razorpayError);
        return NextResponse.json({
          success: false,
          error: 'Razorpay order creation failed',
          details: razorpayError.message,
        }, { status: 402 });
      }
    }

    // ─── Square ──────────────────────────────────────────────────────────────
    if (gatewayId === 'square_payments') {
      // Square requires the Square OAuth token + location_id to create a payment
      // from the card nonce the frontend sent in paymentMethodId.
      const accessToken = process.env.SQUARE_ACCESS_TOKEN;
      const locationId = process.env.SQUARE_LOCATION_ID;
      if (!accessToken || !locationId) {
        return NextResponse.json({
          success: false,
          error: 'Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in your environment.',
          gatewayId,
        }, { status: 503 });
      }
      try {
        const env = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
        const apiBase = env === 'production'
          ? 'https://connect.squareup.com'
          : 'https://connect.squareupsandbox.com';
        const amountInCents = Math.round(Number(amount) * 100);
        const payRes = await fetch(`${apiBase}/v2/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': '2024-08-21',
          },
          body: JSON.stringify({
            source_id: paymentMethodId,
            idempotency_key: `${formId}_${Date.now()}`,
            amount_money: { amount: amountInCents, currency },
            location_id: locationId,
          }),
        });
        if (!payRes.ok) {
          const errText = await payRes.text();
          return NextResponse.json({
            success: false,
            error: `Square payment failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const payment = await payRes.json();
        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: payment.payment?.status === 'COMPLETED' ? 'succeeded' : 'pending',
              transactionId: payment.payment?.id,
              paymentMethod: 'square',
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
              paidAt: payment.payment?.status === 'COMPLETED' ? new Date() : null,
            },
          }).catch(() => { /* noop */ });
        }
        return NextResponse.json({
          success: true,
          transactionId: payment.payment?.id,
          paymentStatus: payment.payment?.status === 'COMPLETED' ? 'succeeded' : 'pending',
          gateway: 'square',
        });
      } catch (squareError: any) {
        console.error('[forms/charge] Square error:', squareError);
        return NextResponse.json({
          success: false,
          error: 'Square payment failed',
          details: squareError.message,
        }, { status: 402 });
      }
    }

    // ─── Other gateways ─────────────────────────────────────────────────────
    return NextResponse.json({
      success: false,
      error: `Gateway '${gatewayId}' is not yet implemented for direct charges. Supported: stripe_*`,
      gatewayId,
    }, { status: 501 });
  } catch (error: any) {
    console.error('[forms/charge POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 },
    );
  }
}
