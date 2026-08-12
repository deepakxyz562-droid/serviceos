/**
 * Public Business Hub — server-side data access layer.
 *
 * This module centralizes all reads of tenant data for the public-facing
 * business hub at /{industry}/{city}/{slug}. It enforces:
 *   - Public-safety: never leaks `email`, `whatsappConfigJson`, `plan`,
 *     `settingsJson`, `whiteLabelJson`, or any other sensitive field.
 *   - Auto-index criteria: a business is only "indexable" when its profile
 *     is rich enough (description ≥100 chars, ≥3 active public services,
 *     ≥1 image, publicProfileEnabled=true).
 *   - URL canonicalization: builds the canonical /{industry}/{city}/{slug}
 *     URL and 301-redirects when the URL segments don't match the DB.
 */

import { unstable_cache, revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas'
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs'
import { getIndustryKit, durationToMinutes } from '@/lib/industry-kits'
import { computeProfileTier, isIndexableByTier, type ProfileTier } from '@/lib/marketplace/profile-tier'
import { isTemplatedDescription } from '@/lib/marketplace/industry-content'

/**
 * Explicit column selection for the public-business tenant lookup.
 *
 * We project ONLY the columns needed by the public detail page — excluding
 * heavy JSON blobs (whatsappConfigJson, settingsJson, whiteLabelJson,
 * featureFlags, etc.) and internal columns (createdAt, updatedAt,
 * suspendedAt, etc.). Cuts the wire payload from ~50KB to ~5KB per lookup.
 *
 * Reused as the type source for `buildPublicBusinessData`'s `tenant` param
 * so the SELECT shape and the consumer stay in sync.
 */
const PUBLIC_TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  industry: true,
  city: true,
  state: true,
  phone: true,
  whatsappPhone: true,
  email: true,
  website: true,
  address: true,
  country: true,
  currency: true,
  logo: true,
  coverImage: true,
  tagline: true,
  description: true,
  rating: true,
  reviewCount: true,
  businessHoursJson: true,
  galleryJson: true,
  serviceAreasJson: true,
  socialLinksJson: true,
  faqsJson: true,
  seoTitle: true,
  seoDescription: true,
  publicProfileEnabled: true,
  marketplaceOptIn: true,
  claimed: true,
  plan: true,
  planStatus: true,
  trialEndsAt: true,
  identityVerified: true,
  businessVerified: true,
  insuranceVerified: true,
  licenceNumber: true,
  insuranceProvider: true,
  emergencyServiceAvailable: true,
  googlePlaceId: true,
  website: true,
} satisfies Prisma.TenantSelect

/**
 * The tenant shape returned by `db.tenant.findFirst({ select: PUBLIC_TENANT_SELECT })`.
 * Used to type `buildPublicBusinessData`'s `tenant` parameter without
 * requiring the full (30+ column) tenant row.
 */
type PublicTenantRow = Prisma.TenantGetPayload<{ select: typeof PUBLIC_TENANT_SELECT }>

export interface PublicBusinessData {
  id: string
  name: string
  slug: string
  industry: string | null
  industryUrlSlug: string
  cityUrlSlug: string
  city: string | null
  state: string | null
  phone: string | null
  whatsappPhone: string | null
  email: string | null
  website: string | null
  address: string | null
  country: string
  currency: string
  logo: string | null
  coverImage: string | null
  tagline: string | null
  description: string | null
  rating: number
  reviewCount: number
  businessHoursJson: string
  galleryJson: string
  serviceAreasJson: string
  socialLinksJson: string
  faqsJson: string
  seoTitle: string | null
  seoDescription: string | null
  publicProfileEnabled: boolean
  /**
   * Whether this tenant has opted into the marketplace (paid + verified +
   * Stripe connected). When true, the public hub page renders the
   * marketplace booking panel (Instant Booking + Quote Request dialogs)
   * and the trust-badges / certifications sections — merging the old
   * /marketplace/[slug] storefront into the canonical public hub URL.
   */
  marketplaceOptIn: boolean
  /**
   * Whether this tenant has been claimed by a real registered business
   * owner (vs. OSM/demo seed data which has claimed=false). Used by the
   * detail page to decide between the full MarketplaceBookingPanel
   * (Book Now + Request Quote) and a minimal "Call Now" CTA.
   */
  claimed: boolean
  /** Subscription plan tier — 'starter' | 'growth' | 'business' | 'enterprise'. */
  plan: string | null
  /** Subscription status — 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended'. */
  planStatus: string | null
  /**
   * When the current trial expires. ISO string (Supabase REST adapter
   * returns strings; direct Prisma returns Date — normalized to ISO
   * string here so it serializes cleanly across the server/client
   * boundary).
   */
  trialEndsAt: string | null
  // ── Verification flags (public-safe — already exposed via marketplace) ──
  identityVerified: boolean
  businessVerified: boolean
  insuranceVerified: boolean
  licenceNumber: string | null
  insuranceProvider: string | null
  emergencyServiceAvailable: boolean
  isIndexable: boolean  // computed: rich-enough check passed
  /**
   * 3-tier profile quality score (A=rich / B=medium / C=thin). Drives
   * indexation (Tier C → noindex,follow) and sitemap priority
   * (A=0.8, B=0.5). Computed at read time from fields already on the
   * Tenant model — no DB column required. See profile-tier.ts.
   */
  profileTier: ProfileTier
  canonicalUrl: string
  googlePlaceId: string | null
  website: string | null
}

/**
 * Public-facing certification row (mirrors ProviderCertification, minus
 * the tenantId / documentUrl which are provider-internal).
 */
export interface PublicCertificationData {
  id: string
  name: string
  issuer: string | null
  issueDate: string | null
  expiryDate: string | null
  isVerified: boolean
  certificateNumber: string | null
}

export interface PublicServiceData {
  id: string
  name: string
  description: string | null
  longDescription: string | null
  slug: string | null
  image: string | null
  category: string
  basePrice: number
  duration: number
  icon: string | null
}

export interface PublicReviewData {
  id: string
  rating: number
  comment: string | null
  authorName: string | null
  source: string
  createdAt: Date
  responseJson: string
}

const SITE_URL = 'https://fieseros.com'

/**
 * Resolve a tenant by the three URL segments (industry, city, slug).
 * Returns null when no tenant matches the slug.
 *
 * Also enforces URL canonicalization: if the tenant exists but the
 * industry/city segments don't match the DB values, the caller should
 * 301-redirect to the canonical URL.
 *
 * Wrapped in `unstable_cache` (120s TTL, tagged 'public-business') so:
 *   - The generateMetadata() call and the page body call — which both run
 *     during a single request for /{industry}/{city}/{slug} — share one DB
 *     round-trip (replaces the old React.cache request-scope dedup).
 *   - Cross-request: subsequent visits by ANY user get the cached row
 *     directly, eliminating 4–6 PostgREST calls per visit. The cache is
 *     busted on tenant profile save via `revalidatePublicBusiness()`.
 */
