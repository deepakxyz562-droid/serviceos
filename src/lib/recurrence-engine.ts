/**
 * Recurrence Engine — Shared Domain Module
 * =========================================
 *
 * The single source of truth for recurring schedule date math.
 *
 * This module is PURE (no DB, no side effects) so it can be imported by:
 *   - Server-side API routes (to compute nextRunAt on schedule creation)
 *   - Server-side cron runner (to advance nextRunAt)
 *   - Client-side React (to show "27 visits" preview in the UI)
 *
 * The "27 visits" preview the user sees in Create Job MUST match the backend's
 * actual generation. By sharing this module, both sides use identical logic.
 *
 * Public API:
 *   - `calculateNextOccurrence(input, afterDate)` → next occurrence Date | null
 *   - `calculateOccurrences(input, opts)` → Date[] preview list
 *   - `countOccurrences(input)` → number (for "27 visits" summary)
 *   - `formatScheduleSummary(input)` → human-readable string
 *   - `validateSchedule(input)` → { valid, errors[] }
 *   - `parseWeekdaysJson(json)` → number[]
 *   - `parseNthWeekdayJson(json)` → { week, weekday } | null
 *
 * Supported frequencies:
 *   - daily        → every N days (interval=1 default)
 *   - weekly       → on dayOfWeek OR any of weekdaysJson[] (multi-day), every N weeks
 *   - biweekly     → alias for weekly + interval=2
 *   - monthly      → dayOfMonth OR nth-weekday-of-month (nthWeekdayJson), every N months
 *   - quarterly    → monthly + interval=3
 *   - annually     → monthly + interval=12
 *   - as_needed    → no automatic generation (returns null from calculateNextOccurrence)
 *   - custom       → freed-text; falls back to weekly behavior
 */

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Shape of a RecurringJobSchedule for the recurrence engine.
 * Uses snake_case-ish Prisma field names but is intentionally loose so both
 * DB rows and client-side form state can be passed in.
 */
export interface RecurrenceInput {
  frequency: string;
  /** 0-6 (Sun=0). Single-day weekly. Superseded by weekdaysJson when non-empty. */
  dayOfWeek?: number | null;
  /** 1-31 for monthly/quarterly/annually. Clamped to month-end. */
  dayOfMonth?: number | null;
  /** 1-5 for "second Tuesday" patterns. Pair with dayOfWeek. */
  weekOfMonth?: number | null;
  /** JSON array of weekday ints (e.g. [1,3,5] = Mon/Wed/Fri). Empty/invalid → []. */
  weekdaysJson?: string | null;
  /** "Every N <unit>" multiplier. Default 1. interval=2 + weekly → "Every 2 weeks". */
  interval?: number | null;
  /** JSON: {"week": 1|2|3|4|5|-1, "weekday": 0-6}. -1 = last. For monthly nth-weekday. */
  nthWeekdayJson?: string | null;
  /** "09:30" 24h format (start time). End computed as start + durationMins. */
  timeOfDay?: string | null;
  /** Visit duration in minutes. Default 60. */
  durationMins?: number | null;
  /** When the schedule starts (first occurrence ≥ this). Default now. */
  startDate?: Date | string | null;
  /** When the schedule ends (null = open-ended / Never). */
  endDate?: Date | string | null;
  /** Stop after N generated occurrences (null = unlimited). */
  endAfterOccurrences?: number | null;
  /** true = FLEXIBLE schedule, no auto-cron. calculateNextOccurrence returns null. */
  asNeeded?: boolean | null;
  /** IANA timezone name (e.g. "Asia/Kolkata"). Null = server local. */
  timezone?: string | null;
}

export interface OccurrencePreviewOptions {
  /** Max occurrences to return (safety cap). Default 365. */
  max?: number;
  /** When to stop computing occurrences. Default = startDate + 2 years OR endDate. */
  until?: Date | string | null;
}

