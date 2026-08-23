import type { TenantEmailBranding } from '@/lib/tenant-branding';

export interface PinEmailData {
  customerName: string;
  assigneeName: string;
  jobTitle: string;
  jobNumber?: string;
  scheduledDate: string;
  scheduledTime: string;
  pin: string;
  trackingUrl: string;
  isResend?: boolean;
}

/**
 * Escape HTML special characters in user-provided strings to prevent XSS
 * in email clients. All dynamic values (customer name, job title, etc.)
 * must pass through this before being inserted into the HTML string.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the customer verification PIN email to a static HTML string.
 *
 * Builds the HTML directly (NOT via React's renderToStaticMarkup) because
 * `react-dom/server` has compatibility issues with Turbopack in Next.js 16
 * and caused all API endpoints importing the notification pipeline to crash
 * with "Ecmascript file had an error".
 *
 * The HTML structure mirrors the BrandedLayout React component (from Phase 1):
 *   - Accent color bar
 *   - Header (logo OR business name)
 *   - Body (greeting, job details, PIN box, CTA button)
 *   - Footer (contact info + "Powered by Fieseros" unless white-label)
 *
 * All styles are inline (email clients have inconsistent CSS support).
 *
 * @param branding The tenant email branding DTO (from loadTenantEmailBranding)
 * @param data The job-specific data for the email
 * @returns HTML string ready for the email channel's emailHtml payload field
 */
export function renderPinEmailHtml(branding: TenantEmailBranding, data: PinEmailData): string {
  const {
    businessName,
    logoUrl,
    phone,
    email: emailAddr,
    website,
    address,
    primaryColor = '#0f766e',
    accentColor = '#0d9488',
    fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    footerHtml,
    hideFieserosBranding,
  } = branding;

  const initials = businessName
    ? businessName
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SO';

  const greeting = data.customerName
    ? `Hi ${escapeHtml(data.customerName)},`
    : 'Hello,';

  const resendNote = data.isResend
    ? '<p style="color: #64748b; font-size: 13px; margin-top: 8px;">This is a resend of your verification PIN.</p>'
    : '';

  const jobLabel = data.jobNumber
    ? `Job #${escapeHtml(data.jobNumber)}`
    : 'Your appointment';

  const preheader = data.isResend
    ? `Your verification PIN is ${data.pin} (resend)`
    : `Your verification PIN is ${data.pin} — ${data.assigneeName} is scheduled for ${data.scheduledDate}`;

  // ── Header ──
  const headerContent = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" style="max-height:52px;max-width:220px;height:auto;display:block;border:0" />`
    : `<table cellpadding="0" cellspacing="0"><tbody><tr><td style="background-color:${escapeHtml(primaryColor)};border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:18px;font-family:${escapeHtml(fontFamily)}">${escapeHtml(initials)}</td><td style="padding-left:14px;vertical-align:middle"><span style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;font-family:${escapeHtml(fontFamily)}">${escapeHtml(businessName)}</span></td></tr></tbody></table>`;

  // ── PIN box ──
  const pinBox = `
    <div style="margin:24px 0;padding:24px;background-color:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;text-align:center">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:0.08em">Your Access / Verification PIN</p>
      <p style="margin:0;font-size:40px;font-weight:800;color:${escapeHtml(primaryColor)};font-family:Monaco, Consolas, monospace;letter-spacing:0.2em">${escapeHtml(data.pin)}</p>
    </div>`;

  // ── CTA button ──
  const ctaButton = `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0 16px">
      <tbody><tr>
        <td style="background-color:${escapeHtml(primaryColor)};border-radius:10px;padding:13px 28px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
          <a href="${escapeHtml(data.trackingUrl)}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;font-family:${escapeHtml(fontFamily)};display:inline-block;letter-spacing:-0.01em">Access Customer Portal →</a>
        </td>
      </tr></tbody>
    </table>`;

  // ── Footer contact details ──
  const contactLines: string[] = [];
  if (phone) contactLines.push(`<span style="margin-right:16px;display:inline-block"><strong style="color:#475569">Phone:</strong> ${escapeHtml(phone)}</span>`);
  if (emailAddr) contactLines.push(`<span style="margin-right:16px;display:inline-block"><strong style="color:#475569">Email:</strong> ${escapeHtml(emailAddr)}</span>`);
  if (website) contactLines.push(`<span style="display:inline-block"><strong style="color:#475569">Web:</strong> <a href="${escapeHtml(website.startsWith('http') ? website : 'https://' + website)}" style="color:${escapeHtml(primaryColor)};text-decoration:none">${escapeHtml(website.replace(/^https?:\/\//, ''))}</a></span>`);
  
  const contactHtml = contactLines.length > 0
    ? `<tr><td style="padding-top:4px"><div style="color:#64748b;font-size:13px;line-height:1.6">${contactLines.join('')}</div></td></tr>`
    : '';

  const footerPoweredBy = !hideFieserosBranding
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">Powered by <a href="https://fieseros.com" style="color:${escapeHtml(primaryColor)};text-decoration:none;font-weight:600">Fieseros</a></div>`
    : '';

  const customFooter = footerHtml
    ? `<div style="margin-top:16px;font-size:13px;color:#64748b;line-height:1.5">${footerHtml}</div>`
    : '';

  // ── Assemble full email HTML ──
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification PIN - ${escapeHtml(businessName)}</title>
</head>
<body style="font-family:${escapeHtml(fontFamily)};background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px">
    <tbody><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
        <tr><td style="background-color:${escapeHtml(primaryColor)};height:6px;line-height:6px"></td></tr>
        <tr><td style="padding:32px 40px 20px">
          <table width="100%" cellpadding="0" cellspacing="0"><tbody><tr><td>${headerContent}</td></tr></tbody></table>
        </td></tr>
        <tr><td style="padding:8px 40px 36px;font-family:${escapeHtml(fontFamily)};color:#334155;font-size:15px;line-height:1.65">
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a">${greeting}</p>
          <p style="margin:0 0 12px">Your technician <strong>${escapeHtml(data.assigneeName)}</strong> is scheduled for <strong>${escapeHtml(data.jobTitle)}</strong> (${jobLabel}).</p>
          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin:16px 0">
            <p style="margin:0 0 4px"><strong>📅 Scheduled Date:</strong> ${escapeHtml(data.scheduledDate)}</p>
            <p style="margin:0"><strong>⏰ Time Window:</strong> ${escapeHtml(data.scheduledTime)}</p>
          </div>
          ${pinBox}
          <p style="margin:0 0 8px;font-size:14px;color:#64748b">Please share this PIN with your technician when they arrive to verify the service.</p>
          ${resendNote}
          ${ctaButton}
        </td></tr>
        <tr><td style="padding:28px 40px 32px;background-color:#f8fafc;border-top:1px solid #f1f5f9">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#64748b">
            <tbody>
              <tr><td style="padding-bottom:10px"><strong style="color:#0f172a;font-size:14px">${escapeHtml(businessName)}</strong>${address ? '<div style="color:#64748b;margin-top:4px">' + escapeHtml(address) + '</div>' : ''}</td></tr>
              ${contactHtml}
            </tbody>
          </table>
          ${customFooter}
          ${footerPoweredBy}
        </td></tr>
      </table>
    </td></tr></tbody>
  </table>
</body>
</html>`;
}