async function _getPublicBusinessByUrl(
  industrySeg: string,
  citySeg: string,
  slugSeg: string,
): Promise<{ business: PublicBusinessData | null; needsRedirect: boolean; canonicalUrl: string | null }> {
  // Look up by slug (URL-safe identifier).
  // We accept either `slug` or `publicSlug` as the URL identifier.
  //
  // `select` (PUBLIC_TENANT_SELECT) projects ONLY the columns needed by the
  // public page — excluding heavy JSON blobs (whatsappConfigJson,
  // settingsJson, whiteLabelJson) and internal columns (createdAt,
  // updatedAt, suspendedAt). Cuts the wire payload from ~50KB to ~5KB.
  let tenant: PublicTenantRow | null = null
  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { slug: slugSeg },
          { publicSlug: slugSeg },
        ],
      },
      select: PUBLIC_TENANT_SELECT,
    })
  } catch {
    return { business: null, needsRedirect: false, canonicalUrl: null }
  }

  if (!tenant) {
    return { business: null, needsRedirect: false, canonicalUrl: null }
  }

  // ── Canonical URL = PLURAL industry slug ─────────────────────────────
  // The canonical URL scheme is now /{pluralIndustry}/{city}/{slug}
  // (e.g. /plumbers/london/abc-plumbing) — see
  // src/lib/seo/plural-industry-slugs.ts. The plural form is the
  // SEO-friendly browse URL (matching /plumbers/london for the browse
  // route), so the 3-segment profile route lives under the same plural
  // prefix for URL consistency.
  //
  // The legacy `mapIndustryToUrlSlug()` (singular: 'plumber') is still
  // exported for callers that need the OLD singular form (e.g. the offline
  // IndexedDB cache key on `industryUrlSlug`); only the canonical URL
  // builder switches to plural here.
  const expectedIndustry = mapIndustryToPluralSlug(tenant.industry)
  const expectedCity = slugifyCity(tenant.city)

  // If the URL segments don't match the DB-derived canonical segments,
  // signal a redirect to the canonical URL.
  if (industrySeg !== expectedIndustry || citySeg !== expectedCity) {
    const canonicalUrl = `${SITE_URL}/${expectedIndustry}/${expectedCity}/${tenant.slug}`
    return { business: null, needsRedirect: true, canonicalUrl }
  }

  const canonicalUrl = `${SITE_URL}/${expectedIndustry}/${expectedCity}/${tenant.slug}`

  // Fetch services ONCE here via the cached `getPublicServices` (which uses
  // its own unstable_cache entry) so we can derive the `isIndexable` count
  // without a separate `service.count()` query. The page's later
  // getPublicServices() call will hit the same cache entry — zero duplicate
  // DB work.
  const services = await getPublicServices(tenant.id)
  const business = await buildPublicBusinessData(tenant, canonicalUrl, services.length)
  return { business, needsRedirect: false, canonicalUrl }
}

export const getPublicBusinessByUrl = unstable_cache(
  _getPublicBusinessByUrl,
  ['public-business-by-url'],
  { revalidate: 120, tags: ['public-business'] },
)

/**
 * Resolve a tenant by slug only (used by /b/[slug] short URL → redirect).
 */
export async function getCanonicalUrlBySlug(slugSeg: string): Promise<string | null> {
  let tenant: Awaited<ReturnType<typeof db.tenant.findFirst>> = null
  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { slug: slugSeg },
          { publicSlug: slugSeg },
        ],
      },
    })
  } catch {
    return null
  }

  if (!tenant) return null
  // PLURAL canonical URL — see _getPublicBusinessByUrl for rationale.
  const expectedIndustry = mapIndustryToPluralSlug(tenant.industry)
  const expectedCity = slugifyCity(tenant.city)
  return `${SITE_URL}/${expectedIndustry}/${expectedCity}/${tenant.slug}`
}

/**
 * Build the public-safe business data object from a raw tenant row.
 * Computes the `isIndexable` flag based on the "rich enough" rule.
 *
 * `publicServiceCount` is passed in (rather than fetched via a separate
 * `service.count()` query) — the caller (_getPublicBusinessByUrl) already
 * fetched the services array for its own use, so we reuse `.length` to
 * avoid a redundant PostgREST round-trip.
 */
