/**
 * Supported Country Dial Codes, Timezones & National Number Rules
 */

export interface CountryItem {
  code: string;
  name: string;
  callingCode: string;
  flag: string;
  digits: number; // Exact required national number digits
  format: string; // Formatting hint
  placeholder: string;
  timeZone: string;
  locale: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: 'IN', name: 'India', callingCode: '91', flag: '🇮🇳', digits: 10, format: 'XXXXX XXXXX', placeholder: '98765 43210', timeZone: 'Asia/Kolkata', locale: 'en-IN' },
  { code: 'US', name: 'United States', callingCode: '1', flag: '🇺🇸', digits: 10, format: 'XXX XXX XXXX', placeholder: '555 123 4567', timeZone: 'America/New_York', locale: 'en-US' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '971', flag: '🇦🇪', digits: 9, format: 'XX XXX XXXX', placeholder: '50 123 4567', timeZone: 'Asia/Dubai', locale: 'en-AE' },
  { code: 'GB', name: 'United Kingdom', callingCode: '44', flag: '🇬🇧', digits: 10, format: 'XXXX XXXXXX', placeholder: '7911 123456', timeZone: 'Europe/London', locale: 'en-GB' },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '966', flag: '🇸🇦', digits: 9, format: 'XX XXX XXXX', placeholder: '50 123 4567', timeZone: 'Asia/Riyadh', locale: 'en-SA' },
  { code: 'CA', name: 'Canada', callingCode: '1', flag: '🇨🇦', digits: 10, format: 'XXX XXX XXXX', placeholder: '555 123 4567', timeZone: 'America/Toronto', locale: 'en-CA' },
  { code: 'SG', name: 'Singapore', callingCode: '65', flag: '🇸🇬', digits: 8, format: 'XXXX XXXX', placeholder: '8123 4567', timeZone: 'Asia/Singapore', locale: 'en-SG' },
  { code: 'AU', name: 'Australia', callingCode: '61', flag: '🇦🇺', digits: 9, format: 'XXX XXX XXX', placeholder: '412 345 678', timeZone: 'Australia/Sydney', locale: 'en-AU' },
  { code: 'DE', name: 'Germany', callingCode: '49', flag: '🇩🇪', digits: 10, format: 'XXXX XXXXXX', placeholder: '151 1234567', timeZone: 'Europe/Berlin', locale: 'de-DE' },
  { code: 'FR', name: 'France', callingCode: '33', flag: '🇫🇷', digits: 9, format: 'X XX XX XX XX', placeholder: '6 12 34 56 78', timeZone: 'Europe/Paris', locale: 'fr-FR' },
  { code: 'NP', name: 'Nepal', callingCode: '977', flag: '🇳🇵', digits: 10, format: 'XXXXX XXXXX', placeholder: '98412 34567', timeZone: 'Asia/Kathmandu', locale: 'en-NP' },
  { code: 'BD', name: 'Bangladesh', callingCode: '880', flag: '🇧🇩', digits: 10, format: 'XXXX XXXXXX', placeholder: '1712 345678', timeZone: 'Asia/Dhaka', locale: 'en-BD' },
  { code: 'MY', name: 'Malaysia', callingCode: '60', flag: '🇲🇾', digits: 9, format: 'XX-XXX XXXX', placeholder: '12 345 6789', timeZone: 'Asia/Kuala_Lumpur', locale: 'en-MY' },
  { code: 'PH', name: 'Philippines', callingCode: '63', flag: '🇵🇭', digits: 10, format: 'XXX XXX XXXX', placeholder: '917 123 4567', timeZone: 'Asia/Manila', locale: 'en-PH' },
  { code: 'NZ', name: 'New Zealand', callingCode: '64', flag: '🇳🇿', digits: 9, format: 'XX XXX XXXX', placeholder: '21 123 4567', timeZone: 'Pacific/Auckland', locale: 'en-NZ' },
  { code: 'ZA', name: 'South Africa', callingCode: '27', flag: '🇿🇦', digits: 9, format: 'XX XXX XXXX', placeholder: '82 123 4567', timeZone: 'Africa/Johannesburg', locale: 'en-ZA' },
];

export const DEFAULT_COUNTRY: CountryItem = COUNTRIES[0]; // India (+91)

