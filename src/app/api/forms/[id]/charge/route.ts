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

    // ─── eCheck.Net, Chargify, Mollie, PayU India, GoCardless, Afterpay/Clearpay
    // are handled further below (after Authorize.Net) — they share the same
    // resolveFormCredentials pattern.

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

    // ─── eCheck.Net (via Authorize.Net echeck transaction) ────────────────
    if (gatewayId === 'echeck_net') {
      // eCheck.Net rides on Authorize.Net credentials.
      const creds = await resolveFormCredentials(formId, 'echeck_net');
      let apiLoginId: string | undefined;
      let transactionKey: string | undefined;
      let isLive = true;

      if (creds?.apiLoginId && creds?.transactionKey) {
        apiLoginId = creds.apiLoginId as string;
        transactionKey = creds.transactionKey as string;
        isLive = creds.isLive !== false;
      } else {
        // Fall back to platform env vars.
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
      // from Accept.js opaque tokenization. For eCheck, the opaque data wraps
      // the bank account/routing number securely.
      const [dataDescriptor, dataValue] = String(paymentMethodId || '').split(':');
      if (!dataDescriptor || !dataValue) {
        return NextResponse.json({
          success: false,
          error: 'Missing Accept.js opaque data for eCheck. The frontend must tokenize bank details via Accept.js first.',
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
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify({
            createTransactionRequest: {
              merchantAuthentication: { name: apiLoginId, transactionKey },
              transactionRequest: {
                transactionType: 'authCaptureTransaction',
                amount: amountStr,
                payment: { opaqueData: { dataDescriptor, dataValue } },
                order: { description: `Form eCheck payment - ${formId}` },
              },
            },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            success: false,
            error: `Authorize.Net eCheck request failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const text = await res.text();
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
                paymentMethod: 'echeck_net',
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
            gateway: 'echeck_net',
          });
        }
        return NextResponse.json({
          success: false,
          error: data?.messages?.message?.[0]?.text || 'Authorize.Net eCheck declined the payment.',
          gatewayId,
        }, { status: 402 });
      } catch (echeckError: any) {
        console.error('[forms/charge] eCheck.Net error:', echeckError);
        return NextResponse.json({
          success: false,
          error: 'eCheck.Net payment failed',
          details: echeckError.message,
        }, { status: 402 });
      }
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
      const apiKey = creds.apiKey as string;
      const subdomain = creds.subdomain as string;
      const isLive = creds.isLive !== false;
      const productId = (creds.productId as string) || String(body.config?.productId || body.productId || '');

      try {
        // Chargify API: POST https://{subdomain}.chargify.com/subscriptions.json
        // Uses HTTP Basic auth with apiKey:X (X is a literal placeholder —
        // Chargify's API key is the only secret needed).
        const apiBase = isLive
          ? `https://${subdomain}.chargify.com`
          : `https://${subdomain}.chargify.com`; // Chargify has no separate sandbox domain
        const auth = Buffer.from(`${apiKey}:X`).toString('base64');
        const res = await fetch(`${apiBase}/subscriptions.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: {
              product_id: productId,
              customer_attributes: {
                first_name: customer?.name?.split(' ')[0] || 'Customer',
                last_name: customer?.name?.split(' ').slice(1).join(' ') || '',
                email: customer?.email || '',
              },
              // chargify handles payment method collection via hosted signup page
              // if no payment profile is provided. We return the hosted URL.
            },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            success: false,
            error: `Chargify subscription creation failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const data = await res.json();
        const subscriptionId = data?.subscription?.id;
        const hostedUrl = data?.subscription?.hosted_signup_url;
        if (formResponseId && subscriptionId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'pending',
              transactionId: String(subscriptionId),
              paymentMethod: 'chargify',
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
            },
          }).catch(() => { /* noop */ });
        }
        return NextResponse.json({
          success: true,
          transactionId: String(subscriptionId || ''),
          subscriptionId: String(subscriptionId || ''),
          checkoutUrl: hostedUrl || null,
          paymentStatus: 'pending',
          gateway: 'chargify',
        });
      } catch (chargifyError: any) {
        console.error('[forms/charge] Chargify error:', chargifyError);
        return NextResponse.json({
          success: false,
          error: 'Chargify subscription creation failed',
          details: chargifyError.message,
        }, { status: 402 });
      }
    }

    // ─── Mollie (European gateway: iDEAL, Bancontact, EPS, Giropay, SEPA) ───
    if (gatewayId === 'mollie') {
      const creds = await resolveFormCredentials(formId, 'mollie');
      if (!creds?.apiKey) {
        return NextResponse.json({
          success: false,
          error: 'No Mollie credentials connected. Add your Mollie API Key in the form inspector or in Dashboard > Settings > Payments.',
          gatewayId,
        }, { status: 503 });
      }
      const apiKey = creds.apiKey as string;
      try {
        // Mollie Payments API: POST https://api.mollie.com/v2/payments
        // Returns { _links: { checkout: { href } } } — redirect URL.
        const res = await fetch('https://api.mollie.com/v2/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: { currency, value: Number(amount).toFixed(2) },
            description: `Form payment - ${formId}`,
            redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/form/${formId}?payment=success`,
            webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/payments/webhook/mollie`,
            metadata: { formId, formResponseId: formResponseId || '', gatewayId },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            success: false,
            error: `Mollie payment creation failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const data = await res.json();
        const checkoutUrl = data?._links?.checkout?.href;
        if (formResponseId && data?.id) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'pending',
              transactionId: data.id,
              paymentMethod: 'mollie',
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
            },
          }).catch(() => { /* noop */ });
        }
        return NextResponse.json({
          success: true,
          transactionId: data?.id || '',
          checkoutUrl,
          paymentStatus: 'pending',
          gateway: 'mollie',
        });
      } catch (mollieError: any) {
        console.error('[forms/charge] Mollie error:', mollieError);
        return NextResponse.json({
          success: false,
          error: 'Mollie payment creation failed',
          details: mollieError.message,
        }, { status: 402 });
      }
    }

    // ─── PayU India (UPI, NetBanking, Cards, Wallets, EMI) ─────────────────
    if (gatewayId === 'payu_india') {
      const creds = await resolveFormCredentials(formId, 'payu_india');
      if (!creds?.merchantKey || !creds?.merchantSalt) {
        return NextResponse.json({
          success: false,
          error: 'No PayU India credentials connected. Add your Merchant Key and Merchant Salt in the form inspector or in Dashboard > Settings > Payments.',
          gatewayId,
        }, { status: 503 });
      }
      const merchantKey = creds.merchantKey as string;
      const merchantSalt = creds.merchantSalt as string;
      const isLive = creds.isLive !== false;
      const txnid = `form_${formId}_${Date.now()}`;
      const productinfo = `Form payment - ${formId}`;

      try {
        // PayU India hash-based redirect flow.
        // The hash is sha512(key|txnid|amount|productinfo|firstname|email|||||||||||salt)
        const firstname = customer?.name?.split(' ')[0] || 'Customer';
        const email = customer?.email || '';
        const hashString = `${merchantKey}|${txnid}|${Number(amount).toFixed(2)}|${productinfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha512').update(hashString).digest('hex');
        const actionUrl = isLive
          ? 'https://secure.payu.in/_payment'
          : 'https://test.payu.in/_payment';

        if (formResponseId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'pending',
              transactionId: txnid,
              paymentMethod: 'payu_india',
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
            },
          }).catch(() => { /* noop */ });
        }

        // Return the redirect parameters — the frontend builds a hidden form
        // and POSTs to PayU's actionUrl.
        return NextResponse.json({
          success: true,
          transactionId: txnid,
          paymentStatus: 'pending',
          gateway: 'payu_india',
          redirect: {
            url: actionUrl,
            method: 'POST',
            params: {
              key: merchantKey,
              txnid,
              amount: Number(amount).toFixed(2),
              productinfo,
              firstname,
              email,
              phone: customer?.phone || '',
              surl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/payments/webhook/payu/success`,
              furl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/payments/webhook/payu/failure`,
              hash,
              udf1: formId,
              udf2: formResponseId || '',
              udf3: gatewayId,
            },
          },
        });
      } catch (payuError: any) {
        console.error('[forms/charge] PayU India error:', payuError);
        return NextResponse.json({
          success: false,
          error: 'PayU India payment initiation failed',
          details: payuError.message,
        }, { status: 402 });
      }
    }

    // ─── GoCardless (Direct Debit: SEPA, BACS, ACH, PAD, BECS) ──────────────
    if (gatewayId === 'gocardless') {
      const creds = await resolveFormCredentials(formId, 'gocardless');
      if (!creds?.accessToken) {
        return NextResponse.json({
          success: false,
          error: 'No GoCardless credentials connected. Add your GoCardless Access Token in the form inspector or in Dashboard > Settings > Payments.',
          gatewayId,
        }, { status: 503 });
      }
      const accessToken = creds.accessToken as string;
      const isLive = creds.isLive !== false;
      const apiBase = isLive
        ? 'https://api.gocardless.com'
        : 'https://api-sandbox.gocardless.com';

      try {
        // GoCardless redirect flow: creates a mandate via hosted page.
        // Step 1: POST /redirect_flows to start the bank authorization flow.
        const res = await fetch(`${apiBase}/redirect_flows`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'GoCardless-Version': '2015-07-06',
            'Idempotency-Key': `${formId}_${Date.now()}`,
          },
          body: JSON.stringify({
            redirect_flows: {
              description: `Form payment mandate - ${formId}`,
              success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/form/${formId}?gocardless=success`,
              metadata: { formId, formResponseId: formResponseId || '', gatewayId },
            },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            success: false,
            error: `GoCardless redirect flow creation failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const data = await res.json();
        const redirectFlowId = data?.redirect_flows?.id;
        const redirectUrl = data?.redirect_flows?.redirect_url;

        if (formResponseId && redirectFlowId) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'pending',
              transactionId: redirectFlowId,
              paymentMethod: 'gocardless',
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
            },
          }).catch(() => { /* noop */ });
        }

        return NextResponse.json({
          success: true,
          transactionId: redirectFlowId || '',
          checkoutUrl: redirectUrl,
          paymentStatus: 'pending',
          gateway: 'gocardless',
        });
      } catch (gocardlessError: any) {
        console.error('[forms/charge] GoCardless error:', gocardlessError);
        return NextResponse.json({
          success: false,
          error: 'GoCardless redirect flow creation failed',
          details: gocardlessError.message,
        }, { status: 402 });
      }
    }

    // ─── Afterpay / Clearpay (BNPL: Pay in 4) ──────────────────────────────
    if (gatewayId === 'afterpay' || gatewayId === 'clearpay') {
      const creds = await resolveFormCredentials(formId, gatewayId);
      if (!creds?.merchantId || !creds?.secretKey) {
        return NextResponse.json({
          success: false,
          error: `No ${gatewayId === 'afterpay' ? 'Afterpay' : 'Clearpay'} credentials connected. Add your Merchant ID and Secret Key in the form inspector or in Dashboard > Settings > Payments.`,
          gatewayId,
        }, { status: 503 });
      }
      const merchantId = creds.merchantId as string;
      const secretKey = creds.secretKey as string;
      const isLive = creds.isLive !== false;
      const apiBase = isLive
        ? (gatewayId === 'afterpay' ? 'https://api.us.afterpay.com/v2' : 'https://api.clearpay.co.uk/v2')
        : (gatewayId === 'afterpay' ? 'https://api-sandbox.us.afterpay.com/v2' : 'https://api-sandbox.clearpay.co.uk/v2');

      try {
        // Afterpay/Clearpay Checkout API: POST /checkouts
        // Returns { token, redirectCheckoutUrl } for redirect flow.
        const auth = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
        const res = await fetch(`${apiBase}/checkouts`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: {
              amount: Number(amount).toFixed(2),
              currency,
            },
            merchantReference: `form_${formId}_${Date.now()}`,
            description: `Form payment - ${formId}`,
            redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/form/${formId}?afterpay=success`,
            metadata: { formId, formResponseId: formResponseId || '', gatewayId },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({
            success: false,
            error: `${gatewayId} checkout creation failed: ${errText}`,
            gatewayId,
          }, { status: 402 });
        }
        const data = await res.json();
        const token = data?.token;
        const checkoutUrl = data?.redirectCheckoutUrl;

        if (formResponseId && token) {
          await db.formResponse.update({
            where: { id: formResponseId },
            data: {
              paymentStatus: 'pending',
              transactionId: token,
              paymentMethod: gatewayId,
              paymentAmount: Number(amount),
              paymentCurrency: currency,
              paymentGatewayId: gatewayId,
            },
          }).catch(() => { /* noop */ });
        }

        return NextResponse.json({
          success: true,
          transactionId: token || '',
          checkoutUrl,
          paymentStatus: 'pending',
          gateway: gatewayId,
        });
      } catch (afterpayError: any) {
        console.error(`[forms/charge] ${gatewayId} error:`, afterpayError);
        return NextResponse.json({
          success: false,
          error: `${gatewayId} checkout creation failed`,
          details: afterpayError.message,
        }, { status: 402 });
      }
    }

    // ─── Other gateways ─────────────────────────────────────────────────────
    return NextResponse.json({
      success: false,
      error: `Gateway '${gatewayId}' is not yet implemented for direct charges. Supported: stripe_* (stripe_elements, stripe_checkout, stripe_ach), paypal_*, razorpay_*, square_payments, authorize_net, echeck_net, chargify, mollie, payu_india, gocardless, afterpay, clearpay.`,
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