async function buildPublicBusinessData(
  tenant: PublicTenantRow,
  canonicalUrl: string,
  publicServiceCount: number,
): Promise<PublicBusinessData> {
  // Parse gallery to check for ≥1 image.
  let gallery: Array<{ url?: string }> = []
  try {
    gallery = JSON.parse(tenant.galleryJson || '[]')
  } catch {
    gallery = []
  }
  // ── Cover-image fallback (SEO fix for production tenants) ─────────────
  // Many production tenants onboarded before the auto-populate Hub defaults
  // existed, so their `coverImage` is NULL. Without a fallback, these tenants
  // fail the `hasImage` indexability gate → `isIndexable: false` → their
  // public pages render with `robots: noindex` AND they're excluded from the
  // sitemap → Google Search Console shows "Discovered pages: 0".
  //
  // Fix: derive an industry-appropriate default cover image at READ time.
  // This makes `hasImage` always true (when industry is known) without
  // requiring a data migration. Zero scripts to run — works for existing
  // AND future tenants the moment this deploys. The effective value is also
  // returned in the data object so OG images + page rendering + structured
  // data all use the fallback.
  const effectiveCoverImage =
    tenant.coverImage || defaultCoverImageForIndustry(tenant.industry)
  const hasImage = Boolean(effectiveCoverImage || tenant.logo || gallery.length > 0)

  // ── Phone normalization ──────────────────────────────────────────────
  // Some seed data (and a few legacy DB rows) stored phone numbers with a
  // leading backslash ("\\+1 323-970-3113") because of an sqlEscape bug
  // that has since been fixed in the seed script. Strip any leading
  // backslashes here at READ time so the rendered output is always clean.
  // This is defensive — future seed runs won't add backslashes, but we
  // also don't want to require a data migration for existing rows.
  const normalizePhone = (raw: string | null): string | null => {
    if (!raw) return null
    // Strip ALL leading backslashes (one or more) and surrounding whitespace.
    const cleaned = raw.replace(/^[\s\\]+/, '').trim()
    return cleaned || null
  }

  // "Rich enough" rule for auto-indexing.
  // Description minimum relaxed from 100 → 40 chars. Analysis of 50 production
  // tenants showed the auto-generated onboarding descriptions follow the pattern
  // "Established {Industry} business serving {City}." — the shortest real one
  // is 41 chars ("Established HVAC business serving sydney."). The old 100-char
  // gate excluded 32/50 production tenants from the sitemap; 40 chars captures
  // ALL 50 while still filtering empty/garbage descriptions. This is the
  // minimum threshold that makes the sitemap actually reflect the marketplace.
  const descriptionLongEnough = Boolean(
    tenant.description && tenant.description.trim().length >= 40,
  )
  // ── 3-tier profile scoring (anti-template-spinning at 100K scale) ──────
  // The previous binary "rich enough" rule (description ≥40 chars + image)
  // would let 100K bulk-seeded Google Places listings all pass the gate and
  // hit Google's index at once — the programmatic-SEO failure mode. The
  // 3-tier model differentiates:
  //   Tier A (Rich)   → claimed + real description + ≥3 services + image + verified
  //   Tier B (Medium) → meets the ≥40 char + image baseline (current behavior)
  //   Tier C (Thin)   → noindex,follow (discoverable but not indexed)
  //
  // `publicServiceCount` is now used for tier scoring (not as a hard gate).
  // `reviewCount` is already on the tenant row. The templated-description
  // detector flags onboarding-boilerplate descriptions so Tier A requires a
  // genuine authored description.
  const confirmedBadgeCount = [
    tenant.identityVerified,
    tenant.businessVerified,
    tenant.insuranceVerified,
    Boolean(tenant.licenceNumber),
  ].filter(Boolean).length
  const profileTier = computeProfileTier({
    claimed: tenant.claimed,
    description: tenant.description,
    isTemplatedDescription: isTemplatedDescription(tenant.description),
    serviceCount: publicServiceCount,
    hasImage,
    confirmedBadgeCount,
    reviewCount: tenant.reviewCount ?? 0,
    publicProfileEnabled: tenant.publicProfileEnabled,
  })
  // `isIndexable` is retained for backward-compat with callers that read it
  // directly. It's now derived from the tier: Tier A + B are indexable,
  // Tier C is not. The page's `robots` directive + sitemap exclusion use
  // the tier directly for finer-grained control.
  const isIndexable = isIndexableByTier(profileTier) && descriptionLongEnough

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    industry: tenant.industry,
    industryUrlSlug: mapIndustryToUrlSlug(tenant.industry),
    cityUrlSlug: slugifyCity(tenant.city),
    city: tenant.city,
    state: tenant.state,
    phone: normalizePhone(tenant.phone),
    whatsappPhone: normalizePhone(tenant.whatsappPhone),
    email: tenant.email,
    // Normalize website URL: ensure it has a protocol so the <a href> is
    // clickable (not treated as a relative path). Trim surrounding whitespace.
    website: tenant.website
      ? (/^https?:\/\//i.test(tenant.website)
          ? tenant.website.trim()
          : `https://${tenant.website.trim()}`)
      : null,
    address: tenant.address,
    country: tenant.country,
    currency: tenant.currency,
    logo: tenant.logo,
    // Use the effective (fallback-applied) cover image so downstream
    // consumers (OG meta, <img> rendering, structured data) get a real
    // URL even when the tenant never uploaded one.
    coverImage: effectiveCoverImage,
    tagline: tenant.tagline,
    description: tenant.description,
    rating: tenant.rating,
    reviewCount: tenant.reviewCount,
    businessHoursJson: tenant.businessHoursJson,
    galleryJson: tenant.galleryJson,
    serviceAreasJson: tenant.serviceAreasJson,
    socialLinksJson: tenant.socialLinksJson,
    faqsJson: tenant.faqsJson,
    seoTitle: tenant.seoTitle,
    seoDescription: tenant.seoDescription,
    publicProfileEnabled: tenant.publicProfileEnabled,
    marketplaceOptIn: tenant.marketplaceOptIn,
    // ── Subscription signals (used to gate the booking panel) ──
    // `claimed` distinguishes real registered businesses from OSM/demo seed
    // data. `planStatus` + `trialEndsAt` determine whether the subscription
    // is currently valid. Together these feed computeCardType() on the detail
    // page to decide between the full MarketplaceBookingPanel and a minimal
    // "Call Now" CTA. trialEndsAt is normalized to an ISO string so it
    // survives server→client serialization cleanly (Supabase REST may return
    // a string OR Date — both .toISOString() safely).
    claimed: tenant.claimed,
    plan: tenant.plan,
    planStatus: tenant.planStatus,
    trialEndsAt: tenant.trialEndsAt instanceof Date
      ? tenant.trialEndsAt.toISOString()
      : (tenant.trialEndsAt ?? null),
    identityVerified: tenant.identityVerified,
    businessVerified: tenant.businessVerified,
    insuranceVerified: tenant.insuranceVerified,
    licenceNumber: tenant.licenceNumber,
    insuranceProvider: tenant.insuranceProvider,
    emergencyServiceAvailable: tenant.emergencyServiceAvailable,
    isIndexable,
    profileTier,
    canonicalUrl,
    googlePlaceId: tenant.googlePlaceId,
    website: tenant.website,
  }
}

/**
 * Fetch the marketplace-only extras (certifications) for a tenant.
 *
 * Only called when `tenant.marketplaceOptIn === true` so we don't hit the
 * ProviderCertification table for non-marketplace businesses. Returns an
 * empty array on any error (the page renders without the certifications
 * section — never crashes the whole page).
 *
 * Dates are returned as ISO strings so they survive the server → client
 * component boundary without serialization issues.
 *
 * Wrapped in `unstable_cache` (120s TTL, tagged 'public-business') so the
 * certifications section is cached alongside the rest of the provider page.
 */
async function _getMarketplaceCertifications(
  tenantId: string,
): Promise<PublicCertificationData[]> {
  try {
    const rows = await db.providerCertification.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        issuer: true,
        issueDate: true,
        expiryDate: true,
        isVerified: true,
        certificateNumber: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      issuer: r.issuer,
      issueDate: r.issueDate ? r.issueDate.toISOString() : null,
      expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
      isVerified: r.isVerified,
      certificateNumber: r.certificateNumber,
    }))
  } catch {
    return []
  }
}

export const getMarketplaceCertifications = unstable_cache(
  _getMarketplaceCertifications,
  ['public-certs'],
  { revalidate: 120, tags: ['public-business'] },
)

/**
 * Fetch the public services for a tenant (active + public only).
 *
 * Wrapped in `unstable_cache` (120s TTL, tagged 'public-business') so the
 * services list is shared across requests. Also called internally by
 * `_getPublicBusinessByUrl` to derive the `isIndexable` count — sharing
 * the same cache entry means a single DB fetch serves both calls.
 */
async function _getPublicServices(tenantId: string): Promise<PublicServiceData[]> {
  try {
    const services = await db.service.findMany({
      where: {
        tenantId,
        isActive: true,
        isPublic: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      longDescription: s.longDescription,
      slug: s.slug,
      image: s.image,
      category: s.category,
      basePrice: s.basePrice,
      duration: s.duration,
      icon: s.icon,
    }))
  } catch {
    return []
  }
}

export const getPublicServices = unstable_cache(
  _getPublicServices,
  ['public-services'],
  { revalidate: 120, tags: ['public-business'] },
)

/**
 * Fetch the most recent published reviews for a tenant.
 * Limits to 10 most recent with rating ≥ 1.
 *
 * Wrapped in `unstable_cache` (120s TTL, tagged 'public-business') so the
 * reviews section is shared across requests. NOTE: the cache key includes
 * `limit` via the function args — different limits cache separately.
 */
async function _getPublicReviews(tenantId: string, limit = 10): Promise<PublicReviewData[]> {
  try {
    const reviews = await db.review.findMany({
      where: {
        tenantId,
        status: 'published',
        rating: { gte: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      authorName: r.authorName,
      source: r.source,
      // PostgREST (Supabase REST adapter) returns dates as ISO strings,
      // while Prisma returns Date objects. Normalize to Date so the
      // interface contract (createdAt: Date) is always satisfied.
      createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string | number | Date),
      responseJson: r.responseJson,
    }))
  } catch {
    return []
  }
}

