import { NextRequest, NextResponse } from 'next/server';
import { calculateAvailableSlots } from '@/lib/scheduling/slot-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability/slots
 *
 * Public API for checking available booking slots.
 *
 * Query params:
 *   tenantId    — required (the business to book with)
 *   serviceId   — optional (the service/appointment type)
 *   employeeId  — optional (specific staff member; omit for any/round-robin)
 *   date        — required ("YYYY-MM-DD")
 *   timezone    — optional (defaults to "America/New_York")
 *
 * Returns: { date, timezone, slots: [{ startTime, endTime, available, label }], workingDay, reason? }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const serviceId = searchParams.get('serviceId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const date = searchParams.get('date');
    const timezone = searchParams.get('timezone') || undefined;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 },
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date is required in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    const result = await calculateAvailableSlots({
      tenantId,
      serviceId,
      employeeId,
      date,
      timezone,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[availability/slots GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 },
    );
  }
}
