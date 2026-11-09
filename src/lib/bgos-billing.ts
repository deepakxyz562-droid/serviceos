import type { NextRequest } from 'next/server';
import { BGOS_PLANS, isBgosPlan, type BgosPlan } from '../../shared/bgos-plans';
import { COUNTRY_LOCALES, inferCountryFromTimeZone } from '@/lib/locale-timezone';
import { getCountryCodeFromHeaders, getIpLocation } from '@/lib/ip-geolocation';

export { BGOS_PLANS, isBgosPlan, type BgosPlan };

/** International USD pricing for BGOS plans. */
export const BGOS_USD_PRICES: Record<BgosPlan, number> = {
  free: 0,
  starter: 9,
  growth: 29,
  business: 79,
};

/** Monthly AI image generation quota granted by each BGOS plan. */
export const BGOS_AI_QUOTAS: Record<string, number> = {
  free: 50,
  starter: 200,
  growth: 600,
  business: 2000,
  launch_special: 200,
  enterprise: 10000,
};

/** Normalize prefixed plan codes (`bgos_starter`, `BUSINESS`) -> base lowercase plan (`starter`, `business`). */
export function normalizeBgosPlanCode(rawPlan: string | null | undefined): string {
  const clean = String(rawPlan || '').trim().toLowerCase();
  if (clean.startsWith('bgos_')) {
    const stripped = clean.slice('bgos_'.length);
    if (isBgosPlan(stripped) || stripped in BGOS_AI_QUOTAS) return stripped;
  }
  return clean;
}

/** Return monthly AI quota allowance for a plan code (normalized). */
export function getBgosAiQuotaForPlan(rawPlan?: string | null): number {
  const normalized = normalizeBgosPlanCode(rawPlan);
  return BGOS_AI_QUOTAS[normalized] ?? BGOS_AI_QUOTAS.starter ?? 200;
}

/** Determine default checkout region based on tenant country (`IN` -> `'india'`, else `'international'`). */
export function resolveBgosBillingRegion(country?: string | null): 'india' | 'international' {
  const norm = String(country || '').trim().toLowerCase();
  if (!norm || norm === 'in' || norm === 'india' || norm === 'ind') {
    return 'india';
  }
  return 'international';
}

function normalizeIsoCountry(raw?: string | null): string | null {
  const clean = String(raw || '').trim().toUpperCase();
  if (!clean || clean === 'XX' || clean === 'T1') return null;
  if (clean === 'INDIA' || clean === 'IND') return 'IN';
  if (clean === 'USA' || clean === 'UNITED STATES') return 'US';
  if (/^[A-Z]{2}$/.test(clean)) return clean;
  return null;
}

function inferCountryFromPhone(phone?: string | null): string | null {
  const raw = String(phone || '').trim();
  if (!raw.startsWith('+')) return null;
  const digits = raw.slice(1).replace(/[^\d]/g, '');
  if (!digits) return null;
  // Sort longest calling code first (971, 966, 977, 880, 91, 44, 65, 61, 49, 33, 60, 63, 64, 27, 1)
  const sorted = [...COUNTRY_LOCALES].sort((a, b) => b.callingCode.length - a.callingCode.length);
  for (const item of sorted) {
    if (digits.startsWith(item.callingCode)) {
      return item.code;
    }
  }
  return null;
}

function inferCountryFromAcceptLanguage(header?: string | null): string | null {
  if (!header) return null;
  // e.g. "en-IN,en-US;q=0.9,hi;q=0.8" — take the highest-priority tag that specifies a region
  const parts = header.split(',').map((s) => s.trim().split(';')[0]).filter(Boolean);
  for (const tag of parts) {
    const match = tag.match(/[-_]([A-Z]{2})\b/i);
    if (match) {
      const iso = normalizeIsoCountry(match[1]);
      if (iso) return iso;
    }
  }
  return null;
}

