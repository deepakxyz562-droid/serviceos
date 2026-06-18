import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, getAppUrl } from '@/lib/auth'

// POST /api/employees/[id]/invite
// Generates an invitation link for an employee to activate their account.
// Creates (or reuses) a User record + creates an Invitation record.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only owners/admins can send invitations.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        userAccount: {
          select: { id: true, email: true, name: true, isActive: true },
        },
        workspace: {
          select: { id: true, tenantId: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Determine the email to invite
    const email = employee.email || employee.userAccount?.email
    if (!email) {
      return NextResponse.json(
        { error: 'Employee has no email address. Add an email to send an invitation.' },
        { status: 400 }
      )
    }

    // Determine tenantId + workspaceId
    const tenantId = employee.workspace?.tenantId || user.tenantId
    const workspaceId = employee.workspaceId || employee.workspace?.id || user.workspaceId

    // Create or reuse the User account
    let userId = employee.userId
    if (!userId) {
      // Check if a user with that email already exists
      const existingUser = await db.user.findUnique({ where: { email } })
      if (existingUser) {
        userId = existingUser.id
        // Link the employee to the user account
        await db.employee.update({
          where: { id },
          data: { userId: existingUser.id },
        })
      } else {
        // Create a new (inactive) user account — they'll set their password via the invitation
        const newUser = await db.user.create({
          data: {
            email,
            name: employee.name,
            phone: employee.phone,
            role: employee.role === 'owner' ? 'owner' : 'employee',
            authProvider: 'email',
            isActive: false, // inactive until they accept the invitation
            tenantId,
            workspaceId,
          },
        })
        userId = newUser.id
        await db.employee.update({
          where: { id },
          data: { userId: newUser.id },
        })
      }
    }

    // Delete any existing invitations for this employee (employeeId is unique)
    await db.invitation.deleteMany({
      where: { employeeId: id },
    })

    // Generate a secure token (valid for 7 days)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Create the invitation
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

    // Update the employee's invitation status
    await db.employee.update({
      where: { id },
      data: { invitationStatus: 'pending' },
    })

    // Build the activation URL
    const baseUrl = getAppUrl()
    const activationUrl = `${baseUrl}/accept-invite?token=${token}`

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      invitationStatus: 'pending',
      activationUrl,
      token,
      email,
      expiresAt: expiresAt.toISOString(),
      message: `Invitation link generated for ${email}. Share it with ${employee.name}.`,
    })
  } catch (error) {
    console.error('Error sending employee invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}