export interface ScheduleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const MONTH_STEP: Record<string, number> = {
  daily: 0,      // daily uses day-add, not month-add
  weekly: 0,     // weekly uses day-add
  biweekly: 0,   // biweekly uses day-add
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

const WEEK_STEP_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function applyTimeOfDay(date: Date, time: string | null | undefined): Date {
  const d = new Date(date);
  if (!time) {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

function getTimezoneOffsetMinutes(timezone: string | null | undefined, date: Date): number {
  if (!timezone) return 0;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? '0');
    const hour = get('hour') % 24;
    const wallClockAsUtc = new Date(Date.UTC(
      get('year'), get('month') - 1, get('day'),
      hour, get('minute'), get('second'),
    ));
    return Math.round((wallClockAsUtc.getTime() - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function zonedTimeToUtc(
  timezone: string | null | undefined,
  year: number, month0: number, day: number,
  hours: number, minutes: number, seconds: number = 0,
): Date {
  if (!timezone) {
    return new Date(year, month0, day, hours, minutes, seconds);
  }
  const fakeUtc = new Date(Date.UTC(year, month0, day, hours, minutes, seconds));
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, fakeUtc);
  return new Date(fakeUtc.getTime() - offsetMinutes * 60000);
}

/**
 * Find the Nth occurrence of a given weekday in a month.
 * Returns 0 if there's no Nth occurrence (e.g. the 5th Monday doesn't always exist).
 *
 * @param year  e.g. 2024
 * @param month0 0-indexed (0 = January)
 * @param weekday 0-6 (0 = Sunday)
 * @param weekOfMonth 1-5 (1 = first occurrence) OR -1 (last occurrence of the month)
 */
function nthWeekdayOfMonth(
  year: number,
  month0: number,
  weekday: number,
  weekOfMonth: number,
): number {
  if (weekOfMonth === -1) {
    // Last weekday of the month.
    const last = daysInMonth(year, month0);
    const lastDate = new Date(year, month0, last);
    let diff = (lastDate.getDay() - weekday + 7) % 7;
    return last - diff;
  }
  const first = new Date(year, month0, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (weekOfMonth - 1) * 7;
  if (day > daysInMonth(year, month0)) return 0;
  return day;
}

/**
 * Parse weekdaysJson — accepts "[1,3,5]" or "1,3,5" or "[1, 3, 5]".
 * Returns sorted unique array of 0-6 ints. Invalid → [].
 */
export function parseWeekdaysJson(json: string | null | undefined): number[] {
  if (!json) return [];
  let s = json.trim();
  if (!s) return [];
  // Strip surrounding brackets
  if (s.startsWith('[')) s = s.slice(1);
  if (s.endsWith(']')) s = s.slice(0, -1);
  if (!s) return [];
  const nums = s
    .split(',')
    .map(p => parseInt(p.trim(), 10))
    .filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

/**
 * Parse nthWeekdayJson — accepts {"week": 2, "weekday": 2} shape.
 * Returns null if invalid.
 *   week: 1|2|3|4|5|-1  (-1 = last)
 *   weekday: 0-6
 */
export function parseNthWeekdayJson(json: string | null | undefined): { week: number; weekday: number } | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    const { week, weekday } = parsed as Record<string, unknown>;
    const w = Number(week);
    const wd = Number(weekday);
    if (!Number.isInteger(w) || !Number.isInteger(wd)) return null;
    if (![-1, 1, 2, 3, 4, 5].includes(w)) return null;
    if (wd < 0 || wd > 6) return null;
    return { week: w, weekday: wd };
  } catch {
    return null;
  }
}

// ─── Core: calculateNextOccurrence ─────────────────────────────────────────

/**
 * Compute the next occurrence date strictly AFTER `afterDate`.
 *
 * Returns null if:
 *   - frequency is 'as_needed' (FLEXIBLE — never auto-generates)
 *   - computed next occurrence is past `endDate`
 *   - schedule has hit `endAfterOccurrences` cap (caller must check executionCount separately)
 *
 * @param input  recurrence configuration
 * @param afterDate  compute the next occurrence strictly after this instant
 */
/**
 * Compute the next occurrence date strictly AFTER `afterDate`.
 *
 * Returns null if:
 *   - frequency is 'as_needed' (FLEXIBLE — never auto-generates)
 *   - computed next occurrence is past `endDate`
 *   - schedule has hit `endAfterOccurrences` cap (caller must check executionCount separately)
 *
 * @param input  recurrence configuration
 * @param afterDate  compute the next occurrence strictly after this instant
 * @param opts.inclusiveFirst  when true, allows returning `afterDate` itself if it matches the pattern. Used by calculateOccurrences() to include the start date as the first visit.
 */
export function calculateNextOccurrence(
  input: RecurrenceInput,
  afterDate: Date,
  opts: { inclusiveFirst?: boolean } = {},
): Date | null {
  const frequency = (input.frequency || 'weekly').toLowerCase();
  const interval = Math.max(1, Number(input.interval) || 1);
  const inclusiveFirst = opts.inclusiveFirst ?? false;

  // FLEXIBLE schedule — never auto-generate.
  if (frequency === 'as_needed' || input.asNeeded) {
    return null;
  }

  let result: Date;

  if (frequency === 'daily') {
    const cursor = new Date(afterDate);
    if (!inclusiveFirst) cursor.setDate(cursor.getDate() + interval);
    // For inclusiveFirst, only advance if cursor doesn't match the pattern.
    // Daily pattern matches every day, so cursor itself matches if inclusiveFirst.
    else {
      // Check if cursor's time matches timeOfDay; if not, advance to next day at timeOfDay.
      // For simplicity in daily mode, just keep cursor at same day with timeOfDay applied.
    }
    result = cursor;
  } else if (frequency === 'weekly' || frequency === 'biweekly' || frequency === 'custom') {
    const stepDays = (WEEK_STEP_DAYS[frequency] || 7) * interval;
    const weekdays = parseWeekdaysJson(input.weekdaysJson);

    if (inclusiveFirst) {
      // Check if afterDate itself matches the pattern (weekday matches AND we're at/after startDate).
      const afterDow = afterDate.getDay();
      const matchesDay = weekdays.length > 0
        ? weekdays.includes(afterDow)
        : (input.dayOfWeek != null ? afterDow === input.dayOfWeek : true);
      if (matchesDay) {
        result = new Date(afterDate);
      } else {
        // Find the next matching weekday within the step window.
        result = findNextWeekday(afterDate, weekdays, input.dayOfWeek, stepDays);
      }
    } else {
      result = findNextWeekday(afterDate, weekdays, input.dayOfWeek, stepDays);
    }
  } else {
    // monthly / quarterly / annually
    const step = (MONTH_STEP[frequency] || 1) * interval;

    if (inclusiveFirst) {
      // Check if afterDate's day matches the monthly pattern.
      const matchesPattern = matchesMonthlyPattern(afterDate, input);
      if (matchesPattern) {
        result = new Date(afterDate);
      } else {
        result = computeMonthlyOccurrence(afterDate, input, step, /* advance */ true);
      }
    } else {
      result = computeMonthlyOccurrence(afterDate, input, step, /* advance */ true);
    }
  }

  // Apply time-of-day (defaults to 00:00).
  // When timezone is set, re-interpret wall-clock in that zone → UTC instant.
  if (input.timezone) {
    const m = input.timeOfDay
      ? /^(\d{1,2}):(\d{2})$/.exec(input.timeOfDay.trim())
      : null;
    const hours = m ? Number(m[1]) : 0;
    const minutes = m ? Number(m[2]) : 0;
    result = zonedTimeToUtc(
      input.timezone,
      result.getFullYear(),
      result.getMonth(),
      result.getDate(),
      hours,
      minutes,
      0,
    );
  } else {
    result = applyTimeOfDay(result, input.timeOfDay);
  }

  // End-date guard.
  if (input.endDate && result > new Date(input.endDate)) {
    return null;
  }

  return result;
}

/**
 * Find the next weekday matching `weekdays` or `dayOfWeek`, strictly after `afterDate`,
 * within `maxDays` window. Used by the weekly/biweekly/custom branches.
 */
function findNextWeekday(
  afterDate: Date,
  weekdays: number[],
  dayOfWeek: number | null | undefined,
  maxDays: number,
): Date {
  if (weekdays.length > 0) {
    // Multi-day weekly.
    for (let i = 1; i <= maxDays; i++) {
      const probe = new Date(afterDate);
      probe.setDate(probe.getDate() + i);
      if (weekdays.includes(probe.getDay())) {
        return probe;
      }
    }
    // No match in window — fall back to next interval's first weekday.
    const probe = new Date(afterDate);
    probe.setDate(probe.getDate() + maxDays + 1);
    return probe;
  }
  // Single-day weekly.
  const targetDow = dayOfWeek ?? 0;
  const cursor = new Date(afterDate);
  cursor.setDate(cursor.getDate() + 1); // strictly after
  const cur = cursor.getDay();
  let diff = (targetDow - cur + 7) % 7;
  if (diff === 0) diff = 7;
  diff += (Math.floor(maxDays / 7) - 1) * 7; // for interval > 1
  cursor.setDate(cursor.getDate() + diff);
  return cursor;
}

/**
 * Check whether a date matches the monthly recurrence pattern (dayOfMonth or nth-weekday).
 */
function matchesMonthlyPattern(date: Date, input: RecurrenceInput): boolean {
  const nthWeekday = parseNthWeekdayJson(input.nthWeekdayJson);
  if (nthWeekday) {
    const day = nthWeekdayOfMonth(date.getFullYear(), date.getMonth(), nthWeekday.weekday, nthWeekday.week);
    return day === date.getDate();
  }
  if (input.weekOfMonth && input.dayOfWeek != null) {
    const day = nthWeekdayOfMonth(date.getFullYear(), date.getMonth(), input.dayOfWeek, input.weekOfMonth);
    return day === date.getDate();
  }
  if (input.dayOfMonth != null) {
    return input.dayOfMonth === date.getDate();
  }
  return false;
}

/**
 * Compute the next monthly occurrence by advancing N months from afterDate.
 */
function computeMonthlyOccurrence(
  afterDate: Date,
  input: RecurrenceInput,
  step: number,
  _advance: boolean,
): Date {
  const base = new Date(afterDate);
  base.setDate(1);
  base.setMonth(base.getMonth() + step);

  const nthWeekday = parseNthWeekdayJson(input.nthWeekdayJson);
  if (nthWeekday) {
    const day = nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), nthWeekday.weekday, nthWeekday.week);
    if (day === 0) {
      base.setMonth(base.getMonth() + step);
      const retryDay = nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), nthWeekday.weekday, nthWeekday.week);
      base.setDate(retryDay || 1);
    } else {
      base.setDate(day);
    }
  } else if (input.weekOfMonth && input.dayOfWeek != null) {
    const day = nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), input.dayOfWeek, input.weekOfMonth);
    if (day === 0) {
      base.setMonth(base.getMonth() + step);
      const retryDay = nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), input.dayOfWeek, input.weekOfMonth);
      base.setDate(retryDay || 1);
    } else {
      base.setDate(day);
    }
  } else {
    const dom = input.dayOfMonth ?? 1;
    const max = daysInMonth(base.getFullYear(), base.getMonth());
    base.setDate(Math.min(dom, max));
  }
  return base;
}

