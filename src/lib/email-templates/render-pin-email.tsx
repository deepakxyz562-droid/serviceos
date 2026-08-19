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
    primaryColor,
    accentColor,
    fontFamily,
    footerHtml,
    hideFieserosBranding,
  } = branding;

  const greeting = data.customerName
    ? `Hi ${escapeHtml(data.customerName)},`
    : 'Hello,';

  const resendNote = data.isResend
    ? '<p style="color: #6b7280; font-size: 13px; margin-top: 8px;">This is a resend of your verification PIN.</p>'
    : '';

  const jobLabel = data.jobNumber
    ? `Job #${escapeHtml(data.jobNumber)}`
    : 'Your appointment';

  const preheader = data.isResend
    ? `Your verification PIN is ${data.pin} (resend)`
    : `Your verification PIN is ${data.pin} — ${data.assigneeName} is scheduled for ${data.scheduledDate}`;

  // ── Header ──
  const headerContent = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" style="max-height:48px;max-width:200px;height:auto;display:inline-block" />`
    : `<span style="font-size:22px;font-weight:700;color:${escapeHtml(primaryColor)};font-family:${escapeHtml(fontFamily)}">${escapeHtml(businessName)}</span>`;

  // ── PIN box ──
  const pinBox = `
    <div style="margin:24px 0;padding:20px 24px;background-color:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;text-align:center">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Your Verification PIN</p>
      <p style="margin:0;font-size:36px;font-weight:800;color:${escapeHtml(primaryColor)};font-family:${escapeHtml(fontFamily)};letter-spacing:0.15em">${escapeHtml(data.pin)}</p>
    </div>`;

  // ── CTA button (table-based for email client compatibility) ──
  const ctaButton = `
    <table cellpadding="0" cellspacing="0" style="margin:16px 0">
      <tbody><tr>
        <td style="background-color:${escapeHtml(primaryColor)};border-radius:8px;padding:12px 24px">
          <a href="${escapeHtml(data.trackingUrl)}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;font-family:'Inter',sans-serif;display:inline-block">Track Your Appointment</a>
        </td>
      </tr></tbody>
    </table>`;

  // ── Footer contact details ──
  const contactLines: string[] = [];
  if (phone) contactLines.push(`&#9742; ${escapeHtml(phone)}`);
  if (emailAddr) contactLines.push(`&#9993; ${escapeHtml(emailAddr)}`);
  if (website) contactLines.push(`&#127760; ${escapeHtml(website)}`);
  const contactHtml = contactLines.length > 0
    ? `<tr><td><span>${contactLines.join('&nbsp;&nbsp;')}</span></td></tr>`
    : '';

  const footerPoweredBy = !hideFieserosBranding
    ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center">Powered by <a href="https://fieseros.com" style="color:${escapeHtml(accentColor)};text-decoration:none;font-weight:600">Fieseros</a></div>`
    : '';

  const customFooter = footerHtml
    ? `<div style="margin-top:16px;font-size:13px;color:#6b7280">${footerHtml}</div>`
    : '';

  // ── Assemble the full email HTML ──
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification PIN - ${escapeHtml(businessName)}</title>
</head>
<body style="font-family:${escapeHtml(fontFamily)};background-color:#f4f5f7;margin:0;padding:0">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0">
    <tbody><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:600px;width:100%">
        <tr><td style="background-color:${escapeHtml(primaryColor)};height:6px;line-height:6px"></td></tr>
        <tr><td style="padding:32px 40px 24px">
          <table width="100%" cellpadding="0" cellspacing="0"><tbody><tr><td>${headerContent}</td></tr></tbody></table>
        </td></tr>
        <tr><td style="padding:0 40px 32px;font-family:${escapeHtml(fontFamily)};color:#1f2937;font-size:15px;line-height:1.6">
          <p style="margin:0 0 16px">${greeting}</p>
          <p style="margin:0 0 8px">Your technician <strong>${escapeHtml(data.assigneeName)}</strong> is scheduled for <strong>${escapeHtml(data.jobTitle)}</strong> (${jobLabel}).</p>
          <p style="margin:0 0 16px"><strong>&#128197; Date:</strong> ${escapeHtml(data.scheduledDate)}<br /><strong>&#128336; Time:</strong> ${escapeHtml(data.scheduledTime)}</p>
          ${pinBox}
          <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Please share this PIN with your technician when they arrive to verify the service.</p>
          ${resendNote}
          ${ctaButton}
        </td></tr>
        <tr><td style="padding:24px 40px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#6b7280">
            <tbody>
              <tr><td style="padding-bottom:12px"><strong style="color:#374151">${escapeHtml(businessName)}</strong>${address ? '<br />' + escapeHtml(address) : ''}</td></tr>
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
