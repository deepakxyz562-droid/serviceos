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
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;min-height:100%;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;">

          <!-- Top Accent Bar -->
          <tr>
            <td style="background:#0f766e;height:6px;line-height:6px;"></td>
          </tr>

          <!-- Header bar -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #f1f5f9;">
              <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">${esc(BRAND.name)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;font-weight:500;">${esc(tenantLabel)}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 12px 36px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;letter-spacing:-0.02em;">
                New Task Assignment
              </h1>
              <p style="margin:0 0 20px 0;font-size:15px;color:#334155;line-height:1.6;">
                Hi ${esc(greetingName)},
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;">
                You have been assigned a new task.${jobTitle ? ` <strong style="color:#0f172a;">${esc(jobTitle)}</strong>` : ''}
              </p>

              <!-- Schedule block (highlighted card) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:11px;font-weight:700;color:#166534;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;">Scheduled Window</div>
                    <div style="font-size:16px;font-weight:700;color:#14532d;line-height:1.4;">${esc(scheduleBlock)}</div>
                  </td>
                </tr>
              </table>

              <!-- Details Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:collapse;">
                <tr>
                  <td width="130" valign="top" style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;">Assigned To</div>
                  </td>
                  <td valign="top" style="padding:12px 0 12px 12px;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:14px;color:#0f172a;line-height:1.5;font-weight:600;">${esc(assigneeName || '—')}</div>
                  </td>
                </tr>
                <tr>
                  <td width="130" valign="top" style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;">Job #</div>
                  </td>
                  <td valign="top" style="padding:12px 0 12px 12px;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:14px;color:#0f172a;line-height:1.5;font-weight:600;">#${esc(jobNumber || '—')}</div>
                  </td>
                </tr>
                <tr>
                  <td width="130" valign="top" style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;">Location</div>
                  </td>
                  <td valign="top" style="padding:12px 0 12px 12px;border-bottom:1px solid #f1f5f9;">
                    ${addressHtml || '<div style="font-size:14px;color:#64748b;">—</div>'}
                  </td>
                </tr>
                <tr>
                  <td width="130" valign="top" style="padding:12px 0;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;">Customer Info</div>
                  </td>
                  <td valign="top" style="padding:12px 0 12px 12px;">
                    ${contactHtml}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 16px 0;">
                <tr>
                  <td align="left">
                    <a href="${esc(viewJobUrl)}" style="display:inline-block;padding:14px 28px;background:#0f766e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:10px;line-height:1.2;box-shadow:0 2px 4px rgba(0,0,0,0.08);">
                      View Job Details →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px;border-top:1px solid #f1f5f9;background:#f8fafc;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;line-height:1.5;">
                Questions or issues? Contact support at <a href="mailto:${esc(supportEmail)}" style="color:#0f766e;text-decoration:none;font-weight:600;">${esc(supportEmail)}</a>
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                © ${year} ${esc(BRAND.legalEntity)}. All rights reserved.
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
