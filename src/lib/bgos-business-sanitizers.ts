import { getCountryLocaleMeta } from '@/lib/locale-timezone';
import { productForHostname } from '../../shared/product-context';

export interface HostRoutingInput {
  host?: string | null;
  marketplaceOptIn?: boolean | null;
  forceView?: string | null;
}

export type BgosCardRouteDecision =
  | { action: 'render_bgos' }
  | { action: 'redirect_marketplace' }
  | { action: 'redirect_bgos_host' };

/**
 * Decide whether `/b/[slug]` should render the standalone BGOS Business Page directly,
 * redirect to Fieseros Marketplace (`/{industry}/{city}/{slug}`), or move a visitor
 * from `fieseros.com` over to `bgos.fieseros.com/b/[slug]`.
 */
export function shouldRenderBgosCardHost(input: HostRoutingInput): BgosCardRouteDecision {
  const host = (input.host || '').toLowerCase().split(':')[0].trim();
  const force = (input.forceView || '').toLowerCase().trim();
  const isBgosHost =
    productForHostname(host) === 'bgos' ||
    host.startsWith('bgos.') ||
    host.includes('.bgos.');
  const isLocalOrPreview =
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.sslip.io');

  if (isBgosHost) {
    return { action: 'render_bgos' };
  }

  if (force === 'marketplace' && input.marketplaceOptIn) {
    return { action: 'redirect_marketplace' };
  }

  if (force === 'card') {
    return { action: 'render_bgos' };
  }

  if (isLocalOrPreview) {
    // Allow local dev & preview testing of the standalone business page directly,
    // unless the tenant explicitly opted into marketplace discovery on a non-card visit.
    return input.marketplaceOptIn ? { action: 'redirect_marketplace' } : { action: 'render_bgos' };
  }

  // Consumer marketplace hosts (fieseros.com, www.fieseros.com)
  if (input.marketplaceOptIn) {
    return { action: 'redirect_marketplace' };
  }

  return { action: 'redirect_bgos_host' };
}

const US_ONLY_DEFAULT_STATES = new Set(['TX', 'TEXAS']);
const INDIAN_HINT_RE =
  /(india|bihar|patna|delhi|mumbai|bengaluru|bangalore|hyderabad|chennai|kolkata|pune|jaipur|lucknow|ahmedabad|surat|noida|gurgaon|gurugram|faridabad|ghaziabad|haryana|uttar pradesh|maharashtra|karnataka|tamil nadu|telangana|west bengal|gujarat|rajasthan|\b\d{6}\b)/i;

/**
 * Strip corrupted US default state (`TX`) when the business is not actually in the US
 * (for example Indian addresses seeded with `state: 'TX'` -> `"Patna, TX, India"`).
 */
export function normalizeRegionState(input: {
  state?: string | null;
  country?: string | null;
  address?: string | null;
  city?: string | null;
}): string | null {
  const rawState = (input.state || '').trim();
  if (!rawState) return null;

  const upperState = rawState.toUpperCase();
  const upperCountry = (input.country || '').trim().toUpperCase();
  const combinedLocation = `${input.address || ''} ${input.city || ''}`.trim();

  if (US_ONLY_DEFAULT_STATES.has(upperState)) {
    if (upperCountry && upperCountry !== 'US' && upperCountry !== 'USA') {
      return null;
    }
    if (INDIAN_HINT_RE.test(combinedLocation)) {
      return null;
    }
  }

  return rawState;
}

const DUMMY_TEXT_MARKERS = [
  'trusted local service provider',
  'licensed & insured • fast response',
  'your trusted partner for expert home services',
  'family-owned and operated service business serving the local community since 2009',
  'proudly serves Dallas and surrounding areas',
  'what areas do you serve in texas?',
  '24/7 emergency response for urgent issues',
  'every job is backed by our 100% satisfaction guarantee',
];

/**
 * Detect untouched boilerplate copy from the legacy marketplace seeder so a
 * BGOS business owner never sees "home services across Dallas, TX" on their page.
 */
export function isSeededDummyText(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return DUMMY_TEXT_MARKERS.some((marker) => lower.includes(marker));
}

