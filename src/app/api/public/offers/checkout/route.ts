import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCreemConfig } from '@/lib/creem';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      offerId,
      offerTitle,
      offerType,
      price = 0,
      currency = 'INR',
      customerName,
      customerEmail,
      customerPhone,
      downloadUrl,
      eventSlug,
      paymentMethod = 'card',
    } = body;

    if (!tenantId || !customerEmail) {
      return NextResponse.json(
        { error: 'tenantId and customerEmail are required' },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, email: true, currency: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // 1. Create or update Customer in CRM
    let customer = await db.customer.findFirst({
      where: { tenantId, email: customerEmail },
    });

    if (!customer) {
      customer = await db.customer.create({
        data: {
          tenantId,
          name: customerName || customerEmail.split('@')[0],
          email: customerEmail,
          phone: customerPhone || null,
          source: 'creator_profile_offer',
        },
      });
    }

    // 2. Create Lead in CRM for attribution & pipeline tracking
    const lead = await db.lead.create({
      data: {
        tenantId,
        customerId: customer.id,
        name: customerName || customer.name,
        email: customerEmail,
        phone: customerPhone || customer.phone,
        source: 'creator_offer',
        status: price > 0 ? 'contacted' : 'qualified',
        value: Number(price) || 0,
        notes: `Purchased Offer: ${offerTitle} (${currency} ${price}) [Type: ${offerType || 'offer'}]`,
      },
    });

    // 3. Log Timeline Event
    try {
      await db.timelineEvent.create({
        data: {
          tenantId,
          customerId: customer.id,
          type: 'offer_purchase',
          title: `Booked/Purchased: ${offerTitle}`,
          description: `${customerName || customerEmail} selected ${offerTitle} for ${currency} ${price}.`,
          metadata: JSON.stringify({
            offerId,
            offerTitle,
            offerType,
            price,
            currency,
            leadId: lead.id,
          }),
        },
      });
    } catch {
      // Timeline logging is non-blocking
    }

    // 4. Handle Free Offers
    if (Number(price) === 0) {
      return NextResponse.json({
        success: true,
        isFree: true,
        message: 'Offer claimed successfully',
        downloadUrl: downloadUrl || null,
        bookingUrl: eventSlug ? `/book/${tenant.slug}/${eventSlug}?name=${encodeURIComponent(customerName || '')}&email=${encodeURIComponent(customerEmail)}` : null,
      });
    }

    // 5. Handle Paid Offers via Creem or Multi-Currency Gateway
    const creemConfig = await getCreemConfig();
    let checkoutUrl = '';

    if (paymentMethod === 'creem' && creemConfig) {
      // Use Creem hosted checkout if configured
      checkoutUrl = `https://checkout.creem.io/pay?amount=${Math.round(price * 100)}&currency=${currency === 'INR' ? 'USD' : currency}&product_name=${encodeURIComponent(offerTitle)}&email=${encodeURIComponent(customerEmail)}&customer_id=${customer.id}`;
    } else {
      // Direct high-fidelity simulated checkout / gateway token for local INR & card processing
      checkoutUrl = `/pay/${lead.id}?amount=${price}&currency=${currency}&title=${encodeURIComponent(offerTitle)}&email=${encodeURIComponent(customerEmail)}`;
    }

    return NextResponse.json({
      success: true,
      isFree: false,
      checkoutUrl,
      orderId: `ord_${Date.now()}`,
      leadId: lead.id,
      downloadUrl: downloadUrl || null,
      bookingUrl: eventSlug ? `/book/${tenant.slug}/${eventSlug}?name=${encodeURIComponent(customerName || '')}&email=${encodeURIComponent(customerEmail)}` : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process offer checkout' },
      { status: 500 }
    );
  }
}
