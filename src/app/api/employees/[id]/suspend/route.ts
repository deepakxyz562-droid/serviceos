import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/employees/[id]/suspend
 *
 * Suspend (or reactivate) an employee's login access by toggling User.isActive.
 * Does NOT delete the employee record — all historical jobs/bookings are preserved.
 *
 * Body: { suspended: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can suspend employees' },
        { status: 403 }
      );
    }

    const { id: employeeId } = await params;
    const body = await request.json().catch(() => ({}));
    const suspended = body.suspended !== false; // default to suspend

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { userAccount: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (employee.userId) {
      await db.user.update({
        where: { id: employee.userId },
        data: { isActive: !suspended },
      });
    }

    await db.employee.update({
      where: { id: employeeId },
      data: { invitationStatus: suspended ? 'suspended' : 'accepted' },
    });

    return NextResponse.json({
      success: true,
      suspended,
      employee: { id: employee.id, name: employee.name, invitationStatus: suspended ? 'suspended' : 'accepted' },
    });
  } catch (error) {
    console.error('[Employee Suspend Error]', error);
    return NextResponse.json({ error: 'Failed to update employee status' }, { status: 500 });
  }
}
