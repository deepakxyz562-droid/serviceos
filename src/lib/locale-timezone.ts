/**
 * Country, Calling Code, and IANA Timezone Scheduling Utilities
 * Ensures bulk review invites and scheduled media run during business daytime
 * in the workspace's own country/timezone rather than hardcoded IST/UTC offsets.
 */

export interface CountryLocaleMeta {
  code: string;
  name: string;
  callingCode: string;
  flag: string;
  timeZone: string;
  locale: string;
  nationalDigits: number;
}

export const COUNTRY_LOCALES: CountryLocaleMeta[] = [
  { code: 'IN', name: 'India', callingCode: '91', flag: '🇮🇳', timeZone: 'Asia/Kolkata', locale: 'en-IN', nationalDigits: 10 },
  { code: 'US', name: 'United States', callingCode: '1', flag: '🇺🇸', timeZone: 'America/New_York', locale: 'en-US', nationalDigits: 10 },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '971', flag: '🇦🇪', timeZone: 'Asia/Dubai', locale: 'en-AE', nationalDigits: 9 },
  { code: 'GB', name: 'United Kingdom', callingCode: '44', flag: '🇬🇧', timeZone: 'Europe/London', locale: 'en-GB', nationalDigits: 10 },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '966', flag: '🇸🇦', timeZone: 'Asia/Riyadh', locale: 'en-SA', nationalDigits: 9 },
  { code: 'CA', name: 'Canada', callingCode: '1', flag: '🇨🇦', timeZone: 'America/Toronto', locale: 'en-CA', nationalDigits: 10 },
  { code: 'SG', name: 'Singapore', callingCode: '65', flag: '🇸🇬', timeZone: 'Asia/Singapore', locale: 'en-SG', nationalDigits: 8 },
  { code: 'AU', name: 'Australia', callingCode: '61', flag: '🇦🇺', timeZone: 'Australia/Sydney', locale: 'en-AU', nationalDigits: 9 },
  { code: 'DE', name: 'Germany', callingCode: '49', flag: '🇩🇪', timeZone: 'Europe/Berlin', locale: 'en-DE', nationalDigits: 10 },
  { code: 'FR', name: 'France', callingCode: '33', flag: '🇫🇷', timeZone: 'Europe/Paris', locale: 'fr-FR', nationalDigits: 9 },
  { code: 'NP', name: 'Nepal', callingCode: '977', flag: '🇳🇵', timeZone: 'Asia/Kathmandu', locale: 'en-NP', nationalDigits: 10 },
  { code: 'BD', name: 'Bangladesh', callingCode: '880', flag: '🇧🇩', timeZone: 'Asia/Dhaka', locale: 'en-BD', nationalDigits: 10 },
  { code: 'MY', name: 'Malaysia', callingCode: '60', flag: '🇲🇾', timeZone: 'Asia/Kuala_Lumpur', locale: 'en-MY', nationalDigits: 9 },
  { code: 'PH', name: 'Philippines', callingCode: '63', flag: '🇵🇭', timeZone: 'Asia/Manila', locale: 'en-PH', nationalDigits: 10 },
  { code: 'NZ', name: 'New Zealand', callingCode: '64', flag: '🇳🇿', timeZone: 'Pacific/Auckland', locale: 'en-NZ', nationalDigits: 9 },
  { code: 'ZA', name: 'South Africa', callingCode: '27', flag: '🇿🇦', timeZone: 'Africa/Johannesburg', locale: 'en-ZA', nationalDigits: 9 },
];

const BY_CODE = new Map(COUNTRY_LOCALES.map((c) => [c.code.toUpperCase(), c]));

const TIMEZONE_TO_COUNTRY: Array<{ prefix: string; code: string }> = [
  { prefix: 'Asia/Kolkata', code: 'IN' },
  { prefix: 'Asia/Calcutta', code: 'IN' },
  { prefix: 'Asia/Dubai', code: 'AE' },
  { prefix: 'Asia/Riyadh', code: 'SA' },
  { prefix: 'Asia/Singapore', code: 'SG' },
  { prefix: 'Asia/Kathmandu', code: 'NP' },
  { prefix: 'Asia/Dhaka', code: 'BD' },
  { prefix: 'Asia/Kuala_Lumpur', code: 'MY' },
  { prefix: 'Asia/Manila', code: 'PH' },
  { prefix: 'Europe/London', code: 'GB' },
  { prefix: 'Europe/Berlin', code: 'DE' },
  { prefix: 'Europe/Paris', code: 'FR' },
  { prefix: 'Australia/', code: 'AU' },
  { prefix: 'Pacific/Auckland', code: 'NZ' },
  { prefix: 'Africa/Johannesburg', code: 'ZA' },
  { prefix: 'America/Toronto', code: 'CA' },
  { prefix: 'America/Vancouver', code: 'CA' },
  { prefix: 'America/Montreal', code: 'CA' },
  { prefix: 'America/', code: 'US' },
];

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

export function inferCountryFromTimeZone(timeZone: string | null | undefined): CountryLocaleMeta | null {
  if (!timeZone) return null;
  for (const row of TIMEZONE_TO_COUNTRY) {
    if (timeZone.startsWith(row.prefix)) {
      return BY_CODE.get(row.code) || null;
    }
  }
  return null;
}

export function getCountryLocaleMeta(countryCode?: string | null, timeZone?: string | null): CountryLocaleMeta {
  const code = (countryCode || '').trim().toUpperCase();
  if (code && BY_CODE.has(code)) {
    return BY_CODE.get(code)!;
  }
  const byTz = inferCountryFromTimeZone(timeZone);
  if (byTz) return byTz;
  return BY_CODE.get('US')!;
}

