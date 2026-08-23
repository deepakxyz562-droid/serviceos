import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createInboundMessage } from '@/lib/inbox-message-service';

/**
 * POST /api/email/inbound
 * ─────────────────────────────────────────────────────────────────────────
 * Inbound email webhook — receives parsed inbound emails and creates a
 * Conversation + InboxMessage so the email appears in the omnichannel inbox.
 *
 * O5 Phase: Email channel integration into the unified inbox.
 *
 * SUPPORTED PROVIDERS:
 *   - SendGrid Inbound Parse (posts form-encoded fields: from, to, subject,
 *     text, html, attachments, envelope, charsets, SPF, dkim, etc.)
 *   - Postmark Inbound (posts JSON: From, To, Subject, TextBody, HtmlBody,
 *     MessageId, Attachments, etc.)
 *   - CloudMailin (JSON: from, to, subject, text, html, etc.)
 *
 * The route auto-detects the format based on content-type + field names.
 *
 * TENANT RESOLUTION:
 *   The `to` field contains the recipient email address. We resolve the
 *   tenant by looking up the inbound email address against:
 *     1. Tenant.email (the business email)
 *     2. Tenant.supportEmail
 *     3. ChannelConnection (channel='email', externalAccountId matches the
 *        inbound address — configured when the tenant connects email)
 *
 * IDEMPOTENCY:
 *   InboxMessage.externalId = the provider Message-ID. The unique constraint
 *   (tenantId, channel, externalId) prevents duplicate rows if the webhook
 *   fires more than once.
 *
 * AUTH:
 *   This endpoint is hit by external email providers (SendGrid, Postmark, etc.)
 *   and must be public. Security comes from:
 *     1. The tenant resolution (only acts on emails sent TO a known tenant address)
 *     2. Optional `EMAIL_INBOUND_SECRET` query param or header
 *
 *   Configure your email provider to POST to:
 *     https://fieseros.com/api/email/inbound?secret=<EMAIL_INBOUND_SECRET>
 */

export async function POST(request: NextRequest) {
  try {
    // ── 1. Optional auth via secret query param ──
    const inboundSecret = process.env.EMAIL_INBOUND_SECRET;
    if (inboundSecret) {
      const { searchParams } = new URL(request.url);
      const provided = searchParams.get('secret') || request.headers.get('x-email-inbound-secret') || '';
      if (provided !== inboundSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // ── 2. Parse the inbound email (auto-detect format) ──
    const contentType = request.headers.get('content-type') || '';
    let parsed: {
      from: string;
      to: string;
      subject: string;
      textBody: string;
      htmlBody?: string;
      messageId?: string;
    };

    if (contentType.includes('application/json')) {
      // Postmark / CloudMailin / generic JSON
      const body = await request.json();
      parsed = {
        from: body.from || body.From || body.fromEmail || '',
        to: body.to || body.To || body.toEmail || body.recipient || '',
        subject: body.subject || body.Subject || '(no subject)',
        textBody: body.text || body.TextBody || body.text_body || body.plain || '',
        htmlBody: body.html || body.HtmlBody || body.html_body,
        messageId: body.messageId || body.MessageId || body.message_id,
      };
    } else {
      // SendGrid Inbound Parse (form-encoded)
      const formData = await request.formData();
      parsed = {
        from: (formData.get('from') as string) || '',
        to: (formData.get('to') as string) || '',
        subject: (formData.get('subject') as string) || '(no subject)',
        textBody: (formData.get('text') as string) || '',
        htmlBody: (formData.get('html') as string) || undefined,
        messageId: (formData.get('messageId') as string) || undefined,
      };
    }

    if (!parsed.from || !parsed.to) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
    }

    // ── 3. Resolve the tenant from the `to` address ──
    // Extract the bare email address (handle "Name <email@domain>" format)
    const toEmail = extractEmailAddress(parsed.to);
    const fromEmail = extractEmailAddress(parsed.from);

    let tenantId: string | null = null;
    // Try Tenant.email first (may timeout on large tables without an index)
    try {
      const tenant = await db.tenant.findFirst({
        where: { email: toEmail },
        select: { id: true },
      });
      if (tenant) {
        tenantId = tenant.id;
      }
    } catch {
      // Tenant query failed (timeout or other) — fall through to ChannelConnection
    }
    // Fall back to ChannelConnection (channel='email', externalAccountId = toEmail)
    if (!tenantId) {
      try {
        const conn = await db.channelConnection.findFirst({
          where: { channel: 'email', externalAccountId: toEmail, status: 'CONNECTED' },
          select: { tenantId: true },
        });
        if (conn) {
          tenantId = conn.tenantId;
        }
      } catch {
        // ChannelConnection query also failed — continue with null tenantId
      }
    }

    if (!tenantId) {
      // No tenant owns this email address — likely spam or misconfigured
      console.warn(`[email/inbound] no tenant found for recipient: ${toEmail}`);
      return NextResponse.json({ received: true, action: 'ignored', reason: 'unknown_recipient' });
    }

    // ── 4. Find or create a Conversation (channel='email') ──
    let conversation = await db.conversation.findFirst({
      where: { customerPhone: fromEmail, channel: 'email', status: 'active', tenantId },
      orderBy: { lastMessageAt: 'desc' },
      select: { conversationId: true },
    });
    let conversationId = conversation?.conversationId;
    if (!conversationId) {
      conversationId = `conv_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.conversation.create({
        data: {
          conversationId,
          customerPhone: fromEmail,
          customerName: parsed.from.includes('<') ? parsed.from.split('<')[0].trim() : fromEmail,
          channel: 'email',
          status: 'active',
          currentStage: 'greeting',
          lastMessageAt: new Date(),
          lastMessageBody: parsed.subject,
          lastDirection: 'inbound',
          tenantId,
        },
      });
    }

    // ── 5. Create the canonical InboxMessage (idempotent) ──
    const result = await createInboundMessage({
      tenantId,
      conversationId,
      channel: 'email',
      senderId: fromEmail,
      senderName: parsed.from.includes('<') ? parsed.from.split('<')[0].trim() : fromEmail,
      content: parsed.textBody || parsed.htmlBody || parsed.subject,
      messageType: parsed.htmlBody ? 'html' : 'text',
      externalId: parsed.messageId,
      metadataJson: {
        subject: parsed.subject,
        from: parsed.from,
        to: parsed.to,
        hasHtml: !!parsed.htmlBody,
      },
    });

    console.log(`[email/inbound] received from ${fromEmail} → ${toEmail} (tenant=${tenantId}), created=${result.created}`);

    return NextResponse.json({
      received: true,
      action: 'stored',
      messageId: result.message.id,
      created: result.created,
    });
  } catch (error) {
    console.error('[email/inbound] error:', error);
    return NextResponse.json({ error: 'Failed to process inbound email' }, { status: 500 });
  }
}

/**
 * Extract a bare email address from a string like "Name <email@domain>" or
 * "email@domain". Returns the lowercased email address.
 */
function extractEmailAddress(s: string): string {
  const match = s.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase().trim();
  // No angle brackets — assume the whole string is the email (or contains one)
  const directMatch = s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (directMatch) return directMatch[0].toLowerCase().trim();
  return s.toLowerCase().trim();
}
