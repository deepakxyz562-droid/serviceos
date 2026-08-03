/**
 * Job Assignment Email Template (Jobber-style)
 * =============================================
 *
 * Renders a polished "New task assignment" notification email sent to an
 * employee when a new job is assigned to them. Matches the structure of the
 * Jobber task-assignment email:
 *
 *   Subject:   New task assignment
 *   Body:      Greeting → Schedule → Assigned to → Job # → Address →
 *              Contact details → [View Job] CTA → Help Center footer
 *
 * USAGE:
 *   import { renderJobAssignmentEmail, JOB_ASSIGNMENT_EMAIL_SUBJECT }
 *     from '@/lib/email-templates/job-assignment';
 *
 *   const html = renderJobAssignmentEmail({
 *     assigneeName: 'Deepak',
 *     jobNumber: '2',
 *     scheduledAt: new Date('2026-07-11T11:00:00'),
 *     scheduledEndTime: new Date('2026-07-11T12:00:00'),
 *     address: '2426 E Riverside Dr, Austin, TX 78741',
 *     customerName: 'Deepak',
 *     customerPhone: '206-555-0122',
 *     customerEmail: 'deepakchandra076@gmail.com',
 *     jobTitle: 'AC Repair',
 *     viewJobUrl: 'https://acme-plumbing.fieseros.com/?view=jobs&job=abc123',
 *   });
 *
 * The returned HTML is a self-contained <html> document suitable for any
 * email provider (SMTP / Resend / SendGrid / SES / Mailgun / Postmark / Brevo).
 * All styles are inline — no external CSS — for maximum client compatibility
 * (Outlook, Gmail, Yahoo, Apple Mail).
 */

import { BRAND, getAppUrl } from '@/lib/brand';

// ── Constants ─────────────────────────────────────────────────────────────

/**
 * The exact subject line for the assignment email. Matches the Jobber format.
 * Used by the dispatcher in `whatsapp-notifications.ts`.
 */
export const JOB_ASSIGNMENT_EMAIL_SUBJECT = 'New task assignment';

/**
 * The EmailTemplate.slug value used when seeding the editable copy of this
 * template into the database. Admins can edit the seeded row in the Email
 * Templates UI; the code module here remains the always-available fallback.
 */
export const JOB_ASSIGNMENT_TEMPLATE_SLUG = 'task-assignment';

// ── Types ────────────────────────────────────────────────────────────────

export interface JobAssignmentEmailData {
  /** Recipient employee's first name (or full name). Used for greeting + "Assigned to". */
  assigneeName: string;
  /** Human-readable job number shown as "Job #2". Falls back to last 6 of id. */
  jobNumber: string;
  /** Job title / service type (e.g. "AC Repair"). Optional. */
  jobTitle?: string;
  /** Job start time. Used for the schedule block + greeting date. */
  scheduledAt: Date | string | null;
  /** Job end time. Optional. When omitted, only the start time is shown. */
  scheduledEndTime?: Date | string | null;
  /** Free-text service address. Will be split into street + city/region. */
  address?: string;
  /** Customer name. Required. */
  customerName: string;
  /** Customer phone. Optional. */
  customerPhone?: string;
  /** Customer email. Optional. */
  customerEmail?: string;
  /** Deep link to the job detail view in the app. */
  viewJobUrl: string;
  /** Optional tenant display name shown in the email footer. Defaults to BRAND.name. */
  tenantName?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters in user-supplied strings before injecting
 * them into the email body. Prevents XSS-style breakouts in mail clients
 * (most clients strip <script>, but injected tags can still break layout).
 */
function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a Date as "Jul 11, 2026".
 * Returns 'TBD' when the date is missing/invalid.
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'TBD';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'TBD';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'TBD';
  }
}

/**
 * Format a Date as "11:00 AM" (12-hour, no seconds).
 * Returns 'TBD' when the date is missing/invalid.
 */
function formatTime(date: Date | string | null | undefined): string {
  if (!date) return 'TBD';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'TBD';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'TBD';
  }
}

/**
 * Build the schedule block string. Matches the Jobber format:
 *   "Jul 11, 2026: 11:00 AM – 12:00 PM"
 *
 * When no end time is provided, falls back to just the start:
 *   "Jul 11, 2026: 11:00 AM"
 *
 * When no start time is provided, returns 'Schedule TBD'.
 */
export function formatScheduleBlock(
  scheduledAt: Date | string | null | undefined,
  scheduledEndTime?: Date | string | null,
): string {
  const dateStr = formatDate(scheduledAt);
  if (dateStr === 'TBD') return 'Schedule TBD';
  const startTime = formatTime(scheduledAt);
  const endTime = scheduledEndTime ? formatTime(scheduledEndTime) : '';
  if (endTime && endTime !== 'TBD') {
    return `${dateStr}: ${startTime} – ${endTime}`;
  }
  return `${dateStr}: ${startTime}`;
}