export const getPublicReviews = unstable_cache(
  _getPublicReviews,
  ['public-reviews'],
  { revalidate: 120, tags: ['public-business'] },
)

/**
 * Bust the public-business cache. Call this after a tenant profile save
 * (Public Hub tab, Settings, etc.) so the next visitor sees fresh data
 * instead of waiting up to 120s for the unstable_cache TTL to expire.
 *
 * Implemented via `revalidateTag('public-business', { expire: 0 })` —
 * purges ALL cached entries tagged 'public-business' (the per-provider
 * business row, services, reviews, and certifications). The blast radius
 * is acceptable because tenant profile saves are infrequent (per-tenant,
 * manual admin action).
 *
 * Safe to call from a Server Action or Route Handler. Importable from
 * client components (it's just a re-export of `revalidateTag`); calling
 * it from the client has no effect (revalidateTag is server-only), so
 * callers MUST invoke it inside a 'use server' action or Route Handler.
 *
 * NOTE: Next.js 16 changed `revalidateTag` to require a second `profile`
 * argument (a named CacheLife profile string OR a `{ expire?: number }`
 * config). We pass `{ expire: 0 }` for immediate invalidation.
 */
export function revalidatePublicBusiness(_slugOrTenantId?: string): void {
  // _slugOrTenantId is accepted for API symmetry with future per-entry
  // cache busting. Currently we revalidate the whole 'public-business'
  // tag (all providers) — granular per-tenant busting would require a
  // unique tag per tenant (e.g. `public-business:${tenantId}`) which we
  // can add later if the global bust becomes too coarse.
  revalidateTag('public-business', { expire: 0 })
}

// ─── Similar Businesses ─────────────────────────────────────────────────────

export interface SimilarBusiness {
  id: string
  name: string
  slug: string
  industry: string | null
  city: string | null
  state: string | null
  country: string
  phone: string | null
  rating: number
  reviewCount: number
  tagline: string | null
  coverImage: string | null
  claimed: boolean
  canonicalUrl: string
}

/**
 * Find similar businesses for a given provider profile page.
 *
 * Strategy (2-tier, falls back gracefully):
 *   1. Same `industry` + same `city` (most relevant — same service, same area)
 *   2. If tier-1 returns fewer than `limit`, backfill from same `industry` +
 *      same `country` (broader geographic match)
 *
 * Excludes:
 *   - The current tenant (by id)
 *   - Suspended tenants (suspendedAt != null)
 *   - Tenants with marketplaceOptIn=false or publicProfileEnabled=false
 *
 * Sort: rating DESC, then reviewCount DESC (most reputable first).
 *
 * Returns at most `limit` (default 6) similar businesses.
 * Cached for 5 minutes via unstable_cache.
 */
