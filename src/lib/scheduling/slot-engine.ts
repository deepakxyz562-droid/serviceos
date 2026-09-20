/**
 * Slot Engine — server-side availability calculator.
 *
 * The core "scheduling brain" that generates available time slots from:
 *   1. Recurring weekly working hours (Availability model)
 *   2. Service-level overrides (ServiceAvailability)
 *   3. Existing bookings (already-scheduled slots are blocked)
 *   4. Buffer times (gap between appointments for travel/prep)
 *   5. Lead time (minimum hours before a slot can be booked)
 *   6. Holidays (blocked dates via HolidayCalendar)
 *
 * This is how Calendly works — it doesn't store every possible time slot,
 * it calculates them from rules on-the-fly.
 */

import { db } from '@/lib/db';

export interface TimeSlot {
  startTime: string;   // ISO 8601 datetime (UTC)
  endTime: string;     // ISO 8601 datetime (UTC)
  available: boolean;
  employeeId?: string; // assigned employee (for round-robin)
  label?: string;      // e.g. "10:00 AM"
}

export interface SlotEngineParams {
  tenantId: string;
  serviceId?: string;
  employeeId?: string;
  date: string;        // "YYYY-MM-DD"
  timezone?: string;   // defaults to tenant's timezone
}

export interface SlotEngineResult {
  date: string;
  timezone: string;
  slots: TimeSlot[];
  workingDay: boolean;
  reason?: string;     // why no slots (holiday, no working hours, etc.)
}

/**
 * Calculate available time slots for a given date + service + employee.
 *
 * Algorithm:
 * 1. Fetch the day-of-week for the requested date
 * 2. Fetch Availability rules (tenant + employee) for that day
 * 3. Fetch ServiceAvailability override (if serviceId provided)
 * 4. Apply overrides to slot duration / buffer / lead time
 * 5. Generate all possible slots within working hours
 * 6. Remove break time slots
 * 7. Remove slots that overlap with existing bookings
 * 8. Remove slots that are within lead time (too soon to book)
 * 9. Return remaining slots with labels
 */
