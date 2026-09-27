import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { DayAvailability, WeeklyAvailabilitySettings } from '@/features/scheduling/types/event-types';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * GET /api/scheduling/availability
 * Returns 7-day weekly schedule + timezone + buffer settings.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { timezone: true },
    });

    const rows = await db.availability.findMany({
      where: {
        tenantId: user.tenantId,
        employeeId: null, // tenant-level schedule
      },
      orderBy: { dayOfWeek: 'asc' },
    });

    const dayMap = new Map<number, any>();
    rows.forEach((r) => dayMap.set(r.dayOfWeek, r));

    const days: DayAvailability[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const existing = dayMap.get(dayOfWeek);
      if (existing) {
        return {
          dayOfWeek,
          name: DAY_NAMES[dayOfWeek],
          isWorkingDay: existing.isWorkingDay,
          startTime: existing.startTime || '09:00',
          endTime: existing.endTime || '17:00',
          breakStart: existing.breakStart,
          breakEnd: existing.breakEnd,
        };
      }

      // Sensible default: Mon-Fri working, Sat-Sun off
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      return {
        dayOfWeek,
        name: DAY_NAMES[dayOfWeek],
        isWorkingDay: isWeekday,
        startTime: '09:00',
        endTime: '17:00',
        breakStart: null,
        breakEnd: null,
      };
    });

    const firstRow = rows[0];

    const result: WeeklyAvailabilitySettings = {
      tenantId: user.tenantId,
      timezone: firstRow?.timezone || tenant?.timezone || 'America/New_York',
      slotDuration: firstRow?.slotDuration || 30,
      bufferTime: firstRow?.bufferTime || 0,
      leadTimeHours: firstRow?.leadTimeHours || 2,
      days,
    };

    return NextResponse.json({ success: true, availability: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scheduling/availability
 * Saves updated weekly availability schedule.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body: Partial<WeeklyAvailabilitySettings> = await request.json();
    const { days, timezone = 'America/New_York', bufferTime = 0, slotDuration = 30, leadTimeHours = 2 } = body;

    if (!Array.isArray(days)) {
      return NextResponse.json({ error: 'days array is required' }, { status: 400 });
    }

    // Upsert availability for each day of week
    for (const d of days) {
      await db.availability.upsert({
        where: {
          tenantId_employeeId_dayOfWeek: {
            tenantId: user.tenantId,
            employeeId: null as any,
            dayOfWeek: d.dayOfWeek,
          },
        },
        update: {
          isWorkingDay: d.isWorkingDay,
          startTime: d.startTime || '09:00',
          endTime: d.endTime || '17:00',
          breakStart: d.breakStart || null,
          breakEnd: d.breakEnd || null,
          timezone,
          bufferTime,
          slotDuration,
          leadTimeHours,
        },
        create: {
          tenantId: user.tenantId,
          employeeId: null,
          dayOfWeek: d.dayOfWeek,
          isWorkingDay: d.isWorkingDay,
          startTime: d.startTime || '09:00',
          endTime: d.endTime || '17:00',
          breakStart: d.breakStart || null,
          breakEnd: d.breakEnd || null,
          timezone,
          bufferTime,
          slotDuration,
          leadTimeHours,
        },
      });
    }

    // Also update tenant timezone
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { timezone },
    });

    return NextResponse.json({ success: true, message: 'Availability updated successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update availability' },
      { status: 500 }
    );
  }
}
