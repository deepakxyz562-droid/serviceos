/**
 * welcome-email.ts
 * ================
 *
 * Welcome email sent to a new business owner AFTER they verify their email.
 *
 * Previously sent in parallel with the verification email on registration —
 * but that was wrong UX (two emails at once before the user had verified).
 * Now the welcome email fires from the verify-email route, only after
 * emailVerified is confirmed true. The welcome email's purpose is onboarding
 * guidance: getting-started checklist, dashboard link, support contact.
 *
 * Mirrors the claim-emails.ts pattern: transactional usageType, no tenantId
 * (bypasses per-tenant email quota — this is a platform-issued email for a
 * brand-new tenant).
 */

import { sendEmail } from '@/lib/email-send';
import { logger } from '@/lib/logger';
import { renderPromotionalFooter } from '@/lib/emails/promotional-footer';

export interface WelcomeEmailContext {
  /** The business owner's name (User.name). */
  ownerName: string | null;
  /** The business name (Tenant.name). */
  businessName: string;
  /** The login URL (dashboard entry point). */
  appUrl: string;
  /** The tenant slug — used to build the public marketplace URL. */
  tenantSlug: string;
  /** Whether the tenant is opted into the marketplace. If false, the
   * "Your marketplace listing is live" section is hidden from the email. */
  marketplaceOptIn?: boolean;
}

/**
 * Send the welcome email to a specific address.
 * Non-blocking — errors are logged but don't fail the registration.
 */
export async function sendWelcomeEmailTo(
  to: string,
  ctx: WelcomeEmailContext,
): Promise<void> {
  const { ownerName, businessName, appUrl, tenantSlug, marketplaceOptIn = true } = ctx;
  const displayName = ownerName || 'there';
  const dashboardUrl = `${appUrl}/login`;
  const marketplaceUrl = `${appUrl}/provider/${tenantSlug}`;
  const footer = renderPromotionalFooter({ appUrl, existingUser: true });

  const html = renderWelcomeEmailHtml({
    displayName,
    businessName,
    dashboardUrl,
    marketplaceUrl,
    marketplaceOptIn,
    footerHtml: footer.html,
  });

  const result = await sendEmail({
    to,
    subject: `Welcome to Fieseros — let's get ${businessName} online`,
    html,
    text: welcomeText(displayName, businessName, dashboardUrl, marketplaceUrl, marketplaceOptIn, footer.text),
    usageType: 'transactional',
    // No tenantId — bypasses per-tenant email quota gate.
  });

  if (!result.success) {
    logger.error(
      { component: 'welcome-email', to, error: result.error },
      'Failed to send welcome email',
    );
  } else {
    logger.info(
      { component: 'welcome-email', to, businessName },
      'Welcome email sent',
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function welcomeText(
  displayName: string,
  businessName: string,
  dashboardUrl: string,
  marketplaceUrl: string,
  marketplaceOptIn: boolean,
  footerText: string,
): string {
  const marketplaceLine = marketplaceOptIn
    ? `5. Your marketplace listing is live: ${marketplaceUrl}`
    : '5. Opt in to the marketplace from your dashboard to get discovered by customers';
  return `Welcome to Fieseros, ${displayName}!

Your business "${businessName}" is now set up on Fieseros. Here's how to get started:

1. Verify your email (check your inbox for a separate verification email)
2. Complete your business profile — add your logo, services, and hours
3. Add your team members so they can start taking jobs
4. Connect Stripe to start accepting payments
${marketplaceLine}

Log in to your dashboard: ${dashboardUrl}

Need help? Reply to this email or visit our help center.

${footerText}`;
}

function renderWelcomeEmailHtml(params: {
  displayName: string;
  businessName: string;
  dashboardUrl: string;
  marketplaceUrl: string;
  marketplaceOptIn: boolean;
  footerHtml: string;
}): string {
  const { displayName, businessName, dashboardUrl, marketplaceUrl, marketplaceOptIn, footerHtml } = params;
  const step5Html = marketplaceOptIn
    ? `<tr><td style="padding:8px 0;color:#0f766e;font-size:14px;"><strong>&#9744; Step 5:</strong></td><td style="padding:8px 0;color:#334155;font-size:14px;">Your marketplace listing is live — share it with customers</td></tr>`
    : `<tr><td style="padding:8px 0;color:#0f766e;font-size:14px;"><strong>&#9744; Step 5:</strong></td><td style="padding:8px 0;color:#334155;font-size:14px;">Opt in to the marketplace from your dashboard to get discovered by customers</td></tr>`;
  const marketplaceBoxHtml = marketplaceOptIn
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-top:20px;">
                <p style="margin:0 0 4px;color:#0f766e;font-size:13px;font-weight:600;">Your marketplace listing</p>
                <p style="margin:0;color:#115e59;font-size:12px;line-height:1.5;word-break:break-all;font-family:monospace;">${escapeHtml(marketplaceUrl)}</p>
              </div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Fieseros</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;line-height:52px;color:#0f766e;font-weight:700;font-size:22px;margin-bottom:12px;">&#127881;</div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">Welcome to Fieseros!</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">Hi ${escapeHtml(displayName)}, your business <strong>${escapeHtml(businessName)}</strong> is all set up.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 16px;">You're ready to start managing customers, jobs, scheduling, invoicing, and payments — all in one place. Here's a quick getting-started checklist:</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
                <tr><td style="padding:8px 0;color:#0f766e;font-size:14px;"><strong>&#9745; Step 1:</strong></td><td style="padding:8px 0;color:#334155;font-size:14px;">Verify your email (check your inbox for a separate verification email)</td></tr>
                <tr><td style="padding:8px 0;color:#0f766e;font-size:14px;"><strong>&#9744; Step 2:</strong></td><td style="padding:8px 0;color:#334155;font-size:14px;">Complete your business profile — logo, services, hours</td></tr>
                <tr><td style="padding:8px 0;color:#0f766e;font-size:14px;"><strong>&#9744; Step 3:</strong></td><td style="padding:8px 0;color:#334155;font-size:14px;">Add your team members so they can take jobs</td></tr>
                <tr><td style="padding:8px 0;color:#0f766e;font-size:14px;"><strong>&#9744; Step 4:</strong></td><td style="padding:8px 0;color:#334155;font-size:14px;">Connect Stripe to start accepting payments</td></tr>
                ${step5Html}
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Go to my dashboard</a>
                  </td>
                </tr>
              </table>

              ${marketplaceBoxHtml}

              <p style="color:#64748b;font-size:13px;margin:24px 0 0;">Need help? Reply to this email or visit our help center — we're here to help you grow your business.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;">
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
