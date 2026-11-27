import { outlookBusyTimes } from '@/lib/scheduling/outlook-calendar-sync';
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
import { fetchGoogleCalendarBusyTimes } from '@/lib/scheduling/google-calendar-sync';
import {
  getLocalDateParts,
  resolveTenantLocale,
  wallClockToUtcDate,
} from '@/lib/locale-timezone';

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
  const tenant = tenantId
    ? await db.tenant.findUnique({
        where: { id: tenantId },
        select: { country: true, settingsJson: true },
      }).catch(() => null)
    : null;
  const localeInfo = resolveTenantLocale({
    tenantCountry: tenant?.country,
    settingsJson: tenant?.settingsJson,
    overrideTimeZone: timezone && timezone !== 'UTC' ? timezone : undefined,
  });
  const tz = localeInfo.timeZone;

  let parsedSettings: Record<string, any> = {};
  if (tenant?.settingsJson) {
    try {
      parsedSettings =
        typeof tenant.settingsJson === 'string'
          ? JSON.parse(tenant.settingsJson)
          : (tenant.settingsJson as Record<string, any>);
    } catch {}
  }

  try {
    // 1. Parse requested YYYY-MM-DD in tenant calendar + determine day of week
    const [yearStr, monthStr, dayStr] = date.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = targetDate.getUTCDay(); // 0=Sunday

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
    // Priority: employee-specific > tenant-level default > tenant settingsJson.businessHours > Mon-Fri default
    let availability: Awaited<ReturnType<typeof db.availability.findFirst>> = null;
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

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
    const bhMap = parsedSettings?.businessHours;
    const bhDay = bhMap?.[DAY_NAMES[dayOfWeek]] || bhMap?.[DAY_NAMES[dayOfWeek].toLowerCase()];

    let workingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    let startTime = '09:00';
    let endTime = '17:00';

    if (availability) {
      workingDay = availability.isWorkingDay;
      startTime = availability.startTime || '09:00';
      endTime = availability.endTime || '17:00';
    } else if (bhDay && typeof bhDay === 'object') {
      workingDay = bhDay.open !== false;
      if (bhDay.is24Hours) {
        startTime = '00:00';
        endTime = '23:59';
      } else {
        startTime = bhDay.openTime || bhDay.startTime || '09:00';
        endTime = bhDay.closeTime || bhDay.endTime || '17:00';
      }
    }

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
          const slotStart = parseSlotTime(slot.startTime, tz);
          const slotEnd = parseSlotTime(slot.endTime, tz);
          const breakS = parseTimeString(breakStart);
          const breakE = parseTimeString(breakEnd);
          return !(slotStart < breakE && slotEnd > breakS);
        })
      : slots;

    // 7. Remove slots that overlap with existing bookings
    const dayStart = wallClockToUtcDate({ year, month, day, hour: 0, minute: 0, timeZone: tz });
    const dayEnd = new Date(
      wallClockToUtcDate({ year, month, day, hour: 23, minute: 59, timeZone: tz }).getTime() + 59999,
    );

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

    // Merge Google Calendar busy periods (checks up to 6 work/personal sub-calendars)
    try {
      const gcalBusy = await fetchGoogleCalendarBusyTimes(
        tenantId,
        dayStart.toISOString(),
        dayEnd.toISOString()
      );
      if (Array.isArray(gcalBusy) && gcalBusy.length > 0) {
        bookedRanges.push(...gcalBusy);
      }
    } catch (gcalErr) {
      return { date, timezone: tz, slots: [], workingDay: true, reason: 'Connected calendar availability is temporarily unavailable. Please retry.' };
    }

    try {
      bookedRanges.push(...await outlookBusyTimes(tenantId, dayStart.toISOString(), dayEnd.toISOString()));
    } catch {
      return { date, timezone: tz, slots: [], workingDay: true, reason: 'Microsoft calendar availability is temporarily unavailable. Please retry.' };
    }

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
 * Generate time slots between start and end times in the tenant timezone.
 */
function generateTimeSlots(
  date: string,
  startTime: string,
  endTime: string,
  durationMin: number,
  bufferMin: number,
  timezone: string,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [yearStr, monthStr, dayStr] = date.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  while (currentMin + durationMin <= endMin) {
    const hour = Math.floor(currentMin / 60);
    const minute = currentMin % 60;
    const slotStart = wallClockToUtcDate({
      year,
      month,
      day,
      hour,
      minute,
      timeZone: timezone,
    });
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

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
 * Parse an ISO datetime → minutes since midnight (in the specified timezone)
 */
function parseSlotTime(iso: string, timezone = 'UTC'): number {
  const parts = getLocalDateParts(new Date(iso), timezone);
  return parts.hour * 60 + parts.minute;
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
