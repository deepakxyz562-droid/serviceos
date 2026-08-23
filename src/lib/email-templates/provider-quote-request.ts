/**
 * Provider Quote Request Email Template
 * =======================================
 *
 * Sent to an UNCLAIMED marketplace provider when a customer submits a
 * "Request a Quote" form on their listing. This is a critical customer-
 * acquisition touchpoint — the provider just received a real lead, which
 * is the strongest possible moment to introduce them to Fieseros CRM.
 *
 * The email includes:
 *   1. The quote request details (project info + customer contact)
 *   2. A "next step" callout (contact the customer quickly)
 *   3. A Fieseros CRM promotional CTA card (the acquisition pitch)
 *   4. A "Claim your free profile" CTA (links to signup flow)
 *   5. A branded footer with copyright + support email
 *
 * Both HTML and plain-text renderers are provided. The plain-text version
 * is essential for spam filters and clients that don't render HTML.
 */

import { BRAND, getAppUrl } from '@/lib/brand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProviderQuoteEmailData {
  providerName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  title: string;
  description: string | null;
  urgency: string;
  city: string | null;
  budgetLow: number | null;
  budgetHigh: number | null;
  /** The JobRequest ID — included for support reference. */
  requestId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const URGENCY_LABELS: Record<string, string> = {
  low: 'Flexible',
  medium: 'Within 1-2 weeks',
  high: 'This week',
  emergency: 'EMERGENCY — ASAP',
};

function formatBudget(low: number | null, high: number | null): string {
  if (low != null && high != null) return `$${low} – $${high}`;
  if (low != null) return `From $${low}`;
  if (high != null) return `Up to $${high}`;
  return 'Not specified';
}

// ─── HTML renderer ───────────────────────────────────────────────────────────

/**
 * Render the HTML email body for a provider quote request notification.
 *
 * Uses a table-based layout for Outlook 2007-2019 compatibility (those
 * clients use Word's rendering engine, which has poor CSS support).
 * Inline styles throughout — email clients strip <style> tags.
 */
