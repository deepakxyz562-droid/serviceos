import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      offerId,
      question,
      customerName,
      customerEmail,
      customerPhone,
      price = 199,
      currency = 'INR',
    } = body;

    if (!tenantId || !customerEmail || !question?.trim()) {
      return NextResponse.json(
        { error: 'tenantId, customerEmail, and question are required' },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // 1. Create or find Customer in CRM
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
          source: 'ask_a_question',
        },
      });
    }

    // 2. Create Lead / Inquiry
    const lead = await db.lead.create({
      data: {
        tenantId,
        customerId: customer.id,
        name: customerName || customer.name,
        email: customerEmail,
        phone: customerPhone || customer.phone,
        source: 'ask_a_question',
        status: 'new',
        value: Number(price) || 0,
        notes: `[Ask a Question - Priority Response]: "${question}"`,
      },
    });

    // 3. Log timeline event
    try {
      await db.timelineEvent.create({
        data: {
          tenantId,
          customerId: customer.id,
          type: 'question_asked',
          title: 'Submitted Paid Question',
          description: `Question: "${question}" (Turnaround: 24h, Fee: ${currency} ${price})`,
          metadata: JSON.stringify({
            offerId,
            question,
            price,
            currency,
            leadId: lead.id,
          }),
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Your question was submitted successfully! The creator will review and reply within 24 hours.',
      inquiryId: lead.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit question' },
      { status: 500 }
    );
  }
}
