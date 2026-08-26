/**
 * services-lead-emails.ts
 * =======================
 *
 * Two email templates for the services quote-request funnel (Phase 3):
 *
 *   1. sendServicesLeadConfirmation — sent to the VISITOR who submitted the
 *      form. Confirms receipt, sets expectations ("we'll be in touch within
 *      1 business day"), and offers a secondary CTA to start a free CRM
 *      trial while they wait.
 *
 *   2. sendServicesLeadNotification — sent to services@fieseros.com (the
 *      Fieseros Services internal tenant's email) so the services team
 *      knows a new lead came in. Contains all the lead details + a link
 *      to the CRM Leads view.
 *
 * Both emails use the reusable promotional footer (src/lib/emails/promotional-footer.ts)
 * for brand consistency.
 *
 * Pattern mirrors claim-emails.ts: transactional usageType, no tenantId
 * (bypasses per-tenant email quota — these are platform-issued emails).
 */

import { sendEmail } from '@/lib/email-send';
import { logger } from '@/lib/logger';
import { renderPromotionalFooter } from '@/lib/emails/promotional-footer';

export interface ServicesLeadEmailContext {
  /** The visitor's name. */
  visitorName: string;
  /** The visitor's email (where the confirmation is sent). */
  visitorEmail: string;
  /** The visitor's phone. */
  visitorPhone: string;
  /** The business name they entered. */
  businessName: string;
  /** The service they're interested in (website / seo / google_ads). */
  service: string;
  /** The industry they selected (e.g. "Plumbing"). */
  industry?: string;
  /** Their budget range. */
  budget?: string;
  /** Their timeline. */
  timeline?: string;
  /** Their current website (if any). */
  currentWebsite?: string;
  /** Their project requirements (free text). */
  requirements?: string;
  /** The Lead ID (for the notification email's CRM link). */
  leadId: string;
  /** The base app URL. */
  appUrl: string;
}

const SERVICE_LABELS: Record<string, string> = {
  website: 'Website Development',
  seo: 'SEO & Local Search',
  google_ads: 'Google Ads Management',
};

function getServiceLabel(service: string): string {
  return SERVICE_LABELS[service] || service;
}

/**
 * Send the confirmation email to the visitor.
 * "Thanks for your interest — we'll be in touch within 1 business day."
 */
export async function sendServicesLeadConfirmation(ctx: ServicesLeadEmailContext): Promise<void> {
  const footer = renderPromotionalFooter({ appUrl: ctx.appUrl, existingUser: false });
  const serviceLabel = getServiceLabel(ctx.service);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thanks for your interest — Fieseros Services</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;line-height:52px;color:#0f766e;font-weight:700;font-size:22px;margin-bottom:12px;">&#10003;</div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">Thanks for your interest!</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">We received your request for ${escapeHtml(serviceLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 14px;">Hi ${escapeHtml(ctx.visitorName || 'there')},</p>
              <p style="margin:0 0 16px;">
                Thanks for reaching out to Fieseros Services! We&apos;ve received your request
                and one of our specialists will be in touch within <strong>1 business day</strong> to
                discuss your project.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:20px 0;">
                <p style="margin:0 0 8px;color:#0f766e;font-size:13px;font-weight:700;">Your request summary:</p>
                <table style="width:100%;font-size:13px;color:#475569;">
                  <tr><td style="padding:3px 0;color:#94a3b8;">Business:</td><td style="padding:3px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.businessName)}</td></tr>
                  <tr><td style="padding:3px 0;color:#94a3b8;">Service:</td><td style="padding:3px 0;font-weight:500;color:#0f172a;">${escapeHtml(serviceLabel)}</td></tr>
                  ${ctx.industry ? `<tr><td style="padding:3px 0;color:#94a3b8;">Industry:</td><td style="padding:3px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.industry)}</td></tr>` : ''}
                  ${ctx.budget ? `<tr><td style="padding:3px 0;color:#94a3b8;">Budget:</td><td style="padding:3px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.budget)}</td></tr>` : ''}
                  ${ctx.timeline ? `<tr><td style="padding:3px 0;color:#94a3b8;">Timeline:</td><td style="padding:3px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.timeline)}</td></tr>` : ''}
                </table>
              </div>

              <p style="color:#475569;font-size:14px;margin:16px 0 8px;">
                <strong>While you wait — start your free CRM trial.</strong><br>
                Explore the Fieseros platform that powers your future website. Manage leads, jobs,
                scheduling, and invoices from one dashboard.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
                <tr>
                  <td style="background-color:#0f766e;border-radius:10px;padding:13px 28px;">
                    <a href="${escapeHtml(ctx.appUrl)}/#signup" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Start Free CRM Trial &rarr;</a>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:11px;line-height:1.5;margin-top:16px;border-top:1px solid #f1f5f9;padding-top:12px;">
                Reference ID: <span style="font-family:monospace;">${ctx.leadId}</span><br>
                If you didn&apos;t submit this request, please reply to this email so we can investigate.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;">
              ${footer.html}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `Thanks for your interest — Fieseros Services

Hi ${ctx.visitorName || 'there'},

Thanks for reaching out! We've received your request for ${serviceLabel} and one of our specialists will be in touch within 1 business day.

Your request summary:
  Business: ${ctx.businessName}
  Service: ${serviceLabel}
  ${ctx.industry ? `Industry: ${ctx.industry}\n  ` : ''}${ctx.budget ? `Budget: ${ctx.budget}\n  ` : ''}${ctx.timeline ? `Timeline: ${ctx.timeline}\n` : ''}

While you wait — start your free CRM trial: ${ctx.appUrl}/#signup

Reference ID: ${ctx.leadId}

If you didn't submit this request, please reply to this email.

${footer.text}
  `.trim();

  try {
    const result = await sendEmail({
      to: ctx.visitorEmail,
      subject: `Thanks for your interest — Fieseros Services`,
      html,
      text,
      usageType: 'transactional',
    });
    logger.info(
      { component: 'services-lead-email', to: ctx.visitorEmail, leadId: ctx.leadId, simulated: (result as { simulated?: boolean }).simulated },
      'Services lead confirmation email sent',
    );
  } catch (err) {
    logger.error({ component: 'services-lead-email', err, leadId: ctx.leadId }, 'Failed to send services lead confirmation email');
  }
}

