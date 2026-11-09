/**
 * BGOS Registered-User Email Templates
 * ====================================
 * Clean, Gmail/Outlook-compatible HTML + plain-text email builders tailored
 * exclusively for BGOS (bgos.fieseros.com). Pure functions — zero DB/network I/O.
 */

export const DEFAULT_BGOS_URL = 'https://bgos.fieseros.com';

export type BgosEmailKey =
  | 'bgos_verification'
  | 'bgos_password_reset'
  | 'bgos_welcome'
  | 'bgos_connect_gbp_nudge'
  | 'bgos_review_growth_0_to_5'
  | 'bgos_first_post_nudge'
  | 'bgos_unreplied_reviews'
  | 'bgos_trial_ending_2d'
  | 'bgos_trial_expired'
  | 'bgos_post_trial_inactive_3d'
  | 'bgos_post_trial_winback_14d'
  | 'bgos_promo_broadcast'
  | 'bgos_weekly_digest';

export interface RenderedBgosEmail {
  subject: string;
  html: string;
  text: string;
}

export interface BgosPriceSummary {
  currencyCode: 'INR' | 'USD';
  starterPrice: string;
  growthPrice: string;
  businessPrice: string;
}

export function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isSyntheticPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return true;
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return true;

  const [local, domain] = trimmed.split('@');
  if (!local || !domain) return true;

  if (domain.endsWith('.local') || domain.endsWith('.invalid')) {
    return true;
  }
  if (domain === 'bgos.fieseros.com' && local.startsWith('phone_')) {
    return true;
  }
  // Apple fallback synthetic address when identityToken + clientEmail both omit real relay email
  if (domain === 'privaterelay.appleid.com' && /^\d{6}\.[a-f0-9]{16,}\.\d+$/i.test(local)) {
    return true;
  }
  return false;
}

/**
 * Filter out synthetic placeholder accounts (mobile phone placeholders,
 * local-only addresses, test domains) that cannot receive real email.
 */
export function isDeliverableEmail(email: string | null | undefined): boolean {
  if (isSyntheticPlaceholderEmail(email)) return false;
  const domain = email!.trim().toLowerCase().split('@')[1] || '';
  if (
    domain.endsWith('.test') ||
    domain === 'example.com' ||
    domain === 'example.org' ||
    domain === 'test.com'
  ) {
    return false;
  }
  return true;
}

export function resolveBgosBaseUrl(candidate?: string | null): string {
  const envUrl = (process.env.BGOS_PUBLIC_URL || '').trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }
  if (candidate) {
    const clean = candidate.trim().replace(/\/+$/, '');
    if (
      clean.includes('bgos.') ||
      clean.startsWith('http://localhost') ||
      clean.startsWith('http://127.0.0.1')
    ) {
      return clean;
    }
  }
  return DEFAULT_BGOS_URL;
}

export function getBgosPricingForTenant(opts?: {
  country?: string | null;
  currency?: string | null;
  phone?: string | null;
}): BgosPriceSummary {
  const country = (opts?.country || '').trim().toUpperCase();
  const currency = (opts?.currency || '').trim().toUpperCase();
  const phone = (opts?.phone || '').trim();

  const isIndia =
    currency === 'INR' ||
    country === 'IN' ||
    country === 'INDIA' ||
    phone.startsWith('+91');

  if (isIndia) {
    return {
      currencyCode: 'INR',
      starterPrice: '₹499/mo',
      growthPrice: '₹1,499/mo',
      businessPrice: '₹3,999/mo',
    };
  }
  return {
    currencyCode: 'USD',
    starterPrice: '$9/mo',
    growthPrice: '$29/mo',
    businessPrice: '$79/mo',
  };
}

