import { NextRequest, NextResponse } from 'next/server';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { resolveOrderMessagingConfig } from '@/lib/commerce/order-messaging-config';
import { dispatchTransactionalWhatsApp, type OrderMessageTemplate } from '@/lib/whatsapp-transactional';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { phone, message, template } = body as {
      phone?: string;
      message?: string;
      template?: OrderMessageTemplate;
    };

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    if (!message && !template) {
      return NextResponse.json({ error: 'Message body or template is required' }, { status: 400 });
    }

    // Resolve active Meta Cloud API provider from Superadmin / tenant
    const provider = await resolveOrderMessagingConfig(business.tenantId || null);

    const result = await dispatchTransactionalWhatsApp(
      phone,
      message || '',
      template,
      provider
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to dispatch WhatsApp message via Meta Cloud API',
          method: result.method,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      method: result.method,
      sender: provider.source,
      phoneNumberId: provider.phoneNumberId,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'ORDER_WHATSAPP_PROVIDER_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'Meta WhatsApp provider is not active or credentials are missing' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Internal server error dispatching WhatsApp message' },
      { status: 500 }
    );
  }
}
