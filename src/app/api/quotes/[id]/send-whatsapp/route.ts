import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendJobNotification } from '@/lib/whatsapp-notifications';
import { sendEmail } from '@/lib/email-send';
import { issueCustomerMagicLink } from '@/lib/customer-magic-link';

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

    // ── Issue a customer magic-link URL for the quote (deep-link to /quotes/:id) ──
    // Wrapped in try/catch — the WhatsApp send should still succeed even if
    // link generation fails (e.g. quote without a customer record).
    let magicUrl: string | null = null
    if (quote.customerId) {
      try {
        const magicLink = await issueCustomerMagicLink({
          customerId: quote.customerId,
          redirect: `/quotes/${quote.id}`,
        })
        magicUrl = magicLink.url
      } catch (err) {
        console.warn(
          `[send-whatsapp/quote] magic-link generation failed for quote ${quote.id}:`,
          err
        )
      }
    }

    // Append a plain-text link line so the customer can tap into their quote
    // on the portal. WhatsApp doesn't render HTML buttons, so we keep it text.
    if (magicUrl) {
      messageLines.push('');
      messageLines.push(`View your quote: ${magicUrl}`);
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

    // ── Parallel email branch: if the customer has an email AND a magic link
    // was generated, send a branded HTML email with a "View Quote" button so
    // customers who prefer email (or who don't have WhatsApp installed) can
    // still open the quote on the portal. Wrapped in try/catch — a failure
    // here must NOT fail the WhatsApp send above.
    let emailResult: { success: boolean; simulated?: boolean; error?: string } | null = null
    if (quote.customer?.email && magicUrl) {
      try {
        const viewQuoteButton = `<div style="margin: 24px 0;"><a href="${magicUrl}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Quote</a></div>`
        const emailHtml = [
          `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px">`,
          `<h2 style="color:#0f172a;">📋 Your Quote: ${quote.title}</h2>`,
          `<p>Hi ${customerName},</p>`,
          `<p>Please review your quote from <strong>${quote.tenant?.name || 'ServiceOS'}</strong>.</p>`,
          viewQuoteButton,
          `<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">`,
          `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Total</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;color:#059669;">$${Number(quote.total).toFixed(2)}</td></tr>`,
          quote.validUntil ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Valid Until</td><td style="padding:8px;border:1px solid #e5e7eb;">${new Date(quote.validUntil).toLocaleDateString()}</td></tr>` : '',
          `</table>`,
          quote.notes ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${quote.notes}</p>` : '',
          `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
          `<p style="font-size:12px;color:#9ca3af;">— Sent from ${quote.tenant?.name || 'ServiceOS'}</p>`,
          `</div>`,
        ].filter(Boolean).join('\n')
        const r = await sendEmail({
          to: quote.customer.email,
          subject: `Your quote from ${quote.tenant?.name || 'ServiceOS'}: ${quote.title}`,
          html: emailHtml,
          text: `Your quote "${quote.title}" for $${Number(quote.total).toFixed(2)} is ready.\n\nView your quote: ${magicUrl}\n\n— ${quote.tenant?.name || 'ServiceOS'}`,
          usageType: 'transactional',
          tenantId: quote.tenantId || undefined,
        })
        emailResult = { success: !!r.success, simulated: r.simulated, error: r.error }
      } catch (err) {
        console.error('[send-whatsapp/quote] parallel email send failed:', err)
        emailResult = { success: false, error: String(err) }
      }
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
      message: `Quote sent via WhatsApp to ${customerName}${emailResult?.success ? ' and email' : ''}`,
      quote: updated,
      whatsapp: whatsappResult,
      email: emailResult,
    });
  } catch (error) {
    console.error('Failed to send quote via WhatsApp:', error);
    return NextResponse.json({ error: 'Failed to send quote via WhatsApp' }, { status: 500 });
  }
}
