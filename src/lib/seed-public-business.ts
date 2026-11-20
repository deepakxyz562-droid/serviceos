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
import { generateHubContent, type HubContent } from '@/lib/ai-client'
import { normalizeRegionState } from '@/lib/bgos-business-sanitizers'

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
  coverImage: string | null
  logo: string | null
  gallery: Array<{ url: string; caption: string }>
  faqs: Array<{ question: string; answer: string }>
  serviceAreas: string[]
}

const GENERIC_DUMMY: IndustryDummy = {
  tagline: 'Trusted local service provider • Licensed & Insured • Fast response',
  description: `We are a family-owned and operated service business serving the local community since 2009. Our team of licensed, insured, and background-checked professionals specializes in emergency repairs, installations, and maintenance services.

We pride ourselves on honest pricing, on-time arrivals, and quality workmanship. Every job is backed by our 100% satisfaction guarantee. Call us today — we're available for emergencies.`,
  coverImage: null,
  logo: null,
  services: [
    {
      name: 'Professional Consultation',
      description: 'Personalized consultation to evaluate your needs and discuss tailored solutions.',
      longDescription: 'Get dedicated time with our experienced team to assess your specific requirements, evaluate available options, and receive upfront pricing with practical recommendations.',
      category: 'consultation',
      basePrice: 99,
      duration: 60,
      slug: 'professional-consultation',
    },
    {
      name: 'Primary Service Delivery',
      description: 'Expert, end-to-end service delivery tailored to your project requirements.',
      longDescription: 'Our specialists provide dependable, professional service execution from initial setup through final review, maintaining the highest quality standards.',
      category: 'service',
      basePrice: 299,
      duration: 120,
      slug: 'primary-service-delivery',
    },
    {
      name: 'Custom Solutions',
      description: 'Bespoke packages and customized assistance designed around your goals.',
      longDescription: 'Every client has unique needs. We design and deliver custom solutions aligned with your timeline, budget, and long-term objectives.',
      category: 'custom',
      basePrice: 499,
      duration: 180,
      slug: 'custom-solutions',
    },
    {
      name: 'Ongoing Support & Maintenance',
      description: 'Continuous assistance, proactive reviews, and responsive follow-up care.',
      longDescription: 'Ensure lasting success with responsive support, scheduled checkups, and priority assistance whenever you need updates or troubleshooting.',
      category: 'support',
      basePrice: 149,
      duration: 60,
      slug: 'ongoing-support-maintenance',
    },
  ],
  reviews: [],
  gallery: [],
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
  'IT & Web Services': {
    ...GENERIC_DUMMY,
    tagline: 'Custom Web Design • Google SEO • Cloud Solutions • Dedicated Support',
    services: [
      { name: 'Website Design & Development', description: 'Modern, mobile-first responsive websites designed to drive inquiries and sales.', longDescription: 'We build high-converting, lightning-fast websites and web applications tailored to your brand, optimized for all screen sizes and search visibility.', category: 'web-development', basePrice: 500, duration: 180, slug: 'website-design-development' },
      { name: 'Local SEO & Maps Ranking', description: 'Rank higher on Google Maps and Google Search for high-intent customer keywords.', longDescription: 'Comprehensive search engine optimization for local businesses, including Google Business Profile optimization, localized citation building, and keyword rank tracking.', category: 'seo', basePrice: 350, duration: 120, slug: 'local-seo-maps-ranking' },
      { name: 'Custom Software & Web Apps', description: 'Tailor-made software platforms, custom integrations, and automation workflows.', longDescription: 'From client portals to workflow automations, we develop scalable software solutions tailored to streamline operations and elevate customer experience.', category: 'software', basePrice: 800, duration: 240, slug: 'custom-software-web-apps' },
      { name: 'Cloud Hosting & Ongoing Support', description: 'Secure, high-availability cloud infrastructure with regular backups and updates.', longDescription: 'Reliable cloud deployment, domain management, SSL security, and continuous maintenance ensuring your digital assets run smoothly 24/7 without interruption.', category: 'cloud-support', basePrice: 150, duration: 60, slug: 'cloud-hosting-ongoing-support' },
    ],
  },
  'Salon & Beauty': {
    ...GENERIC_DUMMY,
    tagline: 'Expert Haircuts & Styling • Skincare • Premium Products • Relaxing Atmosphere',
    services: [
      { name: 'Haircut & Styling', description: 'Custom haircuts, precision trims, and personalized styling.', longDescription: 'Consultation and customized haircut paired with luxury washing, scalp massage, and professional blowout styling tailored to your personal aesthetic.', category: 'hair', basePrice: 65, duration: 60, slug: 'haircut-styling' },
      { name: 'Color & Highlights', description: 'Full balayage, dimensional highlights, gloss, and root touchups.', longDescription: 'Expert color formulation using gentle, restorative salon products to deliver vibrant, natural-looking dimension that lasts.', category: 'color', basePrice: 140, duration: 120, slug: 'color-highlights' },
      { name: 'Facial & Skincare Treatment', description: 'Deep cleansing, hydrating, and rejuvenating custom facials.', longDescription: 'Rejuvenate your skin with targeted exfoliations, soothing masks, and deeply nourishing serums tailored to your unique skin type.', category: 'skincare', basePrice: 95, duration: 75, slug: 'facial-skincare' },
      { name: 'Manicure & Pedicure', description: 'Complete nail shaping, cuticle care, scrub, massage, and polish.', longDescription: 'Relaxing spa manicures and pedicures with non-toxic, long-wearing polishes, paraffin hydration, and gentle foot care.', category: 'nails', basePrice: 50, duration: 60, slug: 'manicure-pedicure' },
    ],
  },
  'Healthcare & Medical': {
    ...GENERIC_DUMMY,
    tagline: 'Compassionate Care • Experienced Practitioners • Modern Facilities',
    services: [
      { name: 'Initial Health Consultation', description: 'Comprehensive patient assessment and personalized health planning.', longDescription: 'Thorough review of health history, vital checks, diagnostic screening, and personalized care recommendations from experienced clinicians.', category: 'consultation', basePrice: 120, duration: 45, slug: 'health-consultation' },
      { name: 'Preventative Wellness Checkup', description: 'Routine checkups, diagnostic screenings, and wellness guidance.', longDescription: 'Proactive preventative care designed to detect concerns early, review biomarkers, and support long-term vitality for patients of all ages.', category: 'wellness', basePrice: 180, duration: 60, slug: 'preventative-wellness' },
      { name: 'Specialist Treatment Session', description: 'Targeted care sessions for specific medical and therapeutic needs.', longDescription: 'Evidence-based clinical treatments focused on symptom relief, rehabilitation, and long-term recovery in a supportive, modern environment.', category: 'treatment', basePrice: 200, duration: 60, slug: 'specialist-treatment' },
      { name: 'Follow-up & Care Monitoring', description: 'Progress review, prescription evaluation, and continuing care.', longDescription: 'Dedicated follow-up visits to monitor treatment response, answer questions, adjust care plans, and ensure sustained health improvement.', category: 'monitoring', basePrice: 85, duration: 30, slug: 'care-monitoring' },
    ],
  },
  'Restaurant & Dining': {
    ...GENERIC_DUMMY,
    tagline: 'Fresh Seasonal Ingredients • Handcrafted Menus • Dine-In & Private Events',
    services: [
      { name: 'Dine-In Table Reservation', description: 'Reserved table seating with full culinary hospitality and seasonal menus.', longDescription: 'Enjoy authentic, chef-prepared dining in a vibrant ambiance. Ideal for date nights, family gatherings, and casual celebrations.', category: 'dining', basePrice: 50, duration: 90, slug: 'table-reservation' },
      { name: 'Takeout & Curbside Pickup', description: 'Freshly prepared orders packaged securely for convenient off-premise dining.', longDescription: 'Order your favorite dishes online or by phone with rapid kitchen turnaround and contactless curbside pickup.', category: 'takeout', basePrice: 25, duration: 20, slug: 'takeout-pickup' },
      { name: 'Private Event Catering', description: 'Custom catering packages and platters for corporate meetings and family parties.', longDescription: 'From cocktail hors doeuvres to full buffet setups, our kitchen brings unforgettable flavors and full-service dining to your private venue.', category: 'catering', basePrice: 400, duration: 180, slug: 'private-catering' },
      { name: 'Chef Tasting Experience', description: 'Multi-course culinary journey showcasing signature seasonal dishes.', longDescription: 'An exclusive dining experience guided by our culinary team featuring unique pairings, specialty ingredients, and house-made desserts.', category: 'experience', basePrice: 95, duration: 120, slug: 'chef-tasting' },
    ],
  },
  'Professional & Legal': {
    ...GENERIC_DUMMY,
    tagline: 'Trusted Advisors • Strategic Counsel • Confidential & Results-Driven',
    services: [
      { name: 'Advisory Consultation', description: 'Initial strategy session to evaluate goals and determine legal or financial paths.', longDescription: 'Confidential, in-depth consultation exploring your objectives, risk factors, and actionable strategies delivered by seasoned advisors.', category: 'advisory', basePrice: 250, duration: 60, slug: 'advisory-consultation' },
      { name: 'Document & Contract Review', description: 'Meticulous review and drafting of commercial and personal agreements.', longDescription: 'Protect your interests with comprehensive document analysis, risk mitigation, and clear contractual drafting tailored to current regulations.', category: 'document-review', basePrice: 350, duration: 90, slug: 'document-review' },
      { name: 'Client Representation & Planning', description: 'Dedicated ongoing representation, negotiations, and strategic advocacy.', longDescription: 'Professional guidance and proactive negotiation across business matters, financial filings, and formal stakeholder discussions.', category: 'representation', basePrice: 500, duration: 120, slug: 'representation-planning' },
      { name: 'Compliance & Ongoing Advisory', description: 'Regular compliance reviews and quarterly advisory checkpoints.', longDescription: 'Keep your business protected with periodic check-ins, regulatory updates, and proactive planning that prevents future liabilities.', category: 'compliance', basePrice: 200, duration: 60, slug: 'compliance-advisory' },
    ],
  },
}

