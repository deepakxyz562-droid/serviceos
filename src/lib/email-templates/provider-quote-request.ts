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
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <!-- Outer wrapper: centers the email on desktop -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Email container: max 560px -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- ── Header (emerald gradient) ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);background-color:#ecfdf5;padding:28px 28px 24px 28px;border-bottom:1px solid #bbf7d0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#059669;">
                      ${esc(BRAND.name)} Marketplace
                    </p>
                    <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#065f46;line-height:1.3;">
                      New Quote Request
                    </h1>
                    <p style="margin:0;font-size:14px;color:#047857;line-height:1.5;">
                      A customer found you on ${esc(BRAND.name)} and wants a quote.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Project details ── -->
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:600;color:#111827;line-height:1.4;">
                ${esc(d.title)}
              </h2>
              ${d.description ? `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#4b5563;white-space:pre-wrap;">${esc(d.description)}</p>` : ''}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                <tr>
                  <td style="padding:5px 0;color:#6b7280;width:110px;vertical-align:top;">Urgency:</td>
                  <td style="padding:5px 0;font-weight:600;color:#111827;">${esc(urgencyLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#6b7280;vertical-align:top;">Location:</td>
                  <td style="padding:5px 0;font-weight:600;color:#111827;">${esc(d.city || 'Not specified')}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#6b7280;vertical-align:top;">Budget:</td>
                  <td style="padding:5px 0;font-weight:600;color:#111827;">${esc(budgetStr)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Customer contact card ── -->
          <tr>
            <td style="padding:8px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;">
                <tr>
                  <td style="padding:18px 20px;">
                    <h3 style="margin:0 0 10px 0;font-size:15px;font-weight:600;color:#065f46;">
                      Customer Contact Details
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                      <tr>
                        <td style="padding:3px 0;color:#6b7280;width:90px;vertical-align:top;">Name:</td>
                        <td style="padding:3px 0;font-weight:600;color:#111827;">${esc(d.customerName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;color:#6b7280;vertical-align:top;">Phone:</td>
                        <td style="padding:3px 0;">
                          <a href="tel:${esc(d.customerPhone.replace(/[^+\\d]/g, ''))}" style="color:#059669;font-weight:600;text-decoration:none;">${esc(d.customerPhone)}</a>
                        </td>
                      </tr>
                      ${d.customerEmail ? `<tr>
                        <td style="padding:3px 0;color:#6b7280;vertical-align:top;">Email:</td>
                        <td style="padding:3px 0;">
                          <a href="mailto:${esc(d.customerEmail)}" style="color:#059669;font-weight:600;text-decoration:none;">${esc(d.customerEmail)}</a>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Next step callout (amber) ── -->
          <tr>
            <td style="padding:16px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                      <strong>Next step:</strong> Contact the customer directly using the details above.
                      Responding quickly increases your chances of winning the job.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Fieseros CRM promotional CTA card ── -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#065f46 0%,#047857 100%);background-color:#065f46;border-radius:10px;">
                <tr>
                  <td style="padding:24px 22px;">
                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#a7f3d0;">
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
