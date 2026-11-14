import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';
import { slugifyCity } from '@/lib/seo/schemas';

export type BusinessPresenceMode = 'no_website' | 'bgos_hosted' | 'custom_domain';

export interface PresenceTenantInput {
  id: string;
  name: string;
  slug?: string | null;
  publicSlug?: string | null;
  industry?: string | null;
  city?: string | null;
  website?: string | null;
  publicProfileEnabled?: boolean | null;
  marketplaceOptIn?: boolean | null;
  claimed?: boolean | null;
  settingsJson?: string | null;
  brandProfile?: {
    industry?: string | null;
    location?: string | null;
  } | null;
}

export interface PresenceResolution {
  mode: BusinessPresenceMode;
  slug: string;
  websiteUrl: string | null;
  canonicalUrl: string | null;
  shortHostedUrl: string;
  hostedCanonicalUrl: string;
  domain: string | null;
  publicProfileEnabled: boolean;
  claimed: boolean;
  needsActivation: boolean;
  isDirectoryOrSocialUrl: boolean;
  customDomainRecord?: {
    domain: string;
    status: string;
  } | null;
}

const HOSTED_HOSTS = new Set([
  'fieseros.com',
  'www.fieseros.com',
  'bgos.fieseros.com',
  'bgos.site',
  'www.bgos.site',
  'app.fieseros.com',
  'marketplace.fieseros.com',
]);

const SOCIAL_OR_DIRECTORY_HOSTS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'wa.me',
  'whatsapp.com',
  'youtube.com',
  'youtu.be',
  'justdial.com',
  'indiamart.com',
  'sulekha.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
];

export function normalizeSlugValue(nameOrSlug: string | null | undefined, fallbackId?: string): string {
  const base = String(nameOrSlug || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base) return base;
  return fallbackId ? `business-${fallbackId.slice(-6).toLowerCase()}` : 'business';
}

export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

export function extractHostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isFieserosHostedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return HOSTED_HOSTS.has(host) || host.endsWith('.fieseros.com');
  } catch {
    return false;
  }
}

export function isSocialOrDirectoryHost(host: string | null): boolean {
  if (!host) return false;
  return SOCIAL_OR_DIRECTORY_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

export function buildHostedCanonicalUrl(params: {
  slug: string;
  industry?: string | null;
  city?: string | null;
}): string {
  const industrySlug = mapIndustryToPluralSlug(params.industry);
  const citySlug = slugifyCity(params.city);
  return `https://fieseros.com/${industrySlug}/${citySlug}/${params.slug}`;
}

export function resolveBusinessPresenceMode(params: {
  tenant: PresenceTenantInput;
  gbpWebsite?: string | null;
  customDomain?: { domain: string; status: string } | null;
}): PresenceResolution {
  const { tenant, gbpWebsite, customDomain } = params;
  const slug = normalizeSlugValue(tenant.publicSlug || tenant.slug || tenant.name, tenant.id);
  const industry = tenant.industry || tenant.brandProfile?.industry || null;
  const city = tenant.city || tenant.brandProfile?.location || null;

  const shortHostedUrl = `https://${slug}.bgos.site`;
  const hostedCanonicalUrl = buildHostedCanonicalUrl({ slug, industry, city });
  const publicProfileEnabled = Boolean(tenant.publicProfileEnabled);
  const claimed = Boolean(tenant.claimed);

  let settingsWebsite: string | null = null;
  if (tenant.settingsJson) {
    try {
      const parsed = JSON.parse(tenant.settingsJson);
      if (typeof parsed?.bookingPageConfig?.website === 'string') {
        settingsWebsite = parsed.bookingPageConfig.website;
      }
    } catch {}
  }

  // Verified CustomDomain record takes highest precedence if it's not a fieseros subdomain
  if (customDomain?.domain && !customDomain.domain.endsWith('.fieseros.com')) {
    const url = normalizeExternalUrl(customDomain.domain);
    const domain = extractHostname(url);
    return {
      mode: 'custom_domain',
      slug,
      websiteUrl: url,
      canonicalUrl: url,
      shortHostedUrl,
      hostedCanonicalUrl,
      domain,
      publicProfileEnabled,
      claimed,
      needsActivation: false,
      isDirectoryOrSocialUrl: isSocialOrDirectoryHost(domain),
      customDomainRecord: customDomain,
    };
  }

  // Check GBP website -> Tenant.website -> bookingPageConfig.website
  const candidates = [
    normalizeExternalUrl(gbpWebsite),
    normalizeExternalUrl(tenant.website),
    normalizeExternalUrl(settingsWebsite),
  ].filter((u): u is string => Boolean(u));

  const externalUrl = candidates.find((u) => !isFieserosHostedUrl(u));
  if (externalUrl) {
    const domain = extractHostname(externalUrl);
    return {
      mode: 'custom_domain',
      slug,
      websiteUrl: externalUrl,
      canonicalUrl: externalUrl,
      shortHostedUrl,
      hostedCanonicalUrl,
      domain,
      publicProfileEnabled,
      claimed,
      needsActivation: false,
      isDirectoryOrSocialUrl: isSocialOrDirectoryHost(domain),
      customDomainRecord: null,
    };
  }

  const hostedUrl = candidates.find((u) => isFieserosHostedUrl(u));
  if (publicProfileEnabled || hostedUrl) {
    const useBgosCardCanonical =
      tenant.marketplaceOptIn === false ||
      tenant.marketplaceOptIn === null ||
      Boolean(hostedUrl && /bgos\./i.test(hostedUrl));
    const effectiveCanonical = useBgosCardCanonical ? shortHostedUrl : hostedCanonicalUrl;
    const effectiveDomain = useBgosCardCanonical ? 'bgos.site' : 'fieseros.com';
    return {
      mode: 'bgos_hosted',
      slug,
      websiteUrl: hostedUrl || effectiveCanonical,
      canonicalUrl: effectiveCanonical,
      shortHostedUrl,
      hostedCanonicalUrl,
      domain: effectiveDomain,
      publicProfileEnabled,
      claimed,
      needsActivation: !publicProfileEnabled,
      isDirectoryOrSocialUrl: false,
      customDomainRecord: null,
    };
  }

  return {
    mode: 'no_website',
    slug,
    websiteUrl: null,
    canonicalUrl: null,
    shortHostedUrl,
    hostedCanonicalUrl,
    domain: null,
    publicProfileEnabled: false,
    claimed,
    needsActivation: true,
    isDirectoryOrSocialUrl: false,
    customDomainRecord: null,
  };
}