export function renderProviderQuoteEmail(d: ProviderQuoteEmailData): string {
  const appUrl = getAppUrl();
  const year = new Date().getFullYear();
  const urgencyLabel = URGENCY_LABELS[d.urgency] || d.urgency;
  const budgetStr = formatBudget(d.budgetLow, d.budgetHigh);
  const claimUrl = `${appUrl}/?auth=register&returnUrl=%2Fmarketplace`;
  const crmLearnMoreUrl = `${appUrl}/`;
  const supportEmail = BRAND.emails.support;

  const esc = escapeHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Quote Request from ${esc(d.customerName)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;">

          <!-- Accent Bar -->
          <tr>
            <td style="background:#0f766e;height:6px;line-height:6px;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background:#f0fdf4;padding:28px 36px 24px;border-bottom:1px solid #dcfce7;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#0f766e;">
                      ${esc(BRAND.name)} Marketplace
                    </p>
                    <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;letter-spacing:-0.02em;">
                      ⚡ New Customer Quote Request
                    </h1>
                    <p style="margin:0;font-size:14px;color:#047857;line-height:1.5;">
                      A customer requested a quote directly for <strong>${esc(d.providerName)}</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Project details -->
          <tr>
            <td style="padding:28px 36px 12px 36px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.4;">
                ${esc(d.title)}
              </h2>
              ${d.description ? `<p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;white-space:pre-wrap;">${esc(d.description)}</p>` : ''}
              
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;width:110px;vertical-align:top;font-weight:500;">Urgency:</td>
                    <td style="padding:4px 0;font-weight:700;color:#0f172a;">${esc(urgencyLabel)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;vertical-align:top;font-weight:500;">Location:</td>
                    <td style="padding:4px 0;font-weight:600;color:#0f172a;">${esc(d.city || 'Not specified')}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;vertical-align:top;font-weight:500;">Budget:</td>
                    <td style="padding:4px 0;font-weight:600;color:#0f172a;">${esc(budgetStr)}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Customer contact card -->
          <tr>
            <td style="padding:0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border-radius:12px;border:1px solid #99f6e4;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#0f766e;">
                      👤 Customer Contact Details
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                      <tr>
                        <td style="padding:4px 0;color:#64748b;width:90px;vertical-align:top;font-weight:500;">Name:</td>
                        <td style="padding:4px 0;font-weight:700;color:#0f172a;">${esc(d.customerName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;vertical-align:top;font-weight:500;">Phone:</td>
                        <td style="padding:4px 0;">
                          <a href="tel:${esc(d.customerPhone.replace(/[^+\\d]/g, ''))}" style="color:#0f766e;font-weight:700;text-decoration:none;">${esc(d.customerPhone)}</a>
                        </td>
                      </tr>
                      ${d.customerEmail ? `<tr>
                        <td style="padding:4px 0;color:#64748b;vertical-align:top;font-weight:500;">Email:</td>
                        <td style="padding:4px 0;">
                          <a href="mailto:${esc(d.customerEmail)}" style="color:#0f766e;font-weight:600;text-decoration:none;">${esc(d.customerEmail)}</a>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next step callout (amber) -->
          <tr>
            <td style="padding:16px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:10px;border:1px solid #fde68a;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                      <strong>Pro tip:</strong> Responding within 15 minutes increases your booking rate by 300%. Contact the customer directly using the phone or email above.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fieseros CRM promotional CTA card -->
          <tr>
            <td style="padding:28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f766e;border-radius:14px;box-shadow:0 4px 12px rgba(15,118,110,0.2);">
                <tr>
                  <td style="padding:28px 24px;">
                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#99f6e4;">
                      Grow Your Business
                    </p>
                    <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3;">
                      Manage leads, quotes & jobs in one place
                    </h3>
                    <p style="margin:0 0 20px 0;font-size:14px;color:#ccfbf1;line-height:1.5;">
                      Claim your free ${esc(BRAND.name)} business profile to update your services, get direct customer requests, and unlock our full service management suite.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <a href="${esc(claimUrl)}" style="display:inline-block;padding:12px 24px;background:#ffffff;color:#0f766e;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;line-height:1.2;">
                            Claim Free Business Profile →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#99f6e4;">
                      Grow Your Business
                    </p>
                    <h3 style="margin:0 0 10px 0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.4;">
                      Turn more quotes into jobs with ${esc(BRAND.name)} CRM
                    </h3>
                    <p style="margin:0 0 14px 0;font-size:13px;color:#d1fae5;line-height:1.6;">
                      The all-in-one platform for service businesses. Manage leads, schedule jobs,
                      dispatch technicians, send invoices, and get paid — all in one place.
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#ecfdf5;">
                      <tr>
                        <td style="padding:3px 0;width:50%;vertical-align:top;">
                          &#10003; Lead management &amp; CRM
                        </td>
                        <td style="padding:3px 0;width:50%;vertical-align:top;">
                          &#10003; Job scheduling &amp; dispatch
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;vertical-align:top;">
                          &#10003; Invoicing &amp; payments
                        </td>
                        <td style="padding:3px 0;vertical-align:top;">
                          &#10003; Email, SMS &amp; Push automation
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                      <tr>
                        <td>
                          <a href="${esc(crmLearnMoreUrl)}" style="display:inline-block;padding:11px 22px;background:#ffffff;color:#065f46;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;line-height:1.2;">
                            Learn More About ${esc(BRAND.name)} CRM
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Claim your listing CTA ── -->
          <tr>
            <td style="padding:16px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#111827;">
                      Are you the owner of ${esc(d.providerName)}?
                    </p>
                    <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;line-height:1.5;">
                      Claim your free ${esc(BRAND.name)} profile to manage quotes, respond to customers,
                      update your business info, and get discovered by more local customers.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <a href="${esc(claimUrl)}" style="display:inline-block;padding:10px 20px;background:#059669;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;line-height:1.2;">
                            Claim Your Free Profile
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${d.requestId ? `
          <!-- ── Reference ID ── -->
          <tr>
            <td style="padding:16px 28px 0 28px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Reference ID: <span style="font-family:monospace;font-size:11px;">${esc(d.requestId)}</span>
              </p>
            </td>
          </tr>` : ''}

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 28px 28px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Questions? Contact <a href="mailto:${esc(supportEmail)}" style="color:#059669;text-decoration:none;font-weight:500;">${esc(supportEmail)}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                &copy; ${year} ${esc(BRAND.legalEntity)}. All rights reserved.
              </p>
              <p style="margin:4px 0 0 0;font-size:11px;color:#9ca3af;line-height:1.4;">
                <a href="${esc(appUrl)}" style="color:#9ca3af;text-decoration:none;">${esc(BRAND.url)}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email container -->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Plain-text renderer ─────────────────────────────────────────────────────

/**
 * Render a plain-text fallback of the same email. Essential for spam
 * filters (which penalize HTML-only emails) and text-only clients.
 */
export function renderProviderQuoteEmailText(d: ProviderQuoteEmailData): string {
  const appUrl = getAppUrl();
  const urgencyLabel = URGENCY_LABELS[d.urgency] || d.urgency;
  const budgetStr = formatBudget(d.budgetLow, d.budgetHigh);
  const claimUrl = `${appUrl}/?auth=register&returnUrl=%2Fmarketplace`;
  const crmLearnMoreUrl = `${appUrl}/`;

  const lines: string[] = [
    `${BRAND.name.toUpperCase()} MARKETPLACE — NEW QUOTE REQUEST`,
    '='.repeat(50),
    '',
    `A customer found you on ${BRAND.name} and wants a quote.`,
    '',
    '── PROJECT DETAILS ──',
    `Title:       ${d.title}`,
    `Urgency:     ${urgencyLabel}`,
    `Location:    ${d.city || 'Not specified'}`,
    `Budget:      ${budgetStr}`,
  ];

  if (d.description) {
    lines.push('', 'Description:', d.description);
  }

  lines.push(
    '',
    '── CUSTOMER CONTACT ──',
    `Name:   ${d.customerName}`,
    `Phone:  ${d.customerPhone}`,
  );

  if (d.customerEmail) {
    lines.push(`Email:  ${d.customerEmail}`);
  }

  lines.push(
    '',
    '── NEXT STEP ──',
    'Contact the customer directly using the details above.',
    'Responding quickly increases your chances of winning the job.',
    '',
    '── GROW YOUR BUSINESS WITH FIESEROS CRM ──',
    `Turn more quotes into jobs with ${BRAND.name} CRM — the all-in-one`,
    'platform for service businesses.',
    '',
    '  - Lead management & CRM',
    '  - Job scheduling & dispatch',
    '  - Invoicing & payments',
    '  - Email, SMS & Push automation',
    '',
    `Learn more: ${crmLearnMoreUrl}`,
    '',
    '── CLAIM YOUR FREE PROFILE ──',
    `Are you the owner of ${d.providerName}?`,
    'Claim your free profile to manage quotes, respond to customers,',
    'and get discovered by more local customers.',
    '',
    `Claim now: ${claimUrl}`,
  );

  if (d.requestId) {
    lines.push('', `Reference ID: ${d.requestId}`);
  }

  lines.push(
    '',
    '='.repeat(50),
    `${BRAND.copyright}`,
    `${BRAND.url}`,
    `Questions? Contact ${BRAND.emails.support}`,
  );

  return lines.join('\n');
}
