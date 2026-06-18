import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// POST /api/employees/[id]/suspend
// Toggles the linked User account's isActive status (suspend/reactivate).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only owners/admins can suspend employees.' },
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
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // If no linked user account, just toggle the employee's invitationStatus
    if (!employee.userAccount) {
      const newStatus = employee.invitationStatus === 'suspended' ? 'accepted' : 'suspended'
      await db.employee.update({
        where: { id },
        data: { invitationStatus: newStatus },
      })
      return NextResponse.json({
        success: true,
        suspended: newStatus === 'suspended',
        invitationStatus: newStatus,
        message: newStatus === 'suspended'
          ? `${employee.name} suspended (no user account linked).`
          : `${employee.name} reactivated.`,
      })
    }

    // Toggle the user's isActive
    const newIsActive = !employee.userAccount.isActive
    await db.user.update({
      where: { id: employee.userAccount.id },
      data: { isActive: newIsActive },
    })

    // Update employee invitation status to reflect suspension state
    const newInvitationStatus = newIsActive ? 'accepted' : 'suspended'
    await db.employee.update({
      where: { id },
      data: { invitationStatus: newInvitationStatus },
    })

    return NextResponse.json({
      success: true,
      suspended: !newIsActive,
      isActive: newIsActive,
      invitationStatus: newInvitationStatus,
      message: newIsActive
        ? `${employee.name}'s account has been reactivated.`
        : `${employee.name}'s account has been suspended. They can no longer log in.`,
    })
  } catch (error) {
    console.error('Error suspending employee:', error)
    return NextResponse.json(
      { error: 'Failed to suspend employee' },
      { status: 500 }
    )
  }
}
