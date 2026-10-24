import { NextRequest, NextResponse } from 'next/server';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { resolveOrderMessagingConfig } from '@/lib/commerce/order-messaging-config';
import {
  dispatchTransactionalWhatsApp,
  type OrderMessageTemplate,
  buildBosOrderConfirmedTemplate,
  buildBosOrderStatusTemplate,
  buildBosTaxInvoiceTemplate,
  buildBosPaymentReceivedTemplate,
  buildBosKhataReminderTemplate,
  TransactionalOrderPayload,
} from '@/lib/whatsapp-transactional';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let cleanPhone = '';
  let fallbackMessage = '';
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const {
      phone,
      message,
      template,
      templateType,
      templateData,
    } = body as {
      phone?: string;
      message?: string;
      template?: OrderMessageTemplate;
      templateType?:
        | 'bos_order_confirmed'
        | 'order_confirmed'
        | 'bos_order_status_update'
        | 'order_status'
        | 'bos_tax_invoice'
        | 'tax_invoice'
        | 'bos_payment_received'
        | 'payment_received'
        | 'bos_khata_reminder'
        | 'khata_reminder';
      templateData?: Record<string, any>;
    };

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    cleanPhone = phone.replace(/\D/g, '');
    let finalTemplate: OrderMessageTemplate | undefined = template;
    fallbackMessage = message || '';

    // Automatically build approved Meta Utility template if templateType is supplied
    if (templateType && templateData) {
      if (templateType === 'bos_tax_invoice' || templateType === 'tax_invoice') {
        const built = buildBosTaxInvoiceTemplate({
          customerName: templateData.customerName || 'Customer',
          invoiceNumber: templateData.invoiceNumber || 'INV-1001',
          businessName: templateData.businessName || business.name,
          total: Number(templateData.total || 0),
          currency: templateData.currency || business.currency || 'INR',
          paymentStatus: templateData.paymentStatus || 'PAID',
          paymentMethod: templateData.paymentMethod || 'Online',
          invoiceUrl: templateData.invoiceUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.com'}/invoice/${templateData.invoiceNumber}`,
        });
        finalTemplate = built.template;
        if (!fallbackMessage) fallbackMessage = built.fallbackText;
      } else if (templateType === 'bos_order_confirmed' || templateType === 'order_confirmed') {
        const built = buildBosOrderConfirmedTemplate({
          orderId: templateData.orderId || 'ord',
          orderNumber: templateData.orderNumber || '101',
          businessName: templateData.businessName || business.name,
          customerName: templateData.customerName || 'Customer',
          customerPhone: cleanPhone,
          total: Number(templateData.total || 0),
          items: templateData.items || [],
          paymentStatus: templateData.paymentStatus || 'PAID',
          status: templateData.status || 'CONFIRMED',
          currency: templateData.currency || business.currency || 'INR',
          storeSlug: templateData.storeSlug || business.id,
          trackingUrl: templateData.trackingUrl,
        });
        finalTemplate = built.template;
        if (!fallbackMessage) fallbackMessage = built.fallbackText;
      } else if (templateType === 'bos_order_status_update' || templateType === 'order_status') {
        const built = buildBosOrderStatusTemplate(
          {
            orderId: templateData.orderId || 'ord',
            orderNumber: templateData.orderNumber || '101',
            businessName: templateData.businessName || business.name,
            customerName: templateData.customerName || 'Customer',
            customerPhone: cleanPhone,
            total: Number(templateData.total || 0),
            items: templateData.items || [],
            paymentStatus: templateData.paymentStatus || 'PAID',
            status: templateData.status || 'CONFIRMED',
            currency: templateData.currency || business.currency || 'INR',
            storeSlug: templateData.storeSlug || business.id,
            trackingUrl: templateData.trackingUrl,
            deliveryAddress: templateData.deliveryAddress,
            deliveryType: templateData.deliveryType,
          },
          templateData.newStatus || 'CONFIRMED'
        );
        finalTemplate = built.template;
        if (!fallbackMessage) fallbackMessage = built.fallbackText;
      } else if (templateType === 'bos_payment_received' || templateType === 'payment_received') {
        const built = buildBosPaymentReceivedTemplate({
          customerName: templateData.customerName || 'Customer',
          receiptNumber: templateData.receiptNumber || 'REC-101',
          businessName: templateData.businessName || business.name,
          amountReceived: Number(templateData.amountReceived || 0),
          currency: templateData.currency || business.currency || 'INR',
          paymentMode: templateData.paymentMode || 'UPI',
          remainingBalance: templateData.remainingBalance !== undefined ? Number(templateData.remainingBalance) : undefined,
          receiptUrl: templateData.receiptUrl,
        });
        finalTemplate = built.template;
        if (!fallbackMessage) fallbackMessage = built.fallbackText;
      } else if (templateType === 'bos_khata_reminder' || templateType === 'khata_reminder') {
        const built = buildBosKhataReminderTemplate({
          customerName: templateData.customerName || 'Customer',
          businessName: templateData.businessName || business.name,
          dueAmount: Number(templateData.dueAmount || 0),
          currency: templateData.currency || business.currency || 'INR',
          dueDateOrDays: templateData.dueDateOrDays || 'Due Today',
          paymentUrl: templateData.paymentUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.com'}/khata`,
        });
        finalTemplate = built.template;
        if (!fallbackMessage) fallbackMessage = built.fallbackText;
      }
    }

    if (!fallbackMessage && !finalTemplate) {
      return NextResponse.json({ error: 'Message body or template is required' }, { status: 400 });
    }

    // Resolve active Meta Cloud API provider from Superadmin / tenant
    const provider = await resolveOrderMessagingConfig(business.tenantId || null);

    let result = await dispatchTransactionalWhatsApp(
      phone,
      fallbackMessage,
      finalTemplate,
      provider
    );

    // If template send failed because new template is still in Meta review,
    // retry immediately with the user's approved 'invoice_payment_link' template!
    if (
      !result.success &&
      finalTemplate &&
      (finalTemplate.name === 'bos_tax_invoice' || templateType === 'bos_tax_invoice' || templateType === 'tax_invoice')
    ) {
      const approvedFallbackTemplate: OrderMessageTemplate = {
        name: 'invoice_payment_link',
        language: 'en_US',
        parameters: [
          templateData?.customerName || 'Customer',
          templateData?.invoiceNumber || 'INV-1001',
          templateData?.businessName || business.name,
          new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: templateData?.currency || business.currency || 'INR',
          }).format(Number(templateData?.total || 0)),
          templateData?.paymentStatus === 'PAID' ? 'PAID' : (templateData?.dueDate || 'Immediate'),
          templateData?.invoiceUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.com'}/invoice/${templateData?.invoiceNumber}`,
        ],
      };
      const retryResult = await dispatchTransactionalWhatsApp(
        phone,
        fallbackMessage,
        approvedFallbackTemplate,
        provider
      );
      if (retryResult.success) {
        result = retryResult;
        finalTemplate = approvedFallbackTemplate;
      }
    }

    if (!result.success) {
      const waDeepLink = `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(fallbackMessage)}`;
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to dispatch WhatsApp message via Meta Cloud API',
          method: result.method,
          fallbackUrl: waDeepLink,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      method: result.method,
      sender: provider.source,
      phoneNumberId: provider.phoneNumberId,
      templateUsed: finalTemplate?.name,
    });
  } catch (error: any) {
    const waDeepLink = cleanPhone ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(fallbackMessage)}` : undefined;
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'ORDER_WHATSAPP_PROVIDER_UNAVAILABLE') {
      return NextResponse.json(
        {
          error: 'Meta WhatsApp provider is not active or credentials are missing',
          fallbackUrl: waDeepLink,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Internal server error dispatching WhatsApp message', fallbackUrl: waDeepLink },
      { status: 500 }
    );
  }
}
