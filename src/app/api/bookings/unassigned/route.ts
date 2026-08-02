import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/bookings/unassigned
 * Returns all bookings for the current tenant that have NO employee assigned
 * and are still actionable (status pending or confirmed).
 *
 * Query params:
 *  - ?limit=  (default 100, max 500)
 *  - ?offset= (default 0)
 *
 * Used by the Dispatch board to show "Unassigned Bookings" for bulk assignment.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    let limit = 100;
    let offset = 0;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 500);
      }
    }
    if (offsetParam) {
      const parsed = parseInt(offsetParam, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        offset = parsed;
      }
    }

    const bookings = await db.booking.findMany({
      where: {
        tenantId: user.tenantId,
        employeeId: null,
        status: { in: ['pending', 'confirmed'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      skip: offset,
      include: {
        employee: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      bookings,
      count: bookings.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[BookingsUnassigned] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unassigned bookings' },
      { status: 500 }
    );
  }
}