function parseSettings(raw?: string | null): Record<string, any> {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export interface InstallBillingResolution {
  countryCode: string;
  defaultRegion: 'india' | 'international';
  currency: 'INR' | 'USD';
  startingPriceInr: number;
  startingPriceUsd: number;
  startingPriceLabel: string;
  source:
    | 'verified_tenant'
    | 'explicit'
    | 'cdn_geo'
    | 'ip_geo'
    | 'device_tz'
    | 'device_country'
    | 'phone'
    | 'tenant_country'
    | 'accept_language'
    | 'default';
}

/**
 * Resolve billing country & currency strictly from app-installation signals with
 * zero OS location-permission prompts:
 *   1. Explicitly verified workspace preference (`settingsJson.countryVerified === true`)
 *   2. Explicit request input (signup country param / explicit body field)
 *   3. Server Edge/CDN IP Geo headers (`x-vercel-ip-country`, `cf-ipcountry`, etc.)
 *   4. Device installation timezone (`X-Device-Timezone`, e.g. `Asia/Kolkata` -> `IN`)
 *   5. Device installation region header (`X-Device-Country`)
 *   6. Stored `tenant.country` (except legacy unverified `'US'` mobile default when overridden by IP/TZ/phone)
 *   7. Real public client IP geolocation (`ipapi.co` cached 24h, skipped on localhost/unit tests)
 *   8. E.164 phone dial prefix (`+91` -> `IN`)
 *   9. `Accept-Language` regional subtag (`en-IN` -> `IN`)
 *  10. Fallback `'IN'`
 */
export async function resolveInstallCountryAndBilling(params: {
  request?: NextRequest | Request | null;
  tenant?: {
    country?: string | null;
    phone?: string | null;
    settingsJson?: string | null;
  } | null;
  phone?: string | null;
  explicitCountry?: string | null;
  explicitTimeZone?: string | null;
  allowIpLookup?: boolean;
}): Promise<InstallBillingResolution> {
  const settings = parseSettings(params.tenant?.settingsJson);
  const reqHeaders = params.request?.headers ?? null;

  const finalize = (
    countryCode: string,
    source: InstallBillingResolution['source'],
  ): InstallBillingResolution => {
    const defaultRegion = resolveBgosBillingRegion(countryCode);
    const currency: 'INR' | 'USD' = defaultRegion === 'india' ? 'INR' : 'USD';
    return {
      countryCode,
      defaultRegion,
      currency,
      startingPriceInr: BGOS_PLANS.starter.priceInr,
      startingPriceUsd: BGOS_USD_PRICES.starter,
      startingPriceLabel: currency === 'INR' ? `₹${BGOS_PLANS.starter.priceInr}/mo` : `$${BGOS_USD_PRICES.starter}/mo`,
      source,
    };
  };

  // 1. User explicitly confirmed country in Workspace Settings
  const verifiedCountry = normalizeIsoCountry(settings.country);
  if (settings.countryVerified === true && verifiedCountry) {
    return finalize(verifiedCountry, 'verified_tenant');
  }

  // 2. Explicit country/tz passed directly during signup/registration
  const explicitCountry = normalizeIsoCountry(params.explicitCountry);
  if (explicitCountry) {
    return finalize(explicitCountry, 'explicit');
  }
  const explicitTzCountry = params.explicitTimeZone
    ? inferCountryFromTimeZone(params.explicitTimeZone)?.code || null
    : null;

  // 3. Trusted CDN/Edge IP geo country header on the request
  const cdnCountry = normalizeIsoCountry(getCountryCodeFromHeaders(reqHeaders));
  if (cdnCountry) {
    return finalize(cdnCountry, 'cdn_geo');
  }

  // 4. Client device timezone & region headers (zero permissions required)
  const deviceTz = reqHeaders?.get('x-device-timezone')?.trim() || params.explicitTimeZone || null;
  const deviceTzCountry = deviceTz ? inferCountryFromTimeZone(deviceTz)?.code || null : null;
  if (deviceTzCountry) {
    return finalize(deviceTzCountry, 'device_tz');
  }

  const deviceCountry = normalizeIsoCountry(reqHeaders?.get('x-device-country'));
  if (deviceCountry) {
    return finalize(deviceCountry, 'device_country');
  }

  // 5. Explicit tenant.country (unless it is the legacy unverified 'US' default while phone is +91 or public IP is present)
  const phoneCountry = inferCountryFromPhone(params.phone || params.tenant?.phone);
  const tenantCountry = normalizeIsoCountry(params.tenant?.country);
  const isUnverifiedLegacyUs =
    tenantCountry === 'US' &&
    settings.countryVerified !== true &&
    Boolean(phoneCountry && phoneCountry !== 'US');

  const fwd = reqHeaders?.get('x-forwarded-for') || reqHeaders?.get('x-real-ip') || '';
  const firstIp = fwd.split(',')[0]?.trim() || '';
  const isPublicIp =
    Boolean(firstIp) &&
    firstIp !== '127.0.0.1' &&
    firstIp !== '::1' &&
    !firstIp.startsWith('192.168.') &&
    !firstIp.startsWith('10.');

  const shouldDeferUnverifiedUsToIp =
    tenantCountry === 'US' &&
    settings.countryVerified !== true &&
    params.allowIpLookup !== false &&
    Boolean(params.request) &&
    isPublicIp;

  if (tenantCountry && !isUnverifiedLegacyUs && !shouldDeferUnverifiedUsToIp) {
    return finalize(tenantCountry, 'tenant_country');
  }

  if (explicitTzCountry) {
    return finalize(explicitTzCountry, 'device_tz');
  }

  // 6. Optional public IP geolocation for non-local requests missing CDN/device headers
  if (params.allowIpLookup !== false && params.request && isPublicIp) {
    const ipLoc = await getIpLocation(params.request as NextRequest).catch(() => null);
    const ipCountry = normalizeIsoCountry(ipLoc?.countryCode);
    if (ipCountry) {
      return finalize(ipCountry, 'ip_geo');
    }
  }

  // 7. Phone prefix (e.g. +91 -> IN)
  if (phoneCountry) {
    return finalize(phoneCountry, 'phone');
  }

  // Fallback to unverified 'US' if IP/phone signals did not resolve a specific country
  if (tenantCountry && !isUnverifiedLegacyUs) {
    return finalize(tenantCountry, 'tenant_country');
  }

  // 8. Accept-Language regional tag (e.g. en-IN -> IN)
  const langCountry = inferCountryFromAcceptLanguage(reqHeaders?.get('accept-language'));
  if (langCountry) {
    return finalize(langCountry, 'accept_language');
  }

  // 9. Default fallback
  return finalize('IN', 'default');
}
