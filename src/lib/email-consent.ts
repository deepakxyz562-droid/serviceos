/**
 * Email Marketing Consent & Tracking
 * -----------------------------------
 * Central helpers for GDPR-compliant marketing email:
 *   - createUnsubscribeToken()  → persists a signed token linking a campaign send
 *                                 to a recipient (used for List-Unsubscribe, the
 *                                 landing page, the open pixel and click redirects).
 *   - injectTracking()          → rewrites <a href> → click-redirect + appends an
 *                                 open-pixel <img> to the HTML body.
 *   - hasMarketingConsent()     → unified consent gate used by both send routes.
 *   - applyUnsubscribe()        → marks Contact + Customer records as opted-out.
 *
 * These helpers are ONLY invoked when usageType === 'marketing'. Transactional
 * emails (invoices, quotes, password resets, etc.) never carry an unsubscribe
 * header and never check marketing consent — you cannot "unsubscribe" from a
 * receipt.
 */

import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

/** Resolve the externally-visible base URL for links embedded in email bodies. */
export function publicBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  return url.replace(/\/$/, '')
}

export interface UnsubscribeTokenInput {
  campaignId?: string | null
  recipientEmail: string
  recipientRefId?: string | null
  recipientSource?: string | null
  tenantId?: string | null
}

/** Create + persist a per-recipient token. Returns the raw token string. */
export async function createUnsubscribeToken(
  opts: UnsubscribeTokenInput,
): Promise<string> {
  const token = randomBytes(24).toString('hex')
  await db.emailUnsubscribeToken.create({
    data: {
      token,
      campaignId: opts.campaignId || null,
      recipientEmail: opts.recipientEmail.toLowerCase(),
      recipientRefId: opts.recipientRefId || null,
      recipientSource: opts.recipientSource || null,
      tenantId: opts.tenantId || null,
    },
  })
  return token
}

/** Landing-page URL for the List-Unsubscribe header + email footer. */
export function unsubscribeUrl(token: string): string {
  return `${publicBaseUrl()}/api/public/unsubscribe?t=${token}`
}

/** 1x1 transparent pixel URL (GET returns image/png). */
export function openPixelUrl(token: string): string {
  return `${publicBaseUrl()}/api/email/open/${token}/pixel.png`
}

/** Click-redirect URL that wraps an outbound link. */
export function clickRedirectUrl(token: string, destination: string): string {
  return `${publicBaseUrl()}/api/email/click/${token}?u=${encodeURIComponent(destination)}`
}

/**
 * Rewrite every <a href="http(s)://..."> in the HTML to route through the
 * click-redirect endpoint, and append a hidden open-pixel <img> before
 * </body> (or at the end of the document). Only call for marketing emails.
 */