export function buildGoogleReviewLink(placeId?: string | null): string | null {
  if (!placeId || typeof placeId !== 'string') return null;
  const clean = placeId.trim();
  if (!clean) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(clean)}`;
}

// ─── Shared Responsive HTML Shell ──────────────────────────────────────────

interface ShellOptions {
  title: string;
  preheader?: string;
  accentColor?: string;
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  bodyHtml: string;
  appUrl: string;
  includeUnsubscribe: boolean;
  reasonLine?: string;
}

function renderBgosEmailShell(opts: ShellOptions): string {
  const accent = opts.accentColor || '#009F50';
  const appUrl = opts.appUrl.replace(/\/+$/, '');
  const year = new Date().getFullYear();
  const supportUrl = `${appUrl}/app?product=bgos&view=helpCenter`;
  const prefsUrl = `${appUrl}/app?product=bgos&view=settings`;

  const preheaderHtml = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f1f5f9;">${escapeHtml(opts.preheader)}</div>`
    : '';

  const unsubHtml = opts.includeUnsubscribe
    ? `<p style="margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
         ${escapeHtml(opts.reasonLine || 'You received this email because you registered a BGOS workspace and enabled product growth tips.')}
         <br/>
         <a href="{{unsubscribe_url}}" style="color:#475569;text-decoration:underline;">Unsubscribe</a>
         &nbsp;&middot;&nbsp;
         <a href="${escapeHtml(prefsUrl)}" style="color:#475569;text-decoration:underline;">Email preferences</a>
       </p>`
    : `<p style="margin:10px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
         This is a required account notification for your BGOS workspace.
       </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(15,23,42,0.05);">
          <tr>
            <td style="background-color:${accent};height:6px;line-height:6px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 36px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background-color:#ecfdf5;color:#00665D;border:1px solid #bbf7d0;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;letter-spacing:0.03em;">
                      BGOS &middot; Business Growth OS
                    </span>
                  </td>
                </tr>
              </table>
              ${opts.eyebrow ? `<p style="margin:16px 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${accent};">${escapeHtml(opts.eyebrow)}</p>` : ''}
              <h1 style="margin:${opts.eyebrow ? '4px' : '16px'} 0 6px;font-size:23px;line-height:1.3;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">
                ${escapeHtml(opts.headline)}
              </h1>
              ${opts.subheadline ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#64748b;">${escapeHtml(opts.subheadline)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 36px 32px;font-size:15px;line-height:1.65;color:#334155;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;">
                <a href="${escapeHtml(appUrl)}" style="color:#009F50;font-weight:600;text-decoration:none;">BGOS Dashboard</a>
                &nbsp;&middot;&nbsp;
                <a href="${escapeHtml(supportUrl)}" style="color:#475569;text-decoration:none;">Help Center</a>
                &nbsp;&middot;&nbsp;
                <a href="https://fieseros.com/privacy-policy" style="color:#475569;text-decoration:none;">Privacy</a>
              </p>
              ${unsubHtml}
              <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">
                &copy; ${year} BGOS by Fieseros. All rights reserved.
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

function renderPrimaryButton(label: string, url: string, bg = '#009F50'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
    <tr>
      <td style="background-color:${bg};border-radius:10px;">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

// ─── 1. BGOS Email Verification (Transactional) ────────────────────────────

export function renderBgosVerificationEmail(params: {
  ownerName?: string | null;
  verifyLink: string;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const displayName = (params.ownerName || 'there').trim();

  const html = renderBgosEmailShell({
    title: 'Verify your email — BGOS',
    preheader: 'Confirm your email address to activate your BGOS workspace.',
    eyebrow: 'Email Verification',
    headline: 'Verify your email address',
    subheadline: `Welcome to BGOS, ${displayName}! One quick click activates your workspace.`,
    appUrl,
    includeUnsubscribe: false,
    bodyHtml: `
      <p style="margin:0 0 16px;">Click below to verify your email address and unlock your BGOS 7-day free trial (Google Business Profile growth, AI review replies, social posts &amp; QR standees).</p>
      ${renderPrimaryButton('Verify Email & Open BGOS', params.verifyLink)}
      <p style="margin:16px 0 6px;font-size:13px;color:#64748b;">Or copy and paste this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:12px;color:#00665D;word-break:break-all;font-family:monospace;background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
        ${escapeHtml(params.verifyLink)}
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;">
        <p style="margin:0;font-size:12px;color:#92400e;">This verification link expires in 24 hours. If you did not create a BGOS account, you can safely ignore this message.</p>
      </div>`,
  });

  const text = `Verify your email — BGOS

Hi ${displayName},

Welcome to BGOS! Click the link below to confirm your email address and activate your workspace:
${params.verifyLink}

