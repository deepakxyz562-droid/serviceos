/**
 * promotional-footer.ts
 * =====================
 *
 * Reusable promotional footer for all Fieseros transactional emails.
 *
 * DESIGN PHILOSOPHY
 * -----------------
 * The old footer was a plain 'Powered by Fieseros' link — wasted real estate.
 * The new footer is a small product-discovery card that gives the recipient a
 * reason to click and explore Fieseros, without being obnoxious.
 *
 * The CTA (call-to-action) rotates between 4 value propositions so recipients
 * who get multiple emails don't see the same pitch every time:
 *
 *   1. 'Turn inquiries into booked jobs'   (scheduling focus)
 *   2. 'Never miss a customer with AI Receptionist'  (AI focus)
 *   3. 'Get paid faster with Fieseros'   (payments focus)
 *   4. 'See your whole business in one dashboard'   (analytics focus)
 *
 * The footer is conditional on the recipient type:
 *   - existingUser=true: 'Already using Fieseros? Sign in to your dashboard →'
 *   - existingUser=false: 'Explore Fieseros →' (for prospects/claimants)
 *
 * USAGE
 * -----
 *   import { renderPromotionalFooter } from '@/lib/emails/promotional-footer';
 *
 *   const footer = renderPromotionalFooter({
 *     appUrl: 'https://fieseros.com',
 *     existingUser: false,  // claim approval email → prospect
 *   });
 *   // Append `footer.html` to the email body before the closing </body>.
 *
 * BRANDING CONSISTENCY
 * --------------------
 * Uses the same teal (#0f766e) accent color as the rest of the Fieseros email
 * templates (claim-emails.ts, verification-email.ts, welcome-email.ts). Inline
 * styles only — no CSS classes — because email clients have inconsistent CSS
 * support.
 */

export interface PromotionalFooterContext {
  /** The base app URL (https://fieseros.com or local). */
  appUrl: string;
  /** If true, the recipient is already a Fieseros user → show 'Sign in' CTA.
   *  If false, the recipient is a prospect (e.g. claim approval email) →
   *  show 'Explore Fieseros' CTA. */
  existingUser?: boolean;
  /** Optional: rotate the value proposition (0-3). If omitted, rotates based
   *  on the current date so the same recipient sees different pitches on
   *  different days. */
  variantIndex?: number;
}

interface FooterVariant {
  emoji: string;
  headline: string;
  features: string;
}

const FOOTER_VARIANTS: FooterVariant[] = [
  {
    emoji: '&#128197;', // 📅
    headline: 'Turn inquiries into booked jobs',
    features: 'Customers  •  Jobs  •  Scheduling  •  Invoices',
  },
  {
    emoji: '&#129302;', // 🤖
    headline: 'Never miss a customer with AI Receptionist',
    features: 'AI Receptionist  •  Lead Capture  •  24/7 Availability',
  },
  {
    emoji: '&#128179;', // 💳
    headline: 'Get paid faster with Fieseros',
    features: 'Invoices  •  Payments  •  Recurring Billing  •  Payouts',
  },
  {
    emoji: '&#128202;', // 📈
    headline: 'See your whole business in one dashboard',
    features: 'Revenue  •  Jobs  •  Team  •  Customer Insights',
  },
];

export interface RenderedFooter {
  /** The HTML for the promotional footer. Insert before </body>. */
  html: string;
  /** The plain-text version. Append to the text body. */
  text: string;
}

/**
 * Render the promotional footer.
 *
 * The variant rotates based on the current day (day-of-year mod 4) so the
 * same recipient sees different pitches on different days without us having
 * to track per-recipient state. Callers can override with `variantIndex`.
 */
export function renderPromotionalFooter(ctx: PromotionalFooterContext): RenderedFooter {
  const { appUrl, existingUser = false } = ctx;

  // Pick a variant — rotate by day-of-year so it changes daily.
  const dayOfYear = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const variantIdx = ctx.variantIndex ?? dayOfYear % FOOTER_VARIANTS.length;
  const variant = FOOTER_VARIANTS[variantIdx] ?? FOOTER_VARIANTS[0];

  const ctaUrl = existingUser ? `${appUrl}/login` : `${appUrl}/`;
  const ctaLabel = existingUser
    ? 'Sign in to your dashboard'
    : 'Explore Fieseros';

  const html = renderFooterHtml({
    variant,
    ctaUrl,
    ctaLabel,
    existingUser,
  });

  const text = `
—

${variant.emoji} ${variant.headline}

Fieseros CRM
${variant.features}

${ctaLabel}: ${ctaUrl}

${existingUser ? '' : 'Already using Fieseros? Sign in at ' + appUrl + '/login'}

© ${new Date().getFullYear()} Fieseros · Service Business CRM
  `.trim();

  return { html, text };
}

// ─── HTML renderer ──────────────────────────────────────────────────────────

function renderFooterHtml(params: {
  variant: FooterVariant;
  ctaUrl: string;
  ctaLabel: string;
  existingUser: boolean;
}): string {
  const { variant, ctaUrl, ctaLabel, existingUser } = params;
  const year = new Date().getFullYear();
  return `
<!-- ── Promotional footer (reusable) ─────────────────────────────────────── -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfeff 100%);background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:24px 28px;max-width:540px;">
        <tr>
          <td style="text-align:center;">
            <p style="margin:0 0 6px;color:#0f766e;font-size:13px;font-weight:600;letter-spacing:0.02em;">
              ${variant.emoji} ${escapeHtml(variant.headline)}
            </p>
            <p style="margin:0 0 14px;color:#0f172a;font-size:18px;font-weight:700;letter-spacing:-0.01em;">
              Fieseros CRM
            </p>
            <p style="margin:0 0 18px;color:#475569;font-size:12px;line-height:1.6;letter-spacing:0.01em;">
              ${escapeHtml(variant.features)}
            </p>
            <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-weight:600;font-size:13px;text-decoration:none;padding:10px 22px;border-radius:8px;">
              ${escapeHtml(ctaLabel)} →
            </a>
            ${existingUser ? '' : `
            <p style="margin:10px 0 0;color:#94a3b8;font-size:11px;">
              Already using Fieseros? <a href="${escapeHtml(params.ctaUrl)}" style="color:#0f766e;text-decoration:none;">Sign in</a>
            </p>`}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- ── Copyright footer ──────────────────────────────────────────────────── -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
  <tr>
    <td align="center" style="padding:12px 20px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">
      © ${year} <a href="https://fieseros.com" style="color:#0f766e;text-decoration:none;font-weight:600;">Fieseros</a>
      · Service Business CRM
      <br>
      <span style="color:#cbd5e1;">More jobs. Less admin. One CRM.</span>
    </td>
  </tr>
</table>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