/**
 * Split a single-line address string into street + city/state/zip lines.
 *
 * Strategy (deterministic, no external geocoding):
 *   1. If the address contains a comma, the part before the FIRST comma is
 *      the street line, and everything after the first comma (trimmed) is
 *      the city/region line. This matches how most FSM platforms store
 *      addresses: "2426 E Riverside Dr, Austin, TX 78741".
 *   2. If there's no comma, keep the whole string on the street line and
 *      leave the second line empty.
 *
 * Whitespace is trimmed and collapsed. Empty results are returned as ''
 * so the caller can skip rendering an empty <td> line.
 */
export function splitAddress(
  address: string | null | undefined,
): { street: string; cityRegion: string } {
  if (!address || !address.trim()) {
    return { street: '', cityRegion: '' };
  }
  const trimmed = address.trim().replace(/\s+/g, ' ');
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx === -1) {
    return { street: trimmed, cityRegion: '' };
  }
  const street = trimmed.slice(0, commaIdx).trim();
  const cityRegion = trimmed.slice(commaIdx + 1).trim();
  return { street, cityRegion };
}

/**
 * Derive the first-name greeting from a full name. Falls back to the full
 * name when no clear first name can be extracted.
 */
function firstName(full: string): string {
  if (!full) return 'there';
  const trimmed = full.trim();
  if (!trimmed) return 'there';
  // Take the first whitespace-separated token, strip trailing commas.
  const first = trimmed.split(/\s+/)[0].replace(/[,.$]/g, '');
  return first || trimmed;
}

// ── Renderer ─────────────────────────────────────────────────────────────

/**
 * Render the job-assignment email as a self-contained HTML document.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  [Header: Fieseros wordmark]              │
 *   ├──────────────────────────────────────────┤
 *   │  New task assignment                      │  ← H1
 *   │  Hi Deepak,                               │  ← greeting
 *   │                                           │
 *   │  ┌─ Schedule ─────────────────────────┐  │
 *   │  │  Jul 11, 2026: 11:00 AM – 12:00 PM │  │
 *   │  └────────────────────────────────────┘  │
 *   │                                           │
 *   │  Assigned to   Deepak                     │
 *   │  Job #         2                          │
 *   │  Address       2426 E Riverside Dr        │  ← two-line
 *   │                Austin, TX 78741           │
 *   │  Contact       Deepak                     │
 *   │                206-555-0122               │
 *   │                deepakchandra076@gmail.com │
 *   │                                           │
 *   │            [ View Job → ]                 │  ← CTA button
 *   │                                           │
 *   ├──────────────────────────────────────────┤
 *   │  Questions? Visit our Help Center         │  ← footer
 *   │  © 2026 Fieseros, Inc.                    │
 *   └──────────────────────────────────────────┘
 *
 * The HTML uses table-based layout for Outlook compatibility and inline
 * styles everywhere. The color scheme is Fieseros green (matches the
 * existing notification accent color #059669 used across the app).
 */
