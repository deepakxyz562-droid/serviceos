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

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #0d9488); border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">S</div>
    <h1 style="color: #0f172a; font-size: 22px; margin: 12px 0 4px;">Claim Approved — ${escapeHtml(ctx.businessName)}</h1>
    <p style="color: #64748b; font-size: 14px; margin: 0;">You're now verified to manage this business</p>
  </div>

  <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <p style="margin: 0 0 8px; color: #14532d; font-size: 14px; font-weight: 600;">✓ Verification successful</p>
    <p style="margin: 0; color: #166534; font-size: 13px;">
      Your claim for <strong>${escapeHtml(ctx.businessName)}</strong> has been approved. You can now create your account and take ownership of this business listing.
    </p>
  </div>

  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
    Click the button below to create your Fieseros account. Once registered, you'll be able to:
  </p>

  <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px;">
    <li>Edit your public business profile (hours, photos, description)</li>
    <li>Respond to customer reviews</li>
    <li>Receive phone calls from the "Call now" button</li>
    <li>Upgrade to the full CRM for online bookings & quotes</li>
  </ul>

  <div style="text-align: center; margin: 28px 0;">
    <a href="${registrationLink}" style="display: inline-block; background: #10b981; color: white; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
      Create my account →
    </a>
  </div>

  <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    This link is unique to your claim request and expires after 7 days. If you didn't request this claim, please ignore this email.
  </p>
  <p style="color: #94a3b8; font-size: 11px; margin-top: 8px;">
    Reference ID: ${ctx.requestId}
  </p>
</div>
  `.trim();

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
      // No tenantId — bypasses quota gate (platform email for unclaimed business)
    });
    logger.info(
      { component: 'claim-email', requestId: ctx.requestId, simulated: result.simulated },
      'Claim approved email sent',
    );
  } catch (err) {
    logger.error({ component: 'claim-email', err, requestId: ctx.requestId }, 'Failed to send claim approved email');
  }
}

/**
 * Send the "Claim rejected" email. NO registration link.
 * Called when an admin rejects a pending claim.
 */
export async function sendClaimRejectedEmail(ctx: ClaimEmailContext): Promise<void> {
  const reasonText = ctx.reviewNote ? `<p style="color: #475569; font-size: 13px; margin: 12px 0;"><strong>Reason:</strong> ${escapeHtml(ctx.reviewNote)}</p>` : '';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-block; width: 48px; height: 48px; background: #fef2f2; border-radius: 12px; line-height: 48px;">
      <span style="color: #dc2626; font-size: 24px;">✕</span>
    </div>
    <h1 style="color: #0f172a; font-size: 22px; margin: 12px 0 4px;">Claim Update — ${escapeHtml(ctx.businessName)}</h1>
    <p style="color: #64748b; font-size: 14px; margin: 0;">Your claim request could not be verified</p>
  </div>

  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <p style="margin: 0; color: #991b1b; font-size: 13px;">
      After reviewing your claim for <strong>${escapeHtml(ctx.businessName)}</strong>, we were unable to verify your ownership. The listing remains unclaimed.
    </p>
  </div>

  ${reasonText}

  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
    If you believe this is an error, or if you have additional documentation to prove ownership, please contact our support team and reference the ID below.
  </p>

  <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    Reference ID: ${ctx.requestId}
  </p>
</div>
  `.trim();

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

/**
 * Send the "Claim under review" email. Confirmation of receipt.
 * Called immediately when a claim is submitted for admin review.
 */
export async function sendClaimUnderReviewEmail(ctx: ClaimEmailContext): Promise<void> {
  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #0d9488); border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">S</div>
    <h1 style="color: #0f172a; font-size: 22px; margin: 12px 0 4px;">Claim Received — ${escapeHtml(ctx.businessName)}</h1>
    <p style="color: #64748b; font-size: 14px; margin: 0;">We're reviewing your ownership claim</p>
  </div>

  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <p style="margin: 0; color: #92400e; font-size: 13px;">
      Thank you for submitting your claim for <strong>${escapeHtml(ctx.businessName)}</strong>. Our team will review your submission within 1-2 business days.
    </p>
  </div>

  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
    Once approved, you'll receive a second email with a link to create your account and take ownership of this business listing.
  </p>

  <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    Reference ID: ${ctx.requestId}
  </p>
</div>
  `.trim();

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
