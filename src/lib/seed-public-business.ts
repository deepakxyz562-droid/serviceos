/**
 * Public Business Hub — auto-seed dummy data.
 *
 * This module provides a reusable function that populates a tenant with a
 * "rich enough" public business profile so the public hub page at
 * /{industry}/{city}/{slug} (and the short URL /b/{slug}) renders with real
 * content the tenant can later edit from Settings → Public Hub.
 *
 * Indexability rules (enforced by the public hub page + sitemap):
 *   • publicProfileEnabled = true
 *   • description ≥ 100 chars
 *   • ≥ 3 active public services
 *   • ≥ 1 image (cover or logo)
 *
 * Used by:
 *   1. POST /api/superadmin/seed-public-business — SuperAdmin "Seed" button
 *   2. POST /api/auth/register — auto-seeds every NEW tenant on signup
 *   3. src/scripts/seed-public-business.ts — legacy CLI one-off
 */

import { db } from '@/lib/db'

// ─── Industry-specific dummy content ────────────────────────────────────────

interface IndustryDummy {
  tagline: string
  description: string
  services: Array<{
    name: string
    description: string
    longDescription: string
    category: string
    basePrice: number
    duration: number
    slug: string
  }>
  reviews: Array<{ rating: number; comment: string; authorName: string }>
  coverImage: string
  logo: string
  gallery: Array<{ url: string; caption: string }>
  faqs: Array<{ question: string; answer: string }>
  serviceAreas: string[]
}

