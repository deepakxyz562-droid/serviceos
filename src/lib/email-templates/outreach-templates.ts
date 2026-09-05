/**
 * Outreach Email Templates & Layout Renderer (Fieseros-standard)
 * ===============================================================
 *
 * Renders high-converting, responsive outreach emails with:
 *   - 600px centered white card container on #f8fafc canvas
 *   - Emerald gradient accent bar (#0f766e -> #10b981)
 *   - Modern header with Fieseros logo & category badge
 *   - Clean Inter/system typography with generous line-height
 *   - Highlight callout box with emerald accent border
 *   - High-converting pill CTA button with box-shadow
 *   - Secondary fallback URL box
 *   - Branded trust footer with copyright, support, and compliance
 *
 * All styles are inline for 100% email client compatibility (Gmail, Apple Mail, Outlook).
 */

import { BRAND, getAppUrl } from '@/lib/brand';

export interface OutreachEmailLayoutProps {
  /** Preheader text shown in email client preview snippet */
  preheader?: string;
  /** Badge text in header (e.g. "MARKETPLACE OPPORTUNITY", "CLAIM YOUR BUSINESS") */
  categoryBadge?: string;
  /** Main heading */
  headline?: string;
  /** Personalized greeting (e.g. "Hi Jodha Group,") */
  greeting?: string;
  /** Optional custom intro note */
  customLine?: string;
  /** Main body HTML content */
  bodyHtml: string;
  /** Primary CTA button text (e.g. "Enable Marketplace Leads") */
  ctaText?: string;
  /** Primary CTA link URL */
  ctaUrl?: string;
  /** Secondary small note below CTA (e.g. "This claim link expires in 7 days.") */
  subCtaNote?: string;
  /** Optional bullet points / feature highlights */
  highlights?: Array<{ title: string; desc?: string }>;
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

/**
 * Wrap any email body in the master Fieseros outreach layout.
 */
export function renderOutreachEmailLayout(props: OutreachEmailLayoutProps): string {
  const appUrl = getAppUrl();
  const preheaderText = props.preheader || props.headline || 'Opportunities on Fieseros Marketplace';
  const badge = props.categoryBadge || 'BUSINESS OUTREACH';
  const year = new Date().getFullYear();

  const customLineBlock = props.customLine && props.customLine.trim()
    ? `
      <tr>
        <td style="padding: 0 0 20px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px; padding: 12px 16px;">
            <tr>
              <td style="font-size: 14px; color: #166534; line-height: 1.5; font-style: italic;">
                "${esc(props.customLine)}"
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : '';

  const highlightsBlock = props.highlights && props.highlights.length > 0
    ? `
      <tr>
        <td style="padding: 16px 0 24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
            ${props.highlights.map(h => `
              <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                  <span style="display: inline-block; width: 18px; height: 18px; background-color: #dcfce7; color: #15803d; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; font-weight: bold;">✓</span>
                </td>
                <td style="padding: 6px 0 6px 8px; vertical-align: top;">
                  <span style="font-size: 14px; font-weight: 600; color: #1e293b;">${esc(h.title)}</span>
                  ${h.desc ? `<div style="font-size: 13px; color: #64748b; margin-top: 2px;">${esc(h.desc)}</div>` : ''}
                </td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    `
    : '';

  const ctaBlock = props.ctaText && props.ctaUrl
    ? `
      <tr>
        <td align="center" style="padding: 24px 0 12px 0;">
          <!-- Primary CTA Button -->
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); background-color: #10b981; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                <a href="${esc(props.ctaUrl)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                  ${esc(props.ctaText)} &rarr;
                </a>
              </td>
            </tr>
          </table>
          ${props.subCtaNote ? `
            <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
              ${esc(props.subCtaNote)}
            </div>
          ` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 0 8px 0; border-top: 1px solid #f1f5f9;">
          <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
            Or copy and paste this link into your browser:<br />
            <a href="${esc(props.ctaUrl)}" target="_blank" style="color: #059669; word-break: break-all; text-decoration: underline;">
              ${esc(props.ctaUrl)}
            </a>
          </div>
        </td>
      </tr>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(props.headline || preheaderText)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: none;">
  <!-- Preheader preview text -->
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f1f5f9;">
    ${esc(preheaderText)}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- 600px Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
          
          <!-- Top Emerald Gradient Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #0f766e 0%, #10b981 100%); background-color: #10b981; height: 6px; line-height: 6px; font-size: 6px;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 28px 36px 20px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Logo / Brand -->
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #0f766e 100%); border-radius: 8px; text-align: center; line-height: 32px; color: #ffffff; font-weight: 800; font-size: 16px; font-family: -apple-system, sans-serif;">
                            F
                          </div>
                        </td>
                        <td style="padding-left: 10px; vertical-align: middle;">
                          <span style="font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                            ${esc(BRAND.name)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${esc(badge)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #f1f5f9; width: 100%;"></div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 36px 36px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                
                ${props.greeting ? `
                  <tr>
                    <td style="font-size: 16px; font-weight: 700; color: #0f172a; padding-bottom: 16px;">
                      ${esc(props.greeting)}
                    </td>
                  </tr>
                ` : ''}

                ${customLineBlock}

                <!-- Main Text Body -->
                <tr>
                  <td style="font-size: 14px; line-height: 1.65; color: #334155;">
                    ${props.bodyHtml}
                  </td>
                </tr>

                ${highlightsBlock}
                ${ctaBlock}

                <!-- Sign-off -->
                <tr>
                  <td style="padding-top: 24px; font-size: 14px; color: #475569; line-height: 1.5;">
                    Best regards,<br />
                    <strong style="color: #0f172a;">The ${esc(BRAND.name)} Team</strong><br />
                    <span style="font-size: 12px; color: #94a3b8;">${esc(BRAND.tagline)}</span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    ${esc(BRAND.name)} &bull; ${esc(BRAND.tagline)}<br />
                    <a href="${esc(appUrl)}" target="_blank" style="color: #64748b; text-decoration: underline;">
                      ${esc(BRAND.domain)}
                    </a>
                    &bull;
                    <a href="mailto:${esc(BRAND.emails.support)}" style="color: #64748b; text-decoration: underline;">
                      Contact Support
                    </a>
                    <div style="margin-top: 8px; font-size: 11px; color: #cbd5e1;">
                      &copy; ${year} ${esc(BRAND.legalEntity)}. All rights reserved.
                    </div>
                  </td>
                </tr>
              </table>
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
 * Wrap arbitrary HTML in the master Fieseros template if not already wrapped.
 */
export function wrapInMasterOutreachLayout(htmlContent: string, vars: Record<string, string | undefined>): string {
  // If already a full HTML document, return as is
  if (htmlContent.trim().toLowerCase().startsWith('<!doctype') || htmlContent.trim().toLowerCase().startsWith('<html')) {
    return htmlContent;
  }

  const businessName = vars.businessName || 'there';
  const customLine = vars.customLine || '';
  const categoryBadge = vars.categoryBadge || 'OPPORTUNITY';

  return renderOutreachEmailLayout({
    categoryBadge,
    greeting: `Hi ${businessName},`,
    customLine: customLine || undefined,
    bodyHtml: htmlContent,
  });
}


// ─── 4 Pre-built High-Converting HTML Template Bodies ─────────────────────────

export const OUTREACH_TEMPLATES_CATALOG = [
  // 1. Claim Your Business
  {
    name: 'Claim Your Business',
    slug: 'outreach-claim-your-business',
    description: 'Sent to unclaimed businesses already listed on Fieseros. Includes a personalized claim link.',
    templateCategory: 'claim' as const,
    subject: 'Your business is already listed on Fieseros — claim your profile now',
    htmlBody: `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
  We noticed that <strong>{{businessName}}</strong> is already listed on the <strong>Fieseros</strong> service marketplace.
</p>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
  Claiming your profile is completely free and allows you to customize your information, verify your business credentials, and unlock customer booking requests directly.
</p>

<!-- Feature Box -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
  <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
    What you unlock upon claiming:
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 4px 0; font-size: 13px; color: #334155;">
        &bull; <strong>Full profile control:</strong> Update your services, hours, photos, and contact info
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0; font-size: 13px; color: #334155;">
        &bull; <strong>Direct customer inquiries:</strong> Receive incoming jobs from local clients
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0; font-size: 13px; color: #334155;">
        &bull; <strong>Verified business badge:</strong> Build trust with verified customer reviews
      </td>
    </tr>
  </table>
</div>

<!-- CTA Button -->
<div style="text-align: center; margin: 28px 0 16px 0;">
  <a href="{{claimLink}}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
    Claim Your Business Profile &rarr;
  </a>
  <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
    This secure claim link expires in 7 days.
  </div>
</div>`,
    textBody: `Hi {{businessName}},

We noticed that {{businessName}} is already listed on the Fieseros service marketplace.

Claiming your profile is completely free and allows you to customize your information, verify your business credentials, and unlock customer booking requests directly.

What you unlock upon claiming:
- Full profile control: Update your services, hours, photos, and contact info
- Direct customer inquiries: Receive incoming jobs from local clients
- Verified business badge: Build trust with verified customer reviews

Claim your business here: {{claimLink}}

This claim link expires in 7 days.

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'claimLink', label: 'Claim Link', required: true, example: 'https://fieseros.com/claim?token=...' },
    ]),
  },

  // 2. Marketplace Opportunity
  {
    name: 'Marketplace Opportunity',
    slug: 'outreach-marketplace-opportunity',
    description: 'Sent to claimed businesses not yet opted into the marketplace. Highlights lead-generation benefits.',
    templateCategory: 'outreach' as const,
    subject: 'Receive high-intent customer leads in {{city}} on Fieseros',
    htmlBody: `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
  You are already registered on <strong>Fieseros</strong> — but did you know you can also receive <strong>verified customer leads</strong> directly through our marketplace?
</p>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
  Homeowners and commercial clients in <strong>{{city}}</strong> are actively searching for <strong>{{industry}}</strong> professionals right now.
</p>

<!-- Stat Callout Card -->
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin: 20px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-size: 24px; vertical-align: middle; width: 36px;">🚀</td>
      <td style="vertical-align: middle; padding-left: 8px;">
        <div style="font-size: 14px; font-weight: 700; color: #065f46;">
          High-Intent Local Service Leads
        </div>
        <div style="font-size: 13px; color: #047857; margin-top: 2px;">
          Connect with ready-to-hire clients in your exact service area.
        </div>
      </td>
    </tr>
  </table>
</div>

<!-- CTA Button -->
<div style="text-align: center; margin: 28px 0 16px 0;">
  <a href="{{marketplaceUrl}}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
    Enable Marketplace Leads &rarr;
  </a>
</div>`,
    textBody: `Hi {{businessName}},

You are already on Fieseros — but did you know you can also receive verified customer leads directly through our marketplace?

Homeowners and commercial clients in {{city}} are actively searching for {{industry}} professionals right now.

Enable marketplace leads here: {{marketplaceUrl}}

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'city', label: 'City', required: false, example: 'Melbourne' },
      { key: 'industry', label: 'Industry', required: false, example: 'construction' },
      { key: 'marketplaceUrl', label: 'Marketplace URL', required: true, example: 'https://fieseros.com/jodha-group' },
    ]),
  },

  // 3. Complete Your Profile
  {
    name: 'Complete Your Profile',
    slug: 'outreach-complete-your-profile',
    description: 'Sent to claimed businesses with incomplete profiles. Encourages them to add services, hours, photos.',
    templateCategory: 'outreach' as const,
    subject: 'Complete your Fieseros profile to get up to 3x more customer inquiries',
    htmlBody: `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
  Great news — your business is listed on <strong>Fieseros</strong>! However, your public profile is currently incomplete.
</p>

<!-- 3x Inquiries Callout -->
<div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 20px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="font-size: 24px; vertical-align: middle; width: 36px;">📈</td>
      <td style="vertical-align: middle; padding-left: 8px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e40af;">
          3x More Inquiries for Complete Profiles
        </div>
        <div style="font-size: 13px; color: #1d4ed8; margin-top: 2px;">
          Adding your service catalog, business hours, and portfolio photos takes under 3 minutes.
        </div>
      </td>
    </tr>
  </table>
</div>

<!-- CTA Button -->
<div style="text-align: center; margin: 28px 0 16px 0;">
  <a href="{{marketplaceUrl}}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
    Complete Your Profile Now &rarr;
  </a>
</div>`,
    textBody: `Hi {{businessName}},

Great news — your business is listed on Fieseros! However, your profile is currently incomplete.

Businesses with complete profiles get up to 3x more customer inquiries on Fieseros. Adding your services, business hours, and photos takes under 3 minutes.

Complete your profile here: {{marketplaceUrl}}

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'marketplaceUrl', label: 'Marketplace URL', required: true, example: 'https://fieseros.com/abc-plumbing' },
    ]),
  },

  // 4. Welcome to Fieseros
  {
    name: 'Welcome to Fieseros',
    slug: 'outreach-welcome',
    description: 'Welcome email for newly listed businesses. Introduces Fieseros and platform capabilities.',
    templateCategory: 'outreach' as const,
    subject: 'Welcome to Fieseros, {{businessName}}!',
    htmlBody: `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
  Welcome to <strong>Fieseros</strong> — the modern operating system for field service businesses.
</p>
<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
  Your business is now featured on our marketplace. Here is how you can make the most out of your presence:
</p>

<!-- Checklist Box -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 4px 0; font-size: 13px; color: #334155;">
        &bull; <strong>Claim & customize:</strong> Manage your business profile, service areas, and pricing
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0; font-size: 13px; color: #334155;">
        &bull; <strong>Receive leads:</strong> Get instant notifications when customers request a quote
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0; font-size: 13px; color: #334155;">
        &bull; <strong>Field service suite:</strong> Dispatch jobs, generate invoices, and automate communications
      </td>
    </tr>
  </table>
</div>

<!-- CTA Button -->
<div style="text-align: center; margin: 28px 0 16px 0;">
  <a href="{{marketplaceUrl}}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
    Visit Your Public Listing &rarr;
  </a>
</div>`,
    textBody: `Hi {{businessName}},

Welcome to Fieseros — the operating system for service businesses.

Your business is now listed on our marketplace. Here is what you can do:
- Claim your profile to customize your information
- Receive customer booking requests directly
- Manage jobs, quotes, and customer communications

Visit your listing here: {{marketplaceUrl}}

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'marketplaceUrl', label: 'Marketplace URL', required: true, example: 'https://fieseros.com/abc-plumbing' },
    ]),
  },
];
