import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/bookings/[id]/assign
 * Manually assign (or unassign) an employee to a booking.
 *
 * Body: { employeeId: string | null }
 *  - When `employeeId` is null or an empty string → unassign (set to null).
 *  - Otherwise → verify the employee exists (lenient: any tenant) and assign.
 *
 * Side effects:
 *  - If the booking's status is 'pending' and we are assigning an employee,
 *    bump status to 'confirmed' and set `confirmedAt` (idempotent).
 *
 * Returns: the updated booking with `employee` relation included.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Parse body (allow empty body for unassign-by-query scenarios)
    let body: { employeeId?: string | null } = {};
    try {
      body = await request.json();
    } catch {
      // No JSON body — treat as missing employeeId
      body = {};
    }

    // Body must contain employeeId (null/empty allowed for unassign, but key must exist)
    if (body.employeeId === undefined) {
      return NextResponse.json(
        { error: 'employeeId is required in the body (use null to unassign)' },
        { status: 400 }
      );
    }

    const requestedEmployeeId = body.employeeId
      ? String(body.employeeId).trim()
      : '';
    const isUnassign = requestedEmployeeId === '';

    // Verify the booking exists and belongs to the user's tenant
    const existingBooking = await db.booking.findUnique({ where: { id } });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (existingBooking.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // If assigning, verify the employee exists (lenient — allow any tenant,
    // since some legacy data may have null tenantId on employees).
    if (!isUnassign) {
      const employee = await db.employee.findUnique({
        where: { id: requestedEmployeeId },
        select: { id: true, name: true, phone: true, avatar: true },
      });

      if (!employee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      employeeId: isUnassign ? null : requestedEmployeeId,
    };

    // Bump pending → confirmed when assigning (not when unassigning)
    if (!isUnassign && existingBooking.status === 'pending') {
      updateData.status = 'confirmed';
      if (!existingBooking.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
    }

    const booking = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      booking,
      message: isUnassign
        ? 'Employee unassigned from booking'
        : 'Employee assigned to booking',
    });
  } catch (error) {
    console.error('[BookingAssign] Error assigning employee to booking:', error);
    return NextResponse.json(
      { error: 'Failed to assign employee to booking' },
      { status: 500 }
    );
  }
}
