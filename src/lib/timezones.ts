/**
 * Comprehensive IANA timezone list for campaign scheduling.
 *
 * Organized by region with Europe first (the primary user base is European
 * handyman / service businesses). Each entry is a real IANA tz key so the
 * backend can store it verbatim and Intl APIs can format it correctly.
 */

export interface TimezoneOption {
  value: string // IANA tz key, e.g. "Europe/London"
  label: string // Display label with UTC offset placeholder
  group: string
}

function tz(group: string, value: string, label: string): TimezoneOption {
  return { value, label, group }
}

export const CAMPAIGN_TIMEZONES: TimezoneOption[] = [
  // ── Europe (primary) ──
  tz('Europe', 'Europe/London', 'London (GMT/BST)'),
  tz('Europe', 'Europe/Dublin', 'Dublin (GMT/IST)'),
  tz('Europe', 'Europe/Lisbon', 'Lisbon (WET/WEST)'),
  tz('Europe', 'Europe/Paris', 'Paris (CET/CEST)'),
  tz('Europe', 'Europe/Brussels', 'Brussels (CET/CEST)'),
  tz('Europe', 'Europe/Amsterdam', 'Amsterdam (CET/CEST)'),
  tz('Europe', 'Europe/Berlin', 'Berlin (CET/CEST)'),
  tz('Europe', 'Europe/Zurich', 'Zurich (CET/CEST)'),
  tz('Europe', 'Europe/Vienna', 'Vienna (CET/CEST)'),
  tz('Europe', 'Europe/Madrid', 'Madrid (CET/CEST)'),
  tz('Europe', 'Europe/Rome', 'Rome (CET/CEST)'),
  tz('Europe', 'Europe/Stockholm', 'Stockholm (CET/CEST)'),
  tz('Europe', 'Europe/Oslo', 'Oslo (CET/CEST)'),
  tz('Europe', 'Europe/Copenhagen', 'Copenhagen (CET/CEST)'),
  tz('Europe', 'Europe/Helsinki', 'Helsinki (EET/EEST)'),
  tz('Europe', 'Europe/Athens', 'Athens (EET/EEST)'),
  tz('Europe', 'Europe/Bucharest', 'Bucharest (EET/EEST)'),
  tz('Europe', 'Europe/Sofia', 'Sofia (EET/EEST)'),
  tz('Europe', 'Europe/Warsaw', 'Warsaw (CET/CEST)'),
  tz('Europe', 'Europe/Prague', 'Prague (CET/CEST)'),
  tz('Europe', 'Europe/Budapest', 'Budapest (CET/CEST)'),
  tz('Europe', 'Europe/Kyiv', 'Kyiv (EET/EEST)'),
  tz('Europe', 'Europe/Istanbul', 'Istanbul (TRT)'),
  tz('Europe', 'Europe/Moscow', 'Moscow (MSK)'),

  // ── Asia ──
  tz('Asia', 'Asia/Kolkata', 'India (IST)'),
  tz('Asia', 'Asia/Karachi', 'Karachi (PKT)'),
  tz('Asia', 'Asia/Dhaka', 'Dhaka (BST)'),
  tz('Asia', 'Asia/Bangkok', 'Bangkok (ICT)'),
  tz('Asia', 'Asia/Jakarta', 'Jakarta (WIB)'),
  tz('Asia', 'Asia/Singapore', 'Singapore (SGT)'),
  tz('Asia', 'Asia/Hong_Kong', 'Hong Kong (HKT)'),
  tz('Asia', 'Asia/Shanghai', 'Shanghai (CST)'),
  tz('Asia', 'Asia/Manila', 'Manila (PHT)'),
  tz('Asia', 'Asia/Tokyo', 'Tokyo (JST)'),
  tz('Asia', 'Asia/Seoul', 'Seoul (KST)'),
  tz('Asia', 'Asia/Dubai', 'Dubai (GST)'),
  tz('Asia', 'Asia/Riyadh', 'Riyadh (AST)'),
  tz('Asia', 'Asia/Tehran', 'Tehran (IRST)'),

  // ── Middle East / Caucasus ──
  tz('Middle East', 'Asia/Jerusalem', 'Jerusalem (IST/IDT)'),
  tz('Asia', 'Asia/Yerevan', 'Yerevan (AMT)'),

  // ── Africa ──
  tz('Africa', 'Africa/Cairo', 'Cairo (EET)'),
  tz('Africa', 'Africa/Lagos', 'Lagos (WAT)'),
  tz('Africa', 'Africa/Nairobi', 'Nairobi (EAT)'),
  tz('Africa', 'Africa/Johannesburg', 'Johannesburg (SAST)'),

  // ── North America ──
  tz('North America', 'America/New_York', 'New York (EST/EDT)'),
  tz('North America', 'America/Toronto', 'Toronto (EST/EDT)'),
  tz('North America', 'America/Chicago', 'Chicago (CST/CDT)'),
  tz('North America', 'America/Denver', 'Denver (MST/MDT)'),
  tz('North America', 'America/Phoenix', 'Phoenix (MST)'),
  tz('North America', 'America/Los_Angeles', 'Los Angeles (PST/PDT)'),
  tz('North America', 'America/Vancouver', 'Vancouver (PST/PDT)'),
  tz('North America', 'America/Anchorage', 'Anchorage (AKST/AKDT)'),
  tz('North America', 'America/Mexico_City', 'Mexico City (CST/CDT)'),

  // ── South America ──
  tz('South America', 'America/Bogota', 'Bogota (COT)'),
  tz('South America', 'America/Sao_Paulo', 'São Paulo (BRT)'),
  tz('South America', 'America/Buenos_Aires', 'Buenos Aires (ART)'),
  tz('South America', 'America/Santiago', 'Santiago (CLT/CLST)'),

  // ── Pacific ──
  tz('Pacific', 'Australia/Sydney', 'Sydney (AEST/AEDT)'),
  tz('Pacific', 'Australia/Melbourne', 'Melbourne (AEST/AEDT)'),
  tz('Pacific', 'Australia/Perth', 'Perth (AWST)'),
  tz('Pacific', 'Pacific/Auckland', 'Auckland (NZST/NZDT)'),
  tz('Pacific', 'Pacific/Fiji', 'Fiji (FJT)'),

  // ── UTC ──
  tz('UTC', 'UTC', 'UTC (Coordinated Universal Time)'),
]

/** Detect the browser's local IANA timezone. Returns null if unavailable. */
export function detectBrowserTimezone(): string | null {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz && CAMPAIGN_TIMEZONES.some((t) => t.value === tz)) return tz
      // Even if not in our curated list, return it (it's a valid IANA key).
      if (tz) return tz
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Grouped options for a <Select> with optgroups. */
export const CAMPAIGN_TIMEZONES_GROUPED: { group: string; options: TimezoneOption[] }[] = (() => {
  const map = new Map<string, TimezoneOption[]>()
  for (const t of CAMPAIGN_TIMEZONES) {
    if (!map.has(t.group)) map.set(t.group, [])
    map.get(t.group)!.push(t)
  }
  return Array.from(map.entries()).map(([group, options]) => ({ group, options }))
})()
