/**
 * Customer Magic Link Issuer
 * ─────────────────────────
 * Generates secure, single-tenant magic links that auto-authenticate a customer
 * into the customer portal and deep-link to a specific resource (invoice, quote,
 * job, etc.).
 *
 * The link is of the form:  {baseUrl}/?mgl=TOKEN&redirect=/invoices/ID
 *
 * - `mgl` (magic-link token) is consumed by the public exchange endpoint
 *   /api/auth/customer/exchange-magic-link, which mirrors the OTP verify flow:
 *   creates a CustomerPortalSession → generateToken() → sets `serviceos_session`
 *   cookie → returns user + tenant.
 * - The frontend (src/app/page.tsx) reads `?mgl=` from the URL on first load,
 *   POSTs it to the exchange endpoint, then navigates to `?redirect=` once
 *   authenticated. (Frontend consumption is owned by another agent.)
 *
 * This module is safe to call from:
 *   - Route handlers (pass the incoming `Request` for correct base-URL resolution)
 *   - Server-side libs (invoice-automation, notification-orchestrator, etc.) —
 *     omit `request` and the issuer falls back to NEXT_PUBLIC_APP_URL / APP_URL.
 */

import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAppUrl } from '@/lib/auth'

export interface IssueCustomerMagicLinkOptions {
  /** Customer ID to issue the link for. */
  customerId: string
  /** Portal deep-link path (e.g. `/invoices/abc`, `/quotes/xyz`, `/jobs/123`). Defaults to `/`. */
  redirect?: string
  /** Lifetime of the magic link in hours. Defaults to 24, capped at 168 (7 days). */
  expiresInHours?: number
  /** Incoming Request — when provided, base URL is derived from request headers. */
  request?: Request
}

export interface IssueCustomerMagicLinkResult {
  /** The opaque token (also stored on CustomerPortalSession.token). */
  token: string
  /** Fully-qualified URL the customer can click to auto-login. */
  url: string
  /** ISO timestamp at which the magic link expires. */
  expiresAt: string
}

/**
 * Issue a customer magic-link token + clickable URL.
 *
 * Reuses the existing `CustomerPortalSession` model — no schema migration is
 * needed. The token is 32 random bytes (hex-encoded to 64 chars) which is
 * cryptographically unguessable. Multiple links can be outstanding for the
 * same customer (each call creates a new session row); the exchange endpoint
 * accepts any non-expired one.
 */
export async function issueCustomerMagicLink(
  opts: IssueCustomerMagicLinkOptions
): Promise<IssueCustomerMagicLinkResult> {
  const { customerId, redirect, request } = opts
  // Cap expiry at 7 days (168h). Default 24h. Min 1h to avoid foot-guns.
  const rawHours = opts.expiresInHours ?? 24
  const expiresInHours = Math.max(1, Math.min(168, rawHours))

  if (!customerId) {
    throw new Error('issueCustomerMagicLink: customerId is required')
  }

  // ── Resolve customer + tenant (for tenantId on the session row) ──────────
  let customer: {
    id: string
    phone: string
    email?: string | null
    name: string
    workspaceId?: string | null
    workspace?: { tenant?: { id: string } | null } | null
  } | null

  try {
    customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        workspace: { include: { tenant: true } },
      },
    })
  } catch (err) {
    throw new Error(
      `issueCustomerMagicLink: failed to fetch customer ${customerId}: ${String(err)}`
    )
  }

  if (!customer) {
    throw new Error(`issueCustomerMagicLink: customer ${customerId} not found`)
  }

  // ── Generate token + persist a CustomerPortalSession row ─────────────────
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000)
  const tenantId = customer.workspace?.tenant?.id || null

  try {
    await db.customerPortalSession.create({
      data: {
        token,
        customerId: customer.id,
        // `phone` is non-nullable on Customer, but defensively fall back to ''
        customerPhone: customer.phone || '',
        expiresAt,
        tenantId,
      },
    })
  } catch (err) {
    throw new Error(
      `issueCustomerMagicLink: failed to create CustomerPortalSession for ${customerId}: ${String(err)}`
    )
  }

  // ── Build the fully-qualified magic-link URL ────────────────────────────
  // When invoked from a route handler we have the Request → use getAppUrl()
  // for correct origin detection through the Caddy gateway. When invoked
  // from a server-side lib (cron, invoice-automation, orchestrator) there's
  // no Request → fall back to the env var, then localhost.
  let baseUrl: string
  if (request) {
    baseUrl = getAppUrl(request)
  } else {
    baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'http://localhost:3000'
    baseUrl = baseUrl.replace(/\/$/, '')
  }

  let url = `${baseUrl}/?mgl=${token}`
  if (redirect) {
    url += `&redirect=${encodeURIComponent(redirect)}`
  }

  return {
    token,
    url,
    expiresAt: expiresAt.toISOString(),
  }
}