const DUMMY_SERVICES_BY_SLUG: Record<string, string> = {
  'emergency-service': '24/7 emergency response for urgent issues.',
  'inspection-maintenance': 'professional inspection and routine maintenance to prevent issues.',
  installation: 'professional installation of new equipment and systems.',
  'repair-replacement': 'expert repair and replacement services for all major components.',
  'emergency-plumbing': '24/7 emergency plumbing service for burst pipes, severe leaks, and sewer backups.',
  'drain-cleaning': 'professional drain cleaning for slow drains, clogs, and backups.',
  'water-heater-installation': 'tank and tankless water heater installation, repair, and replacement.',
  'bathroom-kitchen-plumbing': 'fixture installation, pipe repair, and remodel rough-ins for bathrooms and kitchens.',
  'ac-repair-installation': 'air conditioning repair, installation, and maintenance for all brands.',
  'heating-service': 'furnace repair, installation, and heat pump service.',
  'duct-cleaning': 'professional air duct cleaning to improve indoor air quality.',
  'maintenance-plans': 'annual maintenance plans to keep your hvac system running efficiently.',
  'electrical-repair': 'licensed electrical repair for homes and businesses.',
  'panel-upgrade': 'electrical panel upgrades and service upgrades.',
  'lighting-installation': 'indoor and outdoor lighting installation, including led upgrades.',
  'ev-charger-installation': 'electric vehicle charger installation for homes and businesses.',
};

/**
 * Exclude untouched auto-seeded placeholder services (`Emergency Service 150`, etc.)
 * while keeping any genuinely customized services created by the owner.
 */
export function isSeededDummyService(input: {
  slug?: string | null;
  name?: string | null;
  description?: string | null;
}): boolean {
  const slug = (input.slug || '').trim().toLowerCase();
  const desc = (input.description || '').trim().toLowerCase();
  if (!slug || !(slug in DUMMY_SERVICES_BY_SLUG)) return false;
  return !desc || desc === DUMMY_SERVICES_BY_SLUG[slug];
}

const DUMMY_AREA_SET = new Set([
  'downtown',
  'north side',
  'south side',
  'east side',
  'west side',
  'suburbs',
]);

export function filterSeededServiceAreas(areas: unknown[]): string[] {
  const cleaned = areas
    .map((item) => (typeof item === 'string' ? item.trim() : typeof (item as any)?.name === 'string' ? String((item as any).name).trim() : ''))
    .filter(Boolean);
  if (cleaned.length === 0) return [];
  const allDummy = cleaned.every((a) => DUMMY_AREA_SET.has(a.toLowerCase()));
  return allDummy ? [] : Array.from(new Set(cleaned));
}

const DUMMY_FAQ_QUESTIONS = new Set([
  'do you offer 24/7 emergency service?',
  'are you licensed and insured?',
  'do you offer free estimates?',
  'what areas do you serve?',
  'do you offer a warranty?',
  'how can i get a quote?',
]);

export function filterSeededFaqs(
  faqs: Array<{ question?: string | null; answer?: string | null }>,
): Array<{ question: string; answer: string }> {
  const normalized = faqs
    .map((f) => ({
      question: (f.question || '').trim(),
      answer: (f.answer || '').trim(),
    }))
    .filter((f) => f.question && f.answer);

  return normalized.filter((faq) => {
    const qLower = faq.question.toLowerCase();
    const aLower = faq.answer.toLowerCase();
    if (aLower.includes('dispatch a technician') || aLower.includes('$2m general liability insurance')) {
      return false;
    }
    if (
      DUMMY_FAQ_QUESTIONS.has(qLower) &&
      (aLower.includes('available 24 hours a day, 7 days a week for emergencies') ||
        aLower.includes('serve the local metro area and surrounding suburbs') ||
        aLower.includes('backed by a 1-year parts and labor warranty') ||
        aLower.includes('free over-the-phone estimates for most jobs'))
    ) {
      return false;
    }
    return true;
  });
}

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  UK: 'GBP',
  AU: 'AUD',
  CA: 'CAD',
  AE: 'AED',
  SA: 'SAR',
  SG: 'SGD',
  MY: 'MYR',
  ZA: 'ZAR',
  JP: 'JPY',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BR: 'BRL',
  TH: 'THB',
  NG: 'NGN',
};

export function resolveCountryCode(input: {
  country?: string | null;
  address?: string | null;
  phone?: string | null;
}): string {
  const rawCountry = (input.country || '').trim().toUpperCase();
  const address = input.address || '';
  const phone = (input.phone || '').trim();

  if (INDIAN_HINT_RE.test(address) || phone.startsWith('+91') || /^91\d{10}$/.test(phone)) {
    return 'IN';
  }
  if (phone.startsWith('+44')) return 'GB';
  if (phone.startsWith('+971')) return 'AE';
  if (phone.startsWith('+61')) return 'AU';
  if (phone.startsWith('+65')) return 'SG';
  if (rawCountry && COUNTRY_CURRENCY_MAP[rawCountry]) return rawCountry;
  if (phone.startsWith('+1')) return 'US';
  return rawCountry || 'US';
}

