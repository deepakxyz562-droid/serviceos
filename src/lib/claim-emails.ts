/**
 * claim-emails.ts
 * ================
 * Email templates + senders for the marketplace business-claim flow.
 *
 * Three email types:
 *   1. CLAIM_APPROVED   — sent when admin approves OR Google auto-approves.
 *                         Contains the registration link (magic token) so the
 *                         claimant can create their account and take ownership.
 *   2. CLAIM_REJECTED   — sent when admin rejects. NO registration link.
 *                         Claimant is told the listing stays unclaimed.
 *   3. CLAIM_UNDER_REVIEW — sent immediately when a claim is submitted for
 *                         admin review (document / email-only path). Confirms
 *                         receipt and sets expectation (1-2 business days).
 *
 * All emails are sent via `sendEmail()` from `@/lib/email-send` with
 * `usageType: 'transactional'` and NO `tenantId` — this bypasses the
 * per-tenant email quota gate because these are platform-issued emails
 * for an unclaimed business (the business has no owner account yet).
 */

import { sendEmail } from '@/lib/email-send';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

export interface ClaimEmailContext {
  /** The business name being claimed (tenant.name). */
  businessName: string;
  /** The claimant's submitted business email. */
  claimantEmail: string;
  /** The unique claim request ID (for support reference). */
  requestId: string;
  /** The secure token for the registration link (only for approved). */
  completionToken?: string;
  /** The base app URL (https://fieseros.com or local). */
  appUrl: string;
  /** Optional admin note (for rejection reason). */
  reviewNote?: string | null;
}

/**
 * Send the "Claim approved" email with a registration/confirmation link.
 * Called when:
 *   - Google Business Profile match ≥ 80% (auto_approved), OR
 *   - Admin manually approves a pending claim.
 *
 * The link is `/?claim=complete&token=<completionToken>`. The frontend
 * `ClaimCompletion` component validates the token and shows either a
 * "Create your account" form (anonymous) or "Confirm claim" button (logged in).
 */