async function _getSimilarProviders(
  tenantId: string,
  industry: string | null,
  city: string | null,
  country: string,
  limit: number = 6,
): Promise<SimilarBusiness[]> {
  if (!industry) return []

  // Tier 1: same industry + same city
  const whereCity = {
    id: { not: tenantId },
    industry,
    city: city || undefined,
    country,
    publicProfileEnabled: true,
    marketplaceOptIn: true,
    suspendedAt: null,
  }

  let tenants = await db.tenant.findMany({
    where: whereCity,
    select: {
      id: true, name: true, slug: true, industry: true, city: true, state: true,
      country: true, phone: true, rating: true, reviewCount: true, tagline: true,
      coverImage: true, claimed: true,
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: limit,
  })

  // Tier 2: if not enough, backfill from same industry + same country (any city)
  if (tenants.length < limit) {
    const existingIds = new Set(tenants.map((t) => t.id))
    existingIds.add(tenantId)
    const more = await db.tenant.findMany({
      where: {
        id: { notIn: Array.from(existingIds) },
        industry,
        country,
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
      },
      select: {
        id: true, name: true, slug: true, industry: true, city: true, state: true,
        country: true, phone: true, rating: true, reviewCount: true, tagline: true,
        coverImage: true, claimed: true,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: limit - tenants.length,
    })
    tenants = [...tenants, ...more]
  }

  // Build canonical URLs using the plural industry slug + slugified city
  return tenants.map((t) => {
    const industrySlug = mapIndustryToPluralSlug(t.industry)
    const citySlug = slugifyCity(t.city)
    return {
      ...t,
      canonicalUrl: `/${industrySlug}/${citySlug}/${t.slug}`,
    }
  })
}

export const getSimilarProviders = unstable_cache(
  _getSimilarProviders,
  ['public-business-similar'],
  { revalidate: 300 }, // 5 minutes
)

/**
 * A sitemap entry for an indexable business — the canonical URL plus the
 * tenant's real `updatedAt` timestamp so Google gets an accurate freshness
 * signal (Concern #3 SEO fix).
 */
export interface IndexableBusinessUrl {
  url: string
  lastModified?: string
  /**
   * Profile tier (A=rich / B=medium). Tier C is never emitted — those
   * listings are excluded from the sitemap entirely (noindex,follow).
   * Used by sitemap.ts to set differentiated `priority` per URL so Google
   * crawls Tier A pages more aggressively than Tier B.
   */
  tier?: 'A' | 'B'
}

/**
 * List all indexable businesses for the sitemap.
 *
 * Returns `{ url, lastModified, tier }` tuples so the sitemap can emit a real
 * `<lastmod>` per URL (the tenant's `updatedAt`), giving Google an accurate
 * freshness signal. Previously this returned plain `string[]` which forced
 * the sitemap to use a shared "now" timestamp for every entry — providing
 * zero freshness differentiation.
 *
 * The `lastModified` field is optional so callers that only need URLs can
 * ignore it. The sitemap.ts consumer uses it; other callers (if any) can
 * just read `.url`.
 *
 * FIX (Q2-Fix 1): Previously this function called `db.tenant.findMany` with
 * NO `take`/`skip`, then filtered in JS. In production (USE_SUPABASE_DB=true)
 * the Supabase REST adapter only attaches a PostgREST `Range` header when
 * `skip` or `take` is provided — without it PostgREST caps the response at
 * 1000 rows by default. With ~100K marketplace tenants this silently
 * truncated the sitemap to ~900 entries (1000 − ~100 pruned by the JS-side
 * description/image filter).
 *
 * The fix paginates the DB fetch in a loop using `skip`/`take` so each page
 * gets its own `Range` header, bypassing the default cap. The page size is
 * 1000 to match the PostgREST default cap (slightly under to leave headroom).
 * The loop terminates when a page returns fewer rows than `pageSize`.
 *
 * The optional `offset`/`limit` parameters support the sitemap-index pattern
 * (Fix 2): `src/app/sitemap.ts` calls this in a loop with `generateSitemaps()`
 * to emit `/sitemap/0.xml`, `/sitemap/1.xml`, … each with ≤40K URLs.
 */
export async function listIndexableBusinessUrls(options?: {
  offset?: number
  limit?: number
}): Promise<IndexableBusinessUrl[]> {
  try {
    const PAGE_SIZE = 1000
    const hardLimit = options?.limit // optional cap for sitemap-index pagination
    const offsetStart = Math.max(0, options?.offset ?? 0)

    const allTenants: Array<{
      id: string
      slug: string
      industry: string
      city: string
      state: string
      country: string
      description: string | null
      claimed: boolean
      coverImage: string | null
      logo: string | null
      galleryJson: string | null
      reviewCount: number | null
      identityVerified: boolean
      businessVerified: boolean
      insuranceVerified: boolean
      licenceNumber: string | null
      updatedAt: Date | string
    }> = []

    let skip = offsetStart
    let fetchedThisCall = 0
    // Loop until either (a) a page returns < PAGE_SIZE rows (we've exhausted
    // the dataset), or (b) we've hit the optional `limit` cap.
    while (true) {
      // If a hard limit is set, don't fetch beyond it.
      if (hardLimit !== undefined && fetchedThisCall >= hardLimit) break
      const remaining = hardLimit !== undefined ? hardLimit - fetchedThisCall : undefined
      const take = remaining !== undefined ? Math.min(PAGE_SIZE, remaining) : PAGE_SIZE

      const page = await db.tenant.findMany({
        where: {
          publicProfileEnabled: true,
          suspendedAt: null,
          // Push the description-non-null check down into the DB layer so we
          // don't waste page budget on rows that will be JS-pruned. PostgREST
          // has no native char-length filter, so the ≥40-char check stays in JS,
          // but `not: null` alone prunes a meaningful chunk of empty rows.
          description: { not: null },
        },
        select: {
          id: true,
          slug: true,
          industry: true,
          city: true,
          state: true,
          country: true,
          description: true,
          claimed: true,
          coverImage: true,
          logo: true,
          galleryJson: true,
          reviewCount: true,
          identityVerified: true,
          businessVerified: true,
          insuranceVerified: true,
          licenceNumber: true,
          updatedAt: true,
        },
        skip,
        take,
        orderBy: { id: 'asc' }, // stable pagination order
      })

      if (!page || page.length === 0) break
      allTenants.push(...page)
      fetchedThisCall += page.length
      if (page.length < take) break // last page reached
      skip += page.length
    }

    // ── Filter + tier-score in JS (single pass over the paginated result) ──
    // We fetch the fields needed for tier scoring alongside the existing
    // "rich enough" check, then compute the tier per tenant. Tier C
    // listings are excluded from the sitemap (noindex,follow). Tier A + B
    // are emitted with their tier so sitemap.ts can set differentiated
    // priority (A=0.8, B=0.5).
    //
    // We don't fetch the service count here (would require a per-tenant
    // Service query or a groupBy — the Supabase REST adapter stubs the
    // latter). Instead, tier scoring uses serviceCount=0 for sitemap
    // purposes, which means sitemap tier scoring is conservative: a
    // Tier-A listing (rich + claimed + verified + reviews) might score
    // as Tier B in the sitemap if it has ≥3 services. That's fine — the
    // per-page robots directive uses the accurate tier (with real service
    // count) computed in buildPublicBusinessData(). The sitemap priority
    // is a hint, not a directive; under-scoring is safe.
    const candidates = allTenants.filter((t) => {
      const descriptionLongEnough = Boolean(
        t.description && t.description.trim().length >= 40,
      )
      if (!descriptionLongEnough) return false

      let gallery: Array<{ url?: string }> = []
      try {
        gallery = JSON.parse(t.galleryJson || '[]')
      } catch {
        gallery = []
      }
      const effectiveCoverImage =
        t.coverImage || defaultCoverImageForIndustry(t.industry)
      const hasImage = Boolean(effectiveCoverImage || t.logo || gallery.length > 0)
      return hasImage
    })

    const entries: IndexableBusinessUrl[] = []
    for (const t of candidates) {
      // ── Tier scoring (conservative — serviceCount=0 for sitemap) ──────
      let galleryCount = 0
      try {
        const g = JSON.parse(t.galleryJson || '[]')
        if (Array.isArray(g)) galleryCount = g.length
      } catch {
        galleryCount = 0
      }
      const effectiveCoverImageB =
        t.coverImage || defaultCoverImageForIndustry(t.industry)
      const hasImageB = Boolean(effectiveCoverImageB || t.logo || galleryCount > 0)
      const confirmedBadges = [
        t.identityVerified,
        t.businessVerified,
        t.insuranceVerified,
        Boolean(t.licenceNumber),
      ].filter(Boolean).length
      const tier = computeProfileTier({
        claimed: t.claimed,
        description: t.description,
        isTemplatedDescription: isTemplatedDescription(t.description),
        serviceCount: 0, // conservative — see comment above
        hasImage: hasImageB,
        confirmedBadgeCount: confirmedBadges,
        reviewCount: t.reviewCount ?? 0,
        publicProfileEnabled: true, // already filtered above
      })
      // Tier C is excluded from the sitemap entirely (noindex,follow).
      if (!isIndexableByTier(tier)) continue

      // PLURAL industry slug — matches the new /{pluralIndustry}/{city}/{slug}
      // canonical URL scheme.
      const industrySlug = mapIndustryToPluralSlug(t.industry)
      const citySlug = slugifyCity(t.city)
      // Normalize updatedAt to ISO string. Prisma returns Date; the Supabase
      // REST adapter may return a string. Both .toISOString() safely (Date
      // directly, string via new Date(...).toISOString()).
      const lastModified =
        t.updatedAt instanceof Date
          ? t.updatedAt.toISOString()
          : t.updatedAt
            ? new Date(t.updatedAt as string).toISOString()
            : undefined
      entries.push({
        url: `${SITE_URL}/${industrySlug}/${citySlug}/${t.slug}`,
        lastModified,
        tier,
      })
    }
    return entries
  } catch (err) {
    console.error('[public-business] listIndexableBusinessUrls error:', err)
    return []
  }
}

/**
 * List ALL indexable business URLs using CURSOR-BASED pagination.
 *
 * WHY THIS EXISTS (alongside the offset-based `listIndexableBusinessUrls`):
 * The offset-based variant uses `skip`/`take` which is O(n²) on Supabase
 * REST — each page with `skip: 80000` must scan & discard 80K rows before
 * returning the next 1000. For sitemap page 3 (offset 80000), this meant
 * 40 sequential HTTP requests × ~500ms each = 30+ seconds → timeout.
 *
 * This cursor-based variant uses `where: { id: { gt: lastId } }` which lets
 * the DB use the primary-key index to jump directly to the next page — O(n)
 * total instead of O(n²). It fetches ALL indexable URLs in a single pass,
 * so the caller (sitemap-builder) can slice the result for each sitemap
 * page without re-querying the DB.
 *
 * The result is cached by the caller (sitemap-builder.ts) for 1 hour, so
 * the expensive full-table scan only happens once per hour — all sitemap
 * page requests are then served from the in-memory cache.
 */
export async function listAllIndexableBusinessUrls(): Promise<IndexableBusinessUrl[]> {
  try {
    const PAGE_SIZE = 1000
    const allTenants: Array<{
      id: string
      slug: string
      industry: string
      city: string
      description: string | null
      claimed: boolean
      coverImage: string | null
      logo: string | null
      galleryJson: string | null
      reviewCount: number | null
      identityVerified: boolean
      businessVerified: boolean
      insuranceVerified: boolean
      licenceNumber: string | null
      updatedAt: Date | string
    }> = []

    // ── Cursor-based pagination: id > lastId ──
    // Each iteration fetches the next PAGE_SIZE rows ordered by id ASC.
    // The `id > lastId` WHERE clause uses the PK index for an instant
    // seek — no row scanning needed (unlike `skip: N` which scans N rows).
    let lastId: string | undefined = undefined
    while (true) {
      const page = await db.tenant.findMany({
        where: {
          publicProfileEnabled: true,
          suspendedAt: null,
          description: { not: null },
          ...(lastId ? { id: { gt: lastId } } : {}),
        },
        select: {
          id: true,
          slug: true,
          industry: true,
          city: true,
          description: true,
          claimed: true,
          coverImage: true,
          logo: true,
          galleryJson: true,
          reviewCount: true,
          identityVerified: true,
          businessVerified: true,
          insuranceVerified: true,
          licenceNumber: true,
          updatedAt: true,
        },
        take: PAGE_SIZE,
        orderBy: { id: 'asc' },
      })

      if (!page || page.length === 0) break
      allTenants.push(...page)
      lastId = page[page.length - 1].id
      if (page.length < PAGE_SIZE) break // last page reached
    }

    // ── Filter + tier-score in JS (same logic as listIndexableBusinessUrls) ──
    const candidates = allTenants.filter((t) => {
      const descriptionLongEnough = Boolean(
        t.description && t.description.trim().length >= 40,
      )
      if (!descriptionLongEnough) return false

      let gallery: Array<{ url?: string }> = []
      try {
        gallery = JSON.parse(t.galleryJson || '[]')
      } catch {
        gallery = []
      }
      const effectiveCoverImage =
        t.coverImage || defaultCoverImageForIndustry(t.industry)
      const hasImage = Boolean(effectiveCoverImage || t.logo || gallery.length > 0)
      return hasImage
    })

    const entries: IndexableBusinessUrl[] = []
    for (const t of candidates) {
      let galleryCount = 0
      try {
        const g = JSON.parse(t.galleryJson || '[]')
        if (Array.isArray(g)) galleryCount = g.length
      } catch {
        galleryCount = 0
      }
      const effectiveCoverImageB =
        t.coverImage || defaultCoverImageForIndustry(t.industry)
      const hasImageB = Boolean(effectiveCoverImageB || t.logo || galleryCount > 0)
      const confirmedBadges = [
        t.identityVerified,
        t.businessVerified,
        t.insuranceVerified,
        Boolean(t.licenceNumber),
      ].filter(Boolean).length
      const tier = computeProfileTier({
        claimed: t.claimed,
        description: t.description,
        isTemplatedDescription: isTemplatedDescription(t.description),
        serviceCount: 0, // conservative — same as listIndexableBusinessUrls
        hasImage: hasImageB,
        confirmedBadgeCount: confirmedBadges,
        reviewCount: t.reviewCount ?? 0,
        publicProfileEnabled: true,
      })
      if (!isIndexableByTier(tier)) continue

      const industrySlug = mapIndustryToPluralSlug(t.industry)
      const citySlug = slugifyCity(t.city)
      const lastModified =
        t.updatedAt instanceof Date
          ? t.updatedAt.toISOString()
          : t.updatedAt
            ? new Date(t.updatedAt as string).toISOString()
            : undefined
      entries.push({
        url: `${SITE_URL}/${industrySlug}/${citySlug}/${t.slug}`,
        lastModified,
        tier,
      })
    }
    return entries
  } catch (err) {
    console.error('[public-business] listAllIndexableBusinessUrls error:', err)
    return []
  }
}

/**
 * Count indexable marketplace tenants for sitemap-index sizing.
 *
 * Used by `generateSitemaps()` in `src/app/sitemap.ts` to compute how many
 * sitemap files to emit (each capped at PER_FILE URLs, well under Google's
 * 50,000-URL-per-file limit).
 *
 * This returns the raw count of tenants matching the same `where` clause as
 * `listIndexableBusinessUrls()` (publicProfileEnabled + not suspended +
 * description not null). The actual emitted URL count will be ≤ this number
 * after the JS-side description-length/image/tier filter is applied — but
 * using the raw count for sizing is safe (over-estimates pages, never under).
 */
export async function countIndexableBusinessTenants(): Promise<number> {
  try {
    // NOTE: Prisma `count` is NOT supported by the Supabase REST adapter
    // (PostgREST `count` is returned via a `Prefer: count=exact` header +
    // `Content-Range` response header, which the adapter doesn't implement).
    // Fall back to paginating `findMany` with `select: { id: true }` and
    // summing page lengths — cheap (single column) and reliable.
    const PAGE_SIZE = 1000
    let total = 0
    let skip = 0
    while (true) {
      const page = await db.tenant.findMany({
        where: {
          publicProfileEnabled: true,
          suspendedAt: null,
          description: { not: null },
        },
        select: { id: true },
        skip,
        take: PAGE_SIZE,
        orderBy: { id: 'asc' },
      })
      if (!page || page.length === 0) break
      total += page.length
      if (page.length < PAGE_SIZE) break
      skip += page.length
    }
    return total
  } catch (err) {
    console.error('[public-business] countIndexableBusinessTenants error:', err)
    return 0
  }
}

// ─── Auto-populate Hub defaults ──────────────────────────────────────────────
//
// Called when (a) onboarding completes, or (b) a backfill script runs for
// existing tenants. Derives Hub content from data the tenant already has
// (name, industry, address, phone) so the public page is "ready" the moment
// the user finishes onboarding — without forcing them to fill out a second
// form. The user can then edit/disable/delete anything from the Public Hub
// settings tab.

/**
 * Map an industry string to one of the existing landing images under
 * /images/landing/. Used as the default cover image so every new Hub
 * has a non-empty hero banner out of the box.
 */
function defaultCoverImageForIndustry(industry: string | null): string {
  const i = (industry || '').toLowerCase()
  if (i.includes('plumb')) return '/images/industry/plumbing.webp'
  if (i.includes('hvac') || i.includes('air cond') || i.includes('heating') || i.includes('cooling')) return '/images/industry/hvac.webp'
  if (i.includes('electric')) return '/images/industry/electric.webp'
  if (i.includes('clean')) return '/images/industry/cleaning.webp'
  if (i.includes('pest')) return '/images/industry/pest.webp'
  if (i.includes('mov')) return '/images/industry/moving.webp'
  if (i.includes('landscape') || i.includes('lawn') || i.includes('garden')) return '/images/industry/landscape.webp'
  if (i.includes('roof')) return '/images/industry/roofing.webp'
  if (i.includes('paint')) return '/images/industry/painting.webp'
  if (i.includes('auto') || i.includes('car') || i.includes('mechanic')) return '/images/industry/auto.webp'
  if (i.includes('salon') || i.includes('spa') || i.includes('beauty')) return '/images/industry/salon.webp'
  if (i.includes('pet') || i.includes('vet') || i.includes('groom')) return '/images/industry/pet.webp'
  if (i.includes('food') || i.includes('restaurant') || i.includes('cater')) return '/images/industry/food.webp'
  if (i.includes('photo')) return '/images/industry/photography.webp'
  if (i.includes('tutor') || i.includes('education') || i.includes('teach')) return '/images/industry/tutoring.webp'
  if (i.includes('handyman') || i.includes('handy')) return '/images/industry/handyman.webp'
  return '/images/industry/industry.webp'
}

/**
 * Parse a US/CA-style address string into city / state / postalCode.
 * Best-effort — handles patterns like:
 *   "123 Main St, Denver, CO 80202"
 *   "123 Main St, Denver, CO 80202-1234"
 *   "Denver, CO 80202"
 *
 * ALSO handles the JSON-string format produced by the Settings view
 * (settings-view.tsx saves `address` as `JSON.stringify({street,city,state,pincode,country})`):
 *   '{"street":"123 Main St","city":"Denver","state":"CO","pincode":"80202","country":"US"}'
 */
function parseAddressParts(address: string | null): {
  city: string | null
  state: string | null
  postalCode: string | null
} {
  if (!address) return { city: null, state: null, postalCode: null }

  // ── JSON-string form (written by Settings view) ─────────────────────
  const trimmed = address.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed) as {
        city?: string | null
        state?: string | null
        pincode?: string | null
        postalCode?: string | null
      }
      return {
        city: (obj.city || '').trim() || null,
        state: (obj.state || '').trim() || null,
        postalCode: (obj.postalCode || obj.pincode || '').trim() || null,
      }
    } catch {
      // fall through to regex parsing
    }
  }

  // ── Plain-string form ───────────────────────────────────────────────
  // Look for the "CITY, ST 12345" or "CITY, ST 12345-6789" tail.
  const m = address.match(/,\s*([^,]+?),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/)
  if (m) {
    return { city: m[1].trim(), state: m[2].toUpperCase(), postalCode: m[3] }
  }
  // Try without leading comma (e.g. "Denver CO 80202")
  const m2 = address.match(/\b([A-Za-z .]+)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/)
  if (m2) {
    return { city: m2[1].trim(), state: m2[2].toUpperCase(), postalCode: m2[3] }
  }
  return { city: null, state: null, postalCode: null }
}