const GENERIC_DUMMY: IndustryDummy = {
  tagline: 'Trusted local service provider • Licensed & Insured • Fast response',
  description: `We are a family-owned and operated service business serving the local community since 2009. Our team of licensed, insured, and background-checked professionals specializes in emergency repairs, installations, and maintenance services.

We pride ourselves on honest pricing, on-time arrivals, and quality workmanship. Every job is backed by our 100% satisfaction guarantee. Call us today — we're available for emergencies.`,
  coverImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&h=400&fit=crop',
  logo: 'https://images.unsplash.com/photo-1581092919535-90a3b3a8f80e?w=200&h=200&fit=crop',
  services: [
    {
      name: 'Emergency Service',
      description: '24/7 emergency response for urgent issues.',
      longDescription: 'When an emergency strikes, you need a professional fast. We offer 24/7 emergency response throughout the service area. Our technicians arrive within 60 minutes for most calls, equipped to handle any urgent situation.',
      category: 'emergency',
      basePrice: 150,
      duration: 90,
      slug: 'emergency-service',
    },
    {
      name: 'Inspection & Maintenance',
      description: 'Professional inspection and routine maintenance to prevent issues.',
      longDescription: 'Regular maintenance is the key to avoiding costly breakdowns. Our inspection service includes a thorough check of all components, identification of potential issues, and a detailed report with recommendations.',
      category: 'maintenance',
      basePrice: 89,
      duration: 60,
      slug: 'inspection-maintenance',
    },
    {
      name: 'Installation',
      description: 'Professional installation of new equipment and systems.',
      longDescription: 'We install, repair, and replace all major brands. Our technicians will help you choose the right product for your needs, and we handle all permits and inspections.',
      category: 'installation',
      basePrice: 1200,
      duration: 240,
      slug: 'installation',
    },
    {
      name: 'Repair & Replacement',
      description: 'Expert repair and replacement services for all major components.',
      longDescription: 'From a simple part replacement to a full system overhaul, our technicians handle all repair work. All repairs are backed by our 1-year labor warranty.',
      category: 'repair',
      basePrice: 200,
      duration: 120,
      slug: 'repair-replacement',
    },
  ],
  reviews: [
    { rating: 5, comment: 'Came out at 2am for an emergency. Fast, professional, and fair price. Will use again!', authorName: 'Sarah M.' },
    { rating: 5, comment: 'Installed a new system same day. Very knowledgeable and cleaned up everything. Highly recommend.', authorName: 'David K.' },
    { rating: 4, comment: 'Good service. A bit pricey but the work was solid.', authorName: 'Maria L.' },
    { rating: 5, comment: 'Best in town. Honest, on-time, and does excellent work. We use them for all our properties.', authorName: 'James R.' },
    { rating: 5, comment: 'Fixed the issue in 30 minutes. Friendly and professional.', authorName: 'Patricia B.' },
  ],
  gallery: [
    { url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop', caption: 'Installation work' },
    { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', caption: 'Service in progress' },
    { url: 'https://images.unsplash.com/photo-1607400201515-c2c41c07d307?w=400&h=400&fit=crop', caption: 'Completed project' },
    { url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop', caption: 'Repair work' },
  ],
  faqs: [
    { question: 'Do you offer 24/7 emergency service?', answer: 'Yes. We are available 24 hours a day, 7 days a week for emergencies. Call us anytime.' },
    { question: 'Are you licensed and insured?', answer: 'Yes. We are fully licensed and carry $2M general liability insurance.' },
    { question: 'Do you offer free estimates?', answer: 'Yes, we offer free over-the-phone estimates for most jobs. For complex installations, we may schedule an on-site inspection at no charge.' },
    { question: 'What areas do you serve?', answer: 'We serve the local metro area and surrounding suburbs. Contact us to confirm we cover your location.' },
    { question: 'Do you offer a warranty?', answer: 'Yes. All our work is backed by a 1-year parts and labor warranty.' },
  ],
  serviceAreas: ['Downtown', 'North Side', 'South Side', 'East Side', 'West Side', 'Suburbs'],
}

const INDUSTRY_DUMMIES: Record<string, IndustryDummy> = {
  Plumbing: {
    ...GENERIC_DUMMY,
    tagline: '24/7 Emergency Plumbing • Licensed & Insured • Local since 2009',
    services: [
      { name: 'Emergency Plumbing', description: '24/7 emergency plumbing service for burst pipes, severe leaks, and sewer backups.', longDescription: 'When a plumbing emergency strikes, you need a plumber fast. We offer 24/7 emergency response throughout the area. Our master plumbers arrive within 60 minutes for most calls, equipped to handle burst pipes, sewer backups, gas leaks, water heater failures, and flooding.', category: 'emergency', basePrice: 150, duration: 90, slug: 'emergency-plumbing' },
      { name: 'Drain Cleaning', description: 'Professional drain cleaning for slow drains, clogs, and backups.', longDescription: 'Slow drains and recurring clogs are more than a nuisance — they can signal deeper plumbing issues. Our drain cleaning service uses professional-grade augers and hydro-jetting equipment to clear blockages without damaging your pipes.', category: 'drain', basePrice: 89, duration: 60, slug: 'drain-cleaning' },
      { name: 'Water Heater Installation', description: 'Tank and tankless water heater installation, repair, and replacement.', longDescription: 'No hot water? We install, repair, and replace all major water heater brands including tank, tankless, and hybrid heat pump models. Our master plumbers will help you choose the right size and efficiency level for your home.', category: 'water-heater', basePrice: 1200, duration: 240, slug: 'water-heater-installation' },
      { name: 'Bathroom & Kitchen Plumbing', description: 'Fixture installation, pipe repair, and remodel rough-ins for bathrooms and kitchens.', longDescription: 'From a simple faucet replacement to a full bathroom or kitchen remodel, our plumbers handle all residential plumbing work. We install sinks, toilets, garbage disposals, dishwashers, and showers.', category: 'fixtures', basePrice: 200, duration: 120, slug: 'bathroom-kitchen-plumbing' },
    ],
  },
  HVAC: {
    ...GENERIC_DUMMY,
    tagline: 'Heating & Cooling Experts • 24/7 Emergency Service • Certified Technicians',
    services: [
      { name: 'AC Repair & Installation', description: 'Air conditioning repair, installation, and maintenance for all brands.', longDescription: 'Keep your home cool with professional AC service. We repair and install all major brands of central air, ductless mini-splits, and heat pumps. Same-day service available.', category: 'cooling', basePrice: 180, duration: 90, slug: 'ac-repair-installation' },
      { name: 'Heating Service', description: 'Furnace repair, installation, and heat pump service.', longDescription: 'Stay warm with reliable heating service. Our technicians repair and install furnaces, heat pumps, and boilers. We offer 24/7 emergency heating service in winter months.', category: 'heating', basePrice: 200, duration: 90, slug: 'heating-service' },
      { name: 'Duct Cleaning', description: 'Professional air duct cleaning to improve indoor air quality.', longDescription: 'Improve your indoor air quality with professional duct cleaning. Our powerful vacuum system removes dust, allergens, and debris from your entire duct system.', category: 'maintenance', basePrice: 350, duration: 180, slug: 'duct-cleaning' },
      { name: 'Maintenance Plans', description: 'Annual maintenance plans to keep your HVAC system running efficiently.', longDescription: 'Prevent costly breakdowns with our annual maintenance plan. Includes two tune-ups per year, priority service, and 15% off all repairs.', category: 'maintenance', basePrice: 199, duration: 60, slug: 'maintenance-plans' },
    ],
  },
  Electrical: {
    ...GENERIC_DUMMY,
    tagline: 'Licensed Electricians • Residential & Commercial • 24/7 Emergency',
    services: [
      { name: 'Electrical Repair', description: 'Licensed electrical repair for homes and businesses.', longDescription: 'From flickering lights to faulty outlets, our licensed electricians handle all types of electrical repairs. We diagnose and fix issues quickly and safely.', category: 'repair', basePrice: 120, duration: 60, slug: 'electrical-repair' },
      { name: 'Panel Upgrade', description: 'Electrical panel upgrades and service upgrades.', longDescription: 'Is your electrical panel outdated or overloaded? We upgrade panels to meet modern electrical demands, including EV charger ready panels.', category: 'installation', basePrice: 1800, duration: 240, slug: 'panel-upgrade' },
      { name: 'Lighting Installation', description: 'Indoor and outdoor lighting installation, including LED upgrades.', longDescription: 'Brighten your space with professional lighting installation. We install recessed lighting, ceiling fans, outdoor lighting, and LED retrofits.', category: 'installation', basePrice: 150, duration: 90, slug: 'lighting-installation' },
      { name: 'EV Charger Installation', description: 'Electric vehicle charger installation for homes and businesses.', longDescription: 'Go electric with professional EV charger installation. We install Level 2 chargers for all EV brands, including Tesla, Rivian, and Ford.', category: 'installation', basePrice: 800, duration: 180, slug: 'ev-charger-installation' },
    ],
  },
}

/**
 * Pick the industry-specific dummy data, falling back to the generic set.
 */
function getIndustryDummy(industry?: string | null): IndustryDummy {
  if (!industry) return GENERIC_DUMMY
  // Try exact match first, then case-insensitive
  if (INDUSTRY_DUMMIES[industry]) return INDUSTRY_DUMMIES[industry]
  const key = Object.keys(INDUSTRY_DUMMIES).find(
    (k) => k.toLowerCase() === industry.toLowerCase(),
  )
  return key ? INDUSTRY_DUMMIES[key] : GENERIC_DUMMY
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface SeedPublicBusinessOptions {
  /** Tenant ID to seed. If omitted, a new demo tenant is created. */
  tenantId?: string
  /** Override the business name (used when creating a new demo tenant). */
  businessName?: string
  /** Override the industry. */
  industry?: string
  /** Override the city. */
  city?: string
  /** Override the state/region. */
  state?: string
  /**
   * If true and tenantId is provided, OVERWRITE existing public hub fields
   * (services + reviews are upserted, not duplicated). Default: false (only
   * seed if the tenant has no public profile yet).
   */
  overwrite?: boolean
}

export interface SeedPublicBusinessResult {
  tenantId: string
  tenantName: string
  slug: string
  publicSlug: string
  publicUrl: string
  shortUrl: string
  servicesCreated: number
  reviewsCreated: number
  created: boolean // true = new tenant created, false = existing updated
}

/**
 * Seed (or re-seed) a tenant's public business hub with dummy data the
 * tenant can later edit from Settings → Public Hub.
 *
 * Safe to call multiple times — services + reviews are upserted by name/author.
 */
export async function seedPublicBusinessForTenant(
  options: SeedPublicBusinessOptions = {},
): Promise<SeedPublicBusinessResult> {
  const dummy = getIndustryDummy(options.industry)
  let tenant
  let created = false

  if (options.tenantId) {
    // ─── Existing tenant path ──────────────────────────────────────────────
    tenant = await db.tenant.findUnique({ where: { id: options.tenantId } })
    if (!tenant) {
      throw new Error(`Tenant not found: ${options.tenantId}`)
    }
    // If not overwrite and already has a public profile, skip silently.
    if (!options.overwrite && tenant.publicProfileEnabled && tenant.description && tenant.description.length >= 100) {
      // Already seeded — just return the existing state.
      const svcCount = await db.service.count({ where: { tenantId: tenant.id, isPublic: true } })
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        slug: tenant.slug,
        publicSlug: tenant.publicSlug || tenant.slug,
        publicUrl: buildPublicUrl(tenant.industry, tenant.city, tenant.slug),
        shortUrl: `/b/${tenant.publicSlug || tenant.slug}`,
        servicesCreated: svcCount,
        reviewsCreated: await db.review.count({ where: { tenantId: tenant.id } }),
        created: false,
      }
    }
  } else {
    // ─── New demo tenant path ──────────────────────────────────────────────
    const businessName = options.businessName || 'Demo Business'
    const industry = options.industry || 'Plumbing'
    const city = options.city || 'Dallas'
    const state = options.state || 'TX'
    let slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    // Ensure unique slug
    let counter = 1
    while (await db.tenant.findUnique({ where: { slug } })) {
      slug = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${counter}`
      counter++
    }
    tenant = await db.tenant.create({
      data: {
        name: businessName,
        slug,
        industry,
        phone: '+1 214 555 0142',
        email: `owner@${slug}.example.com`,
        address: '1420 Main Street',
        city,
        state,
        country: 'US',
        currency: 'USD',
        plan: 'starter',
        planStatus: 'active',
        onboardingCompleted: true,
      },
    })
    created = true
  }

  // ─── Update the tenant's public profile fields ───────────────────────────
  const city = options.city || tenant.city || 'Dallas'
  const state = options.state || tenant.state || 'TX'

  tenant = await db.tenant.update({
    where: { id: tenant.id },
    data: {
      publicProfileEnabled: true,
      publicSlug: tenant.publicSlug || tenant.slug,
      tagline: dummy.tagline,
      description: dummy.description,
      coverImage: tenant.coverImage || dummy.coverImage,
      logo: tenant.logo || dummy.logo,
      rating: tenant.rating || 4.9,
      reviewCount: tenant.reviewCount || 127,
      city,
      state,
      businessHoursJson: JSON.stringify({
        mon: { open: '07:00', close: '19:00' },
        tue: { open: '07:00', close: '19:00' },
        wed: { open: '07:00', close: '19:00' },
        thu: { open: '07:00', close: '19:00' },
        fri: { open: '07:00', close: '19:00' },
        sat: { open: '08:00', close: '17:00' },
        sun: { open: '00:00', close: '23:59' },
      }),
      serviceAreasJson: JSON.stringify(dummy.serviceAreas),
      socialLinksJson: JSON.stringify({
        facebook: `https://facebook.com/${tenant.slug}`,
        instagram: `https://instagram.com/${tenant.slug}`,
        twitter: `https://twitter.com/${tenant.slug}`,
      }),
      faqsJson: JSON.stringify(dummy.faqs),
      galleryJson: JSON.stringify(dummy.gallery),
    },
  })

  // ─── Upsert services (by name, scoped to tenant) ─────────────────────────
  let servicesCreated = 0
  const existingServices = await db.service.findMany({ where: { tenantId: tenant.id } })
  for (const svc of dummy.services) {
    const existing = existingServices.find((s) => s.name === svc.name)
    if (existing) {
      await db.service.update({
        where: { id: existing.id },
        data: { ...svc, isPublic: true },
      })
    } else {
      await db.service.create({
        data: { ...svc, isPublic: true, tenantId: tenant.id },
      })
      servicesCreated++
    }
  }

  // ─── Upsert reviews (by authorName, scoped to tenant) ────────────────────
  let reviewsCreated = 0
  const existingReviews = await db.review.findMany({ where: { tenantId: tenant.id } })
  for (const rev of dummy.reviews) {
    const exists = existingReviews.some((r) => r.authorName === rev.authorName)
    if (!exists) {
      await db.review.create({
        data: {
          ...rev,
          tenantId: tenant.id,
          status: 'published',
          source: 'internal',
          responseJson: JSON.stringify({}),
        },
      })
      reviewsCreated++
    }
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    slug: tenant.slug,
    publicSlug: tenant.publicSlug || tenant.slug,
    publicUrl: buildPublicUrl(tenant.industry, tenant.city, tenant.slug),
    shortUrl: `/b/${tenant.publicSlug || tenant.slug}`,
    servicesCreated,
    reviewsCreated,
    created,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildPublicUrl(industry?: string | null, city?: string | null, slug?: string): string {
  const industrySlug = (industry || 'services').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const citySlug = (city || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `/${industrySlug}/${citySlug}/${slug || ''}`
}