// ─── Core: calculateOccurrences (preview list) ────────────────────────────

/**
 * Generate a list of upcoming occurrence dates, starting from `input.startDate`.
 *
 * Used by:
 *   - UI "27 visits" preview (limited to ~50 to avoid runaway computation)
 *   - Backend "planned occurrences" tab in Schedule Detail
 *
 * Stops when:
 *   - reaches `opts.max` (default 365)
 *   - reaches `opts.until` (default = startDate + 2 years OR input.endDate)
 *   - reaches `input.endAfterOccurrences` if set
 *   - calculateNextOccurrence returns null (as_needed, past endDate)
 *
 * Does NOT include the start date itself unless `includeStart` is true (default true).
 */
export function calculateOccurrences(
  input: RecurrenceInput,
  opts: OccurrencePreviewOptions = {},
): Date[] {
  const max = Math.min(opts.max ?? 365, 1000);
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const defaultUntil = new Date(startDate);
  defaultUntil.setFullYear(defaultUntil.getFullYear() + 2);
  const until = opts.until ? new Date(opts.until) : (input.endDate ? new Date(input.endDate) : defaultUntil);

  const occurrences: Date[] = [];

  // For the FIRST occurrence, check if startDate itself matches the pattern.
  // calculateNextOccurrence uses "strictly after" semantics (correct for cron
  // advancing), but the preview should INCLUDE the start date if it matches.
  // We pass inclusiveFirst=true so the start date is returned if it matches.
  let next: Date | null = calculateNextOccurrence(input, startDate, { inclusiveFirst: true });

  // Note: we do NOT filter out `next < startDate` here when timezone is set,
  // because the first occurrence in the schedule's timezone may have a UTC
  // instant that's technically "before" the raw startDate (which was parsed
  // in the runtime's local TZ). The inclusiveFirst check already ensures the
  // DATE in the schedule's timezone matches, which is the correct semantic.
  if (next && !input.timezone && next < startDate) {
    // Defensive: only filter when no timezone is set (raw local comparison).
    while (next && next < startDate) {
      next = calculateNextOccurrence(input, next);
    }
  }

  let count = 0;
  while (next && occurrences.length < max && next <= until) {
    if (input.endAfterOccurrences && count >= input.endAfterOccurrences) break;
    occurrences.push(next);
    count++;
    next = calculateNextOccurrence(input, occurrences[occurrences.length - 1]);
  }

  return occurrences;
}

