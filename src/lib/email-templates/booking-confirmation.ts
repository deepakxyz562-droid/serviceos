/**
 * Booking Confirmation Email Template (Fieseros-standard)
 * ========================================================
 *
 * Renders an elevated, responsive "Booking Confirmed" notification email sent to
 * customers when their service booking is created or confirmed.
 *
 * All styles are inline for maximum compatibility across Gmail, Apple Mail,
 * Outlook, Yahoo, and mobile email clients.
 */

import { BRAND, getAppUrl } from '@/lib/brand';

export const BOOKING_CONFIRMATION_EMAIL_SUBJECT = 'Booking Confirmed';
export const BOOKING_CONFIRMATION_TEMPLATE_SLUG = 'booking-confirmation';

export interface BookingConfirmationEmailData {
  /** Customer's name */
  customerName?: string;
  /** Human-readable job / booking number, e.g. "HB3BMJ" or "2" */
  jobNumber: string;
  /** Service title / job title, e.g. "AC Repair" */
  jobTitle?: string;
  /** Scheduled date string, e.g. "Fri, Sep 4, 2026" */
  scheduledDate?: string;
  /** Scheduled time window or start time, e.g. "10:00 AM - 12:00 PM" */
  scheduledTime?: string;
  /** Service location address */
  address?: string;
  /** Customer phone number */
  customerPhone?: string;
  /** Customer email address */
  customerEmail?: string;
  /** URL to view booking status in portal or app */
  viewBookingUrl?: string;
  /** Business / Tenant display name */
  tenantName?: string;
  /** Business phone */
  tenantPhone?: string;
  /** Business email */
  tenantEmail?: string;
}

function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(full?: string): string {
  if (!full) return 'there';
  const trimmed = full.trim();
  if (!trimmed) return 'there';
  const first = trimmed.split(/\s+/)[0].replace(/[,.$]/g, '');
  return first || trimmed;
}

/**
 * Render the booking confirmation email HTML.
 */
export function renderBookingConfirmationEmail(data: BookingConfirmationEmailData): string {
  const business = data.tenantName || BRAND.name;
  const greetingName = firstName(data.customerName);
  const jobNumber = data.jobNumber || 'N/A';
  const serviceTitle = data.jobTitle || 'General Service';
  const scheduledDate = data.scheduledDate || 'Schedule TBD';
  const appUrl = getAppUrl();
  const ctaUrl = data.viewBookingUrl || (data.jobNumber ? `${appUrl}/?view=jobs&job=${data.jobNumber}` : appUrl);

  const preheader = `Booking #${jobNumber} Confirmed — ${serviceTitle} on ${scheduledDate}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(preheader)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%;-webkit-text-size-adjust:none;">
  <!-- Hidden Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f1f5f9;">
    ${esc(preheader)}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%;">
          
          <!-- Top Accent Gradient Bar -->
          <tr>
            <td style="background:linear-gradient(90deg, #0f766e 0%, #10b981 100%);background-color:#0f766e;height:6px;line-height:6px;font-size:6px;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;line-height:56px;color:#0f766e;font-size:26px;margin-bottom:14px;text-align:center;">
                &#10003;
              </div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">Booking Confirmed</h1>
              <p style="color:#64748b;font-size:14px;margin:0;line-height:1.5;">Thank you for your booking with <strong>${esc(business)}</strong>.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:4px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">
                Hi <strong>${esc(greetingName)}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#475569;">
                Your appointment has been successfully scheduled. Here is a summary of your service request:
              </p>

              <!-- Booking Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;width:140px;">Booking ID</td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;color:#0f766e;font-size:14px;font-weight:700;font-family:monospace;letter-spacing:0.04em;">#${esc(jobNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Service</td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;">${esc(serviceTitle)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;${data.address ? 'border-bottom:1px solid #e2e8f0;' : ''}color:#64748b;font-size:13px;font-weight:600;">Scheduled Date</td>
                  <td style="padding:14px 18px;${data.address ? 'border-bottom:1px solid #e2e8f0;' : ''}color:#0f172a;font-size:14px;font-weight:600;">
                    ${esc(scheduledDate)}${data.scheduledTime ? ` &middot; <span style="color:#64748b;font-weight:normal;">${esc(data.scheduledTime)}</span>` : ''}
                  </td>
                </tr>
                ${data.address ? `
                <tr>
                  <td style="padding:14px 18px;color:#64748b;font-size:13px;font-weight:600;">Location</td>
                  <td style="padding:14px 18px;color:#0f172a;font-size:14px;">${esc(data.address)}</td>
                </tr>
                ` : ''}
              </table>

              <!-- What's Next Callout Box -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin:24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:top;width:24px;padding-right:10px;font-size:16px;line-height:1;">
                      &#9889;
                    </td>
                    <td>
                      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.04em;">What happens next?</p>
                      <p style="margin:0;font-size:13px;color:#15803d;line-height:1.5;">
                        We will assign a technician to your job shortly. You will receive an update as soon as your technician is assigned and en route.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Action CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${esc(ctaUrl)}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;box-shadow:0 3px 6px rgba(15,118,110,0.2);letter-spacing:-0.01em;">
                      Open in Fieseros &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support Note -->
              ${(data.tenantPhone || data.tenantEmail) ? `
              <p style="color:#64748b;font-size:13px;margin:24px 0 0;text-align:center;line-height:1.5;">
                Need to reschedule or have questions? Contact us at 
                ${data.tenantPhone ? `<strong>${esc(data.tenantPhone)}</strong>` : ''}
                ${(data.tenantPhone && data.tenantEmail) ? ' or ' : ''}
                ${data.tenantEmail ? `<a href="mailto:${esc(data.tenantEmail)}" style="color:#0f766e;text-decoration:none;">${esc(data.tenantEmail)}</a>` : ''}.
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding:24px 40px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;line-height:1.5;">
                This is an automated notification regarding your booking with <strong>${esc(business)}</strong>.
              </p>
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Powered by <a href="https://fieseros.com" style="color:#0f766e;text-decoration:none;font-weight:600;">Fieseros</a> &middot; The Operating System for Service Businesses
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