export async function calculateAvailableSlots(
  params: SlotEngineParams,
): Promise<SlotEngineResult> {
  const { tenantId, serviceId, employeeId, date, timezone } = params;
  const tz = timezone || 'America/New_York';

  try {
    // 1. Parse the date + determine day of week
    const targetDate = new Date(date + 'T00:00:00');
    const dayOfWeek = targetDate.getDay(); // 0=Sunday

    // 2. Check if date is a holiday
    const holiday = await db.holidayCalendar.findFirst({
      where: {
        tenantId,
        date: targetDate,
      },
    }).catch(() => null);

    if (holiday) {
      return {
        date,
        timezone: tz,
        slots: [],
        workingDay: false,
        reason: `Holiday: ${holiday.name || 'Closed'}`,
      };
    }

    // 3. Fetch Availability rules for this day
    // Priority: employee-specific > tenant-level default
    let availability = null;
    if (employeeId) {
      availability = await db.availability.findUnique({
        where: {
          tenantId_employeeId_dayOfWeek: { tenantId, employeeId, dayOfWeek },
        },
      }).catch(() => null);
    }

    if (!availability) {
      // Fall back to tenant-level (employeeId = null)
      availability = await db.availability.findFirst({
        where: {
          tenantId,
          employeeId: null,
          dayOfWeek,
        },
      }).catch(() => null);
    }

    // If no availability rule exists, use sensible defaults
    const workingDay = availability?.isWorkingDay ?? (dayOfWeek >= 1 && dayOfWeek <= 5); // Mon-Fri default
    const startTime = availability?.startTime || '09:00';
    const endTime = availability?.endTime || '17:00';
    const breakStart = availability?.breakStart || null;
    const breakEnd = availability?.breakEnd || null;

    if (!workingDay) {
      return {
        date,
        timezone: tz,
        slots: [],
        workingDay: false,
        reason: 'Not a working day',
      };
    }

    // 4. Fetch ServiceAvailability override
    let slotDuration = availability?.slotDuration || 30;
    let bufferTime = availability?.bufferTime || 0;
    let leadTimeHours = availability?.leadTimeHours || 2;

    if (serviceId) {
      const serviceOverride = await db.serviceAvailability.findFirst({
        where: {
          tenantId,
          serviceId,
          OR: [
            { employeeId: employeeId || null },
            { employeeId: null },
          ],
        },
        orderBy: { employeeId: 'desc' }, // prefer employee-specific
      }).catch(() => null);

      if (serviceOverride) {
        slotDuration = serviceOverride.slotDuration || slotDuration;
        bufferTime = serviceOverride.bufferTime || bufferTime;
        leadTimeHours = serviceOverride.leadTimeHours || leadTimeHours;
      }

      // Also get the service duration (default slot duration from Service)
      const service = await db.service.findUnique({
        where: { id: serviceId },
        select: { duration: true },
      }).catch(() => null);

      if (service?.duration && !serviceOverride) {
        slotDuration = service.duration;
      }
    }

    // 5. Generate all possible slots within working hours
    const slots = generateTimeSlots(
      date,
      startTime,
      endTime,
      slotDuration,
      bufferTime,
      tz,
    );

    // 6. Remove break time slots
    const filteredSlots = breakStart && breakEnd
      ? slots.filter((slot) => {
          const slotStart = parseSlotTime(slot.startTime);
          const slotEnd = parseSlotTime(slot.endTime);
          const breakS = parseTimeString(breakStart);
          const breakE = parseTimeString(breakEnd);
          return !(slotStart < breakE && slotEnd > breakS);
        })
      : slots;

    // 7. Remove slots that overlap with existing bookings
    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59');

    const existingBookings = await db.booking.findMany({
      where: {
        tenantId,
        employeeId: employeeId || undefined,
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['cancelled', 'no_show'] },
      },
      select: { scheduledAt: true, scheduledEndTime: true, duration: true },
    }).catch(() => []);

    const bookedRanges = existingBookings.map((booking) => {
      const start = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
      const end = booking.scheduledEndTime
        ? new Date(booking.scheduledEndTime)
        : start
          ? new Date(start.getTime() + (booking.duration || slotDuration) * 60000)
          : null;
      return start && end ? { start, end } : null;
    }).filter((r): r is { start: Date; end: Date } => r !== null);

    const availableSlots = filteredSlots.filter((slot) => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      return !bookedRanges.some(
        (range) => slotStart < range.end && slotEnd > range.start,
      );
    });

    // 8. Remove slots within lead time (too soon to book)
    const now = new Date();
    const leadTimeCutoff = new Date(now.getTime() + leadTimeHours * 3600000);

    const finalSlots = availableSlots.filter((slot) => {
      const slotStart = new Date(slot.startTime);
      return slotStart > leadTimeCutoff;
    });

    // 9. Format labels
    const labeledSlots = finalSlots.map((slot) => ({
      ...slot,
      label: formatTimeLabel(new Date(slot.startTime), tz),
      employeeId: employeeId,
    }));

    return {
      date,
      timezone: tz,
      slots: labeledSlots,
      workingDay: true,
      reason: labeledSlots.length === 0 ? 'All slots are booked' : undefined,
    };
  } catch (error) {
    console.error('[slot-engine] Error calculating slots:', error);
    return {
      date,
      timezone: tz,
      slots: [],
      workingDay: false,
      reason: 'Error calculating availability',
    };
  }
}

/**
 * Generate time slots between start and end times.
 */
function generateTimeSlots(
  date: string,
  startTime: string,
  endTime: string,
  durationMin: number,
  bufferMin: number,
  _timezone: string,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  while (currentMin + durationMin <= endMin) {
    const slotStart = new Date(date + 'T00:00:00');
    slotStart.setMinutes(currentMin);

    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotStart.getMinutes() + durationMin);

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      available: true,
    });

    currentMin += durationMin + bufferMin;
  }

  return slots;
}

/**
 * Parse "HH:mm" → minutes since midnight
 */
function parseTimeString(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Parse an ISO datetime → minutes since midnight (in local time)
 */
function parseSlotTime(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Format a time slot for display: "10:00 AM", "2:30 PM"
 */
function formatTimeLabel(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}
