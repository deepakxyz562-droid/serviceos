import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { generateToken, COOKIE_OPTIONS } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/customer/exchange-magic-link
 * ──────────────────────────────────────────
 * Consume a customer magic-link token. Mirrors the canonical OTP-verify flow
 * (`src/app/api/auth/customer/verify-otp/route.ts`):
 *   1. Look up CustomerPortalSession by token.
 *   2. If expired → 410 Gone.
 *   3. Update lastAccessedAt.
 *   4. Build AuthUser (role 'customer') + generateToken().
 *   5. Set the `serviceos_session` HTTP-only cookie (24h maxAge).
 *   6. Update customer.lastLoginAt.
 *   7. Return { user, tenant, token }.
 *
 * The session is NOT deleted — this allows customers to re-open the same
 * email link later (within the 24h window) without requesting a new one.
 *
 * Body: { token: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token } = body as { token?: string }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Magic link token is required' },
        { status: 400 }
      )
    }

    // ── 1. Look up the session ───────────────────────────────────────────
    let session: {
      id: string
      customerId: string
      expiresAt: Date
    } | null

    try {
      session = await db.customerPortalSession.findUnique({
        where: { token },
        select: { id: true, customerId: true, expiresAt: true },
      })
    } catch (err) {
      console.error('[exchange-magic-link] session lookup failed:', err)
      return NextResponse.json(
        { error: 'Failed to validate magic link' },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Magic link not found' },
        { status: 404 }
      )
    }

    // ── 2. Expiry check → 410 Gone ───────────────────────────────────────
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Magic link expired' },
        { status: 410 }
      )
    }

    // ── 3. Touch lastAccessedAt (fire-and-forget) ────────────────────────
    try {
      await db.customerPortalSession.update({
        where: { id: session.id },
        data: { lastAccessedAt: new Date() },
      })
    } catch (err) {
      // Non-fatal — the session is still valid; we just couldn't update the
      // last-accessed timestamp.
      console.warn('[exchange-magic-link] lastAccessedAt update failed:', err)
    }

    // ── 4. Fetch customer + tenant ───────────────────────────────────────
    let customer: {
      id: string
      name: string
      phone: string
      email: string | null
      workspaceId: string | null
      workspace?: { tenant?: { id: string; name: string; slug: string | null; industry?: string | null; logo?: string | null; phone?: string | null; email?: string | null } | null } | null
    } | null

    try {
      customer = await db.customer.findUnique({
        where: { id: session.customerId },
        include: {
          workspace: { include: { tenant: true } },
        },
      })
    } catch (err) {
      console.error('[exchange-magic-link] customer lookup failed:', err)
      return NextResponse.json(
        { error: 'Failed to load customer record' },
        { status: 500 }
      )
    }

    if (!customer) {
      // The session references a customer that no longer exists.
      return NextResponse.json(
        { error: 'Customer account not found' },
        { status: 404 }
      )
    }

    const tenant = customer.workspace?.tenant || null

    // ── 5. Build AuthUser + JWT (mirror verify-otp) ──────────────────────
    const authUser = {
      id: customer.id,
      email: customer.email || '',
      name: customer.name,
      phone: customer.phone,
      role: 'customer' as const,
      tenantId: tenant?.id || null,
      workspaceId: customer.workspaceId || null,
      avatar: null,
      isSuperAdmin: false,
      employeeId: null,
    }

    const jwt = generateToken(authUser)

    // ── 6. Set HTTP-only cookie (24h, same as OTP verify) ────────────────
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_OPTIONS.name, jwt, {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: COOKIE_OPTIONS.path,
      maxAge: 60 * 60 * 24, // 24 hours for customers
    })

    // ── 7. Update lastLoginAt (fire-and-forget) ──────────────────────────
    try {
      await db.customer.update({
        where: { id: customer.id },
        data: { lastLoginAt: new Date() },
      })
    } catch (err) {
      console.warn('[exchange-magic-link] lastLoginAt update failed:', err)
    }

    return NextResponse.json({
      success: true,
      user: authUser,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            industry: tenant.industry,
            logo: tenant.logo,
            phone: tenant.phone,
            email: tenant.email,
          }
        : null,
      token: jwt,
    })
  } catch (error) {
    console.error('[exchange-magic-link] unexpected error:', error)
    return NextResponse.json(
      { error: 'Magic link exchange failed' },
      { status: 500 }
    )
  }
}