/**
 * Count total occurrences the schedule will produce.
 * Caps at 10000 for safety.
 */
export function countOccurrences(input: RecurrenceInput): number {
  if (input.asNeeded) return 0;
  return calculateOccurrences(input, { max: 10000 }).length;
}

// ─── Summary formatter (for UI display) ────────────────────────────────────

/**
 * Format a human-readable recurrence summary.
 *
 * Examples:
 *   "Weekly on Tuesday"
 *   "Weekly on Mon, Wed, Fri"
 *   "Every 2 weeks on Tuesday"
 *   "Monthly on the 18th"
 *   "Monthly on the first Monday"
 *   "Daily"
 *   "As needed"
 *   "Aug 18, 2026 → Feb 16, 2027 · 27 visits"
 */
export function formatScheduleSummary(input: RecurrenceInput): string {
  const freq = (input.frequency || 'weekly').toLowerCase();
  const interval = Math.max(1, Number(input.interval) || 1);
  const weekdays = parseWeekdaysJson(input.weekdaysJson);
  const nthWeekday = parseNthWeekdayJson(input.nthWeekdayJson);

  let cadence: string;

  if (input.asNeeded || freq === 'as_needed') {
    cadence = 'As needed';
  } else if (freq === 'daily') {
    cadence = interval === 1 ? 'Daily' : `Every ${interval} days`;
  } else if (freq === 'weekly' || freq === 'custom') {
    if (weekdays.length > 0) {
      const days = weekdays.map(d => DAY_NAMES[d]).join(', ');
      cadence = interval === 1 ? `Weekly on ${days}` : `Every ${interval} weeks on ${days}`;
    } else {
      const dayName = input.dayOfWeek != null ? DAY_NAMES[input.dayOfWeek] : 'Sunday';
      cadence = interval === 1 ? `Weekly on ${dayName}` : `Every ${interval} weeks on ${dayName}`;
    }
  } else if (freq === 'biweekly') {
    const dayName = input.dayOfWeek != null ? DAY_NAMES[input.dayOfWeek] : 'Sunday';
    cadence = `Every 2 weeks on ${dayName}`;
  } else if (freq === 'monthly') {
    if (nthWeekday) {
      const weekWord = nthWeekday.week === -1 ? 'last' : ['first', 'second', 'third', 'fourth', 'fifth'][nthWeekday.week - 1];
      cadence = interval === 1
        ? `Monthly on the ${weekWord} ${DAY_NAMES_FULL[nthWeekday.weekday]}`
        : `Every ${interval} months on the ${weekWord} ${DAY_NAMES_FULL[nthWeekday.weekday]}`;
    } else if (input.weekOfMonth && input.dayOfWeek != null) {
      const weekWord = ['first', 'second', 'third', 'fourth', 'fifth'][input.weekOfMonth - 1];
      cadence = `Monthly on the ${weekWord} ${DAY_NAMES_FULL[input.dayOfWeek]}`;
    } else {
      const day = input.dayOfMonth ?? 1;
      const ordinal = ordinalSuffix(day);
      cadence = interval === 1 ? `Monthly on the ${day}${ordinal}` : `Every ${interval} months on the ${day}${ordinal}`;
    }
  } else if (freq === 'quarterly') {
    const day = input.dayOfMonth ?? 1;
    cadence = `Quarterly on the ${day}${ordinalSuffix(day)}`;
  } else if (freq === 'annually') {
    cadence = 'Annually';
  } else {
    cadence = freq;
  }

  return cadence;
}