/**
 * Format a tenant's `address` field for human-readable display.
 *
 * The address column is a plain `String?` in the schema, but the Settings
 * view writes it as a JSON string `{"street","city","state","pincode","country"}`.
 * This helper detects JSON and renders it as a readable single-line string.
 * Non-JSON addresses are returned verbatim.
 *
 * Exported so the public Hub landing page can use it directly.
 */
export function formatAddressForDisplay(address: string | null | undefined): string {
  if (!address) return ''
  const trimmed = address.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed) as {
        street?: string | null
        city?: string | null
        state?: string | null
        pincode?: string | null
        postalCode?: string | null
        country?: string | null
      }
      const parts = [
        obj.street?.trim(),
        obj.city?.trim(),
        obj.state?.trim(),
        (obj.postalCode || obj.pincode || '').trim(),
        obj.country?.trim(),
      ].filter((p) => p && p.length > 0)
      return parts.join(', ')
    } catch {
      // malformed JSON — fall through to return raw string
    }
  }
  return trimmed
}

/** Title-case an industry string for human display ("plumbing" → "Plumbing"). */
function prettyIndustry(industry: string | null): string {
  if (!industry) return 'Home Services'
  const i = industry.trim()
  if (!i) return 'Home Services'
  return i.charAt(0).toUpperCase() + i.slice(1)
}