This link expires in 24 hours. If you did not create a BGOS account, you can safely ignore this email.`;

  return {
    subject: 'Verify your email — BGOS',
    html,
    text,
  };
}

// ─── 2. BGOS Password Reset (Transactional) ────────────────────────────────

export function renderBgosPasswordResetEmail(params: {
  ownerName?: string | null;
  businessName?: string | null;
  resetUrl: string;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const displayName = (params.ownerName || 'there').trim();
  const biz = params.businessName ? ` for ${params.businessName}` : '';

  const html = renderBgosEmailShell({
    title: 'Reset your BGOS password',
    preheader: 'Reset your BGOS account password within the next 24 hours.',
    eyebrow: 'Account Security',
    headline: 'Reset your password',
    subheadline: `Hi ${displayName}, we received a request to reset your BGOS password${biz}.`,
    appUrl,
    includeUnsubscribe: false,
    bodyHtml: `
      <p style="margin:0 0 14px;">Click the button below to choose a new password for your BGOS account:</p>
      ${renderPrimaryButton('Set New Password →', params.resetUrl)}
      <p style="margin:14px 0 6px;font-size:13px;color:#64748b;">If the button doesn&apos;t work, copy this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:12px;color:#00665D;word-break:break-all;font-family:monospace;background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
        ${escapeHtml(params.resetUrl)}
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
        <p style="margin:0;font-size:12px;color:#475569;">This link expires in 24 hours and can only be used once. If you didn&apos;t request a password reset, you can safely ignore this email.</p>
      </div>`,
  });

  const text = `Reset your BGOS password

Hi ${displayName},

We received a request to reset your BGOS password${biz}. Use the link below to set a new password:
${params.resetUrl}

This link expires in 24 hours. If you did not request a password reset, you can ignore this email.`;

  return {
    subject: 'Reset your BGOS password',
    html,
    text,
  };
}

// ─── 3. Fieseros Branded Password Reset (Transactional Fallback) ────────────

export function renderFieserosPasswordResetEmail(params: {
  ownerName?: string | null;
  businessName?: string | null;
  resetUrl: string;
  appUrl: string;
}): RenderedBgosEmail {
  const displayName = (params.ownerName || 'there').trim();
  const biz = params.businessName ? ` (${escapeHtml(params.businessName)})` : '';
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset your password — Fieseros</title></head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;margin:0;padding:28px 16px;color:#1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="background:#0f766e;height:6px;line-height:6px;">&nbsp;</td></tr>
        <tr><td style="padding:32px 36px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Reset your password</h1>
          <p style="margin:0 0 18px;font-size:14px;color:#64748b;">Hi ${escapeHtml(displayName)}${biz}, click below to set a new password for your Fieseros account.</p>
          ${renderPrimaryButton('Reset Password →', params.resetUrl, '#0f766e')}
          <p style="margin:14px 0 6px;font-size:12px;color:#64748b;">Or copy this link:</p>
          <p style="margin:0 0 18px;font-size:12px;color:#0f766e;word-break:break-all;font-family:monospace;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;">${escapeHtml(params.resetUrl)}</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">This link expires in 24 hours. If you did not request a reset, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: 'Reset your Fieseros password',
    html,
    text: `Hi ${displayName},\n\nUse this link to reset your Fieseros password:\n${params.resetUrl}\n\nThis link expires in 24 hours. If you did not request it, you can ignore this email.`,
  };
}

// ─── 4. BGOS Day-0 Welcome Email ───────────────────────────────────────────

export function renderBgosWelcomeEmail(params: {
  ownerName?: string | null;
  businessName: string;
  appUrl?: string;
  trialDays?: number;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const displayName = (params.ownerName || 'there').trim();
  const biz = params.businessName.trim() || 'your business';
  const integrationsUrl = `${appUrl}/app?product=bgos&view=integrations`;
  const reviewsUrl = `${appUrl}/app?product=bgos&view=reviews`;
  const studioUrl = `${appUrl}/app?product=bgos&view=socialMedia`;
  const trialText = params.trialDays && params.trialDays > 0
    ? `Your ${params.trialDays}-day free trial is live — let's put ${biz} in front of more local customers.`
    : `Your BGOS workspace is live — let's put ${biz} in front of more local customers.`;

  const html = renderBgosEmailShell({
    title: `Welcome to BGOS — ${biz}`,
    preheader: `3 quick steps to grow ${biz} on Google Search & Maps.`,
    eyebrow: 'Welcome to BGOS',
    headline: `Welcome aboard, ${displayName}!`,
    subheadline: trialText,
    appUrl,
    includeUnsubscribe: true,
    reasonLine: 'You received this welcome guide because you created a BGOS account.',
    bodyHtml: `
      <p style="margin:0 0 18px;">BGOS is built to help <strong>${escapeHtml(biz)}</strong> get more 5-star Google reviews, stay active on Google &amp; social channels, and convert local searches into paying customers.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;">Your 3-minute setup checklist</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:7px 0;vertical-align:top;width:28px;color:#009F50;font-weight:700;">1.</td>
            <td style="padding:7px 0;font-size:14px;">
              <strong>Connect your Google Business Profile</strong><br/>
              <span style="color:#64748b;font-size:13px;">Sync your business location, reviews &amp; Google Maps insights.</span>
              <a href="${escapeHtml(integrationsUrl)}" style="color:#009F50;font-size:13px;font-weight:600;text-decoration:none;"> Connect now &rarr;</a>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;vertical-align:top;width:28px;color:#009F50;font-weight:700;">2.</td>
            <td style="padding:7px 0;font-size:14px;">
              <strong>Start collecting 5-star reviews</strong><br/>
              <span style="color:#64748b;font-size:13px;">Share your direct Google review link or download a counter QR standee.</span>
              <a href="${escapeHtml(reviewsUrl)}" style="color:#009F50;font-size:13px;font-weight:600;text-decoration:none;"> Open Reviews &rarr;</a>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;vertical-align:top;width:28px;color:#009F50;font-weight:700;">3.</td>
            <td style="padding:7px 0;font-size:14px;">
              <strong>Schedule your first AI update or poster</strong><br/>
              <span style="color:#64748b;font-size:13px;">Use your real business photos to generate posts and keep your profile active.</span>
              <a href="${escapeHtml(studioUrl)}" style="color:#009F50;font-size:13px;font-weight:600;text-decoration:none;"> Open Studio &rarr;</a>
            </td>
          </tr>
        </table>
      </div>
      ${renderPrimaryButton('Open Your BGOS Dashboard →', appUrl)}
      <p style="margin:8px 0 0;font-size:13px;color:#64748b;">Need help getting set up? Simply reply to this email anytime.</p>`,
  });

  const text = `Welcome to BGOS, ${displayName}!

${trialText}

Your 3-minute setup checklist for ${biz}:
1. Connect your Google Business Profile: ${integrationsUrl}
2. Get more Google reviews & QR Standee: ${reviewsUrl}
3. Schedule your first AI update or photo: ${studioUrl}

Open BGOS: ${appUrl}

Unsubscribe from growth tips: {{unsubscribe_url}}`;

  return {
    subject: `Welcome to BGOS — let's grow ${biz} on Google`,
    html,
    text,
  };
}

