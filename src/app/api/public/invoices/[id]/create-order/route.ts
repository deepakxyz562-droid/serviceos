import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parsePaymentSettings } from '@/app/api/settings/payment-integrations/route';

/**
 * POST /api/public/invoices/[id]/create-order
 *
 * Creates an order / payment intent with the provider using the Tenant's own credentials.
 * Supports: 'razorpay' | 'stripe'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { provider?: string };
    const provider = body.provider || 'razorpay';

    const invoice = await db.invoice.findFirst({
      where: { OR: [{ id }, { number: id }] },
      select: {
        id: true,
        number: true,
        total: true,
        currency: true,
        status: true,
        tenantId: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: invoice.tenantId || '' },
      select: { settingsJson: true, name: true },
    });

    const settings = parsePaymentSettings(tenant?.settingsJson);

    // ── Razorpay Order Creation ────────────────────────────────────────────
    if (provider === 'razorpay') {
      if (!settings.razorpay?.keyId || !settings.razorpay?.keySecret) {
        return NextResponse.json({ error: 'Razorpay is not configured for this provider' }, { status: 400 });
      }

      // Convert total amount to paise (1 INR = 100 paise)
      const amountPaise = Math.round((invoice.total || 0) * 100);
      const auth = Buffer.from(`${settings.razorpay.keyId}:${settings.razorpay.keySecret}`).toString('base64');

      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: invoice.currency || 'INR',
          receipt: invoice.number || invoice.id,
          notes: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            tenantId: invoice.tenantId,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err.error?.description || 'Failed to create Razorpay order' }, { status: 400 });
      }

      const orderData = await res.json();
      return NextResponse.json({
        provider: 'razorpay',
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: settings.razorpay.keyId,
        businessName: tenant?.name || 'Service Provider',
      });
    }

    // ── Stripe PaymentIntent Creation ──────────────────────────────────────
    if (provider === 'stripe') {
      if (!settings.stripe?.secretKey) {
        return NextResponse.json({ error: 'Stripe is not configured for this provider' }, { status: 400 });
      }

      // Amount in smallest currency unit (cents/pence)
      const amountCents = Math.round((invoice.total || 0) * 100);
      const currency = (invoice.currency || 'usd').toLowerCase();

      const params = new URLSearchParams();
      params.append('amount', amountCents.toString());
      params.append('currency', currency);
      params.append('metadata[invoiceId]', invoice.id);
      params.append('metadata[invoiceNumber]', invoice.number || '');
      params.append('metadata[tenantId]', invoice.tenantId || '');

      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${settings.stripe.secretKey}`,
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err.error?.message || 'Failed to create Stripe payment intent' }, { status: 400 });
      }

      const piData = await res.json();
      return NextResponse.json({
        provider: 'stripe',
        clientSecret: piData.client_secret,
        publishableKey: settings.stripe.publishableKey,
      });
    }

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
  }
}
