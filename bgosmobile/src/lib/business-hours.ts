export interface BusinessDayHours {
  open: boolean;
  openTime: string;
  closeTime: string;
  is24Hours?: boolean;
}

export type BusinessWeekHours = Record<string, BusinessDayHours>;

export interface SpecialDayHours {
  date: string;
  open: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface OpenStatusResult {
  isOpen: boolean | null;
  label: string;
}

const WEEK_DAY_ORDER = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const SHORT_DAY: Record<string, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

function parseMinutes(hhmm?: string): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const mins = Number.parseInt(match[2], 10);
  if (hours === 24 && mins === 0) return 24 * 60;
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

export function formatClock12h(hhmm?: string): string {
  const total = parseMinutes(hhmm);
  if (total == null) return hhmm || '';
  if (total === 24 * 60) return '12:00 AM';
  const h24 = Math.floor(total / 60);
  const mins = total % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return mins === 0 ? `${h12} ${period}` : `${h12}:${String(mins).padStart(2, '0')} ${period}`;
}

function getZonedClock(now: Date, timeZone?: string | null): {
  dayName: (typeof WEEK_DAY_ORDER)[number];
  dayIndex: number;
  dateStr: string;
  minutesNow: number;
} {
  try {
    const tz = timeZone && timeZone.trim() ? timeZone.trim() : undefined;
    const parts = new Intl.DateTimeFormat('en-US', {
      ...(tz ? { timeZone: tz } : {}),
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const weekday = get('weekday');
    const dayIdx = WEEK_DAY_ORDER.findIndex((d) => d.toLowerCase() === weekday.toLowerCase());
    const safeDayIdx = dayIdx >= 0 ? dayIdx : now.getDay();
    const hour = Number.parseInt(get('hour'), 10);
    const minute = Number.parseInt(get('minute'), 10);
    const yyyy = get('year');
    const mm = get('month');
    const dd = get('day');

    return {
      dayName: WEEK_DAY_ORDER[safeDayIdx],
      dayIndex: safeDayIdx,
      dateStr: yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : now.toISOString().slice(0, 10),
      minutesNow:
        Number.isFinite(hour) && Number.isFinite(minute)
          ? (hour % 24) * 60 + minute
          : now.getHours() * 60 + now.getMinutes(),
    };
  } catch {
    return {
      dayName: WEEK_DAY_ORDER[now.getDay()],
      dayIndex: now.getDay(),
      dateStr: now.toISOString().slice(0, 10),
      minutesNow: now.getHours() * 60 + now.getMinutes(),
    };
  }
}

function normalizeDayEntry(raw: any): BusinessDayHours | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.open === 'boolean') {
    return raw as BusinessDayHours;
  }
  if (typeof raw.closed === 'boolean' || typeof raw.open === 'string') {
    return {
      open: raw.closed === true ? false : true,
      openTime: typeof raw.openTime === 'string' ? raw.openTime : typeof raw.open === 'string' ? raw.open : '09:00',
      closeTime: typeof raw.closeTime === 'string' ? raw.closeTime : typeof raw.close === 'string' ? raw.close : '18:00',
      is24Hours: Boolean(raw.is24Hours),
    };
  }
  return null;
}

function resolveDayEntry(
  regularHours: BusinessWeekHours | null | undefined,
  dayName: string,
): BusinessDayHours | null {
  if (!regularHours || typeof regularHours !== 'object') return null;
  const direct = normalizeDayEntry(regularHours[dayName]);
  if (direct) return direct;
  const lower = dayName.toLowerCase();
  for (const [key, val] of Object.entries(regularHours)) {
    if (key.toLowerCase() === lower || key.toLowerCase().startsWith(lower.slice(0, 3))) {
      return normalizeDayEntry(val);
    }
  }
  return null;
}

/**
 * Computes honest real-time open/closed status from structured business hours
 * in the business's local timezone. Never fabricates opening hours.
 */
export function formatBusinessOpenStatus(opts: {
  regularHours?: BusinessWeekHours | null;
  specialHours?: SpecialDayHours[] | null;
  openNowOverride?: boolean | null;
  timeZone?: string | null;
  now?: Date;
}): OpenStatusResult {
  const now = opts.now || new Date();
  const { dayName, dayIndex, dateStr, minutesNow } = getZonedClock(now, opts.timeZone);

  const specialToday = opts.specialHours?.find((s) => s.date === dateStr);
  const regularHours = opts.regularHours;
  const hasAnyRegularHours =
    Boolean(regularHours && typeof regularHours === 'object' && Object.keys(regularHours).length > 0);

  if (!specialToday && !hasAnyRegularHours) {
    if (typeof opts.openNowOverride === 'boolean') {
      return {
        isOpen: opts.openNowOverride,
        label: opts.openNowOverride ? 'Open now' : 'Closed now',
      };
    }
    return { isOpen: null, label: 'Hours not set' };
  }

  const todayHours: BusinessDayHours | null = specialToday
    ? {
        open: Boolean(specialToday.open),
        openTime: specialToday.openTime || '09:00',
        closeTime: specialToday.closeTime || '18:00',
      }
    : resolveDayEntry(regularHours, dayName);

  if (todayHours?.open) {
    if (todayHours.is24Hours) {
      return { isOpen: true, label: 'Open 24 hours' };
    }
    const openMins = parseMinutes(todayHours.openTime);
    const closeMins = parseMinutes(todayHours.closeTime);
    if (openMins != null && closeMins != null) {
      if (openMins === 0 && closeMins >= 23 * 60 + 59) {
        return { isOpen: true, label: 'Open 24 hours' };
      }
      // Overnight schedule (e.g. 18:00 -> 02:00)
      if (closeMins <= openMins) {
        if (minutesNow >= openMins || minutesNow < closeMins) {
          return { isOpen: true, label: `Open · Closes ${formatClock12h(todayHours.closeTime)}` };
        }
      } else {
        if (minutesNow >= openMins && minutesNow < closeMins) {
          return { isOpen: true, label: `Open · Closes ${formatClock12h(todayHours.closeTime)}` };
        }
        if (minutesNow < openMins) {
          return { isOpen: false, label: `Closed · Opens ${formatClock12h(todayHours.openTime)}` };
        }
      }
    } else if (typeof opts.openNowOverride === 'boolean') {
      return {
        isOpen: opts.openNowOverride,
        label: opts.openNowOverride ? 'Open now' : 'Closed now',
      };
    }
  }

  // Find next open day within the next 7 days
  if (hasAnyRegularHours) {
    for (let offset = 1; offset <= 7; offset++) {
      const nextName = WEEK_DAY_ORDER[(dayIndex + offset) % 7];
      const nextHours = resolveDayEntry(regularHours, nextName);
      if (nextHours?.open) {
        const openFormatted = nextHours.is24Hours ? '12:00 AM' : formatClock12h(nextHours.openTime);
        const dayPrefix = offset === 1 ? 'tomorrow' : SHORT_DAY[nextName];
        return {
          isOpen: false,
          label: openFormatted ? `Closed · Opens ${dayPrefix} ${openFormatted}` : `Closed · Opens ${dayPrefix}`,
        };
      }
    }
  }

  return { isOpen: false, label: 'Closed' };
}
