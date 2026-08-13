import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireCrmTenant } from '@/lib/require-crm-tenant';
import { sendEmail } from '@/lib/email-send';
import { issueCustomerMagicLink } from '@/lib/customer-magic-link';
import { EventBus } from '@/lib/event-bus';

// POST /api/quotes/[id]/send-email
//
// Sends a quote to the customer via email ONLY (no SMS, no WhatsApp).
// Mirrors the invoice send-email flow: resolves the recipient from the
// linked Customer, builds a branded HTML email with a "View Quote"
// magic-link button, stamps emailSent/emailSentAt on the Quote row, and
// flips status draft->sent.
//
// Returns real success/failure - does NOT fake success when no email
// provider is configured (the email-send layer surfaces a clear error).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Enforce tenant scoping - a user can only send quotes in their own tenant.
    const guard = await requireCrmTenant(req);
    if (guard) return guard;

    const { id } = await params;
    const quote = await db.quote.findUnique({
      where: { id },
      include: { customer: true, tenant: true },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    // Cross-tenant guard - a user from tenant A cannot send tenant B's quote.
    if (quote.tenantId && user.tenantId && quote.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden - quote does not belong to your tenant' }, { status: 403 });
    }

    const customerEmail = quote.customer?.email || '';
    const customerName = quote.customer?.name || 'Customer';

    if (!customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer has no email address. Add an email to the customer record before sending the quote by email.',
        },
        { status: 400 }
      );
    }

    // Issue a customer magic-link URL for the quote (deep-link to /quotes/:id).
    // Best-effort - if link generation fails, we still send the email but
    // without the "View Quote" button.
    let magicUrl: string | null = null;
    if (quote.customerId) {
      try {
        const magicLink = await issueCustomerMagicLink({
          customerId: quote.customerId,
          redirect: `/quotes/${quote.id}`,
        });
        magicUrl = magicLink.url;
      } catch (err) {
        console.warn(
          `[send-email/quote] magic-link generation failed for quote ${quote.id}:`,
          err
        );
      }
    }

    // Build the email body - parse line items so the email shows a real
    // breakdown, not just a total.
    let lineItemsHtml = '';
    try {
      const items = JSON.parse(quote.itemsJson || '[]') as Array<{
        name?: string;
        description?: string;
        quantity?: number;
        unitPrice?: number;
        price?: number;
        amount?: number;
      }>;
      if (Array.isArray(items) && items.length > 0) {
        const rows = items.map((it) => {
          const desc = it.name || it.description || 'Item';
          const qty = it.quantity ?? 1;
          const unitPrice = it.unitPrice ?? it.price ?? it.amount ?? 0;
          const lineTotal = qty * unitPrice;
          return `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${desc}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${qty}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${unitPrice.toFixed(2)}</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">$${lineTotal.toFixed(2)}</td></tr>`;
        }).join('');
        lineItemsHtml = `
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Item</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">Qty</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Price</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`;
      }
    } catch {
      // itemsJson parsing failed - skip the line-items table.
    }

    const viewQuoteButton = magicUrl
      ? `<div style="margin: 24px 0;"><a href="${magicUrl}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Quote</a></div>`
      : '';

    const summaryRows = [
      quote.subtotal ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Subtotal</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${Number(quote.subtotal).toFixed(2)}</td></tr>` : '',
      quote.discount ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Discount</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">-$${Number(quote.discount).toFixed(2)}</td></tr>` : '',
      quote.tax ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Tax</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">$${Number(quote.tax).toFixed(2)}</td></tr>` : '',
      `<tr><td style="padding:8px;background:#f9fafb;font-weight:700;border:1px solid #e5e7eb;">Total</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:#059669;">$${Number(quote.total).toFixed(2)}</td></tr>`,
      quote.validUntil ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Valid Until</td><td style="padding:8px;border:1px solid #e5e7eb;">${new Date(quote.validUntil).toLocaleDateString()}</td></tr>` : '',
    ].filter(Boolean).join('');

    const summaryTable = summaryRows
      ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">${summaryRows}</table>`
      : '';

    const emailHtml = [
      `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px">`,
      `<h2 style="color:#0f172a;">Your Quote: ${quote.title}</h2>`,
      `<p>Hi ${customerName},</p>`,
      `<p>Please review your quote from <strong>${quote.tenant?.name || 'Fieseros'}</strong>.</p>`,
      viewQuoteButton,
      lineItemsHtml,
      summaryTable,
      quote.description ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${quote.description}</p>` : '',
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
      `<p style="font-size:12px;color:#9ca3af;">- Sent from ${quote.tenant?.name || 'Fieseros'}</p>`,
      `</div>`,
    ].filter(Boolean).join('\n');

    const textBody = [
      `Your quote "${quote.title}" from ${quote.tenant?.name || 'Fieseros'} is ready.`,
      `Total: $${Number(quote.total).toFixed(2)}`,
      quote.validUntil ? `Valid until: ${new Date(quote.validUntil).toLocaleDateString()}` : '',
      magicUrl ? `View your quote: ${magicUrl}` : '',
      '',
      `- ${quote.tenant?.name || 'Fieseros'}`,
    ].filter(Boolean).join('\n');

    // Send the email. sendEmail returns { success: false, error:
    // 'NO_EMAIL_PROVIDER_CONFIGURED' } when no provider is set up - we
    // surface that to the UI as a real error instead of faking success.
    const emailResult = await sendEmail({
      to: customerEmail,
      subject: `Your quote from ${quote.tenant?.name || 'Fieseros'}: ${quote.title}`,
      html: emailHtml,
      text: textBody,
      usageType: 'transactional',
      tenantId: quote.tenantId || undefined,
    });

    if (!emailResult.success) {
      // Don't flip status - the quote stays in 'draft' so the user knows
      // the send failed and can retry after fixing the provider config.
      return NextResponse.json({
        success: false,
        error: emailResult.error || 'Email send failed',
        email: { success: false, error: emailResult.error },
      }, { status: 200 }); // 200 so the UI can read the structured error
    }

    // Stamp emailSent + flip status draft->sent
    const wasDraft = quote.status === 'draft';
    const updated = await db.quote.update({
      where: { id },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
        status: wasDraft ? 'sent' : quote.status,
      },
    });

    // Emit quote.sent event (only on draft -> sent transition). Best-effort.
    if (wasDraft) {
      try {
        await EventBus.emit(
          'quote.sent',
          {
            quoteId: updated.id,
            customerId: updated.customerId || null,
            tenantId: updated.tenantId || null,
            fromStatus: 'draft',
            toStatus: 'sent',
            resourceType: 'quote',
            resourceId: updated.id,
          },
          { tenantId: updated.tenantId || undefined }
        );
      } catch (eventErr) {
        console.error('[Quotes send-email] quote.sent event failed:', eventErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Quote sent via email to ${customerEmail}`,
      quote: updated,
      email: { success: true, messageId: emailResult.messageId },
    });
  } catch (error) {
    console.error('Failed to send quote via email:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to send quote via email', details: message }, { status: 500 });
  }
}