export function resolveBusinessCurrency(input: {
  currency?: string | null;
  country?: string | null;
  address?: string | null;
  phone?: string | null;
}): string {
  const effectiveCountry = resolveCountryCode(input);
  const mappedCountryCurrency = COUNTRY_CURRENCY_MAP[effectiveCountry];
  const explicitCurrency = (input.currency || '').trim().toUpperCase();

  // If DB has default 'USD' while address/phone/country clearly identify India (e.g. +91/IN),
  // prefer the country's real currency (`INR`).
  if (effectiveCountry !== 'US' && (!explicitCurrency || explicitCurrency === 'USD') && mappedCountryCurrency) {
    return mappedCountryCurrency;
  }
  if (explicitCurrency) return explicitCurrency;
  return mappedCountryCurrency || 'USD';
}

export function normalizeWhatsAppDigits(phone?: string | null, countryCode?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return null;
  if (trimmed.startsWith('+')) return digits;
  const meta = getCountryLocaleMeta(countryCode || 'US');
  if (digits.length === meta.nationalDigits && !digits.startsWith(meta.callingCode)) {
    return `${meta.callingCode}${digits}`;
  }
  return digits;
}

export interface BgosBusinessHoursRow {
  day: string;
  shortDay: string;
  open: boolean;
  openTime: string;
  closeTime: string;
}

const ORDERED_DAYS: Array<{ key: string; short: string; aliases: string[] }> = [
  { key: 'Monday', short: 'Mon', aliases: ['mon', 'monday'] },
  { key: 'Tuesday', short: 'Tue', aliases: ['tue', 'tuesday'] },
  { key: 'Wednesday', short: 'Wed', aliases: ['wed', 'wednesday'] },
  { key: 'Thursday', short: 'Thu', aliases: ['thu', 'thursday'] },
  { key: 'Friday', short: 'Fri', aliases: ['fri', 'friday'] },
  { key: 'Saturday', short: 'Sat', aliases: ['sat', 'saturday'] },
  { key: 'Sunday', short: 'Sun', aliases: ['sun', 'sunday'] },
];

export function normalizeHoursSchedule(
  tenantHoursRaw?: string | Record<string, any> | null,
  placeHours?: Record<string, { open?: boolean; openTime?: string; closeTime?: string }> | null,
): BgosBusinessHoursRow[] {
  let sourceObj: Record<string, any> | null = placeHours && Object.keys(placeHours).length > 0 ? placeHours : null;

  if (!sourceObj && tenantHoursRaw) {
    if (typeof tenantHoursRaw === 'string') {
      try {
        const parsed = JSON.parse(tenantHoursRaw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          sourceObj = parsed;
        }
      } catch {
        sourceObj = null;
      }
    } else if (typeof tenantHoursRaw === 'object' && Object.keys(tenantHoursRaw).length > 0) {
      sourceObj = tenantHoursRaw;
    }
  }

  if (!sourceObj) return [];

  const lowerMap = new Map<string, any>();
  for (const [k, v] of Object.entries(sourceObj)) {
    lowerMap.set(k.trim().toLowerCase(), v);
  }

  const rows: BgosBusinessHoursRow[] = [];
  for (const d of ORDERED_DAYS) {
    const val = d.aliases.map((alias) => lowerMap.get(alias)).find((v) => v !== undefined);
    if (!val || typeof val !== 'object') continue;
    const isClosed = val.closed === true || val.open === false;
    rows.push({
      day: d.key,
      shortDay: d.short,
      open: !isClosed,
      openTime: String(val.openTime || val.open || '09:00'),
      closeTime: String(val.closeTime || val.close || '18:00'),
    });
  }

  return rows;
}

export function computeOpenNowStatus(
  hours: BgosBusinessHoursRow[],
  timeZone: string,
): boolean | null {
  if (!hours.length) return null;
  try {
    const now = new Date();
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(now);
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(now);
    const today = hours.find((h) => h.day.toLowerCase() === dayName.toLowerCase());
    if (!today) return null;
    if (!today.open) return false;
    return timeStr >= today.openTime && timeStr <= today.closeTime;
  } catch {
    return null;
  }
}
