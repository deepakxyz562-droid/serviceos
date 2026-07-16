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

import { db } from '@/lib/db'
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas'

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
  isIndexable: boolean  // computed: rich-enough check passed
  canonicalUrl: string
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

const SITE_URL = 'https://serviceos.com'

/**
 * Resolve a tenant by the three URL segments (industry, city, slug).
 * Returns null when no tenant matches the slug.
 *
 * Also enforces URL canonicalization: if the tenant exists but the
 * industry/city segments don't match the DB values, the caller should
 * 301-redirect to the canonical URL.
 */
export async function getPublicBusinessByUrl(
  industrySeg: string,
  citySeg: string,
  slugSeg: string,
): Promise<{ business: PublicBusinessData | null; needsRedirect: boolean; canonicalUrl: string | null }> {
  // Look up by slug (URL-safe identifier).
  // We accept either `slug` or `publicSlug` as the URL identifier.
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
    return { business: null, needsRedirect: false, canonicalUrl: null }
  }

  if (!tenant) {
    return { business: null, needsRedirect: false, canonicalUrl: null }
  }

  const expectedIndustry = mapIndustryToUrlSlug(tenant.industry)
  const expectedCity = slugifyCity(tenant.city)

  // If the URL segments don't match the DB-derived canonical segments,
  // signal a redirect to the canonical URL.
  if (industrySeg !== expectedIndustry || citySeg !== expectedCity) {
    const canonicalUrl = `${SITE_URL}/${expectedIndustry}/${expectedCity}/${tenant.slug}`
    return { business: null, needsRedirect: true, canonicalUrl }
  }

  const canonicalUrl = `${SITE_URL}/${expectedIndustry}/${expectedCity}/${tenant.slug}`
  const business = await buildPublicBusinessData(tenant, canonicalUrl)
  return { business, needsRedirect: false, canonicalUrl }
}

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
  const expectedIndustry = mapIndustryToUrlSlug(tenant.industry)
  const expectedCity = slugifyCity(tenant.city)
  return `${SITE_URL}/${expectedIndustry}/${expectedCity}/${tenant.slug}`
}

/**
 * Build the public-safe business data object from a raw tenant row.
 * Computes the `isIndexable` flag based on the "rich enough" rule.
 */
async function buildPublicBusinessData(
  tenant: NonNullable<Awaited<ReturnType<typeof db.tenant.findFirst>>>,
  canonicalUrl: string,
): Promise<PublicBusinessData> {
  // Count active public services for the indexability check.
  let publicServiceCount = 0
  try {
    publicServiceCount = await db.service.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
        isPublic: true,
      },
    })
  } catch {
    // service table might not have isPublic column yet — treat as 0
    publicServiceCount = 0
  }

  // Parse gallery to check for ≥1 image.
  let gallery: Array<{ url?: string }> = []
  try {
    gallery = JSON.parse(tenant.galleryJson || '[]')
  } catch {
    gallery = []
  }
  const hasImage = Boolean(tenant.coverImage || tenant.logo || gallery.length > 0)

  // "Rich enough" rule for auto-indexing.
  const descriptionLongEnough = Boolean(
    tenant.description && tenant.description.trim().length >= 100,
  )
  const hasEnoughServices = publicServiceCount >= 3
  const isIndexable = Boolean(
    tenant.publicProfileEnabled &&
    descriptionLongEnough &&
    hasEnoughServices &&
    hasImage,
  )

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    industry: tenant.industry,
    industryUrlSlug: mapIndustryToUrlSlug(tenant.industry),
    cityUrlSlug: slugifyCity(tenant.city),
    city: tenant.city,
    state: tenant.state,
    phone: tenant.phone,
    whatsappPhone: tenant.whatsappPhone,
    address: tenant.address,
    country: tenant.country,
    currency: tenant.currency,
    logo: tenant.logo,
    coverImage: tenant.coverImage,
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
    isIndexable,
    canonicalUrl,
  }
}

/**
 * Fetch the public services for a tenant (active + public only).
 */
export async function getPublicServices(tenantId: string): Promise<PublicServiceData[]> {
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

/**
 * Fetch the most recent published reviews for a tenant.
 * Limits to 10 most recent with rating ≥ 1.
 */
export async function getPublicReviews(tenantId: string, limit = 10): Promise<PublicReviewData[]> {
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
      createdAt: r.createdAt,
      responseJson: r.responseJson,
    }))
  } catch {
    return []
  }
}

/**
 * List all indexable businesses for the sitemap.
 * Returns an array of canonical URLs.
 */
export async function listIndexableBusinessUrls(): Promise<string[]> {
  try {
    // Fetch tenants with publicProfileEnabled=true (cheap filter first),
    // then apply the rest of the "rich enough" rule in JS.
    const tenants = await db.tenant.findMany({
      where: {
        publicProfileEnabled: true,
        suspendedAt: null,
      },
      select: {
        id: true,
        slug: true,
        industry: true,
        city: true,
        description: true,
        coverImage: true,
        logo: true,
        galleryJson: true,
      },
    })

    const urls: string[] = []
    for (const t of tenants) {
      const descriptionLongEnough = Boolean(
        t.description && t.description.trim().length >= 100,
      )
      if (!descriptionLongEnough) continue

      let gallery: Array<{ url?: string }> = []
      try {
        gallery = JSON.parse(t.galleryJson || '[]')
      } catch {
        gallery = []
      }
      const hasImage = Boolean(t.coverImage || t.logo || gallery.length > 0)
      if (!hasImage) continue

      // Service count check (separate query per tenant is expensive at scale,
      // but fine for the first 1k tenants — beyond that we'd batch with a groupBy)
      const serviceCount = await db.service.count({
        where: { tenantId: t.id, isActive: true, isPublic: true },
      })
      if (serviceCount < 3) continue

      const industrySlug = mapIndustryToUrlSlug(t.industry)
      const citySlug = slugifyCity(t.city)
      urls.push(`${SITE_URL}/${industrySlug}/${citySlug}/${t.slug}`)
    }
    return urls
  } catch (err) {
    console.error('[public-business] listIndexableBusinessUrls error:', err)
    return []
  }
}
