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
import { getIndustryKit, durationToMinutes } from '@/lib/industry-kits'

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
  if (i.includes('plumb')) return '/images/landing/pillar-operations.png'
  if (i.includes('hvac') || i.includes('air cond') || i.includes('heating') || i.includes('cooling')) return '/images/landing/pillar-operations.png'
  if (i.includes('electric')) return '/images/landing/pillar-operations.png'
  if (i.includes('clean')) return '/images/landing/pillar-communication.png'
  if (i.includes('pest')) return '/images/landing/pillar-operations.png'
  if (i.includes('mov')) return '/images/landing/pillar-operations.png'
  if (i.includes('landscape') || i.includes('lawn') || i.includes('garden')) return '/images/landing/pillar-operations.png'
  if (i.includes('roof')) return '/images/landing/pillar-operations.png'
  if (i.includes('paint')) return '/images/landing/pillar-operations.png'
  if (i.includes('auto') || i.includes('car') || i.includes('mechanic')) return '/images/landing/pillar-operations.png'
  if (i.includes('salon') || i.includes('spa') || i.includes('beauty')) return '/images/landing/pillar-crm.png'
  if (i.includes('pet') || i.includes('vet') || i.includes('groom')) return '/images/landing/pillar-crm.png'
  if (i.includes('food') || i.includes('restaurant') || i.includes('cater')) return '/images/landing/pillar-finance.png'
  if (i.includes('photo')) return '/images/landing/pillar-crm.png'
  if (i.includes('tutor') || i.includes('education') || i.includes('teach')) return '/images/landing/pillar-crm.png'
  if (i.includes('handyman') || i.includes('handy')) return '/images/landing/pillar-operations.png'
  return '/images/landing/pillar-operations.png'
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