const TZ_PREFIX_TO_COUNTRY: Array<{ prefix: string; code: string }> = [
  { prefix: 'Asia/Kolkata', code: 'IN' },
  { prefix: 'Asia/Calcutta', code: 'IN' },
  { prefix: 'Asia/Dubai', code: 'AE' },
  { prefix: 'Asia/Riyadh', code: 'SA' },
  { prefix: 'Europe/London', code: 'GB' },
  { prefix: 'America/Toronto', code: 'CA' },
  { prefix: 'America/Vancouver', code: 'CA' },
  { prefix: 'America/Edmonton', code: 'CA' },
  { prefix: 'America/Winnipeg', code: 'CA' },
  { prefix: 'America/Halifax', code: 'CA' },
  { prefix: 'America/', code: 'US' },
  { prefix: 'Asia/Singapore', code: 'SG' },
  { prefix: 'Australia/', code: 'AU' },
  { prefix: 'Europe/Berlin', code: 'DE' },
  { prefix: 'Europe/Paris', code: 'FR' },
  { prefix: 'Asia/Kathmandu', code: 'NP' },
  { prefix: 'Asia/Katmandu', code: 'NP' },
  { prefix: 'Asia/Dhaka', code: 'BD' },
  { prefix: 'Asia/Kuala_Lumpur', code: 'MY' },
  { prefix: 'Asia/Manila', code: 'PH' },
  { prefix: 'Pacific/Auckland', code: 'NZ' },
  { prefix: 'Africa/Johannesburg', code: 'ZA' },
];

export function getCountryByCode(code?: string | null): CountryItem {
  const upper = String(code || '').trim().toUpperCase();
  return COUNTRIES.find((c) => c.code === upper) || DEFAULT_COUNTRY;
}

export function normalizeTimeZone(tz?: string | null): string {
  const clean = String(tz || '').trim();
  if (!clean) return DEFAULT_COUNTRY.timeZone;
  if (clean === 'Asia/Calcutta') return 'Asia/Kolkata';
  if (clean === 'Asia/Katmandu') return 'Asia/Kathmandu';
  return clean;
}

export function detectDeviceCountryAndTimezone(): { country: CountryItem; timeZone: string } {
  let tz = '';
  let localeStr = '';
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    tz = normalizeTimeZone(resolved.timeZone || '');
    localeStr = resolved.locale || '';
  } catch {
    tz = DEFAULT_COUNTRY.timeZone;
  }

  for (const rule of TZ_PREFIX_TO_COUNTRY) {
    if (tz.startsWith(rule.prefix)) {
      return { country: getCountryByCode(rule.code), timeZone: tz || getCountryByCode(rule.code).timeZone };
    }
  }

  // Fallback to locale region tag e.g. en-GB -> GB
  const regionMatch = localeStr.match(/[-_]([A-Z]{2})\b/i);
  if (regionMatch) {
    const found = COUNTRIES.find((c) => c.code === regionMatch[1].toUpperCase());
    if (found) {
      return { country: found, timeZone: tz || found.timeZone };
    }
  }

  return { country: DEFAULT_COUNTRY, timeZone: tz || DEFAULT_COUNTRY.timeZone };
}

export function getTimeZoneShortLabel(timeZone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value || timeZone;
  } catch {
    return timeZone;
  }
}

export function formatLocalDateTime(
  isoInput?: string | Date | null,
  options?: { timeZone?: string; locale?: string; includeTime?: boolean },
): string {
  if (!isoInput) return '';
  const date = typeof isoInput === 'string' ? new Date(isoInput) : isoInput;
  if (Number.isNaN(date.getTime())) return '';
  const tz = normalizeTimeZone(options?.timeZone || detectDeviceCountryAndTimezone().timeZone);
  const loc = options?.locale || 'en';
  try {
    return date.toLocaleString(loc, {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      ...(options?.includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
  } catch {
    return date.toDateString();
  }
}

export function getGreetingForLocalTime(timeZone?: string): string {
  const tz = normalizeTimeZone(timeZone || detectDeviceCountryAndTimezone().timeZone);
  try {
    const hourStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
    const hour = Number.parseInt(hourStr, 10);
    if (!Number.isNaN(hour)) {
      if (hour < 12) return 'Good morning';
      if (hour < 17) return 'Good afternoon';
      return 'Good evening';
    }
  } catch {
    // fallback
  }
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatNationalDisplay(digits: string, country: CountryItem): string {
  const clean = digits.replace(/\D/g, '').slice(0, country.digits);
  if (!clean) return '';

  if (country.code === 'IN' || country.code === 'NP') {
    if (clean.length > 5) {
      return `${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return clean;
  }

  if (country.code === 'US' || country.code === 'CA' || country.code === 'PH') {
    if (clean.length > 6) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
    if (clean.length > 3) {
      return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    }
    return clean;
  }

  if (country.code === 'AE' || country.code === 'SA' || country.code === 'MY' || country.code === 'NZ' || country.code === 'ZA') {
    if (clean.length > 5) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
    }
    if (clean.length > 2) {
      return `${clean.slice(0, 2)} ${clean.slice(2)}`;
    }
    return clean;
  }

  if (country.code === 'SG') {
    if (clean.length > 4) {
      return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    }
    return clean;
  }

  return clean;
}

export function buildE164(digits: string, country: CountryItem): string {
  const clean = digits.replace(/\D/g, '').slice(0, country.digits);
  return `+${country.callingCode}${clean}`;
}