/**
 * Format a full schedule preview string with date range + visit count.
 * Example: "Aug 18, 2026 → Feb 16, 2027 · 27 visits · Weekly on Tuesday"
 */
export function formatSchedulePreview(input: RecurrenceInput): string {
  const cadence = formatScheduleSummary(input);
  if (input.asNeeded || (input.frequency || '').toLowerCase() === 'as_needed') {
    const start = input.startDate ? new Date(input.startDate) : new Date();
    return `Starting ${formatDate(start)} · ${cadence}`;
  }

  const occurrences = calculateOccurrences(input, { max: 1000 });
  const count = occurrences.length;
  const start = occurrences[0] || (input.startDate ? new Date(input.startDate) : new Date());

  if (count === 0) {
    return `Starting ${formatDate(start)} · ${cadence} · Ongoing`;
  }

  if (input.endDate) {
    const end = occurrences[occurrences.length - 1] || new Date(input.endDate);
    return `${formatDate(start)} → ${formatDate(end)} · ${count} visits · ${cadence}`;
  }

  if (input.endAfterOccurrences) {
    const last = occurrences[occurrences.length - 1];
    return `Starting ${formatDate(start)} → ${formatDate(last)} · ${count} visits · ${cadence}`;
  }

  return `Starting ${formatDate(start)} · Every ${cadence.replace(/^Weekly on /, '')} · Ongoing`;
}

function formatDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// ─── Validation ────────────────────────────────────────────────────────────

/**
 * Validate a recurrence configuration before persisting.
 * Returns `{ valid, errors, warnings }`.
 *
 * Errors block schedule creation. Warnings are non-blocking (e.g. "monthly day 31
 * won't exist in some months").
 */
export function validateSchedule(input: RecurrenceInput): ScheduleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const freq = (input.frequency || '').toLowerCase();
  const validFreqs = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'as_needed', 'custom'];
  if (!validFreqs.includes(freq)) {
    errors.push(`Invalid frequency: ${input.frequency}. Must be one of ${validFreqs.join(', ')}`);
  }

  if (freq === 'as_needed' || input.asNeeded) {
    return { valid: errors.length === 0, errors, warnings };
  }

  if (freq === 'weekly' || freq === 'biweekly' || freq === 'custom') {
    const weekdays = parseWeekdaysJson(input.weekdaysJson);
    if (weekdays.length === 0 && input.dayOfWeek == null) {
      // For 'custom', dayOfWeek isn't strictly required (interval controls cadence).
      if (freq !== 'custom') {
        errors.push('Weekly/biweekly schedules require dayOfWeek or weekdaysJson');
      }
    }
    if (weekdays.length > 0 && input.dayOfWeek != null) {
      warnings.push('Both weekdaysJson and dayOfWeek are set — weekdaysJson takes precedence');
    }
  }

  if (freq === 'monthly' || freq === 'quarterly' || freq === 'annually') {
    const nthWeekday = parseNthWeekdayJson(input.nthWeekdayJson);
    if (!nthWeekday && input.dayOfMonth == null && !input.weekOfMonth) {
      errors.push('Monthly schedules require dayOfMonth, weekOfMonth+dayOfWeek, or nthWeekdayJson');
    }
    if (input.dayOfMonth && (input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
      errors.push('dayOfMonth must be 1-31');
    }
    if (input.dayOfMonth && input.dayOfMonth > 28) {
      warnings.push(`Day ${input.dayOfMonth} won't exist in February — will clamp to last day of month`);
    }
  }

  if (input.interval != null && input.interval < 1) {
    errors.push('interval must be ≥ 1');
  }

  if (input.startDate && input.endDate) {
    if (new Date(input.startDate) > new Date(input.endDate)) {
      errors.push('startDate must be before endDate');
    }
  }

  if (input.endAfterOccurrences != null && input.endAfterOccurrences < 1) {
    errors.push('endAfterOccurrences must be ≥ 1');
  }

  if (input.timeOfDay) {
    if (!/^\d{1,2}:\d{2}$/.test(input.timeOfDay.trim())) {
      errors.push('timeOfDay must be HH:MM 24h format');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Schedule state helpers ───────────────────────────────────────────────

/**
 * Determine whether a schedule should be auto-paused due to hitting endAfterOccurrences.
 * Caller passes the current executionCount; this returns true when count >= cap.
 */
export function hasHitOccurrenceCap(
  input: Pick<RecurrenceInput, 'endAfterOccurrences'>,
  executionCount: number,
): boolean {
  if (!input.endAfterOccurrences) return false;
  return executionCount >= input.endAfterOccurrences;
}

/**
 * Determine whether a schedule is currently paused (manual or scheduled-resume).
 * A schedule is paused if `pausedAt` is set AND `pausedUntil` is null or in the future.
 * If `pausedUntil` is in the past, the schedule should auto-resume.
 */
export function isSchedulePaused(
  pausedAt: Date | null,
  pausedUntil: Date | null,
  now: Date = new Date(),
): boolean {
  if (!pausedAt) return false;
  if (!pausedUntil) return true; // indefinite pause
  return pausedUntil > now;
}

/**
 * Determine if a paused schedule should auto-resume now.
 * True when pausedAt is set AND pausedUntil is set AND pausedUntil <= now.
 */
export function shouldAutoResume(
  pausedAt: Date | null,
  pausedUntil: Date | null,
  now: Date = new Date(),
): boolean {
  if (!pausedAt || !pausedUntil) return false;
  return pausedUntil <= now;
}