export interface HubDefaultsInput {
  id: string
  name: string
  slug: string
  industry: string | null
  address: string | null
  phone: string | null
  email: string | null
  country: string
  /** existing values — only fields that are null/empty will be filled */
  city?: string | null
  state?: string | null
  postalCode?: string | null
  tagline?: string | null
  description?: string | null
  coverImage?: string | null
  businessHoursJson?: string
  serviceAreasJson?: string
  socialLinksJson?: string
  faqsJson?: string
  seoTitle?: string | null
  seoDescription?: string | null
  publicSlug?: string | null
  publicProfileEnabled?: boolean
}

export interface HubDefaultsResult {
  publicProfileEnabled: boolean
  publicSlug: string
  city: string | null
  state: string | null
  postalCode: string | null
  tagline: string
  description: string  // HTML
  coverImage: string
  businessHoursJson: string
  serviceAreasJson: string
  socialLinksJson: string
  faqsJson: string  // array of {question, answer(HTML)}
  seoTitle: string
  seoDescription: string
}

/**
 * Compute Hub defaults for a tenant. ONLY fills fields that are currently
 * empty — never overwrites user edits. Always sets publicProfileEnabled=true
 * (the user can disable it from the Public Hub tab).
 */
export function computeHubDefaults(input: HubDefaultsInput): HubDefaultsResult {
  const parsed = parseAddressParts(input.address)
  const city = input.city?.trim() || parsed.city || null
  const state = input.state?.trim() || parsed.state || null
  const postalCode = input.postalCode?.trim() || parsed.postalCode || null

  const industryPretty = prettyIndustry(input.industry)
  const cityLabel = city || 'your area'

  const tagline =
    input.tagline?.trim() ||
    `${cityLabel}'s trusted ${industryPretty.toLowerCase()} service`

  // Description: rich HTML. ≥ 100 chars so the "indexable" rule passes.
  const defaultDescriptionHtml = [
    `<p><strong>${escapeHtml(input.name)}</strong> is a ${escapeHtml(industryPretty.toLowerCase())} business serving ${escapeHtml(cityLabel)}${state ? `, ${escapeHtml(state)}` : ''} and the surrounding communities.</p>`,
    `<p>Our team is committed to delivering reliable, professional ${escapeHtml(industryPretty.toLowerCase())} services — from routine maintenance to emergency calls. We show up on time, do the job right the first time, and stand behind our work.</p>`,
    input.phone
      ? `<p>Call us at <a href="tel:${escapeHtml(input.phone.replace(/[^+\d]/g, ''))}">${escapeHtml(input.phone)}</a> to book a visit or request a free quote.</p>`
      : `<p>Contact us today to book a visit or request a free quote.</p>`,
  ].join('')

  const description = input.description?.trim() && input.description.trim().length >= 100
    ? input.description
    : defaultDescriptionHtml

  const coverImage = input.coverImage?.trim() || defaultCoverImageForIndustry(input.industry)

  // Business hours: Mon–Fri 9–5, closed Sat/Sun. If user already has hours, keep them.
  const hasHours = input.businessHoursJson && input.businessHoursJson !== '{}'
  const businessHoursJson = hasHours
    ? input.businessHoursJson!
    : JSON.stringify({
        mon: { open: '09:00', close: '17:00' },
        tue: { open: '09:00', close: '17:00' },
        wed: { open: '09:00', close: '17:00' },
        thu: { open: '09:00', close: '17:00' },
        fri: { open: '09:00', close: '17:00' },
        sat: { closed: true },
        sun: { closed: true },
      })

  // Service areas: [city] if we have one.
  const existingAreas = tryParseArray(input.serviceAreasJson)
  const serviceAreasJson = existingAreas.length > 0
    ? JSON.stringify(existingAreas)
    : JSON.stringify(city ? [city] : [])

  const socialLinksJson = input.socialLinksJson && input.socialLinksJson !== '{}'
    ? input.socialLinksJson
    : '{}'

  // FAQs: 3 generic-but-useful industry FAQs with rich-HTML answers.
  const existingFaqs = tryParseArray(input.faqsJson)
  const faqsJson = existingFaqs.length > 0
    ? JSON.stringify(existingFaqs)
    : JSON.stringify([
        {
          question: `What areas do you serve?`,
          answer: `<p>We proudly serve ${escapeHtml(cityLabel)}${state ? `, ${escapeHtml(state)}` : ''} and the surrounding communities. ${existingAreas.length > 0 ? 'Service areas include: ' + existingAreas.map((a: { name?: string } | string) => typeof a === 'string' ? a : a.name).join(', ') + '.' : ''}</p>`,
        },
        {
          question: `Do you offer emergency ${industryPretty.toLowerCase()} service?`,
          answer: `<p>Yes — we offer emergency ${escapeHtml(industryPretty.toLowerCase())} service for urgent situations. ${input.phone ? `Call us at <a href="tel:${escapeHtml(input.phone.replace(/[^+\d]/g, ''))}">${escapeHtml(input.phone)}</a>` : 'Contact us'} and we'll dispatch a technician as soon as possible.</p>`,
        },
        {
          question: `How can I get a quote?`,
          answer: `<p>Getting a quote is easy. ${input.phone ? `Call us at <a href="tel:${escapeHtml(input.phone.replace(/[^+\d]/g, ''))}">${escapeHtml(input.phone)}</a>` : 'Contact us'}, or use the booking form on this page to request a free, no-obligation estimate for your ${escapeHtml(industryPretty.toLowerCase())} project.</p>`,
        },
      ])

  const seoTitle =
    input.seoTitle?.trim() ||
    `${input.name} | ${industryPretty} in ${cityLabel}`.slice(0, 70)

  const seoDescription =
    input.seoDescription?.trim() ||
    stripHtml(description).slice(0, 155)

  return {
    publicProfileEnabled: true,  // always enable by default
    // Also opt into the marketplace browse grid so backfilled tenants are
    // actually visible at /marketplace. Without this, tenants that had
    // applyHubDefaultsToTenant() run on them got a public hub page but
    // stayed invisible on the marketplace (marketplaceOptIn stayed false).
    marketplaceOptIn: true,
    marketplaceTermsAcceptedAt: new Date(),
    publicSlug: input.publicSlug?.trim() || input.slug,
    city,
    state,
    postalCode,
    tagline,
    description,
    coverImage,
    businessHoursJson,
    serviceAreasJson,
    socialLinksJson,
    faqsJson,
    seoTitle,
    seoDescription,
  }
}