// ─── 5. Google-Inspired "Go from X to more than 5 reviews" Nudge ──────────

export function renderBgosReviewGrowthEmail(params: {
  businessName: string;
  reviewCount: number;
  placeId?: string | null;
  reviewUrl?: string | null;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const count = Math.max(0, Math.floor(params.reviewCount || 0));
  const reviewLink =
    (typeof params.reviewUrl === 'string' && params.reviewUrl.startsWith('http')
      ? params.reviewUrl.trim()
      : null) || buildGoogleReviewLink(params.placeId);
  const reviewsUrl = `${appUrl}/app?product=bgos&view=reviews`;
  const helpUrl = `${appUrl}/app?product=bgos&view=helpCenter`;

  const headline = `Go from ${count} to more than 5 reviews`;

  const linkBlock = reviewLink
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin:18px 0;">
         <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#00665D;">Share your direct Google review link with customers:</p>
         <p style="margin:0;font-size:13px;word-break:break-all;font-family:monospace;line-height:1.5;">
           <a href="${escapeHtml(reviewLink)}" style="color:#00665D;text-decoration:underline;">${escapeHtml(reviewLink)}</a>
         </p>
       </div>`
    : `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin:18px 0;">
         <p style="margin:0;font-size:13px;color:#334155;">Open BGOS Reviews to generate your 1-click Google review link and printable QR counter standee in seconds.</p>
       </div>`;

  const html = renderBgosEmailShell({
    title: `${headline} — BGOS`,
    preheader: 'Business Profiles with 5+ Google reviews can get up to twice as many customers.',
    accentColor: '#009F50',
    eyebrow: 'Google Review Growth Tip',
    headline,
    subheadline: 'Business Profiles like yours with 5 or more reviews can get up to twice as many customers.',
    appUrl,
    includeUnsubscribe: true,
    reasonLine: 'This email was sent to help you improve your Google Business Profile performance on BGOS.',
    bodyHtml: `
      <p style="margin:0 0 14px;"><strong>${escapeHtml(biz)}</strong>, customer reviews are one of the fastest ways to build trust, show you&apos;re established, and stand out when local buyers find your profile on Google.</p>
      ${linkBlock}
      <p style="margin:0 0 6px;font-size:14px;color:#475569;">Send this link to your last 5–10 happy customers on WhatsApp or print your free BGOS QR Standee at your reception counter.</p>
      ${renderPrimaryButton('Share Review Link & Get QR Standee →', reviewsUrl)}
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
        Want best-practice tips? <a href="${escapeHtml(helpUrl)}" style="color:#009F50;text-decoration:underline;">Visit the Help Center</a> or reply to this email.
      </p>`,
  });

  const text = `${headline}

Business Profiles like yours with 5 or more reviews can get up to twice as many customers.

${biz}, customer reviews are a great way to build trust, show you're established, and stand out when customers view your profile on Google.

${reviewLink ? `Share your review link with customers:\n${reviewLink}\n\n` : ''}Get your QR Standee & send review invites in BGOS:
${reviewsUrl}

Help Center: ${helpUrl}
Unsubscribe: {{unsubscribe_url}}`;

  return {
    subject: `${headline}, ${biz}`,
    html,
    text,
  };
}

// ─── 6. Behavior Activation Nudges (GBP Not Connected / 0 Posts / Pending Replies)

export function renderBgosConnectGbpNudgeEmail(params: {
  businessName: string;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const connectUrl = `${appUrl}/app?product=bgos&view=integrations`;

  const html = renderBgosEmailShell({
    title: `Connect Google Business Profile — ${biz}`,
    preheader: `Link your Google profile in 60 seconds to unlock review replies & auto-posting.`,
    eyebrow: 'Quick Setup Step',
    headline: 'Connect your Google Business Profile in 60 seconds',
    subheadline: `${biz} is ready in BGOS — finish connecting Google to start growing.`,
    appUrl,
    includeUnsubscribe: true,
    bodyHtml: `
      <p style="margin:0 0 14px;">Once your Google Business Profile is linked, BGOS automatically pulls in customer reviews, generates AI replies in your brand voice, and lets you publish photos &amp; updates straight to Google Maps.</p>
      ${renderPrimaryButton('Connect Google Business Profile →', connectUrl)}`,
  });

  return {
    subject: `Connect ${biz}'s Google Business Profile in 60 seconds`,
    html,
    text: `Connect your Google Business Profile in 60 seconds\n\nLink Google to unlock automated review replies and GBP posts for ${biz}:\n${connectUrl}\n\nUnsubscribe: {{unsubscribe_url}}`,
  };
}

