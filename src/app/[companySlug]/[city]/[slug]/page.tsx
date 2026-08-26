import type { Metadata } from 'next'
import { permanentRedirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Star,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  ChevronRight,
  Camera,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Wrench,
  ShieldCheck,
  BadgeCheck,
  Award,
  Globe,
  Mail,
  Navigation,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'

import { StructuredData } from '@/components/seo/structured-data'
import { Breadcrumbs } from '@/components/seo/breadcrumbs'
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header'
import { SafeImage } from '@/components/marketplace/safe-image'
import { CornerstoneFooter } from '@/components/seo/cornerstone-footer'
import { StickyMobileCta } from './sticky-mobile-cta'
import { UnclaimedQuotePanel } from './unclaimed-quote-panel'
import {
  getLocalBusinessSchema,
  getFaqSchema,
  getServiceSchema,
  type FaqItem,
  type LocalBusinessReview,
  type LocalBusinessHours,
} from '@/lib/seo/schemas'
import {
  mapIndustryToPluralSlug,
  resolveIndustryFromAnySlug,
} from '@/lib/seo/plural-industry-slugs'
import {
  getPublicBusinessByUrl,
  getPublicServices,
  getPublicReviews,
  getMarketplaceCertifications,
  getSimilarProviders,
  formatAddressForDisplay,
  type PublicBusinessData,
  type PublicServiceData,
  type PublicCertificationData,
  type SimilarBusiness,
} from '@/lib/public-business'
import { PublicBookingForm } from './booking-form'
import { MarketplaceBookingPanel } from './marketplace-booking-panel'
import { ServiceBookButton } from './service-book-button'
import { ChatWidget } from '@/components/public/chat-widget'
import {
  computeCardType,
  fetchFeaturedListingsMap,
  type MarketplaceCardType,
} from '@/lib/marketplace-featured'
import { ClaimBusinessBanner } from '@/components/marketplace/claim-business-banner'
import { CrmCtaSection } from '@/components/marketplace/crm-cta-section'
import { FieserosPromoCard } from '@/components/public/fieseros-promo-card'
import { ImpressionTracker } from '@/components/public/impression-tracker'
import { loadTenantPublicBranding } from '@/lib/tenant-branding'
import {
  getIndustrySoftwareUrl,
  getIndustrySoftwareLabel,
  getIndustryDisplayName,
} from '@/lib/seo/industry-software-pages'
import { getIndustryPlatformFaqs, getResolvedIndustryDisplayName } from '@/lib/marketplace/industry-content'
import {
  QuickFacts,
  AboutIndustryInCity,
  AboutBusiness,
  ServiceAreaMap,
  CommonServices,
  HiringChecklist,
  HowBookingWorks,
  TrustVerification,
  PlatformFaqs as PlatformFaqsSection,
  HeroActions,
  MobileContactCard,
  CompactTrustBadges,
  ExploreCategoryInCity,
} from './evergreen-sections'

// ── Route config ────────────────────────────────────────────────────────────
// This page no longer reads cookies/headers at render time — the
// `ClaimBusinessBanner` was refactored to fetch auth state on the client
// (via the shared Zustand store hydrated by MarketplaceHeader). That lets
// the page use ISR with a 60s revalidate window instead of
// `dynamic = 'force-dynamic'`. Combined with the unstable_cache-tagged
// data layer in src/lib/public-business.ts (120s TTL), the page is now
// served from the data cache on repeat visits — zero DB queries.
export const revalidate = 60
export const dynamicParams = true

// ── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string; city: string; slug: string }>
}): Promise<Metadata> {
  const { companySlug: industry, city, slug } = await params
  const { business } = await getPublicBusinessByUrl(industry, city, slug)

  if (!business) {
    // No business found — render a friendly in-page message instead of the
    // generic 404. Mark as noindex so Google doesn't index dead listings,
    // and give the page a useful title that reflects what the visitor was
    // looking for (industry + city).
    const resolved = resolveIndustryFromAnySlug(industry)
    const industryLabel = resolved
      ? (getIndustryDisplayName(resolved) || prettifySlug(industry))
      : prettifySlug(industry)
    const cityLabel = prettifySlug(city)
    return {
      title: `${industryLabel} not found in ${cityLabel} — Fieseros Marketplace`,
      description: `We couldn't find a ${industryLabel.toLowerCase()} business at this listing. Browse other ${industryLabel.toLowerCase()} providers in ${cityLabel} or claim your free listing on Fieseros.`,
      robots: { index: false, follow: true },
    }
  }

  const title =
    business.seoTitle ||
    `${business.name} — ${business.industry || 'Service'} in ${business.city || 'Your Area'} | Fieseros`
  const description =
    business.seoDescription ||
    business.tagline ||
    business.description?.slice(0, 155) ||
    `Book ${business.name} online. ${business.industry || 'Service'} business in ${business.city || 'your area'}.`

  const canonical = business.canonicalUrl
  const ogImage = business.coverImage || business.logo || undefined

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Fieseros',
      type: 'website',
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    // Auto-index rule: 3-tier profile scoring (anti-template-spinning).
    //   Tier A (Rich)   → index, follow
    //   Tier B (Medium) → index, follow
    //   Tier C (Thin)   → noindex, follow (discoverable via internal links
    //                     but not indexed until the owner claims + enriches
    //                     the profile — prevents 100K thin pages from
    //                     hitting Google's index at once).
    // The `isIndexable` flag is derived from the tier (A/B → true, C → false).
    // Tier C uses `follow: true` (not `false`) so link equity still flows
    // to claimed/verified peer businesses via the Similar Businesses section.
    robots: business.isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  }
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PublicBusinessHubPage({
  params,
}: {
  params: Promise<{ companySlug: string; city: string; slug: string }>
}) {
  const { companySlug: industry, city, slug } = await params

  // ── Singular → Plural canonical redirect ───────────────────────────────
  // The canonical URL scheme is now /{pluralIndustry}/{city}/{slug} (e.g.
  // /plumbers/london/abc-plumbing). Legacy singular URLs (e.g.
  // /plumber/london/abc-plumbing) are 301-redirected to the plural form so
  // link equity consolidates onto a single canonical URL per business.
  //
  // We try pluralSlugToIndustry first (the canonical form). If that fails we
  // try singularSlugToIndustry (the legacy form) — when a singular slug is
  // detected we permanentRedirect() to the plural URL and never reach the
  // rest of the page. Unknown industry slugs fall through to the existing
  // lookup-by-slug path below (the existing getPublicBusinessByUrl redirect
  // logic handles canonicalization for those).
  //
  // NOTE: permanentRedirect() throws a NEXT_REDIRECT error internally — must
  // NOT be wrapped in try/catch.
  const resolvedIndustryId = resolveIndustryFromAnySlug(industry)
  if (resolvedIndustryId) {
    const pluralSlug = mapIndustryToPluralSlug(resolvedIndustryId)
    if (pluralSlug && industry !== pluralSlug) {
      permanentRedirect(`/${pluralSlug}/${city}/${slug}`)
    }
  }

  const { business, needsRedirect, canonicalUrl } = await getPublicBusinessByUrl(industry, city, slug)

  // 301 redirect to canonical URL when segments don't match the DB.
  // Use a RELATIVE path (strip the origin) so the redirect works on any
  // domain — localhost in dev, fieseros.com in prod, or a custom domain.
  // NOTE: permanentRedirect() throws a NEXT_REDIRECT error internally, so we
  // must NOT wrap it in try/catch (the catch would intercept the redirect).
  if (needsRedirect && canonicalUrl) {
    let redirectPath = canonicalUrl
    try {
      redirectPath = new URL(canonicalUrl).pathname
    } catch {
      // canonicalUrl is already a relative path — use as-is
    }
    permanentRedirect(redirectPath)
  }

  if (!business) {
    // HTTP 404 (not a soft 200/noindex) so Google de-indexes cleaned-out
    // listings quickly. The friendly "business not found" UI is rendered by
    // not-found.tsx, which preserves the marketplace shell (header / footer /
    // breadcrumbs) and gives the visitor clear next steps. generateMetadata
    // above already returns robots:noindex for this branch as belt-and-suspenders.
    notFound()
  }

  const cleanPhone = business.phone ? business.phone.replace(/\s*\(\/\)\s*/g, '').trim() : null;

  // Fetch services + reviews + certifications + featured-listing in parallel.
  // Running all four queries concurrently (instead of awaiting services/reviews/
  // certifications first, then featuredMap separately) cuts the total data-fetch
  // window from ~4 sequential round-trips to ~1. For marketplace providers we
  // also fetch certifications + the featured-listing row; non-marketplace
  // businesses resolve those two as empty/absent so no extra query runs.
  const certificationsPromise = business.marketplaceOptIn
    ? getMarketplaceCertifications(business.id)
    : Promise.resolve<PublicCertificationData[]>([])
  const featuredPromise = business.marketplaceOptIn
    ? fetchFeaturedListingsMap([business.id]).catch(() => null)
    : Promise.resolve(null)
  const similarPromise = getSimilarProviders(
    business.id,
    business.industry,
    business.city,
    business.country,
    6,
  ).catch(() => [])
  const [servicesRaw, reviewsRaw, certificationsRaw, featuredMap, similarProvidersRaw, publicBranding] = await Promise.all([
    getPublicServices(business.id),
    getPublicReviews(business.id, 10),
    certificationsPromise,
    featuredPromise,
    similarPromise,
    // Resolve white-label flag so we can hide the "Powered by Fieseros" promo
    // card entirely when the tenant paid for white-label. Fail-open (returns
    // false on error → promo is shown, which is the safe default).
    loadTenantPublicBranding(business.id),
  ])
  const services = Array.isArray(servicesRaw) ? servicesRaw : []
  const reviews = Array.isArray(reviewsRaw) ? reviewsRaw : []
  const certifications = Array.isArray(certificationsRaw) ? certificationsRaw : []
  const similarProviders = Array.isArray(similarProvidersRaw) ? similarProvidersRaw : []
  // When true, the tenant's plan allows white-label AND they've enabled it.
  // The public business hub MUST NOT show any Fieseros branding in this case.
  const hideFieserosBranding = publicBranding.hideFieserosBranding

  // ── Compute the marketplace card type for this business ──────────────────
  // Determines whether the detail page renders the full booking panel
  // (Book Now + Request Quote) or a minimal "Call Now" CTA.
  //   • 'featured' / 'normal-full' → full MarketplaceBookingPanel
  //   • 'normal-minimal'           → Call Now CTA only (no booking, no quote)
  //
  // Seed data (claimed=false), expired trials, and unsubscribed providers
  // all render as 'normal-minimal' — matching the marketplace browse grid
  // treatment. This keeps the detail page consistent with the browse card.
  let cardType: MarketplaceCardType = 'normal-minimal'
  if (business.marketplaceOptIn) {
    try {
      cardType = computeCardType(
        {
          claimed: business.claimed,
          plan: business.plan,
          planStatus: business.planStatus,
          trialEndsAt: business.trialEndsAt,
        },
        featuredMap ? featuredMap.has(business.id) : false,
      )
    } catch {
      // If the FeaturedListing lookup fails, fall back to a plan-only check
      // (claimed + valid subscription → normal-full, else normal-minimal).
      cardType = computeCardType(
        {
          claimed: business.claimed,
          plan: business.plan,
          planStatus: business.planStatus,
          trialEndsAt: business.trialEndsAt,
        },
        false,
      )
    }
  }
  const isMinimalListing = cardType === 'normal-minimal'

  // ── Similar Businesses subtitle (Fix A + B) ──────────────────────────────
  // Sub-industry aware: a Window Cleaning business shows "Other Window Cleaning
  // providers" instead of "Other Cleaning providers". getSimilarProviders has
  // a 2-tier fallback:
  //   Tier 1: same industry + same city
  //   Tier 2: same industry + same country (any city)
  // The subtitle must reflect WHICH tier the results came from so it's not
  // misleading.
  //
  // matchTier is derived from the results: if every provider shares the
  // current business's city, it's tier 1; otherwise tier 2.
  const industryDisplayName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )
  const allSameCity = similarProviders.length > 0 &&
    similarProviders.every((p) => p.city === business.city)
  const similarSubtitle = allSameCity
    ? `Other ${industryDisplayName} providers in ${business.city || 'your area'}`
    : `More ${industryDisplayName} providers across ${countryNameFromCode(business.country)}`
  const browseIndustryHref = resolvedIndustryId
    ? `/${mapIndustryToPluralSlug(resolvedIndustryId)}`
    : '/marketplace'

  // Note: auth state is no longer fetched server-side. The ClaimBusinessBanner
  // component reads auth state from the shared Zustand store (hydrated by
  // MarketplaceHeader on mount via /api/auth/me). This lets the page stay
  // statically renderable + cached (no cookies/headers access at render
  // time). The banner renders `null` while auth state is still loading and
  // once hydrated, decides whether to show itself based on the tenant.id
  // match. Logged-in owners never see the banner; anonymous visitors and
  // authenticated non-owners see the appropriate variant.

  // Parse JSON fields safely.
  const gallery: Array<{ url?: string; caption?: string }> = safeJson(business.galleryJson, [])
  const faqs: FaqItem[] = safeJson(business.faqsJson, [])
  const serviceAreas: string[] = safeJson(business.serviceAreasJson, [])
  const socialLinks: Record<string, string> = safeJson(business.socialLinksJson, {})
  const businessHours: Record<string, { open?: string; close?: string }> = safeJson(business.businessHoursJson, {})

  // NOTE: rating-breakdown buckets were removed per Google Maps ToS §3.2.4
  // (the summary box that used them displayed Google's rating/reviewCount).

  // Build structured data.
  const localBusinessReviews: LocalBusinessReview[] = reviews.map((r) => ({
    authorName: r.authorName || 'Verified Customer',
    rating: r.rating,
    comment: r.comment || undefined,
    datePublished: new Date(r.createdAt).toISOString().split('T')[0],
    url: undefined,
  }))

  const openingHours: LocalBusinessHours[] = buildOpeningHours(businessHours)

  const localBusinessSchema = getLocalBusinessSchema({
    name: business.name,
    description: business.description || business.tagline || `${business.name} — ${business.industry || 'service business'} in ${business.city || 'your area'}.`,
    url: business.canonicalUrl,
    slug: business.slug,
    industry: business.industry,
    phone: business.phone || undefined,
    address: business.address || undefined,
    city: business.city || undefined,
    state: business.state || undefined,
    country: business.country,
    logo: business.logo || undefined,
    coverImage: business.coverImage || undefined,
    // rating + reviewCount removed from schema per Google Maps ToS §3.2.4 —
    // these fields originated from Google Places API and cannot be surfaced
    // (even in structured data). Customer reviews from our own Review table
    // are still passed via `reviews` below.
    reviews: localBusinessReviews,
    openingHours: openingHours.length > 0 ? openingHours : undefined,
    sameAs: Object.values(socialLinks).filter(Boolean),
  })

  // ── FAQ schema (claimed listings only) ──────────────────────────────────
  // Google's FAQ rich-result eligibility is now restricted (March 2023
  // algorithm update — FAQ rich results only show for "authoritative
  // government and health websites"). Emitting FAQ JSON-LD on every page
  // (including 100K unclaimed seed listings) adds schema noise without
  // rich-result upside, and risks Google treating the site as
  // schema-spammy.
  //
  // Policy: emit FAQ JSON-LD ONLY when the listing is claimed by a real
  // business owner. Claimed listings have business-authored FAQs (real
  // content) + the platform FAQs are contextually appropriate. Unclaimed
  // listings still render the platform FAQs visibly (useful for users +
  // long-tail SEO text) but without the JSON-LD schema.
  //
  // Sub-industry aware: a Window Cleaning business gets window-cleaning FAQs.
  const platformFaqsForSchema = getIndustryPlatformFaqs(
    business.industry,
    business.city,
    business.name,
    business.tagline,
  )
  const allFaqsForSchema: FaqItem[] = business.claimed
    ? [
        ...faqs,
        ...platformFaqsForSchema.map((f) => ({ question: f.question, answer: f.answer })),
      ]
    : []
  const faqSchema = allFaqsForSchema.length > 0 ? getFaqSchema(allFaqsForSchema) : null

  const serviceSchemas = services.slice(0, 5).map((s) =>
    getServiceSchema({
      name: s.name,
      description: s.longDescription || s.description || `${s.name} by ${business.name}`,
      url: business.canonicalUrl,
      providerName: business.name,
      providerUrl: business.canonicalUrl,
      serviceType: s.name,
      areaServed: serviceAreas.length > 0 ? serviceAreas : (business.city ? [business.city] : undefined),
      offers: s.basePrice > 0
        ? { price: String(s.basePrice), priceCurrency: business.currency, description: `Starting at ${business.currency} ${s.basePrice}` }
        : undefined,
    }),
  )

  const allSchema: object[] = [localBusinessSchema, ...serviceSchemas]
  if (faqSchema) allSchema.push(faqSchema)

  // Note: breadcrumb schema is injected by the <Breadcrumbs> component itself.
  // The visible <Link> items use RELATIVE URLs so they work on any host
  // (localhost / fieseros.com / custom domains). The JSON-LD schema is
  // absolutized by `getBreadcrumbSchema` in @/lib/seo/schemas.ts using the
  // canonical `https://fieseros.com` origin — Google requires absolute URLs
  // for rich results, but visible links should stay relative.
  //
  // Home → /marketplace (NOT /): this page is part of the marketplace
  // surface, so "Home" should land the user on the marketplace browse page,
  // not the marketing landing page.
  //
  // Industry and City now link to the new plural browse routes:
  //   • Industry → /{pluralIndustry}            (e.g. /plumbers)
  //   • City     → /{pluralIndustry}/{citySlug} (e.g. /plumbers/london)
  // Both routes are SEO-indexable + render a filtered marketplace grid.
  const pluralIndustrySlug = mapIndustryToPluralSlug(business.industry)
  const industryBrowseUrl = `/${pluralIndustrySlug}`
  const cityBrowseUrl = `/${pluralIndustrySlug}/${business.cityUrlSlug}`
  // ── Back-link targets /marketplace WITHOUT city/country params ────────
  // Previously this passed the business's city + country as URL params, which
  // forcibly re-applied a city filter even when the user had explicitly
  // cleared it (Issue #2 filter persistence bug). Now we link to a plain
  // /marketplace and let the Zustand persist middleware (localStorage key
  // 'marketplace-filters') restore the user's actual filter state — including
  // the cleared city. The country is still auto-detected via GeoIP on mount
  // by MarketplaceBrowser, so country scoping is preserved.
  const marketplaceBackUrl = '/marketplace'
  // SEO FIX (option b): correct breadcrumb hierarchy — Home → Marketplace →
  // Industry → City → Business. Previously the first item was labeled "Home"
  // but pointed to /marketplace, which was semantically wrong (and a UX
  // mismatch with the rest of the site where "Home" = "/"). Now we render
  // BOTH "Home" (/) and "Marketplace" (/marketplace) as distinct steps, so
  // the trail matches Google's expectation of a strict page hierarchy and
  // every `item` URL in the BreadcrumbList JSON-LD is distinct.
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Marketplace', url: marketplaceBackUrl },
    { name: business.industry || 'Service', url: industryBrowseUrl },
    { name: business.city || 'Area', url: cityBrowseUrl },
    { name: business.name, url: business.canonicalUrl },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <StructuredData data={allSchema} />
      {/* Anonymous impression tracking — populates the superadmin marketplace
          funnel widget. Fire-and-forget, no PII, no cookies. Only mounted
          when the tenant is NOT white-labeled (white-label tenants don't
          contribute to the Fieseros acquisition funnel). */}
      {!hideFieserosBranding && <ImpressionTracker slug={business.slug} />}
      <MarketplaceHeader />

      {/* NOTE: This page does NOT use id="main-content" — the browse page
          (/marketplace) uses that ID for its scrollable list container.
          Having the same ID on both pages caused a race condition in the
          scroll-restoration logic (getElementById could return either
          element during React's unmount/mount transition). The detail
          page's window scrolls naturally (no overflow-y-auto container),
          so it doesn't need the ID. */}
      <main className="flex-1">
        {/* Breadcrumb bar */}
        <div className="border-b bg-muted/20">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        </div>

        {/* Hero — passes business data; HeroActions renders Call/Website/Directions
            buttons for unclaimed listings only (claimed listings get the full
            booking panel in the right sidebar). */}
        <PublicBusinessHero business={business} services={services.length} backHref={marketplaceBackUrl} />

        {/* Compact trust badges — replaces the always-4-badge strip. Shows a
            single "Not yet verified" summary when <3 badges confirmed (the
            common case for unclaimed/seed listings); shows the full 4-badge
            strip when ≥3 confirmed (claimed + verified businesses). */}
        <CompactTrustBadges business={business} />

        {/* Mobile contact card — compact Call/Website/Directions/Email row
            shown under the hero on mobile only. Desktop keeps the right
            sidebar with full Business Information. Solves the problem of
            Business Information being buried below all evergreen sections
            on mobile. */}
        <MobileContactCard business={business} />

        {/* Main content grid */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: content sections.

                NARRATIVE ORDER (after adding evergreen blocks):
                  1. QuickFacts            — always (at-a-glance stats)
                  2. About {business.name}  — always (FACTS first: real
                                             description or honest Tier-2
                                             rewrite + Claim CTA)
                  3. AboutIndustryInCity   — always (CONTEXT: SEO paragraph
                                             about the industry in this city,
                                             ends with a business-specific
                                             bridge sentence)
                  4. Services              — conditional, marketplace-only
                  5. Gallery               — conditional
                  6. ServiceAreaMap        — always (map + service-area chips)
                  7. HiringChecklist       — always (industry-specific guide)
                  8. HowBookingWorks       — always (3-step flow)
                  9. Certifications        — conditional, marketplace-only
                 10. Reviews               — conditional
                 11. Business FAQs         — conditional (business-authored)
                 12. PlatformFaqs          — always (platform-level FAQs)
                 13. TrustVerification     — always (explains the 4 badges)
                 14. CRM CTA               — conditional, unclaimed only

                The 7 evergreen sections (1, 2, 3, 6, 7, 8, 12, 13) ensure the
                page has genuine content depth for EVERY listing — claimed or
                not, marketplace or not. Prevents Google from treating thin
                listings as low-quality content.

                SEO LAYERING (consultant model):
                  Layer 1 FACTS     → QuickFacts + About {business}
                  Layer 2 CONTEXT   → AboutIndustryInCity (industry + city
                                      + location-context variation sentence)
                  Layer 3 DISCOVERY → Similar Businesses + ExploreCategoryInCity
                                      (sub-category + view-all internal links) */}
            <div className="lg:col-span-2 space-y-12">
              {/* 1. Quick Facts — always present */}
              <QuickFacts
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* 2. About {business.name} — Tier 1 (genuine description) or
                  Tier 2 (honest rewrite + Claim CTA for templated/empty).
                  FACTS FIRST: this is the business-specific layer (Layer 1).
                  Renders before the industry/city context so visitors (and
                  search engines) see what we actually KNOW about this
                  business before reading category/location context. */}
              <AboutBusiness
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* 3. About {Industry} services in {City} — always present (SEO).
                  CONTEXT LAYER (Layer 2): category + location content. The
                  paragraph is industry+city scoped; a business-specific
                  bridge sentence is appended so the section connects the
                  category context to this specific listing. A location-
                  context variation sentence (climate + foundation type +
                  licensing body) is woven in to break the city-name-swap
                  template-spinning pattern at 100K-listing scale. */}
              <AboutIndustryInCity
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* Services — hidden for minimal listings (seed data / expired
                  trials) to keep the detail page consistent with the browse
                  grid's "normal-minimal" card, which shows no services. */}
              {services.length > 0 && !isMinimalListing && (
                <section id="services" aria-labelledby="services-heading">
                  <h2 id="services-heading" className="text-2xl font-bold tracking-tight mb-4">
                    Services Offered
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((s) => (
                      <ServiceCard
                        key={s.id}
                        service={s}
                        currency={business.currency}
                        services={services}
                        providerTenantId={business.id}
                        providerName={business.name}
                        marketplaceOptIn={business.marketplaceOptIn}
                        isMinimalListing={isMinimalListing}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Gallery */}
              {gallery.length > 0 && (
                <section id="gallery" aria-labelledby="gallery-heading">
                  <h2 id="gallery-heading" className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-emerald-700" />
                    Gallery
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.slice(0, 9).map((img, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                        {img.url ? (
                          <SafeImage
                            src={img.url}
                            alt={img.caption || `${business.name} project ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading={i < 3 ? 'eager' : 'lazy'}
                            // Square gallery thumbnails — 400px is plenty for
                            // the 3-up grid on desktop. Supabase transforms
                            // resize on the server, saving 80–95% bandwidth.
                            maxWidth={400}
                            maxHeight={400}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Camera className="h-8 w-8" />
                          </div>
                        )}
                        {img.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
                            {img.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 6. Service Area + Map — always present.
                  Renders service-area chips + a Google Maps embed of the
                  business's address (or city center if no address). Uses
                  the ?output=embed URL pattern — no Google Maps API key
                  required. Subsumes the old inline Areas Served chips. */}
              <ServiceAreaMap
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* 7. Common Services — always present.
                  Generic category-level service cards clearly labeled
                  "Common services in this category — not necessarily offered
                  by this business". Sub-industry aware (window cleaning,
                  carpet cleaning, etc.).

                  BUSINESS VERIFIED TAGS: when the business's real services
                  list contains a fuzzy match for a common-service name,
                  that card shows a "Business Verified" badge. This wires
                  the 3-state verification roadmap (Publicly reported →
                  Business claimed → Fieseros verified) without claiming
                  the business offers services it doesn't. */}
              <CommonServices
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
                businessServices={services}
              />

              {/* 8. Hiring Checklist — always present (compact).
                  Industry-specific 4-6 item guide, rendered as a single
                  compact card with checkmark lines (~1/3 the height of the
                  previous 5-card vertical list). Sub-industry aware. */}
              <HiringChecklist
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* 9. How Booking/Contacting Works — always present.
                  3-step visual explainer. Title + steps adapt to listing type:
                    • Unclaimed → "How contacting this business works"
                    • Claimed   → "How booking with {name} works"
                  Previously the unclaimed flow said "Browse their services"
                  which was misleading (unclaimed businesses typically have
                  no services listed). */}
              <HowBookingWorks
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* 9. Certifications — marketplace providers only */}
              {business.marketplaceOptIn && certifications.length > 0 ? (
                <section id="certifications" aria-labelledby="cert-heading">
                  <h2 id="cert-heading" className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-700" />
                    Certifications &amp; Licences
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {certifications.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 rounded-lg border bg-card p-3">
                        {c.isVerified ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.issuer ?? 'Issued'}
                            {c.issueDate ? ` · ${new Date(c.issueDate).getFullYear()}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Reviews */}
              {reviews.length > 0 && (
                <section id="reviews" aria-labelledby="reviews-heading">
                  <div className="flex items-center justify-between mb-4">
                    <h2 id="reviews-heading" className="text-2xl font-bold tracking-tight">
                      Customer Reviews ({reviews.length})
                    </h2>
                  </div>

                  {/* Rating summary box removed per Google Maps ToS §3.2.4.
                      The big rating number + review count came from Google
                      Places API (business.rating / business.reviewCount) and
                      cannot be surfaced in user-visible UI. The individual
                      customer reviews below are from our own Review table
                      (genuine customer feedback) and remain intact. */}

                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <ReviewCard key={r.id} review={r} />
                    ))}
                  </div>
                </section>
              )}

              {/* FAQs */}
              {faqs.length > 0 && (
                <section id="faqs" aria-labelledby="faqs-heading">
                  <h2 id="faqs-heading" className="text-2xl font-bold tracking-tight mb-4">
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-2">
                    {faqs.map((f, i) => (
                      <details key={i} className="group rounded-lg border bg-card text-card-foreground overflow-hidden">
                        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent transition-colors">
                          <span>{f.question}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
                        </summary>
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none px-4 pb-4 pt-0 prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground"
                          dangerouslySetInnerHTML={{ __html: f.answer }}
                        />
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {/* 12. Platform FAQs — always present.
                  3 platform-level FAQs about hiring this industry in this
                  city. Renders BELOW the business-authored FAQs above (if
                  any). Always present so every detail page is eligible for
                  FAQ rich results in Google Search. */}
              <PlatformFaqsSection
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* 13. Trust & Verification — always present.
                  Explains what each of the 4 Fieseros verification badges
                  means (Identity / Business / Insured / Licensed). Builds
                  trust even on unclaimed listings by showing that Fieseros
                  has a real verification process. */}
              <TrustVerification
                business={business}
                serviceAreas={serviceAreas}
                isMinimalListing={isMinimalListing}
              />

              {/* ── Contextual CRM CTA — marketplace → CRM bridge ──────────────────
                  Shown ONLY on unclaimed business pages (business.claimed === false).
                  This is the strategic funnel: a business owner Googling
                  "plumber in New York" → lands on this page → sees "Run your
                  plumbing business with Fieseros" → clicks through to
                  /plumbing-software → signs up for the CRM.

                  The CTA is dynamically keyed off business.industry so it
                  always links to the most relevant CRM landing page. Falls
                  back to /field-service-software for industries without a
                  dedicated page.

                  For claimed businesses, the CTA is suppressed — they've
                  already claimed their listing and are either already a CRM
                  customer or will be upsold via in-app flows.

                  The "Claim this business" button opens the ClaimBusinessModal
                  (if authenticated) or a sign-in gate (if anonymous) — NOT a
                  dead #book scroll link.

                  id="claim-cta" is the anchor target for the "Claim this
                  business" button in the AboutBusiness section (Tier 2
                  rewrite) so the CTA scrolls into view when clicked.
              */}
              {!business.claimed && (
                <div id="claim-cta">
                  <CrmCtaSection
                    tenantId={business.id}
                    tenantName={business.name}
                    tenantEmail={business.email}
                    tenantCity={business.city}
                    tenantState={business.state}
                    softwareUrl={getIndustrySoftwareUrl(business.industry)}
                    softwareLabel={getIndustrySoftwareLabel(business.industry)}
                    industryName={getIndustryDisplayName(business.industry)}
                  />
                </div>
              )}
            </div>

            {/* Right: sticky CTA card + contact info */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-20 space-y-4">
                {/* Claim / Verified-owner banner — shown to ALL non-owner
                    visitors. Unclaimed listings show a "Claim this business"
                    CTA; claimed listings show a "✓ Verified owner" notice.
                    Anonymous visitors get a sign-in gate when they click.
                    Auth state is resolved client-side via the shared Zustand
                    store (hydrated by MarketplaceHeader on mount) — the banner
                    renders `null` until auth state is known, then shows itself
                    for non-owners. */}
                <ClaimBusinessBanner
                  tenantId={business.id}
                  tenantName={business.name}
                  tenantEmail={business.email}
                  tenantCity={business.city}
                  tenantState={business.state}
                  isClaimed={!!business.claimed}
                />

                {/* Booking CTA — rendering modes, kept consistent with
                    the marketplace browse grid's computeCardType() output:
                      • 'featured' / 'normal-full' (marketplaceOptIn && !isMinimalListing)
                        → full MarketplaceBookingPanel (Book Now + Request Quote)
                      • 'normal-minimal' (marketplaceOptIn && isMinimalListing)
                        → EMAIL-GATED for unclaimed providers:
                          - unclaimed + has email → UnclaimedQuotePanel
                            (stores JobRequest + emails the provider)
                          - unclaimed + no email → minimal "Call Now" CTA only
                          - claimed + minimal → minimal "Call Now" CTA (expired trial etc.)
                      • Non-marketplace businesses (marketplaceOptIn=false)
                        → lightweight PublicBookingForm (creates a Lead).
                    This keeps the detail page treatment consistent with the
                    browse card so users don't see a "Book Now" button on a
                    listing whose browse card only shows "Call Now". */}
                <div id="book" className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                  {business.marketplaceOptIn && !isMinimalListing ? (
                    <MarketplaceBookingPanel
                      providerTenantId={business.id}
                      providerName={business.name}
                      providerPhone={business.phone}
                      currency={business.currency}
                      services={services.map((s) => ({
                        id: s.id,
                        name: s.name,
                        slug: s.slug,
                        basePrice: s.basePrice,
                        duration: s.duration,
                        image: s.image,
                        description: s.description,
                        longDescription: s.longDescription,
                        category: s.category,
                      }))}
                      industry={business.industry}
                      city={business.city}
                      emergencyServiceAvailable={business.emergencyServiceAvailable}
                    />
                  ) : business.marketplaceOptIn && isMinimalListing && !business.claimed && business.email ? (
                    /* Unclaimed provider WITH email → show Request Quote panel.
                       The panel opens QuoteRequestDialog in DIRECT mode, which
                       creates a JobRequest tied to this provider and emails
                       them the customer's contact details. */
                    <UnclaimedQuotePanel
                      providerTenantId={business.id}
                      providerName={business.name}
                      providerPhone={business.phone}
                      providerIndustry={business.industry}
                      providerCity={business.city}
                    />
                  ) : business.marketplaceOptIn && isMinimalListing ? (
                    /* Minimal CTA for seed data / expired trials — Call Now
                       only, no booking, no quote. Matches the browse grid's
                       "normal-minimal" card treatment. */
                    <>
                      <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-5 text-white">
                        <div className="mb-1 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <h3 className="text-lg font-bold">Call to Book</h3>
                        </div>
                        <p className="text-sm text-slate-100">
                          {business.claimed
                            ? 'This business is not currently accepting online bookings. Please call to schedule a visit.'
                            : 'This listing is unclaimed. Call the business directly to inquire about services.'}
                        </p>
                      </div>
                      <div className="p-5">
                        {cleanPhone ? (
                          <a
                            href={`tel:${cleanPhone.replace(/[^+\d]/g, '')}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                          >
                            <Phone className="h-5 w-5" />
                            Call {cleanPhone}
                          </a>
                        ) : (
                          <p className="text-center text-sm text-muted-foreground">
                            No phone number available for this listing.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-gradient-to-br from-emerald-700 to-teal-700 p-5 text-white">
                        <h3 className="text-lg font-bold mb-1">Book a Service</h3>
                        <p className="text-sm text-emerald-50">
                          Get a free quote or schedule a visit in under 2 minutes.
                        </p>
                      </div>
                      <div className="p-5">
                        <PublicBookingForm business={business} services={services} />
                      </div>
                    </>
                  )}

                  {/* Call button — available to all businesses with a phone. */}
                  {cleanPhone ? (
                    <div className="border-t px-5 py-3">
                      <a
                        href={`tel:${cleanPhone.replace(/[^+\d]/g, '')}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        Call {business.name}
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* Business info */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Business Information</h3>

                  {(() => {
                    const displayAddress = formatAddressForDisplay(business.address)
                    return displayAddress ? (
                      <InfoRow icon={MapPin} label="Address" value={displayAddress} />
                    ) : null
                  })()}
                  {business.city && (
                    <InfoRow icon={MapPin} label="City" value={`${business.city}${business.state ? `, ${business.state}` : ''}`} />
                  )}
                  {cleanPhone && (
                    <InfoRow icon={Phone} label="Phone" value={cleanPhone} href={`tel:${cleanPhone.replace(/[^+\d]/g, '')}`} />
                  )}

                  {business.email && (
                    <InfoRow
                      icon={Mail}
                      label="Email"
                      value={business.email}
                      href={`mailto:${business.email}`}
                    />
                  )}
                  {business.website && (
                    <InfoRow
                      icon={Globe}
                      label="Website"
                      value={(() => {
                        try {
                          const u = new URL(business.website)
                          return u.hostname.replace(/^www\./, '') + (u.pathname && u.pathname !== '/' ? u.pathname : '')
                        } catch {
                          return business.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
                        }
                      })()}
                      href={business.website}
                      external
                    />
                  )}
                  {(() => {
                    const displayAddress = formatAddressForDisplay(business.address)
                    if (!displayAddress) return null
                    // Google Maps directions URL — opens native maps on mobile.
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      `${displayAddress}, ${business.city || ''}, ${business.state || ''} ${business.country || ''}`.trim(),
                    )}`
                    return (
                      <InfoRow icon={Navigation} label="Directions" value="Get directions" href={mapsUrl} />
                    )
                  })()}
                  {openingHours.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
                        <Clock className="h-3.5 w-3.5 text-emerald-700" />
                        Business Hours
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {openingHours.map((h, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{h.days.join(', ')}</span>
                            <span>{h.opens} – {h.closes}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social links */}
                  {Object.values(socialLinks).filter(Boolean).length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs font-semibold text-foreground mb-2">Follow Us</div>
                      <div className="flex gap-2">
                        {socialLinks.facebook && <SocialIcon href={socialLinks.facebook} icon={Facebook} label="Facebook" />}
                        {socialLinks.instagram && <SocialIcon href={socialLinks.instagram} icon={Instagram} label="Instagram" />}
                        {socialLinks.twitter && <SocialIcon href={socialLinks.twitter} icon={Twitter} label="Twitter" />}
                        {socialLinks.linkedin && <SocialIcon href={socialLinks.linkedin} icon={Linkedin} label="LinkedIn" />}
                        {socialLinks.youtube && <SocialIcon href={socialLinks.youtube} icon={Youtube} label="YouTube" />}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Powered by Fieseros promo card ───────────────────────────
                    A small premium card (not a footer advertisement) that
                    positions Fieseros as the technology powering the business.
                    Hidden entirely when the tenant has white-label enabled
                    (paid feature + tenant.whiteLabelJson.hideFieserosBranding=true).
                    Per review direction: "The tenant's business must remain
                    the hero. Fieseros should feel like the technology powering
                    a better business experience."

                    For CLAIMED businesses, showServicesCta adds a subtle
                    "Want a website like this? →" link (Phase 4 cross-sell). */}
                {!hideFieserosBranding && (
                  <FieserosPromoCard showServicesCta={business.claimed} />
                )}
              </div>
            </div>
          </div>

          {/* ── Similar Businesses (full-width, Fix D) ─────────────────────────
              Moved OUT of the left 2/3 column to full page width so the cards
              get more horizontal room (3-up on desktop instead of 2-up in a
              narrow column). The subtitle is contextual (Fix A + B):
                • Tier 1 (same city):  "Other HVAC providers in Wallasey"
                • Tier 2 (country):    "More HVAC providers across United Kingdom" */}
          {similarProviders.length > 0 && (
            <section id="similar" aria-labelledby="similar-heading" className="mt-12 lg:mt-16 pt-12 lg:pt-16 border-t">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
                <div>
                  <h2 id="similar-heading" className="text-2xl font-bold tracking-tight">
                    Similar Businesses
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {similarSubtitle}
                  </p>
                </div>
                <Link
                  href={browseIndustryHref}
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1 shrink-0"
                >
                  View all {industryDisplayName}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarProviders.map((p) => (
                  <SimilarBusinessCard key={p.id} business={p} />
                ))}
              </div>
            </section>
          )}

          {/* ── Explore {Industry} in {City} — DISCOVERY LAYER (Layer 3) ───────
              Internal-linking hub: sub-category links (derived from the
              CommonServices list) + a "View all {industry} businesses in
              {city}" CTA pointing to the /{pluralSlug}/{city} browse page.

              This is the marketplace topical architecture signal — it tells
              Google how this business page relates to its category, its
              location, and the broader marketplace. Each sub-category link
              is a real URL (/{pluralSlug}/{city}?service=...); the view-all
              link goes to the existing /{pluralSlug}/{city} page.

              Renders always (even when similarProviders is empty) because
              the internal-linking value is independent of peer listings. */}
          <ExploreCategoryInCity
            business={business}
            serviceAreas={serviceAreas}
            isMinimalListing={isMinimalListing}
          />
        </div>
      </main>

      <CornerstoneFooter />

      {/* Spacer for the mobile sticky CTA bar. The CTA is `fixed bottom-0`
          with a height of ~64px (44px button + 8px top/bottom padding). On
          mobile, this 64px would overlap the bottom of the footer when the
          user scrolls to the very end. The spacer reserves that space so the
          footer stays fully visible above the CTA. Hidden on lg+ where the
          CTA itself is hidden (desktop uses the right-column booking panel
          instead). */}
      <div className="h-16 lg:hidden" aria-hidden />

      {/* Visitor-facing live chat widget */}
      <ChatWidget businessSlug={business.slug} businessName={business.name} />

      {/* Sticky mobile CTA bar (P1 issue #30). Renders Call Now + Book Now
          buttons fixed to the bottom of the viewport on mobile only. Hides
          automatically when the booking panel (#book) scrolls into view so
          the CTA isn't duplicated. Desktop doesn't render this (the
          MarketplaceBookingPanel in the right column is already sticky). */}
      <StickyMobileCta phone={cleanPhone} businessName={business.name} />
    </div>
  )
}

// ── Hero section ────────────────────────────────────────────────────────────

function PublicBusinessHero({
  business,
  services,
  backHref,
}: {
  business: PublicBusinessData
  services: number
  backHref?: string
}) {
  if (!business) return null
  return (
    <section className="border-b bg-gradient-to-b from-emerald-50/60 to-background dark:from-emerald-950/20">
      {/* Cover image removed per user request */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to marketplace — server-rendered Link (Option A) matching the
            blog detail page pattern (src/app/blog/[slug]/page.tsx:102-109).
            Placed at the top of the hero so it's the first interactive element
            users see. Uses ArrowLeft icon + muted text that turns emerald on
            hover. The breadcrumb bar above already links to /marketplace (and
            to industry/city browse pages), but this prominent button is more
            discoverable than the small muted breadcrumb text. */}
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
        )}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Logo — hidden entirely when null (the flex container's
              `items-start sm:items-center` keeps the h1 vertically centered
              without it). SafeImage hides the <img> on load error so a stale
              logo URL doesn't render a broken-image icon. */}
          {business.logo && (
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-muted shrink-0 border">
              <SafeImage
                src={business.logo}
                alt={`${business.name} logo`}
                className="w-full h-full object-cover"
                // Logo is rendered at 64–80px. 200×200 gives retina screens
                // a crisp 2x source without over-fetching.
                maxWidth={200}
                maxHeight={200}
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                {business.name}
              </h1>
              {/* Google rating removed per Maps ToS §3.2.4 — rating/reviewCount
                  on Tenant originated from Google Places API and cannot be
                  surfaced in user-visible UI. Customer reviews (from our own
                  Review table) are still shown in the Reviews section below. */}
            </div>
            {business.tagline && (
              <p className="text-base text-muted-foreground mb-2">{business.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {business.industry && (
                <span className="inline-flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {getResolvedIndustryDisplayName(business.industry, business.name, business.tagline)}
                </span>
              )}
              {business.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {business.city}{business.state ? `, ${business.state}` : ''}
                </span>
              )}
              {services > 0 && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  {services} service{services !== 1 ? 's' : ''}
                </span>
              )}
              {!business.claimed && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <ShieldCheck className="h-3 w-3" />
                  Unclaimed
                </span>
              )}
            </div>
            {/* Action buttons — rendered for unclaimed listings only. Claimed
                marketplace listings get the full booking panel in the right
                sidebar, so hero actions would be redundant. */}
            <HeroActions business={business} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Service card ────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  currency,
  services,
  providerTenantId,
  providerName,
  marketplaceOptIn,
  isMinimalListing,
}: {
  service: PublicServiceData
  currency: string
  services: PublicServiceData[]
  providerTenantId: string
  providerName: string
  marketplaceOptIn: boolean
  isMinimalListing: boolean
}) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground overflow-hidden hover:shadow-md transition-shadow">
      {service.image && (
        <div className="h-32 w-full bg-muted overflow-hidden">
          <SafeImage
            src={service.image}
            alt={service.name}
            className="w-full h-full object-cover"
            loading="lazy"
            // Service card thumbnails render at ~400px wide × 128px tall.
            maxWidth={400}
            maxHeight={200}
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
        )}
        <div className="flex items-center justify-between text-sm">
          {service.basePrice > 0 ? (
            <span className="font-semibold text-foreground">
              {currency} {service.basePrice.toFixed(2)}
            </span>
          ) : (
            <span className="text-muted-foreground">Custom quote</span>
          )}
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {service.duration}min
          </span>
        </div>
        {marketplaceOptIn && !isMinimalListing ? (
          <ServiceBookButton
            service={{
              id: service.id,
              name: service.name,
              slug: service.slug,
              basePrice: service.basePrice,
              duration: service.duration,
              image: service.image,
              description: service.description,
            }}
            services={services.map((svc) => ({
              id: svc.id,
              name: svc.name,
              slug: svc.slug,
              basePrice: svc.basePrice,
              duration: svc.duration,
              image: svc.image,
              description: svc.description,
            }))}
            providerTenantId={providerTenantId}
            providerName={providerName}
            currency={currency}
          />
        ) : (
          <a
            href={`#book`}
            className="mt-3 block w-full text-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            Book this service
          </a>
        )}
      </div>
    </div>
  )
}

// ── Review card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
}: {
  review: { id: string; rating: number; comment: string | null; authorName: string | null; source: string; createdAt: Date; responseJson: string }
}) {
  const response: { text?: string; respondedAt?: string } | null = safeJson(review.responseJson, null)
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
              {(review.authorName || 'A')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-foreground text-sm">
                {review.authorName || 'Verified Customer'}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                {review.source !== 'internal' && <span className="ml-1">· via {review.source}</span>}
              </div>
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">{review.comment}</p>
      )}
      {response?.text && (
        <div className="mt-3 pl-3 border-l-2 border-emerald-200 dark:border-emerald-800">
          <div className="text-xs font-semibold text-foreground mb-0.5">Response from business</div>
          <p className="text-sm text-muted-foreground">{response.text}</p>
        </div>
      )}
    </div>
  )
}

// ── Similar business card (Fix C — redesigned) ──────────────────────────────
// Clean, modern card matching the marketplace browse page's design language:
//   • Identity row: avatar (initials) + name + verified badge
//   • Industry • Location line with icons
//   • 2-line tagline
//   • Footer: claim status + "View details" CTA
// No gradient header, no rating (ToS-safe). Avatar uses deterministic pastel
// colors so every provider gets a stable, visually distinct identity.

function buildInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function avatarColors(name: string): { bg: string; text: string } {
  const palettes = [
    { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
    { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
    { bg: 'bg-violet-100 dark:bg-violet-950/60', text: 'text-violet-700 dark:text-violet-300' },
    { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
    { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
    { bg: 'bg-teal-100 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300' },
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return palettes[Math.abs(hash) % palettes.length]
}

function SimilarBusinessCard({ business }: { business: SimilarBusiness }) {
  const initials = buildInitials(business.name)
  const colors = avatarColors(business.name)
  const industryLabel = getIndustryDisplayName(business.industry) || prettifySlug(business.industry || 'service')

  return (
    <Link
      href={business.canonicalUrl}
      className="group flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700"
    >
      {/* Identity row: avatar + name + verified badge */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className={`h-11 w-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${colors.bg} ${colors.text}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {business.name}
            </h3>
            {business.claimed && (
              <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-label="Verified business" />
            )}
          </div>
          {/* Industry • Location */}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground min-w-0">
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="truncate">{industryLabel}</span>
            <span className="text-muted-foreground/40 shrink-0">·</span>
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {business.city || '—'}{business.state ? `, ${business.state}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Tagline */}
      {business.tagline && (
        <p className="px-4 pb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {business.tagline}
        </p>
      )}

      {/* Footer: claim status + View details CTA */}
      <div className="mt-auto flex items-center justify-between pt-3 px-4 pb-4 border-t">
        {business.claimed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Unclaimed
          </span>
        )}
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 group-hover:gap-1.5 transition-all">
          View details
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}

// ── Star rating ─────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-muted text-muted'
          }`}
        />
      ))}
    </div>
  )
}

// ── Info row ────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  external = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
  external?: boolean
}) {
  const content = (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-emerald-700 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground truncate">{value}</div>
      </div>
    </div>
  )
  return href ? (
    <a
      href={href}
      className="block hover:opacity-80 transition-opacity"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
    >
      {content}
    </a>
  ) : (
    content
  )
}

// ── Social icon ─────────────────────────────────────────────────────────────

function SocialIcon({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="h-8 w-8 rounded-full border flex items-center justify-center text-muted-foreground hover:text-emerald-700 hover:border-emerald-700 transition-colors"
    >
      <Icon className="h-4 w-4" />
    </a>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function safeJson<T>(json: string, fallback: T): T {
  try {
    let parsed = typeof json === 'string' ? JSON.parse(json) : json;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // Not double-encoded, keep first parse result
      }
    }
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function buildOpeningHours(
  hours: Record<string, { open?: string; close?: string }>,
): LocalBusinessHours[] {
  const dayMap: Record<string, string[]> = {
    mon: ['Monday'], tue: ['Tuesday'], wed: ['Wednesday'],
    thu: ['Thursday'], fri: ['Friday'], sat: ['Saturday'], sun: ['Sunday'],
    weekday: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    weekend: ['Saturday', 'Sunday'],
  }

  // Group days with identical hours together.
  const byHours: Record<string, string[]> = {}
  for (const [key, val] of Object.entries(hours)) {
    if (!val?.open || !val?.close) continue
    const days = dayMap[key.toLowerCase()] || [key.charAt(0).toUpperCase() + key.slice(1)]
    const hkey = `${val.open}-${val.close}`
    if (!byHours[hkey]) byHours[hkey] = []
    byHours[hkey].push(...days)
  }

  return Object.entries(byHours).map(([hkey, days]) => {
    const [opens, closes] = hkey.split('-')
    return { days, opens, closes }
  })
}

// ── generateStaticParams (empty — fully dynamic) ───────────────────────────
// We deliberately don't pre-render any business pages at build time because
// the set of businesses is dynamic and potentially huge. The page uses
// `dynamic = 'force-dynamic'` (because it calls getAuthUser/cookies) so every
// request is server-rendered on-demand.

export async function generateStaticParams() {
  return []
}

// ── Small string helpers used by generateMetadata ───────────────────────────
function prettifySlug(slug: string): string {
  if (!slug) return ''
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Convert an ISO 3166-1 alpha-2 country code ("US", "GB", "IN") to its
 * English display name ("United States", "United Kingdom", "India").
 * Uses the built-in Intl.DisplayNames API (Node 14+ / all modern browsers).
 * Falls back to the raw code if the API is unavailable or the code is unknown.
 */
function countryNameFromCode(code: string): string {
  if (!code) return 'your country'
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    return names.of(code) || code
  } catch {
    return code
  }
}
