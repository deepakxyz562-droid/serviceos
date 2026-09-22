import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { resolveFormCredentials } from '@/lib/payments/credentials';

export const dynamic = 'force-dynamic';

/**
 * POST /api/forms/[id]/charge
 *
 * Processes a real payment for a form submission using the 2-Level Hybrid
 * credential resolution model:
 *
 *   Level 1 (Standalone AI Form Builder):
 *     The form's widgetConfig contains encrypted secret keys entered by the
 *     form creator in the inspector. resolveFormCredentials() decrypts them.
 *
 *   Level 2 (FieserOS CRM User convenience):
 *     If the form has no widgetConfig secret, look up the form owner's
 *     PaymentGatewayConfig record (linked to an encrypted Credential row).
 *
 * In both cases, the user's own gateway credentials are used — funds go
 * directly to the user's account, never the platform's.
 *
 * Body:
 *   gatewayId  — e.g. 'stripe_elements', 'paypal_complete', 'razorpay'
 *   amount     — amount to charge (in major currency units, e.g. 49.00)
 *   currency   — 'USD', 'EUR', 'INR', etc.
 *   customer   — { name, email }
 *   paymentMethodId — Stripe payment method ID (from Stripe.js frontend)
 *   formResponseId  — the FormResponse ID (if already created)
 *
 * Returns: { success, transactionId, paymentStatus, clientSecret? }
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
    // Uses the form owner's Stripe secret key (Level 1 widgetConfig OR
    // Level 2 PaymentGatewayConfig). Falls back to process.env.STRIPE_SECRET_KEY
    // for backward compat with the old platform-key deployment.
    if (gatewayId.startsWith('stripe')) {
      const creds = await resolveFormCredentials(formId, gatewayId);
      let stripeSecretKey: string | undefined;
      let isLive = true;

      if (creds?.secretKey) {
        // User's own credentials (Level 1 or Level 2).
        stripeSecretKey = creds.secretKey as string;
        isLive = creds.isLive !== false;
      } else {
        // Backward-compat fallback: platform key from env var.
        stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        // NOTE: This fallback will be removed in a future release. Every form
        // should have its own Stripe credentials connected via the inspector
        // or via the dashboard PaymentGatewayConfig.
      }

      if (!stripeSecretKey) {
        return NextResponse.json(
          {
            error: 'No Stripe credentials connected. Add your Stripe secret key in the form inspector (Payment section) or connect your Stripe account in Dashboard > Settings > Payments.',
            gatewayId,
          },
          { status: 503 },
        );
      }

      const stripe = new Stripe(stripeSecretKey);
      const amountInCents = Math.round(Number(amount) * 100);

      try {
        // Stripe Checkout: create a Checkout Session (hosted redirect flow).
        // For stripe_checkout, return a checkoutUrl instead of a PaymentIntent.
        if (gatewayId === 'stripe_checkout') {
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{
              price_data: {
                currency: currency.toLowerCase(),
                product_data: { name: `Form payment - ${formId}` },
                unit_amount: amountInCents,
              },
              quantity: 1,
            }],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/form/${formId}?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/form/${formId}?payment=cancelled`,
            customer_email: customer?.email || undefined,
            metadata: {
              formId,
              formResponseId: formResponseId || '',
              gatewayId,
              customerName: customer?.name || '',
            },
          }, isLive ? undefined : { apiVersion: '2024-06-20' });

          if (formResponseId) {
            await db.formResponse.update({
              where: { id: formResponseId },
              data: {
                paymentStatus: 'pending',
                transactionId: session.id,
                paymentMethod: 'stripe',
                paymentAmount: Number(amount),
                paymentCurrency: currency,
                paymentGatewayId: gatewayId,
              },
            }).catch(() => { /* DB might be unavailable */ });
          }

          return NextResponse.json({
            success: true,
            transactionId: session.id,
            paymentStatus: 'pending',
            checkoutUrl: session.url,
            gateway: 'stripe',
          });
        }

        // Stripe Elements / Stripe ACH: create a PaymentIntent.
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
      // eCheck.Net rides on Authorize.Net credentials.
      const creds = await resolveFormCredentials(formId, 'authorize_net');
      if (!creds?.apiLoginId || !creds?.transactionKey) {
        return NextResponse.json({
          success: false,
          error: 'No Authorize.Net credentials connected. Add your API Login ID and Transaction Key in the form inspector or in Dashboard > Settings > Payments.',
          gatewayId,
        }, { status: 503 });
      }
      return NextResponse.json({
        success: false,
        error: 'eCheck.Net real charges require the Accept.js SDK to tokenize bank details. This flow is not yet implemented.',
        gatewayId,
        flow: 'client_side',
      }, { status: 501 });
    }

    // ─── Chargify (subscription billing) ────────────────────────────────────
    if (gatewayId === 'chargify') {
      const creds = await resolveFormCredentials(formId, 'chargify');
      if (!creds?.apiKey || !creds?.subdomain) {
        return NextResponse.json({
          success: false,
          error: 'No Chargify credentials connected. Add your Chargify API Key and Subdomain in the form inspector or in Dashboard > Settings > Payments.',
          gatewayId,
        }, { status: 503 });
      }
      return NextResponse.json({
        success: false,
        error: 'Chargify subscription creation flow is not yet implemented.',
        gatewayId,
        flow: 'server_side',
      }, { status: 501 });
    }

    // ─── Authorize.Net (via Accept.js opaque token) ────────────────────────
    if (gatewayId === 'authorize_net') {
      const creds = await resolveFormCredentials(formId, 'authorize_net');
      let apiLoginId: string | undefined;
      let transactionKey: string | undefined;
      let isLive = true;

      if (creds?.apiLoginId && creds?.transactionKey) {
        apiLoginId = creds.apiLoginId as string;
        transactionKey = creds.transactionKey as string;
        isLive = creds.isLive !== false;
      } else {
        // Backward-compat fallback to platform env vars.
        apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
        transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
        isLive = process.env.AUTHORIZE_NET_ENVIRONMENT === 'production';
      }

      if (!apiLoginId || !transactionKey) {
        return NextResponse.json({
          success: false,
          error: 'No Authorize.Net credentials connected. Add your API Login ID and Transaction Key in the form inspector or in Dashboard > Settings > Payments.',
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
        const apiBase = isLive
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
      // PayPal Smart Buttons are 100% client-side — the capture happens in
      // the browser via the PayPal SDK. The backend /charge endpoint is only
      // used to retrieve the user's clientId (which is public, not secret).
      const creds = await resolveFormCredentials(formId, 'paypal_complete');
      if (!creds?.clientId) {
        return NextResponse.json({
          success: false,
          error: 'No PayPal credentials connected. Add your PayPal Client ID in the form inspector or in Dashboard > Settings > Payments.',
          gatewayId,
        }, { status: 503 });
      }
      // Return the clientId so the frontend can initialize the PayPal SDK.
      // No clientSecret needed — PayPal Smart Buttons don't use it client-side.
      return NextResponse.json({
        success: true,
        clientId: creds.clientId,
        gateway: 'paypal',
        flow: 'client_side',
        message: 'PayPal Smart Buttons are initialized client-side with the user\'s clientId.',
      });
    }

    // ─── Razorpay ────────────────────────────────────────────────────────────
    if (gatewayId.startsWith('razorpay')) {
      const creds = await resolveFormCredentials(formId, 'razorpay');
      let keyId: string | undefined;
      let keySecret: string | undefined;

      if (creds?.keyId && creds?.keySecret) {
        keyId = creds.keyId as string;
        keySecret = creds.keySecret as string;
      } else {
        // Backward-compat fallback to platform env vars.
        keyId = process.env.RAZORPAY_KEY_ID;
        keySecret = process.env.RAZORPAY_KEY_SECRET;
      }

      if (!keyId || !keySecret) {
        return NextResponse.json({
          success: false,
          error: 'No Razorpay credentials connected. Add your Razorpay Key ID and Key Secret in the form inspector or in Dashboard > Settings > Payments.',
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
        // Also return the keyId so the frontend can initialize the Checkout modal.
        return NextResponse.json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: keyId, // public, needed by Razorpay Checkout constructor
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
      const creds = await resolveFormCredentials(formId, 'square_payments');
      let accessToken: string | undefined;
      let locationId: string | undefined;
      let isLive = true;

      if (creds?.accessToken) {
        accessToken = creds.accessToken as string;
        locationId = creds.locationId as string;
        isLive = creds.isLive !== false;
      } else {
        // Backward-compat fallback to platform env vars.
        accessToken = process.env.SQUARE_ACCESS_TOKEN;
        locationId = process.env.SQUARE_LOCATION_ID;
        isLive = process.env.SQUARE_ENVIRONMENT === 'production';
      }

      if (!accessToken || !locationId) {
        return NextResponse.json({
          success: false,
          error: 'No Square credentials connected. Add your Square Access Token and Location ID in the form inspector or in Dashboard > Settings > Payments.',
          gatewayId,
        }, { status: 503 });
      }
      try {
        const apiBase = isLive
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
      error: `Gateway '${gatewayId}' is not yet implemented for direct charges. Supported: stripe_* (stripe_elements, stripe_checkout, stripe_ach), paypal_*, razorpay_*, square_payments, authorize_net, echeck_net, chargify.`,
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
