import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { getAppUrl } from '@/lib/auth'

// POST /api/customers/[id]/portal/enable
// Enables customer portal access and generates a magic-link activation token.
// The customer uses the link to set their password and activate their account.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admin/owner/employee can enable portal access for a customer
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'manager', 'employee', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only staff can enable portal access.' },
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
        phone: true,
        portalEnabled: true,
        invitationStatus: true,
        activatedAt: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Generate a secure activation token (valid for 7 days)
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

    // Build the activation URL — uses the company-slug accept-invite route
    const baseUrl = getAppUrl()
    const activationUrl = `${baseUrl}/accept-invite?token=${token}`

    return NextResponse.json({
      success: true,
      portalEnabled: true,
      invitationStatus: 'pending',
      activationUrl,
      token,
      expiresAt: expiresAt.toISOString(),
      message: customer.email
        ? `Portal access enabled. Share the activation link with ${customer.email}.`
        : 'Portal access enabled. Share the activation link with the customer.',
    })
  } catch (error) {
    console.error('Error enabling customer portal:', error)
    return NextResponse.json(
      { error: 'Failed to enable portal access' },
      { status: 500 }
    )
  }
}