export function injectTracking(html: string, token: string): string {
  if (!html) return html
  let out = html
  // Rewrite anchor hrefs pointing to absolute http(s) URLs. Skip the
  // unsubscribe link itself — it must hit /api/public/unsubscribe directly so
  // RFC 8058 one-click unsubscribe works. mailto: / tel: / relative are ignored.
  out = out.replace(
    /(<a\b[^>]*\shref=["'])(https?:\/\/[^"']+)/gi,
    (match, prefix: string, url: string) => {
      if (url.includes('/api/public/unsubscribe') || url.includes('/api/public/preferences')) {
        return match
      }
      return `${prefix}${clickRedirectUrl(token, url)}`
    },
  )
  const pixel = `<img src="${openPixelUrl(token)}" width="1" height="1" alt="" style="display:none !important;border:0;outline:none;width:1px;height:1px;"/>`
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${pixel}</body>`)
  } else {
    out = `${out}${pixel}`
  }
  return out
}

export interface ConsentInput {
  status?: string | null
  marketingConsent?: boolean | null
  unsubscribedAt?: Date | string | null
}

/**
 * Unified marketing-consent gate. Returns true when the recipient MAY receive
 * marketing email.
 *
 *   status === 'unsubscribed' | 'blocked'   → false
 *   unsubscribedAt !== null                  → false
 *   marketingConsent === false (explicit)    → false
 *   marketingConsent === true                → true
 *   marketingConsent === null (legacy/unknown) → true  (grandfathered)
 *
 * The null→true rule preserves existing behaviour for records created before
 * the consent fields were added, so the migration does not silently zero-out
 * a tenant's emailable audience.
 */
export function hasMarketingConsent(input: ConsentInput): boolean {
  if (input.status === 'unsubscribed' || input.status === 'blocked') return false
  if (input.unsubscribedAt) return false
  if (input.marketingConsent === false) return false
  return true
}

/**
 * Apply a one-click unsubscribe. Updates every Contact + Customer whose email
 * matches (case-insensitive on SQLite via lowercase comparison) so the same
 * person is never re-emailed even if they exist in both tables.
 *
 * Also writes a MarketingConsentEvent audit-log entry (GDPR Article 5(2)
 * proof of opt-out) — best-effort, never throws.
 */
export async function applyUnsubscribe(
  email: string,
  source: string,
): Promise<void> {
  if (!email) return
  const lower = email.trim().toLowerCase()
  const now = new Date()

  try {
    // SQLite is case-sensitive by default; compare against the lowercased
    // value AND the original to catch records stored with mixed case.
    await db.contact.updateMany({
      where: { OR: [{ email: lower }, { email: email.trim() }] },
      data: {
        status: 'unsubscribed',
        marketingConsent: false,
        unsubscribedAt: now,
        marketingConsentSource: source,
      },
    })
  } catch {
    /* ignore — Contact table always exists */
  }

  try {
    await db.customer.updateMany({
      where: { OR: [{ email: lower }, { email: email.trim() }] },
      data: {
        marketingConsent: false,
        unsubscribedAt: now,
        marketingConsentSource: source,
      },
    })
  } catch {
    /* ignore */
  }

  // Audit-log entry (best-effort). Survives even if the Customer/Contact
  // rows are later deleted, so you can prove WHEN/HOW the recipient opted
  // out for a regulator or ESP compliance team.
  try {
    await db.marketingConsentEvent.create({
      data: {
        action: 'opt_out',
        source,
        recipientEmail: lower,
        tenantId: null,
        metadataJson: JSON.stringify({ triggeredBy: source, at: now.toISOString() }),
      },
    })
  } catch {
    /* non-fatal */
  }
}

/** Record a raw engagement event (best-effort). */
export async function recordEmailEvent(opts: {
  type: 'open' | 'click' | 'bounce' | 'complaint' | 'unsubscribe' | 'delivered'
  campaignId?: string | null
  recipientEmail: string
  token?: string | null
  url?: string | null
  userAgent?: string | null
  ipAddress?: string | null
  tenantId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.emailEvent.create({
      data: {
        type: opts.type,
        campaignId: opts.campaignId || null,
        recipientEmail: opts.recipientEmail.toLowerCase(),
        token: opts.token || null,
        url: opts.url || null,
        userAgent: opts.userAgent || null,
        ipAddress: opts.ipAddress || null,
        tenantId: opts.tenantId || null,
        metadataJson: JSON.stringify(opts.metadata || {}),
      },
    })
  } catch {
    /* non-fatal */
  }
}

// ─── MarketingConsentEvent audit log (GDPR Article 5(2) + 7(1)) ────────────

/**
 * Append a consent audit-log entry. Survives even if the Customer/Contact
 * row is later deleted, so you can prove WHEN/HOW a recipient opted in or
 * out for a regulator (or a Mailgun/SendGrid compliance team).
 *
 * Best-effort — never throws (consent state is already stored on the
 * Customer/Contact row; the audit log is the secondary record).
 */
export async function recordConsentEvent(opts: {
  action: 'opt_in' | 'opt_out' | 'revoke_opt_out' | 'import' | 'legacy_grandfather'
  source: string
  recipientEmail: string
  recipientRefId?: string | null
  recipientSource?: string | null
  campaignId?: string | null
  tenantId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  if (!opts.recipientEmail) return
  try {
    await db.marketingConsentEvent.create({
      data: {
        action: opts.action,
        source: opts.source,
        recipientEmail: opts.recipientEmail.toLowerCase(),
        recipientRefId: opts.recipientRefId || null,
        recipientSource: opts.recipientSource || null,
        campaignId: opts.campaignId || null,
        tenantId: opts.tenantId || null,
        ipAddress: opts.ipAddress || null,
        userAgent: opts.userAgent || null,
        metadataJson: JSON.stringify(opts.metadata || {}),
      },
    })
  } catch {
    /* non-fatal — consent state is already stored on Customer/Contact */
  }
}

/**
 * Grant marketing consent for a recipient (opt-in capture from a signup
 * form, manual admin action, CSV import with consent, etc.). Updates the
 * matching Contact + Customer rows AND writes a MarketingConsentEvent
 * audit entry. Idempotent — calling twice with the same email is safe.
 */
export async function grantMarketingConsent(opts: {
  email: string
  source: string
  recipientRefId?: string | null
  recipientSource?: string | null
  tenantId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const email = (opts.email || '').trim()
  if (!email) return
  const lower = email.toLowerCase()
  const now = new Date()

  try {
    await db.contact.updateMany({
      where: { OR: [{ email: lower }, { email }] },
      data: {
        marketingConsent: true,
        marketingConsentAt: now,
        marketingConsentSource: opts.source,
        marketingConsentIp: opts.ipAddress || null,
        unsubscribedAt: null,
        status: 'active',
      },
    })
  } catch { /* ignore */ }

  try {
    await db.customer.updateMany({
      where: { OR: [{ email: lower }, { email }] },
      data: {
        marketingConsent: true,
        marketingConsentAt: now,
        marketingConsentSource: opts.source,
        marketingConsentIp: opts.ipAddress || null,
        unsubscribedAt: null,
      },
    })
  } catch { /* ignore */ }

  await recordConsentEvent({
    action: 'opt_in',
    source: opts.source,
    recipientEmail: email,
    recipientRefId: opts.recipientRefId || null,
    recipientSource: opts.recipientSource || null,
    tenantId: opts.tenantId || null,
    ipAddress: opts.ipAddress || null,
    userAgent: opts.userAgent || null,
    metadata: opts.metadata,
  })
}