/**
 * Seed default Service rows for a tenant from its industry kit.
 *
 * Looks up the tenant's `industry`, finds the matching kit in
 * `industry-kits.ts` (HVAC, plumbing, cleaning, electrical, pest control,
 * landscaping, roofing, general contractor), and inserts the kit's 8-10
 * predefined services into the `Service` table with `isActive=true` and
 * `isPublic=true` so they appear on the public Business Hub immediately.
 *
 * Safety: ONLY runs if the tenant has zero existing services — never
 * creates duplicates or overwrites the user's manual setup.
 *
 * Returns the number of services inserted (0 if skipped or no kit found).
 */
export async function seedDefaultServicesForTenant(tenantId: string): Promise<number> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, industry: true },
  })
  if (!tenant || !tenant.industry) return 0

  const kit = getIndustryKit(tenant.industry)
  if (!kit || !kit.services || kit.services.length === 0) return 0

  // ── Don't clobber an existing catalog ───────────────────────────────
  // If the tenant already has ANY services (manual or seeded), skip.
  // This respects the user's existing setup.
  const existingCount = await db.service.count({ where: { tenantId } })
  if (existingCount > 0) return 0

  // ── Insert all kit services in parallel ─────────────────────────────
  // Maps kit shape → Service model shape:
  //   defaultPrice → basePrice
  //   duration ("45m" | "1h 30m") → minutes (via durationToMinutes)
  await Promise.all(
    kit.services.map((s) =>
      db.service.create({
        data: {
          name: s.name,
          description: s.description || null,
          category: s.category || 'general',
          basePrice: s.defaultPrice ?? 0,
          duration: s.duration ? durationToMinutes(s.duration) : 60,
          icon: s.icon || null,
          isActive: true,
          isPublic: true,
          tenantId,
        },
      })
    )
  )

  return kit.services.length
}

/** Apply computed defaults to a tenant row in the DB. Only fills empty fields. */
export async function applyHubDefaultsToTenant(tenantId: string): Promise<void> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return

  const defaults = computeHubDefaults({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    industry: tenant.industry,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    country: tenant.country,
    city: tenant.city,
    state: tenant.state,
    postalCode: tenant.postalCode,
    tagline: tenant.tagline,
    description: tenant.description,
    coverImage: tenant.coverImage,
    businessHoursJson: tenant.businessHoursJson,
    serviceAreasJson: tenant.serviceAreasJson,
    socialLinksJson: tenant.socialLinksJson,
    faqsJson: tenant.faqsJson,
    seoTitle: tenant.seoTitle,
    seoDescription: tenant.seoDescription,
    publicSlug: tenant.publicSlug,
    publicProfileEnabled: tenant.publicProfileEnabled,
  })

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      publicProfileEnabled: defaults.publicProfileEnabled,
      // Opt into the marketplace browse grid ONLY if the tenant has never
      // interacted with the marketplace opt-in (marketplaceTermsAcceptedAt
      // IS null = never went through onboarding step 2's toggle). This fixes
      // the "older users invisible on marketplace" issue without overriding
      // an explicit opt-OUT from a user who completed onboarding and chose
      // not to be listed.
      ...(tenant.marketplaceTermsAcceptedAt
        ? {}
        : { marketplaceOptIn: true, marketplaceTermsAcceptedAt: new Date() }),
      publicSlug: defaults.publicSlug,
      city: defaults.city,
      state: defaults.state,
      postalCode: defaults.postalCode,
      tagline: defaults.tagline,
      description: defaults.description,
      coverImage: defaults.coverImage,
      businessHoursJson: defaults.businessHoursJson,
      serviceAreasJson: defaults.serviceAreasJson,
      socialLinksJson: defaults.socialLinksJson,
      faqsJson: defaults.faqsJson,
      seoTitle: defaults.seoTitle,
      seoDescription: defaults.seoDescription,
    },
  })

  // ── Also seed default Service rows from the industry kit ────────────
  // This makes the "Services Offered" section on the public Hub render
  // immediately on onboarding completion. Safe: only seeds if the tenant
  // has zero existing services. Non-fatal: failures are logged but don't
  // break onboarding.
  try {
    await seedDefaultServicesForTenant(tenantId)
  } catch (err) {
    console.error('[applyHubDefaultsToTenant] seedDefaultServicesForTenant failed:', err)
  }
}

// ─── small helpers ──────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function tryParseArray(json: string | undefined): unknown[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