export function renderJobAssignmentEmail(data: JobAssignmentEmailData): string {
  const {
    assigneeName,
    jobNumber,
    jobTitle,
    scheduledAt,
    scheduledEndTime,
    address,
    customerName,
    customerPhone,
    customerEmail,
    viewJobUrl,
    tenantName,
  } = data;

  const greetingName = firstName(assigneeName);
  const scheduleBlock = formatScheduleBlock(scheduledAt, scheduledEndTime);
  const { street, cityRegion } = splitAddress(address);
  const appUrl = getAppUrl();
  const supportEmail = BRAND.emails.support;
  const tenantLabel = tenantName || BRAND.name;
  const year = new Date().getFullYear();

  // Build the address cell — two lines if both present, one line otherwise.
  const addressHtml = [
    street ? `<div style="font-size:14px;color:#111827;line-height:1.5;">${esc(street)}</div>` : '',
    cityRegion ? `<div style="font-size:14px;color:#111827;line-height:1.5;">${esc(cityRegion)}</div>` : '',
  ].filter(Boolean).join('');

  // Build the contact cell — name, phone (tel:), email (mailto:).
  const contactLines: string[] = [];
  if (customerName) {
    contactLines.push(
      `<div style="font-size:14px;color:#111827;line-height:1.5;font-weight:600;">${esc(customerName)}</div>`,
    );
  }
  if (customerPhone) {
    contactLines.push(
      `<div style="font-size:14px;color:#111827;line-height:1.5;">Phone: <a href="tel:${esc(customerPhone)}" style="color:#059669;text-decoration:none;">${esc(customerPhone)}</a></div>`,
    );
  }
  if (customerEmail) {
    contactLines.push(
      `<div style="font-size:14px;color:#111827;line-height:1.5;">Email: <a href="mailto:${esc(customerEmail)}" style="color:#059669;text-decoration:none;">${esc(customerEmail)}</a></div>`,
    );
  }
  const contactHtml = contactLines.join('') || '<div style="font-size:14px;color:#6b7280;">—</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(JOB_ASSIGNMENT_EMAIL_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Outer wrapper: centers the email client viewport -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;min-height:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!-- Email container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background:#059669;padding:18px 28px;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${esc(BRAND.name)}</div>
              <div style="font-size:12px;color:#d1fae5;margin-top:2px;">${esc(tenantLabel)}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <!-- Subject heading -->
              <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                New task assignment
              </h1>
              <!-- Greeting -->
              <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">
                Hi ${esc(greetingName)},
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.6;">
                You've been assigned a new task.${jobTitle ? ` <strong style="color:#111827;">${esc(jobTitle)}</strong>` : ''}
              </p>

              <!-- Schedule block (highlighted) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-size:11px;font-weight:600;color:#047857;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Schedule</div>
                    <div style="font-size:16px;font-weight:600;color:#064e3b;line-height:1.4;">${esc(scheduleBlock)}</div>
                  </td>
                </tr>
              </table>

              <!-- Details table: Assigned to / Job # / Address / Contact -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <!-- Assigned to -->
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Assigned to</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:14px;color:#111827;line-height:1.5;font-weight:600;">${esc(assigneeName || '—')}</div>
                  </td>
                </tr>
                <!-- Job # -->
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Job #</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:14px;color:#111827;line-height:1.5;font-weight:600;">${esc(jobNumber || '—')}</div>
                  </td>
                </tr>
                <!-- Address -->
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Address</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid #f3f4f6;">
                    ${addressHtml || '<div style="font-size:14px;color:#6b7280;">—</div>'}
                  </td>
                </tr>
                <!-- Contact details -->
                <tr>
                  <td width="120" valign="top" style="padding:10px 0;">
                    <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.6px;text-transform:uppercase;">Contact details</div>
                  </td>
                  <td valign="top" style="padding:10px 0 10px 12px;">
                    ${contactHtml}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;">
                <tr>
                  <td align="left">
                    <a href="${esc(viewJobUrl)}" style="display:inline-block;padding:12px 24px;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;line-height:1.2;">
                      View Job
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px 28px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Questions? Visit our <a href="mailto:${esc(supportEmail)}" style="color:#059669;text-decoration:none;font-weight:500;">Help Center</a>
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                © ${year} ${esc(BRAND.legalEntity)}. All rights reserved.
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

/**
 * Render a plain-text fallback of the same email. Used for the `textBody`
 * column of the seeded EmailTemplate and for clients that don't render HTML.
 */
export function renderJobAssignmentEmailText(data: JobAssignmentEmailData): string {
  const {
    assigneeName,
    jobNumber,
    jobTitle,
    scheduledAt,
    scheduledEndTime,
    address,
    customerName,
    customerPhone,
    customerEmail,
    viewJobUrl,
  } = data;

  const greetingName = firstName(assigneeName);
  const scheduleBlock = formatScheduleBlock(scheduledAt, scheduledEndTime);
  const { street, cityRegion } = splitAddress(address);

  const lines: string[] = [
    'NEW TASK ASSIGNMENT',
    '',
    `Hi ${greetingName},`,
    '',
    `You've been assigned a new task.${jobTitle ? ` ${jobTitle}` : ''}`,
    '',
    `Schedule`,
    scheduleBlock,
    '',
    `Assigned to: ${assigneeName || '—'}`,
    `Job #: ${jobNumber || '—'}`,
  ];

  if (street) {
    lines.push(`Address: ${street}${cityRegion ? `, ${cityRegion}` : ''}`);
  }
  if (customerName) {
    lines.push('', 'Contact details:');
    lines.push(`  ${customerName}`);
    if (customerPhone) lines.push(`  Phone: ${customerPhone}`);
    if (customerEmail) lines.push(`  Email: ${customerEmail}`);
  }

  lines.push('', `View Job: ${viewJobUrl}`);
  lines.push('');
  lines.push(`Questions? Email ${BRAND.emails.support}`);
  lines.push(`${BRAND.copyright}`);

  return lines.join('\n');
}