export function renderBgosFirstPostNudgeEmail(params: {
  businessName: string;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const studioUrl = `${appUrl}/app?product=bgos&view=socialMedia`;

  const html = renderBgosEmailShell({
    title: `Publish your first Google update — ${biz}`,
    preheader: 'Create an AI business image or schedule a Google post in one click.',
    eyebrow: 'Visibility Boost',
    headline: 'Keep your Google Profile active with 1 click',
    subheadline: `Businesses that post weekly updates stay higher in Google Maps local searches.`,
    appUrl,
    includeUnsubscribe: true,
    bodyHtml: `
      <p style="margin:0 0 14px;"><strong>${escapeHtml(biz)}</strong> hasn&apos;t published its first update yet. Upload a business photo — or let BGOS AI generate a promotional visual using your existing business photos — and publish directly to Google.</p>
      ${renderPrimaryButton('Create & Schedule First Post →', studioUrl)}`,
  });

  return {
    subject: `Publish ${biz}'s first Google post with AI Studio`,
    html,
    text: `Keep ${biz}'s Google Business Profile active.\n\nCreate or schedule your first post with BGOS AI Studio:\n${studioUrl}\n\nUnsubscribe: {{unsubscribe_url}}`,
  };
}

export function renderBgosUnrepliedReviewsEmail(params: {
  businessName: string;
  pendingCount: number;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const n = Math.max(1, params.pendingCount);
  const reviewsUrl = `${appUrl}/app?product=bgos&view=reviews`;

  const html = renderBgosEmailShell({
    title: `${n} customer review${n === 1 ? '' : 's'} waiting for a reply`,
    preheader: `Reply faster to boost customer trust on ${biz}'s Google profile.`,
    eyebrow: 'Review Alert',
    headline: `${n} Google review${n === 1 ? '' : 's'} awaiting your reply`,
    subheadline: `Fast replies show Google and future buyers that ${biz} actively cares about service.`,
    appUrl,
    includeUnsubscribe: true,
    bodyHtml: `
      <p style="margin:0 0 14px;">You currently have <strong>${n}</strong> customer review${n === 1 ? '' : 's'} on Google with no reply yet. Open BGOS to generate and publish an AI-drafted reply in one click.</p>
      ${renderPrimaryButton('Reply to Reviews Now →', reviewsUrl)}`,
  });

  return {
    subject: `${n} Google review${n === 1 ? '' : 's'} waiting for your reply — ${biz}`,
    html,
    text: `${n} Google review${n === 1 ? '' : 's'} waiting for a reply on ${biz}.\n\nOpen BGOS to reply in one click: ${reviewsUrl}\n\nUnsubscribe: {{unsubscribe_url}}`,
  };
}

// ─── 7. Trial Lifecycle (7-Day Trial Ending Soon & Trial Expired) ───────────

export function renderBgosTrialEndingEmail(params: {
  businessName: string;
  daysRemaining: number;
  trialEndsAtLabel: string;
  reviewsCount: number;
  postsCount: number;
  pricing: BgosPriceSummary;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const days = Math.max(1, params.daysRemaining);
  const billingUrl = `${appUrl}/app?product=bgos&view=billing`;

  const html = renderBgosEmailShell({
    title: `Your BGOS trial ends in ${days} day${days === 1 ? '' : 's'}`,
    preheader: `Keep ${biz}'s AI review automation & Google growth running smoothly.`,
    accentColor: '#d97706',
    eyebrow: 'Trial Reminder',
    headline: `Your 7-day BGOS trial ends in ${days} day${days === 1 ? '' : 's'}`,
    subheadline: `${biz} — ends on ${params.trialEndsAtLabel}.`,
    appUrl,
    includeUnsubscribe: false,
    bodyHtml: `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;margin-bottom:18px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#92400e;">Workspace Activity Snapshot</p>
        <p style="margin:0;font-size:14px;color:#78350f;">
          Synced reviews: <strong>${params.reviewsCount}</strong> &nbsp;&middot;&nbsp; Posts created: <strong>${params.postsCount}</strong>
        </p>
      </div>
      <p style="margin:0 0 14px;">Upgrade before <strong>${escapeHtml(params.trialEndsAtLabel)}</strong> to keep AI review auto-replies, unlimited forms, appointment scheduling, and Google Studio uninterrupted — starting at <strong>${escapeHtml(params.pricing.starterPrice)}</strong> (Starter) or <strong>${escapeHtml(params.pricing.growthPrice)}</strong> (Growth).</p>
      ${renderPrimaryButton('Choose a BGOS Plan →', billingUrl, '#d97706')}
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Your data, synced reviews, and connected accounts stay safe regardless of when you upgrade.</p>`,
  });

  return {
    subject: `Your BGOS trial for ${biz} ends in ${days} day${days === 1 ? '' : 's'}`,
    html,
    text: `Your BGOS 7-day trial for ${biz} ends in ${days} day${days === 1 ? '' : 's'} (${params.trialEndsAtLabel}).\n\nStarter starts at ${params.pricing.starterPrice} and Growth at ${params.pricing.growthPrice}.\nUpgrade now: ${billingUrl}`,
  };
}

export function renderBgosTrialExpiredEmail(params: {
  businessName: string;
  pricing: BgosPriceSummary;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const billingUrl = `${appUrl}/app?product=bgos&view=billing`;

  const html = renderBgosEmailShell({
    title: `Your BGOS trial has ended — ${biz}`,
    preheader: `Keep growing ${biz} on Free (${params.pricing.currencyCode === 'INR' ? '₹0' : '$0'}) or upgrade starting at ${params.pricing.starterPrice}.`,
    accentColor: '#00665D',
    eyebrow: 'Trial Ended',
    headline: `Your 7-day BGOS trial has ended`,
    subheadline: `Your workspace and Google data for ${biz} are safely preserved.`,
    appUrl,
    includeUnsubscribe: false,
    bodyHtml: `
      <p style="margin:0 0 14px;">Your trial period wrapped up today. Here is how you can continue using BGOS:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:18px;">
        <p style="margin:0 0 8px;font-size:14px;"><strong>Free Plan (${params.pricing.currencyCode === 'INR' ? '₹0' : '$0'}):</strong> Digital business card &amp; QR, 1 hosted intake form, up to 100 contacts.</p>
        <p style="margin:0 0 8px;font-size:14px;"><strong>Starter (${escapeHtml(params.pricing.starterPrice)}):</strong> Unlimited forms, AI chatbot, shared inbox &amp; scheduling.</p>
        <p style="margin:0;font-size:14px;"><strong>Growth (${escapeHtml(params.pricing.growthPrice)}):</strong> Automated review requests, email outreach &amp; growth workflows.</p>
      </div>
      ${renderPrimaryButton('Upgrade BGOS Plan →', billingUrl)}`,
  });

  return {
    subject: `Your BGOS 7-day trial ended — keep ${biz} growing`,
    html,
    text: `Your 7-day BGOS trial for ${biz} has ended. Your data is safely saved.\n\nYou can stay on Free or upgrade to Starter (${params.pricing.starterPrice}) / Growth (${params.pricing.growthPrice}):\n${billingUrl}`,
  };
}

// ─── 8. Post-Trial Unpaid + Inactive Rescue (Day +3 & Day +14 Win-Back) ─────

export function renderBgosPostTrialInactiveEmail(params: {
  businessName: string;
  inactiveDays: number;
  gbpConnected: boolean;
  reviewsCount: number;
  pricing: BgosPriceSummary;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const billingUrl = `${appUrl}/app?product=bgos&view=billing`;
  const dashboardUrl = `${appUrl}/app?product=bgos&view=dashboard`;

  const statusLine = params.gbpConnected
    ? `${biz} has Google Business Profile connected (${params.reviewsCount} synced review${params.reviewsCount === 1 ? '' : 's'}), but your automated growth tools haven't been activated yet.`
    : `${biz}'s BGOS workspace is still waiting — we haven't seen activity in ${params.inactiveDays} days.`;

  const html = renderBgosEmailShell({
    title: `${biz} — pick up where you left off on BGOS`,
    preheader: `Your workspace is saved. Turn local Google searches into customers starting at ${params.pricing.starterPrice}.`,
    eyebrow: 'Workspace Reminder',
    headline: `Your Google growth tools for ${biz} are waiting`,
    subheadline: `No payment has been added yet — and your free workspace data is still intact.`,
    appUrl,
    includeUnsubscribe: true,
    reasonLine: 'You received this reminder because your BGOS trial ended without an active paid plan.',
    bodyHtml: `
      <p style="margin:0 0 14px;">${escapeHtml(statusLine)}</p>
      <p style="margin:0 0 14px;">Customers searching Google Maps choose businesses with recent photos, active updates, and fast review replies. Even starting with BGOS Free QR tools — or upgrading to <strong>Starter (${escapeHtml(params.pricing.starterPrice)})</strong> — keeps ${escapeHtml(biz)} visible every week.</p>
      ${renderPrimaryButton('Activate BGOS Plan →', billingUrl)}
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
        Or <a href="${escapeHtml(dashboardUrl)}" style="color:#009F50;font-weight:600;text-decoration:underline;">sign in to your Free workspace</a> to view your review link and QR tools.
      </p>`,
  });

  return {
    subject: `${biz}, your Google Business growth tools are waiting on BGOS`,
    html,
    text: `${statusLine}\n\nYour BGOS workspace is saved. Upgrade anytime starting at ${params.pricing.starterPrice}: ${billingUrl}\nOr open your dashboard: ${dashboardUrl}\n\nUnsubscribe: {{unsubscribe_url}}`,
  };
}

export function renderBgosWinBackEmail(params: {
  businessName: string;
  inactiveDays: number;
  pricing: BgosPriceSummary;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';
  const billingUrl = `${appUrl}/app?product=bgos&view=billing`;
  const studioUrl = `${appUrl}/app?product=bgos&view=socialMedia`;

  const html = renderBgosEmailShell({
    title: `What's new in BGOS for ${biz}`,
    preheader: `Turn your existing business photos into promotional AI visuals and automate Google reviews.`,
    eyebrow: 'New Features Waiting',
    headline: `Put ${biz}'s Google growth on autopilot`,
    subheadline: `We've added smarter AI tools since your last visit ${params.inactiveDays} days ago.`,
    appUrl,
    includeUnsubscribe: true,
    reasonLine: 'You received this update because you registered a BGOS account for your business.',
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi ${escapeHtml(biz)} team — if getting more local leads on Google is still a goal this month, BGOS can handle the busywork for less than a daily cup of coffee (<strong>${escapeHtml(params.pricing.starterPrice)}</strong>):</p>
      <ul style="margin:0 0 18px;padding-left:20px;color:#334155;">
        <li style="margin-bottom:8px;"><strong>AI Business Image Generator:</strong> Generate custom promotional posters &amp; Google photos automatically using your own business photos + custom prompt.</li>
        <li style="margin-bottom:8px;"><strong>0 → 5+ Google Review Booster:</strong> Direct review links &amp; downloadable QR Standees built for walk-in customers.</li>
        <li><strong>Instant AI Review Replies:</strong> Respond to every 5-star and critical review professionally in seconds.</li>
      </ul>
      ${renderPrimaryButton('Explore Plans & Reactivate →', billingUrl)}
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
        Want to try creating an AI post first? <a href="${escapeHtml(studioUrl)}" style="color:#009F50;font-weight:600;text-decoration:underline;">Open Google Business Studio</a>
      </p>`,
  });

  return {
    subject: `Put ${biz}'s Google reviews & posts on autopilot`,
    html,
    text: `Put ${biz}'s Google growth on autopilot.\n\nNew in BGOS: AI Business Image Studio (uses your real photos), Google Review Booster QR Standee, and AI Review Replies.\nPlans start at ${params.pricing.starterPrice}: ${billingUrl}\n\nUnsubscribe: {{unsubscribe_url}}`,
  };
}

// ─── 9. BGOS Promotional Broadcast Email ────────────────────────────────────

export function renderBgosPromoEmail(params: {
  businessName: string;
  subject: string;
  headline: string;
  subheadline?: string;
  badgeText?: string;
  bodyParagraphs: string[];
  highlights?: string[];
  ctaLabel: string;
  ctaUrl: string;
  appUrl?: string;
}): RenderedBgosEmail {
  const appUrl = resolveBgosBaseUrl(params.appUrl);
  const biz = params.businessName.trim() || 'your business';

  const replaceBiz = (str: string) =>
    str.replace(/\{\{\s*businessName\s*\}\}/gi, biz);

  const subject = replaceBiz(params.subject);
  const headline = replaceBiz(params.headline);
  const subheadline = params.subheadline ? replaceBiz(params.subheadline) : undefined;

  const paragraphsHtml = params.bodyParagraphs
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(replaceBiz(p))}</p>`)
    .join('');

  const highlightsHtml =
    params.highlights && params.highlights.length > 0
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin:16px 0 20px;">
           <ul style="margin:0;padding-left:18px;color:#14532d;font-size:14px;">
             ${params.highlights.map((h) => `<li style="margin-bottom:6px;">${escapeHtml(replaceBiz(h))}</li>`).join('')}
           </ul>
         </div>`
      : '';

  const html = renderBgosEmailShell({
    title: subject,
    preheader: subheadline || subject,
    eyebrow: params.badgeText || 'BGOS Feature Spotlight',
    headline,
    subheadline,
    appUrl,
    includeUnsubscribe: true,
    reasonLine: 'You received this promotional update as a registered BGOS user.',
    bodyHtml: `
      ${paragraphsHtml}
      ${highlightsHtml}
      ${renderPrimaryButton(params.ctaLabel, params.ctaUrl)}`,
  });

  const text = `${headline}
${subheadline ? `\n${subheadline}\n` : ''}
${params.bodyParagraphs.map(replaceBiz).join('\n\n')}
${params.highlights && params.highlights.length > 0 ? `\nHighlights:\n${params.highlights.map((h) => `- ${replaceBiz(h)}`).join('\n')}\n` : ''}
${params.ctaLabel}: ${params.ctaUrl}

Unsubscribe: {{unsubscribe_url}}`;

  return { subject, html, text };
}