/**
 * Pick the industry-specific dummy data, falling back to the generic set.
 */
function getIndustryDummy(industry?: string | null): IndustryDummy {
  if (!industry) return GENERIC_DUMMY
  // Direct match
  if (INDUSTRY_DUMMIES[industry]) return INDUSTRY_DUMMIES[industry]
  const raw = industry.toLowerCase().trim()

  // Match IT / Web / Marketing / Software
  if (/\b(it|web|software|marketing|seo|tech|computer|digital|internet|app)\b/i.test(raw)) {
    return INDUSTRY_DUMMIES['IT & Web Services']
  }
  // Match Salon / Beauty / Spa / Hair
  if (/\b(salon|beauty|hair|spa|barber|nail|skincare|cosmetic|massage)\b/i.test(raw)) {
    return INDUSTRY_DUMMIES['Salon & Beauty']
  }
  // Match Medical / Healthcare / Clinic / Dental
  if (/\b(clinic|dent|doctor|health|med|physio|therap|care|hospital)\b/i.test(raw)) {
    return INDUSTRY_DUMMIES['Healthcare & Medical']
  }
  // Match Restaurant / Food / Cafe / Bakery / Dining
  if (/\b(restaurant|cafe|food|bakery|bar|coffee|dining|cater|pizza|bistro)\b/i.test(raw)) {
    return INDUSTRY_DUMMIES['Restaurant & Dining']
  }
  // Match Legal / Financial / Real Estate / Consulting
  if (/\b(law|legal|tax|account|consult|finance|estate|insur|advis)\b/i.test(raw)) {
    return INDUSTRY_DUMMIES['Professional & Legal']
  }
  // Match Trades
  if (/\b(plumb|pipe|drain)\b/i.test(raw)) return INDUSTRY_DUMMIES.Plumbing
  if (/\b(hvac|air|heat|cool|furnace)\b/i.test(raw)) return INDUSTRY_DUMMIES.HVAC
  if (/\b(electr|wire|power|panel)\b/i.test(raw)) return INDUSTRY_DUMMIES.Electrical

  const key = Object.keys(INDUSTRY_DUMMIES).find(
    (k) => k.toLowerCase() === raw,
  )
  return key ? INDUSTRY_DUMMIES[key] : GENERIC_DUMMY
}

