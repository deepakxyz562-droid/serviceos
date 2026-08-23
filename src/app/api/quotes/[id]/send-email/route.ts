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
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td style="background:#0f766e;border-radius:10px;padding:13px 28px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              <a href="${magicUrl}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;letter-spacing:-0.01em;">
                Review & Approve Quote →
              </a>
            </td>
          </tr>
        </table>`
      : '';

    const summaryRows = [
      quote.subtotal ? `<tr><td style="padding:10px 14px;color:#64748b;font-weight:500;">Subtotal</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:#0f172a;">$${Number(quote.subtotal).toFixed(2)}</td></tr>` : '',
      quote.discount ? `<tr><td style="padding:10px 14px;color:#64748b;font-weight:500;">Discount</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:#dc2626;">-$${Number(quote.discount).toFixed(2)}</td></tr>` : '',
      quote.tax ? `<tr><td style="padding:10px 14px;color:#64748b;font-weight:500;">Tax</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:#0f172a;">$${Number(quote.tax).toFixed(2)}</td></tr>` : '',
      `<tr><td style="padding:12px 14px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;font-size:15px;">Total Quote Value</td><td style="padding:12px 14px;text-align:right;font-weight:700;color:#0f766e;border-top:1px solid #e2e8f0;font-size:18px;">$${Number(quote.total).toFixed(2)}</td></tr>`,
      quote.validUntil ? `<tr><td style="padding:8px 14px;color:#64748b;font-size:13px;">Valid Until</td><td style="padding:8px 14px;text-align:right;color:#64748b;font-size:13px;">${new Date(quote.validUntil).toLocaleDateString()}</td></tr>` : '',
    ].filter(Boolean).join('');

    const summaryTable = summaryRows
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;">${summaryRows}</table>`
      : '';

    const businessNameStr = quote.tenant?.name || 'Fieseros';

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote from ${businessNameStr}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:0.08em;">${businessNameStr}</p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">Quote: ${quote.title}</h1>
              <p style="margin:0;font-size:14px;color:#64748b;">Prepared for <strong>${customerName}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 16px;">Hi ${customerName},</p>
              <p style="margin:0 0 20px;">Your quote from <strong>${businessNameStr}</strong> is ready for your review.</p>
              
              ${summaryTable}
              ${viewQuoteButton}
              ${lineItemsHtml}
              ${quote.description ? `<div style="background:#f8fafc;border-left:4px solid #0f766e;padding:14px 18px;margin-top:20px;border-radius:4px;font-size:14px;color:#475569;"><strong>Notes / Scope:</strong><br />${quote.description}</div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center;">
              Sent by <strong style="color:#64748b;">${businessNameStr}</strong> • Powered by <a href="https://fieseros.com" style="color:#0f766e;text-decoration:none;font-weight:600">Fieseros</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
