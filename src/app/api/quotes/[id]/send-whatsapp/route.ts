import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendJobNotification } from '@/lib/whatsapp-notifications';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await db.quote.findUnique({
      where: { id },
      include: { customer: true, tenant: true },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Compose the WhatsApp message with quote details
    const customerName = quote.customer?.name || quote.customerName || 'Customer';
    const customerPhone = quote.customer?.phone || quote.customerPhone || '';

    if (!customerPhone) {
      return NextResponse.json(
        { error: 'Customer phone number not available. Cannot send WhatsApp message.' },
        { status: 400 }
      );
    }

    // Build the quote message
    const messageLines = [
      `📋 *Quote: ${quote.title}*`,
      '',
      `👤 Customer: ${customerName}`,
    ];

    // Add items from lineItems if available
    try {
      const lineItems = JSON.parse(quote.lineItemsJson || '[]');
      if (Array.isArray(lineItems) && lineItems.length > 0) {
        messageLines.push('');
        messageLines.push('📝 *Items:*');
        lineItems.forEach((item: { description?: string; name?: string; quantity?: number; unitPrice?: number; amount?: number }) => {
          const desc = item.description || item.name || 'Item';
          const qty = item.quantity || 1;
          const price = item.unitPrice || item.amount || 0;
          messageLines.push(`  • ${desc} x${qty} — $${price.toFixed(2)}`);
        });
      }
    } catch {
      // lineItems parsing failed, skip
    }

    messageLines.push('');
    if (quote.subtotal) messageLines.push(`💰 Subtotal: $${Number(quote.subtotal).toFixed(2)}`);
    if (quote.discount) messageLines.push(`🏷️ Discount: $${Number(quote.discount).toFixed(2)}`);
    if (quote.tax) messageLines.push(`📊 Tax: $${Number(quote.tax).toFixed(2)}`);
    messageLines.push(`💳 *Total: $${Number(quote.total).toFixed(2)}*`);

    if (quote.validUntil) {
      messageLines.push(`📅 Valid until: ${new Date(quote.validUntil).toLocaleDateString()}`);
    }

    if (quote.notes) {
      messageLines.push(`📝 Notes: ${quote.notes}`);
    }

    messageLines.push('');
    messageLines.push('_Powered by ServiceOS_');

    const message = messageLines.join('\n');

    // Send the WhatsApp message to the customer
    let whatsappResult: Record<string, unknown> = { success: false, error: 'No send method available' };

    try {
      await sendJobNotification({
        to: customerPhone,
        message,
        recipientName: customerName,
        recipientRole: 'customer',
        subject: `Quote: ${quote.title}`,
        tenantId: quote.tenantId || undefined,
      });
      whatsappResult = { success: true, to: customerPhone };
    } catch (sendErr) {
      console.error('WhatsApp send failed for quote:', sendErr);
      whatsappResult = { success: false, error: String(sendErr) };
    }

    // Mark as sent via WhatsApp
    const updated = await db.quote.update({
      where: { id },
      data: {
        whatsappSent: true,
        whatsappSentAt: new Date(),
        status: quote.status === 'draft' ? 'sent' : quote.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Quote sent via WhatsApp to ${customerName}`,
      quote: updated,
      whatsapp: whatsappResult,
    });
  } catch (error) {
    console.error('Failed to send quote via WhatsApp:', error);
    return NextResponse.json({ error: 'Failed to send quote via WhatsApp' }, { status: 500 });
  }
}