/**
 * Merge AI-generated hub content into the industry dummy baseline.
 *
 * AI replaces: tagline, description, faqs, and per-service descriptions
 * (name + longDescription rewritten; price/duration/category/slug kept
 * from the dummy baseline so pricing stays sensible).
 *
 * Dummy retains: serviceAreas, and any service
 * the AI didn't cover (so we never lose a service because the AI skipped it).
 *
 * If `ai` is null (AI failed or wasn't called), returns the dummy verbatim.
 */
function mergeAiWithDummy(dummy: IndustryDummy, ai: HubContent | null): IndustryDummy {
  if (!ai) return dummy

  // Map AI service copy by name (case-insensitive) so we can match it to
  // the dummy's baseline services without breaking on minor casing diffs.
  const aiServiceByName = new Map<string, { description: string; longDescription: string }>()
  for (const s of ai.services || []) {
    if (s.name) aiServiceByName.set(s.name.toLowerCase(), {
      description: s.description,
      longDescription: s.longDescription,
    })
  }

  const mergedServices = dummy.services.map((svc) => {
    const aiSvc = aiServiceByName.get(svc.name.toLowerCase())
    if (!aiSvc) return svc
    return {
      ...svc,
      description: aiSvc.description || svc.description,
      longDescription: aiSvc.longDescription || svc.longDescription,
    }
  })

  return {
    ...dummy,
    tagline: ai.tagline || dummy.tagline,
    description: ai.description || dummy.description,
    faqs: (ai.faqs && ai.faqs.length > 0)
      ? ai.faqs.map((f) => ({ question: f.question, answer: f.answer }))
      : dummy.faqs,
    services: mergedServices,
  }
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
  /**
   * Explicitly opt the tenant into the public Fieseros marketplace directory.
   * Default: false for real signups (`tenantId` provided); true when creating
   * a synthetic demo tenant (`!tenantId`).
   */
  optInMarketplace?: boolean
  /**
   * Populate synthetic sample copy, services, reviews, FAQs, and stock
   * imagery. Default: false when `tenantId` is provided so real businesses
   * never receive fake "Dallas, TX / Emergency Service / 4.9" placeholder data.
   */
  includeSampleContent?: boolean
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
  const isNewDemoTenant = !options.tenantId
  const optInMarketplace = options.optInMarketplace ?? isNewDemoTenant
  const includeSampleContent = options.includeSampleContent ?? isNewDemoTenant
  const baselineDummy = getIndustryDummy(options.industry)
  let tenant
  let created = false

  if (options.tenantId) {
    // ─── Existing tenant path ──────────────────────────────────────────────
    tenant = await db.tenant.findUnique({ where: { id: options.tenantId } })
    if (!tenant) {
      throw new Error(`Tenant not found: ${options.tenantId}`)
    }
    // If not overwrite and already enabled (with rich content when sample seeding is requested), skip silently.
    if (
      !options.overwrite &&
      tenant.publicProfileEnabled &&
      (!includeSampleContent || (tenant.description && tenant.description.length >= 100))
    ) {
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
    let slug = businessName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[ðÐĐđ]/g, 'd')
      .replace(/[þÞ]/g, 'th')
      .replace(/[æÆ]/g, 'ae')
      .replace(/[œŒ]/g, 'oe')
      .replace(/[øØ]/g, 'o')
      .replace(/[åÅ]/g, 'a')
      .replace(/[łŁ]/g, 'l')
      .replace(/ı/g, 'i')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    // Ensure unique slug
    const baseSlug = slug
    let counter = 1
    while (await db.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
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

  // ─── Clean workspace path (default on normal user signup / tenant creation) ─
  // Never fabricate Dallas/TX locations, $150 Emergency Service rows, fake 4.9/127
  // ratings, or forced marketplace opt-in for real BGOS business workspaces.
  if (!includeSampleContent) {
    const city = options.city?.trim() || tenant.city || null
    const rawState = options.state !== undefined ? options.state : tenant.state
    const state = normalizeRegionState({
      state: rawState,
      country: tenant.country,
      address: tenant.address,
      city,
    })
    const publicSlug = tenant.publicSlug || tenant.slug

    tenant = await db.tenant.update({
      where: { id: tenant.id },
      data: {
        publicProfileEnabled: true,
        claimed: true,
        publicSlug,
        ...(city ? { city } : {}),
        state,
        ...(optInMarketplace
          ? {
              marketplaceOptIn: true,
              marketplaceTermsAcceptedAt: tenant.marketplaceTermsAcceptedAt ?? new Date(),
            }
          : {}),
      },
    })

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      slug: tenant.slug,
      publicSlug: tenant.publicSlug || tenant.slug,
      publicUrl: buildPublicUrl(tenant.industry, tenant.city, tenant.slug),
      shortUrl: `/b/${tenant.publicSlug || tenant.slug}`,
      servicesCreated: 0,
      reviewsCreated: 0,
      created,
    }
  }

  // ─── Synthetic demo / SuperAdmin seed path ────────────────────────────────
  const fallbackUsDefaults = !tenant.country || tenant.country.toUpperCase() === 'US'
  const city = options.city || tenant.city || (fallbackUsDefaults ? 'Dallas' : '')
  const state = normalizeRegionState({
    state: options.state || tenant.state || (fallbackUsDefaults ? 'TX' : null),
    country: tenant.country,
    address: tenant.address,
    city,
  }) || ''

  // ─── Generate per-tenant AI content (Pollinations.ai) ────────────────────
  // Falls back to baselineDummy on any failure — onboarding must NEVER block.
  // Skip AI when re-seeding an already-AI-seeded tenant (overwrite=false case
  // is already short-circuited above; this guards the overwrite=true case
  // so manual "Re-seed" doesn't burn AI calls unnecessarily).
  const industryForAi = options.industry || tenant.industry || 'Home Services'
  const aiContent = await generateHubContent({
    businessName: tenant.name,
    industry: industryForAi,
    city: city || 'your area',
    state,
    phone: tenant.phone,
    services: baselineDummy.services.map((s) => s.name),
  })
  const dummy = mergeAiWithDummy(baselineDummy, aiContent)
  if (aiContent) {
    console.log(`[seed-public-business] AI content generated for tenant ${tenant.id} (${tenant.name})`)
  } else {
    console.warn(`[seed-public-business] AI content failed for tenant ${tenant.id}; using dummy fallback`)
  }

  tenant = await db.tenant.update({
    where: { id: tenant.id },
    data: {
      publicProfileEnabled: true,
      ...(optInMarketplace
        ? {
            marketplaceOptIn: true,
            marketplaceTermsAcceptedAt: tenant.marketplaceTermsAcceptedAt ?? new Date(),
          }
        : {}),
      publicSlug: tenant.publicSlug || tenant.slug,
      tagline: dummy.tagline,
      description: dummy.description,
      coverImage: tenant.coverImage || dummy.coverImage,
      logo: tenant.logo || dummy.logo,
      rating: tenant.rating || 4.9,
      reviewCount: tenant.reviewCount || 127,
      ...(city ? { city } : {}),
      state: state || null,
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