/**
 * Send the notification email to services@fieseros.com.
 * Contains all lead details + a link to the CRM Leads view.
 */
export async function sendServicesLeadNotification(ctx: ServicesLeadEmailContext): Promise<void> {
  const serviceLabel = getServiceLabel(ctx.service);
  const crmLeadsUrl = `${ctx.appUrl}/?utm_source=services_email&utm_medium=lead_notification&utm_campaign=crm_leads`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Services Lead — ${escapeHtml(ctx.businessName)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#fef3c7;border:1px solid #fde68a;border-radius:14px;line-height:52px;color:#d97706;font-weight:700;font-size:22px;margin-bottom:12px;">&#128276;</div>
              <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">New Services Lead</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">A new quote request was submitted</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:14px;line-height:1.65;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:16px 0;">
                <table style="width:100%;font-size:13px;color:#475569;">
                  <tr><td style="padding:4px 0;color:#94a3b8;width:120px;">Business:</td><td style="padding:4px 0;font-weight:600;color:#0f172a;">${escapeHtml(ctx.businessName)}</td></tr>
                  <tr><td style="padding:4px 0;color:#94a3b8;">Contact:</td><td style="padding:4px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.visitorName)}</td></tr>
                  <tr><td style="padding:4px 0;color:#94a3b8;">Email:</td><td style="padding:4px 0;font-weight:500;color:#0f172a;"><a href="mailto:${escapeHtml(ctx.visitorEmail)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(ctx.visitorEmail)}</a></td></tr>
                  <tr><td style="padding:4px 0;color:#94a3b8;">Phone:</td><td style="padding:4px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.visitorPhone)}</td></tr>
                  <tr><td style="padding:4px 0;color:#94a3b8;">Service:</td><td style="padding:4px 0;font-weight:500;color:#0f172a;">${escapeHtml(serviceLabel)}</td></tr>
                  ${ctx.industry ? `<tr><td style="padding:4px 0;color:#94a3b8;">Industry:</td><td style="padding:4px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.industry)}</td></tr>` : ''}
                  ${ctx.budget ? `<tr><td style="padding:4px 0;color:#94a3b8;">Budget:</td><td style="padding:4px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.budget)}</td></tr>` : ''}
                  ${ctx.timeline ? `<tr><td style="padding:4px 0;color:#94a3b8;">Timeline:</td><td style="padding:4px 0;font-weight:500;color:#0f172a;">${escapeHtml(ctx.timeline)}</td></tr>` : ''}
                  ${ctx.currentWebsite ? `<tr><td style="padding:4px 0;color:#94a3b8;">Current site:</td><td style="padding:4px 0;font-weight:500;color:#0f766e;"><a href="${escapeHtml(ctx.currentWebsite)}" target="_blank" rel="noopener noreferrer" style="color:#0f766e;text-decoration:none;">${escapeHtml(ctx.currentWebsite)}</a></td></tr>` : ''}
                </table>
              </div>

              ${ctx.requirements ? `
                <p style="margin:16px 0 6px;color:#0f766e;font-size:13px;font-weight:700;">Project requirements:</p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 14px;font-size:13px;color:#115e59;line-height:1.5;">
                  ${escapeHtml(ctx.requirements)}
                </div>
              ` : ''}

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
                <tr>
                  <td style="background-color:#0f766e;border-radius:10px;padding:12px 24px;">
                    <a href="${escapeHtml(crmLeadsUrl)}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View in CRM &rarr;</a>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:11px;line-height:1.5;margin-top:12px;border-top:1px solid #f1f5f9;padding-top:10px;">
                Lead ID: <span style="font-family:monospace;">${ctx.leadId}</span><br>
                Source: services_quote (Fieseros Services internal tenant)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `New Services Lead — ${ctx.businessName}

A new quote request was submitted.

Business: ${ctx.businessName}
Contact: ${ctx.visitorName}
Email: ${ctx.visitorEmail}
Phone: ${ctx.visitorPhone}
Service: ${serviceLabel}
${ctx.industry ? `Industry: ${ctx.industry}\n` : ''}${ctx.budget ? `Budget: ${ctx.budget}\n` : ''}${ctx.timeline ? `Timeline: ${ctx.timeline}\n` : ''}${ctx.currentWebsite ? `Current site: ${ctx.currentWebsite}\n` : ''}

${ctx.requirements ? `Project requirements:\n${ctx.requirements}\n\n` : ''}View in CRM: ${crmLeadsUrl}

Lead ID: ${ctx.leadId}
Source: services_quote (Fieseros Services internal tenant)
  `.trim();

  try {
    const result = await sendEmail({
      to: 'services@fieseros.com',
      subject: `New Services Lead — ${ctx.businessName} (${serviceLabel})`,
      html,
      text,
      usageType: 'transactional',
    });
    logger.info(
      { component: 'services-lead-email', leadId: ctx.leadId, simulated: (result as { simulated?: boolean }).simulated },
      'Services lead notification email sent to services@fieseros.com',
    );
  } catch (err) {
    logger.error({ component: 'services-lead-email', err, leadId: ctx.leadId }, 'Failed to send services lead notification email');
  }
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