export async function sendClaimApprovedEmail(ctx: ClaimEmailContext): Promise<void> {
  if (!ctx.completionToken) {
    logger.error(
      { component: 'claim-email', requestId: ctx.requestId },
      'sendClaimApprovedEmail called without completionToken — email not sent',
    );
    return;
  }

  const registrationLink = `${ctx.appUrl}/?claim=complete&token=${ctx.completionToken}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Approved — ${escapeHtml(ctx.businessName)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;line-height:52px;color:#0f766e;font-weight:700;font-size:22px;margin-bottom:12px;">✓</div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">Claim Approved!</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">You are verified to manage <strong>${escapeHtml(ctx.businessName)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <div style="background:#f0fdf4;border:1px solid #99f6e4;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
                <p style="margin:0 0 6px;color:#0f766e;font-size:14px;font-weight:700;">✓ Verification Successful</p>
                <p style="margin:0;color:#115e59;font-size:13px;line-height:1.5;">
                  Your claim for <strong>${escapeHtml(ctx.businessName)}</strong> has been approved. You can now create your account and take ownership of this business listing.
                </p>
              </div>

              <p style="color:#0f172a;font-weight:600;margin:0 0 12px;">Once registered, you'll be able to:</p>
              <ul style="color:#475569;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
                <li>Edit your public business profile (hours, photos, services)</li>
                <li>Respond to customer reviews & quotes</li>
                <li>Receive calls & inquiries directly</li>
                <li>Unlock automated appointment booking & invoicing</li>
              </ul>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 16px;">
                <tr>
                  <td style="background-color:#0f766e;border-radius:10px;padding:13px 28px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    <a href="${registrationLink}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;letter-spacing:-0.01em;">
                      Create Account & Claim Profile →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin-top:20px;">
                This link is unique to your claim request and expires in 7 days. Reference ID: <span style="font-family:monospace;">${ctx.requestId}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center;">
              Powered by <a href="https://fieseros.com" style="color:#0f766e;text-decoration:none;font-weight:600">Fieseros</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `Claim Approved — ${ctx.businessName}

Your claim for "${ctx.businessName}" has been approved. You can now create your Fieseros account and take ownership of this business listing.

Create your account: ${registrationLink}

This link is unique to your claim request and expires after 7 days.

Reference ID: ${ctx.requestId}
  `.trim();

  try {
    const result = await sendEmail({
      to: ctx.claimantEmail,
      subject: `✓ Claim Approved — ${ctx.businessName}`,
      html,
      text,
      usageType: 'transactional',
    });
    logger.info(
      { component: 'claim-email', requestId: ctx.requestId, simulated: result.simulated },
      'Claim approved email sent',
    );
  } catch (err) {
    logger.error({ component: 'claim-email', err, requestId: ctx.requestId }, 'Failed to send claim approved email');
  }
}

export async function sendClaimRejectedEmail(ctx: ClaimEmailContext): Promise<void> {
  const reasonText = ctx.reviewNote ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin:16px 0;color:#991b1b;font-size:13px;line-height:1.5;"><strong>Reason:</strong> ${escapeHtml(ctx.reviewNote)}</div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Update — ${escapeHtml(ctx.businessName)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#dc2626;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;line-height:52px;color:#dc2626;font-weight:700;font-size:22px;margin-bottom:12px;">✕</div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">Claim Update</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">Verification for <strong>${escapeHtml(ctx.businessName)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 16px;">
                After reviewing your claim for <strong>${escapeHtml(ctx.businessName)}</strong>, we were unable to verify your ownership at this time.
              </p>
              ${reasonText}
              <p style="color:#475569;font-size:14px;margin:16px 0 0;">
                If you believe this is an error or have additional business documentation, please contact support referencing ID: <span style="font-family:monospace;">${ctx.requestId}</span>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center;">
              Powered by <a href="https://fieseros.com" style="color:#0f766e;text-decoration:none;font-weight:600">Fieseros</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `Claim Update — ${ctx.businessName}

After reviewing your claim for "${ctx.businessName}", we were unable to verify your ownership. The listing remains unclaimed.

${ctx.reviewNote ? `Reason: ${ctx.reviewNote}\n\n` : ''}If you believe this is an error, please contact support.

Reference ID: ${ctx.requestId}
  `.trim();

  try {
    const result = await sendEmail({
      to: ctx.claimantEmail,
      subject: `Claim Update — ${ctx.businessName}`,
      html,
      text,
      usageType: 'transactional',
    });
    logger.info(
      { component: 'claim-email', requestId: ctx.requestId, simulated: result.simulated },
      'Claim rejected email sent',
    );
  } catch (err) {
    logger.error({ component: 'claim-email', err, requestId: ctx.requestId }, 'Failed to send claim rejected email');
  }
}

export async function sendClaimUnderReviewEmail(ctx: ClaimEmailContext): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Received — ${escapeHtml(ctx.businessName)}</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;line-height:52px;color:#d97706;font-weight:700;font-size:22px;margin-bottom:12px;">⏳</div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">Claim Received</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">We are reviewing your ownership request for <strong>${escapeHtml(ctx.businessName)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  Thank you for submitting your claim. Our verification team will review your details within <strong>1–2 business days</strong>.
                </p>
              </div>

              <p style="color:#475569;font-size:14px;margin:0 0 16px;">
                Once approved, you will receive a second email with a link to create your account and take ownership of your profile.
              </p>

              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin-top:20px;border-top:1px solid #f1f5f9;padding-top:16px;">
                Reference ID: <span style="font-family:monospace;">${ctx.requestId}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center;">
              Powered by <a href="https://fieseros.com" style="color:#0f766e;text-decoration:none;font-weight:600">Fieseros</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `Claim Received — ${ctx.businessName}

Thank you for submitting your claim for "${ctx.businessName}". Our team will review your submission within 1-2 business days.

Once approved, you'll receive a second email with a link to create your account.

Reference ID: ${ctx.requestId}
  `.trim();

  try {
    const result = await sendEmail({
      to: ctx.claimantEmail,
      subject: `Claim Received — ${ctx.businessName}`,
      html,
      text,
      usageType: 'transactional',
    });
    logger.info(
      { component: 'claim-email', requestId: ctx.requestId, simulated: result.simulated },
      'Claim under review email sent',
    );
  } catch (err) {
    logger.error({ component: 'claim-email', err, requestId: ctx.requestId }, 'Failed to send claim under review email');
  }
}

/**
 * Generate a cryptographically secure random token for the claim completion link.
 * 32 bytes = 64 hex chars. Unique per claim, stored in `completionToken`.
 */
export function generateClaimToken(): string {
  return randomBytes(32).toString('hex');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
