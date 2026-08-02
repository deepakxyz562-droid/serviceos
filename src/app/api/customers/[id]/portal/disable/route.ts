import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// POST /api/customers/[id]/portal/disable
// Disables customer portal access by clearing the password hash and activation
// token. The customer record itself is preserved (we never delete customer data).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admin/owner/employee can disable portal access
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'manager', 'employee', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only staff can disable portal access.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const customer = await db.customer.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Clear auth fields — customer can no longer log in, but their record stays
    await db.customer.update({
      where: { id },
      data: {
        portalEnabled: false,
        invitationStatus: 'disabled',
        passwordHash: null,
        activationToken: null,
        activationTokenExpiresAt: null,
        activatedAt: null,
        lastLoginAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      portalEnabled: false,
      invitationStatus: 'disabled',
      message: `Portal access disabled for ${customer.name}. Their password has been cleared.`,
    })
  } catch (error) {
    console.error('Error disabling customer portal:', error)
    return NextResponse.json(
      { error: 'Failed to disable portal access' },
      { status: 500 }
    )
  }
}
