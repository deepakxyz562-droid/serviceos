import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-send';
import { BRAND } from '@/lib/brand';
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/contact-us
 *
 * Public contact form submission endpoint. Sends the visitor's message to the
 * appropriate Fieseros inbox based on the selected subject, and sends a
 * confirmation auto-reply to the visitor.
 *
 * Routing (subject → inbox):
 *   - "Sales & Pricing" / "Partnership"         → sales@fieseros.com
 *   - "Technical Support" / "Integrations"       → support@fieseros.com
 *   - "Billing" / "General Inquiry" / "Other"    → admin@fieseros.com
 *
 * Auth: none (public form). Rate-limited per IP: 5 submissions / 15 minutes
 * to prevent spam/abuse. No tenantId is passed to sendEmail so the platform
 * default SMTP provider is used (configured in SuperAdmin → Email Providers).
 *
 * The visitor's email is the reply-to on the internal notification email so
 * the sales/support/admin team can hit "reply" and respond directly.
 */

// 5 submissions per 15 minutes per IP — generous enough for legit users,
// tight enough to block spam bots hammering the form.
const contactLimiter = new RateLimiter(15 * 60 * 1000, 5);

// Map form subjects to internal inbox addresses. Kept in sync with the
// subjectOptions in contact-form.tsx.
function resolveInbox(subject: string): string {
  switch (subject) {
    case 'Sales & Pricing':
    case 'Partnership':
      return BRAND.emails.sales;
    case 'Technical Support':
    case 'Integrations':
      return BRAND.emails.support;
    case 'Billing':
    case 'General Inquiry':
    case 'Data & Privacy':
    case 'Other':
    default:
      return BRAND.emails.admin;
  }
}

export async function POST(request: NextRequest) {
  // ── Rate limit (per IP) ──────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = contactLimiter.check(ip);
  if (!rl.success) {
    return rateLimitResponse(rl.resetAtMs);
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const company = String(body.company || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();

    // ── Validation ──────────────────────────────────────────────────────
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required.' },
        { status: 400 },
      );
    }
    // Basic email format check (RFC-simple).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }
    // Length guards (prevent abuse + DB bloat on the ActivityLog side).
    if (name.length > 120 || company.length > 200 || subject.length > 100 || message.length > 5000) {
      return NextResponse.json(
        { error: 'One or more fields exceed the maximum length.' },
        { status: 400 },
      );
    }

    const inbox = resolveInbox(subject);
    const now = new Date().toISOString();
    const submissionId = `contact-${now.replace(/[-:]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

    // ── 1. Internal notification email → sales/support/admin inbox ──────
    // The visitor's email is set as reply-to so the team can hit "reply".
    const internalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <div style="background: linear-gradient(135deg, #10b981, #0d9488); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Contact Form Submission</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">${escapeHtml(subject)}</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; font-weight: 600; width: 120px; color: #64748b;">Name</td><td style="padding: 8px 0;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #0d9488;">${escapeHtml(email)}</a></td></tr>
            ${company ? `<tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Company</td><td style="padding: 8px 0;">${escapeHtml(company)}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Subject</td><td style="padding: 8px 0;">${escapeHtml(subject)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Submitted</td><td style="padding: 8px 0;">${now} (UTC)</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">IP</td><td style="padding: 8px 0;">${escapeHtml(ip)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Ref</td><td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${escapeHtml(submissionId)}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-weight: 600; color: #64748b; font-size: 13px; margin: 0 0 8px;">Message</p>
          <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</div>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">
          Reply directly to this email to respond to ${escapeHtml(name)}.
        </p>
      </div>
    `;
    const internalText =
      `New Contact Form Submission\n\n` +
      `Subject: ${subject}\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      (company ? `Company: ${company}\n` : '') +
      `Submitted: ${now} (UTC)\n` +
      `IP: ${ip}\n` +
      `Ref: ${submissionId}\n\n` +
      `Message:\n${message}\n\n` +
      `Reply directly to this email to respond to ${name}.`;

    const internalResult = await sendEmail({
      to: inbox,
      subject: `[Contact Form] ${subject} — ${name}`,
      html: internalHtml,
      text: internalText,
      usageType: 'transactional',
      // No tenantId — uses the platform default SMTP provider.
    });

    // ── 2. Auto-reply confirmation → visitor's email ───────────────────
    // Best-effort: never blocks the response if this fails. The internal
    // notification is the important one; the auto-reply is a courtesy.
    if (internalResult.success) {
      const firstName = name.split(' ')[0] || name;
      const autoReplyHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
          <div style="background: linear-gradient(135deg, #10b981, #0d9488); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Thanks for reaching out, ${escapeHtml(firstName)}!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">We've received your message.</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
              Hi ${escapeHtml(firstName)},
            </p>
            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
              Thank you for contacting Fieseros. This is a confirmation that we've
              received your message regarding <strong>${escapeHtml(subject)}</strong>.
              Our team typically responds within 24 hours during business hours.
            </p>
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #64748b;">Your message:</p>
              <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #475569;">${escapeHtml(message.slice(0, 500))}${message.length > 500 ? '…' : ''}</div>
            </div>
            <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.6;">
              In the meantime, you can reply directly to this email if you'd like
              to add more details to your request.
            </p>
            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6;">
              Best regards,<br />
              The Fieseros Team
            </p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">
            ${escapeHtml(BRAND.url)} · Reference: ${escapeHtml(submissionId)}
          </p>
        </div>
      `;
      const autoReplyText =
        `Hi ${firstName},\n\n` +
        `Thank you for contacting Fieseros. This is a confirmation that we've\n` +
        `received your message regarding "${subject}".\n\n` +
        `Our team typically responds within 24 hours during business hours.\n\n` +
        `Reference: ${submissionId}\n\n` +
        `Best regards,\nThe Fieseros Team\n${BRAND.url}`;

      try {
        await sendEmail({
          to: email,
          subject: `We've received your message — Fieseros`,
          html: autoReplyHtml,
          text: autoReplyText,
          usageType: 'transactional',
        });
      } catch (autoReplyErr) {
        // Non-fatal — the internal notification already succeeded. Log + move on.
        console.error('[contact-us] Auto-reply send failed:', autoReplyErr);
      }
    }

    // ── Response ────────────────────────────────────────────────────────
    if (!internalResult.success) {
      console.error('[contact-us] Internal notification send failed:', internalResult.error);
      return NextResponse.json(
        { error: `Unable to send your message right now. Please email us directly at ${inbox}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: submissionId,
      routedTo: inbox,
    });
  } catch (error) {
    console.error('[contact-us] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form. Please try again.' },
      { status: 500 },
    );
  }
}

/** Escape HTML to prevent injection in the email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