export interface ResolvedTenantLocale {
  country: string;
  countryName: string;
  flag: string;
  callingCode: string;
  timeZone: string;
  locale: string;
}

export function resolveTenantLocale(options: {
  tenantCountry?: string | null;
  settingsJson?: string | Record<string, any> | null;
  overrideCountry?: string | null;
  overrideTimeZone?: string | null;
}): ResolvedTenantLocale {
  let settings: Record<string, any> = {};
  if (options.settingsJson) {
    if (typeof options.settingsJson === 'string') {
      try {
        settings = JSON.parse(options.settingsJson);
      } catch {}
    } else if (typeof options.settingsJson === 'object') {
      settings = options.settingsJson;
    }
  }

  const candidateTz = [
    options.overrideTimeZone,
    settings.timezone,
    settings.timeZone,
    settings.businessHours?.timezone,
    settings.autopilot?.timeZone,
  ].find((tz) => isValidTimeZone(tz));

  const explicitCountry =
    (typeof options.overrideCountry === 'string' && options.overrideCountry.trim()) ||
    (typeof settings.country === 'string' && settings.country.trim()) ||
    (typeof options.tenantCountry === 'string' && options.tenantCountry.trim()) ||
    '';

  const meta = getCountryLocaleMeta(explicitCountry, candidateTz || null);
  const timeZone = isValidTimeZone(candidateTz) ? candidateTz : meta.timeZone;

  return {
    country: meta.code,
    countryName: meta.name,
    flag: meta.flag,
    callingCode: meta.callingCode,
    timeZone,
    locale: meta.locale,
  };
}

/**
 * Returns YYYY-MM-DD and HH:MM in the specified IANA timezone for a given UTC Date.
 */
export function getLocalDateParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const safeTz = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((p) => p.type === type)?.value || '0', 10) || 0;

  return {
    year: num('year'),
    month: num('month'),
    day: num('day'),
    hour: num('hour') === 24 ? 0 : num('hour'),
    minute: num('minute'),
  };
}

/**
 * Converts a target calendar day offset (relative to today in `timeZone`) and local
 * wall-clock `hour:minute` into an exact UTC Date, accounting for DST and fractional-hour offsets.
 */
export function computeLocalScheduledDate(options: {
  dayOffset: number;
  hour: number;
  minute?: number;
  timeZone: string;
  now?: Date;
}): Date {
  const now = options.now ? new Date(options.now.getTime()) : new Date();
  const tz = isValidTimeZone(options.timeZone) ? options.timeZone : 'UTC';
  const todayLocal = getLocalDateParts(now, tz);

  const targetCal = new Date(
    Date.UTC(
      todayLocal.year,
      todayLocal.month - 1,
      todayLocal.day + Math.max(0, options.dayOffset),
      options.hour,
      options.minute ?? 0,
      0,
      0,
    ),
  );

  const desiredWallMs = Date.UTC(
    targetCal.getUTCFullYear(),
    targetCal.getUTCMonth(),
    targetCal.getUTCDate(),
    targetCal.getUTCHours(),
    targetCal.getUTCMinutes(),
    0,
    0,
  );

  // Two-pass wall-clock convergence handles DST boundaries & half-hour offsets (+05:30, +05:45)
  let guessMs = desiredWallMs;
  for (let pass = 0; pass < 3; pass++) {
    const actual = getLocalDateParts(new Date(guessMs), tz);
    const actualWallMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0, 0);
    const diffMs = desiredWallMs - actualWallMs;
    if (diffMs === 0) break;
    guessMs += diffMs;
  }

  return new Date(guessMs);
}

/**
 * Parses a "HH:MM" 24h string cleanly, returning { hour, minute } with fallback 10:00.
 */
export function parseHourMinute(raw?: string | null, fallbackHour = 10, fallbackMinute = 0): { hour: number; minute: number } {
  if (!raw || typeof raw !== 'string') return { hour: fallbackHour, minute: fallbackMinute };
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: fallbackHour, minute: fallbackMinute };
  const h = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return { hour: fallbackHour, minute: fallbackMinute };
  return { hour: h, minute: m };
}

/**
 * Normalizes phone numbers to E.164 using the workspace/customer default calling code
 * rather than unconditionally assuming +91.
 */
export function normalizePhoneWithCountry(raw: string, defaultCallingCode = '91'): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  const cleanCode = (defaultCallingCode || '91').replace(/[^\d]/g, '') || '91';
  let digits = trimmed.replace(/[^\d]/g, '');

  // Strip common domestic trunk '0' prefix when dialing without '+'
  if (!hasPlus && digits.startsWith('0') && digits.length >= 9) {
    digits = digits.slice(1);
  }

  if (digits.length < 7 || digits.length > 15) return null;

  if (hasPlus) {
    return digits.length >= 8 ? `+${digits}` : null;
  }

  // If digits already start with the country code and exceed national length, preserve as E.164
  const expectedNational = COUNTRY_LOCALES.find((c) => c.callingCode === cleanCode)?.nationalDigits ?? 10;
  if (digits.length > expectedNational && digits.startsWith(cleanCode)) {
    return `+${digits}`;
  }

  // Local national digits (8-10 depending on country, e.g., SG=8, AE=9, IN/US=10)
  if (digits.length >= 8 && digits.length <= 10) {
    return `+${cleanCode}${digits}`;
  }

  return `+${digits}`;
}
