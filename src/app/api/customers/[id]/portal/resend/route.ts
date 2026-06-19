import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, getAppUrl } from '@/lib/auth'

// POST /api/customers/[id]/portal/resend
// Regenerates the activation link for a customer whose portal is enabled but
// who hasn't activated yet (or who needs a password reset).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'manager', 'employee', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only staff can resend invitations.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const customer = await db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        portalEnabled: true,
        invitationStatus: true,
        workspace: {
          select: {
            tenant: {
              select: { slug: true },
            },
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Auto-enable portal if it wasn't already (resend implies they want access)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.customer.update({
      where: { id },
      data: {
        portalEnabled: true,
        invitationStatus: 'pending',
        invitationSentAt: new Date(),
        activationToken: token,
        activationTokenExpiresAt: expiresAt,
      },
    })

    // Build the activation URL. Resolve the tenant slug the same way as
    // /api/customers/[id]/portal/enable: prefer the customer's workspace→tenant
    // chain, but fall back to the authenticated staff user's tenantId so we
    // never generate a slug-less URL when the customer has no workspace.
    const baseUrl = getAppUrl(request)
    let slug = customer.workspace?.tenant?.slug || null
    if (!slug && user.tenantId) {
      try {
        const tenant = await db.tenant.findUnique({
          where: { id: user.tenantId },
          select: { slug: true },
        })
        slug = tenant?.slug || null
      } catch {
        // ignore — fall back to slug-less URL (handled by /accept-invite route)
      }
    }
    const activationUrl = slug
      ? `${baseUrl}/${slug}/accept-invite?token=${token}`
      : `${baseUrl}/accept-invite?token=${token}`

    return NextResponse.json({
      success: true,
      portalEnabled: true,
      invitationStatus: 'pending',
      activationUrl,
      token,
      expiresAt: expiresAt.toISOString(),
      message: customer.email
        ? `New activation link generated for ${customer.email}.`
        : 'New activation link generated.',
    })
  } catch (error) {
    console.error('Error resending customer invitation:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}
