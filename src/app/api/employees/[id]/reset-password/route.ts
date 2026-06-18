import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, getAppUrl } from '@/lib/auth'

// POST /api/employees/[id]/reset-password
// Generates a password-reset link for an employee. Works by creating a new
// invitation (the accept-invite flow lets them set a new password).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only owners/admins can reset passwords.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        userAccount: {
          select: { id: true, email: true, isActive: true },
        },
        workspace: {
          select: { id: true, tenantId: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const email = employee.email || employee.userAccount?.email
    if (!email) {
      return NextResponse.json(
        { error: 'Employee has no email address.' },
        { status: 400 }
      )
    }

    if (!employee.userId) {
      return NextResponse.json(
        { error: 'Employee has no linked user account. Send an invitation first.' },
        { status: 400 }
      )
    }

    const tenantId = employee.workspace?.tenantId || user.tenantId
    const workspaceId = employee.workspaceId || employee.workspace?.id || user.workspaceId

    // Delete any existing invitations for this employee (employeeId is unique)
    await db.invitation.deleteMany({
      where: { employeeId: id },
    })

    // Generate a new reset token (valid for 2 hours)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

    const invitation = await db.invitation.create({
      data: {
        token,
        email,
        name: employee.name,
        role: 'employee',
        phone: employee.phone,
        status: 'pending',
        invitedById: user.id,
        tenantId,
        workspaceId,
        employeeId: id,
        expiresAt,
      },
    })

    // Build the reset URL
    const baseUrl = getAppUrl()
    const resetUrl = `${baseUrl}/accept-invite?token=${token}`

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      resetUrl,
      token,
      email,
      expiresAt: expiresAt.toISOString(),
      message: `Password reset link generated for ${email}. Valid for 2 hours.`,
    })
  } catch (error) {
    console.error('Error resetting employee password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
