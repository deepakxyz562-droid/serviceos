import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
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
  type LucideIcon,
} from 'lucide-react'

import { StructuredData } from '@/components/seo/structured-data'
import { Breadcrumbs } from '@/components/seo/breadcrumbs'
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header'
import { SafeImage } from '@/components/marketplace/safe-image'
import { CornerstoneFooter } from '@/components/seo/cornerstone-footer'
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
  formatAddressForDisplay,
  type PublicBusinessData,
  type PublicServiceData,
  type PublicCertificationData,
} from '@/lib/public-business'
import { PublicBookingForm } from './booking-form'
import { MarketplaceBookingPanel } from './marketplace-booking-panel'
import { ChatWidget } from '@/components/public/chat-widget'
import {
  computeCardType,
  fetchFeaturedListingsMap,
  type MarketplaceCardType,
} from '@/lib/marketplace-featured'
import { ClaimBusinessBanner } from '@/components/marketplace/claim-business-banner'

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

  if (!business) return {}

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
    // Auto-index rule: only index when profile is rich enough.
    robots: business.isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
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
    notFound()
  }

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
  const [services, reviews, certifications, featuredMap] = await Promise.all([
    getPublicServices(business.id),
    getPublicReviews(business.id, 10),
    certificationsPromise,
    featuredPromise,
  ])

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

  // Rating-breakdown buckets (5★ → 1★) for the reviews summary box.
  const ratingBuckets = (() => {
    const b = [0, 0, 0, 0, 0]
    for (const r of reviews) {
      const s = Math.max(1, Math.min(5, Math.round(r.rating)))
      b[s - 1]++
    }
    return b.reverse() // 5-star first
  })()

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
    rating: business.rating > 0 ? business.rating : undefined,
    reviewCount: business.reviewCount > 0 ? business.reviewCount : undefined,
    reviews: localBusinessReviews,
    openingHours: openingHours.length > 0 ? openingHours : undefined,
    sameAs: Object.values(socialLinks).filter(Boolean),
  })

  const faqSchema = faqs.length > 0 ? getFaqSchema(faqs) : null

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
  const breadcrumbItems = [
    { name: 'Home', url: '/marketplace' },
    { name: business.industry || 'Service', url: industryBrowseUrl },
    { name: business.city || 'Area', url: cityBrowseUrl },
    { name: business.name, url: business.canonicalUrl },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <StructuredData data={allSchema} />
      <MarketplaceHeader />

      <main className="flex-1">
        {/* Breadcrumb bar */}
        <div className="border-b bg-muted/20">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        </div>

        {/* Hero */}
        <PublicBusinessHero business={business} services={services.length} />

        {/* Trust badges — marketplace providers only. Surfaces the 4-gate
            verification (identity / business / insurance / licence) that the
            old /marketplace/[slug] page showed. */}
        {business.marketplaceOptIn ? (
          <div className="border-b bg-muted/20">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <TrustBadge
                  icon={ShieldCheck}
                  label="Identity Verified"
                  value={business.identityVerified ? 'Confirmed' : 'Pending'}
                  ok={business.identityVerified}
                />
                <TrustBadge
                  icon={BadgeCheck}
                  label="Business Verified"
                  value={business.businessVerified ? 'Confirmed' : 'Pending'}
                  ok={business.businessVerified}
                />
                <TrustBadge
                  icon={ShieldCheck}
                  label="Insured"
                  value={
                    business.insuranceProvider ??
                    (business.insuranceVerified ? 'Verified' : 'Pending')
                  }
                  ok={business.insuranceVerified}
                />
                <TrustBadge
                  icon={Award}
                  label="Licence"
                  value={business.licenceNumber ?? 'Verified'}
                  ok={Boolean(business.licenceNumber)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Main content grid */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left: content sections */}
            <div className="lg:col-span-2 space-y-12">
              {/* About */}
              {business.description && (
                <section id="about" aria-labelledby="about-heading">
                  <h2 id="about-heading" className="text-2xl font-bold tracking-tight mb-4">
                    About {business.name}
                  </h2>
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-headings:text-foreground"
                    // Description is now authored via a rich HTML editor in the
                    // Public Hub settings tab. We render it verbatim — the
                    // editor only produces a safe subset (no <script> / inline
                    // event handlers) and the content is owned by the tenant
                    // admin themselves, so this is acceptable for a public page.
                    dangerouslySetInnerHTML={{ __html: business.description }}
                  />
                  {serviceAreas.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-emerald-700" />
                        Areas Served
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {serviceAreas.map((area, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

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
                      <ServiceCard key={s.id} service={s} currency={business.currency} businessSlug={business.slug} canonicalUrl={business.canonicalUrl} />
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

              {/* Certifications — marketplace providers only */}
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
                      Customer Reviews
                    </h2>
                    {business.rating > 0 && (
                      <div className="flex items-center gap-2">
                        <StarRating rating={business.rating} />
                        <span className="text-sm font-medium text-foreground">
                          {business.rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({business.reviewCount} reviews)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Rating breakdown — 5★ → 1★ distribution bars. */}
                  <div className="mb-4 flex items-center gap-6 rounded-lg border bg-muted/30 p-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                        {business.rating > 0 ? business.rating.toFixed(1) : '—'}
                      </p>
                      <StarRating rating={business.rating} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {business.reviewCount} review{business.reviewCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {ratingBuckets.map((count, idx) => {
                        const stars = 5 - idx
                        const pct = business.reviewCount > 0 ? (count / business.reviewCount) * 100 : 0
                        return (
                          <div key={stars} className="flex items-center gap-2 text-xs">
                            <span className="w-6 text-muted-foreground">{stars}★</span>
                            <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                              <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-right text-muted-foreground">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

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

                {/* Booking CTA — three rendering modes, kept consistent with
                    the marketplace browse grid's computeCardType() output:
                      • 'featured' / 'normal-full' (marketplaceOptIn && !isMinimalListing)
                        → full MarketplaceBookingPanel (Book Now + Request Quote)
                      • 'normal-minimal' (marketplaceOptIn && isMinimalListing)
                        → minimal "Call Now" CTA only — no booking, no quote.
                        Used for seed data (claimed=false), expired trials,
                        and unsubscribed providers.
                      • Non-marketplace businesses (marketplaceOptIn=false)
                        → lightweight PublicBookingForm (creates a Lead).
                    This keeps the detail page treatment consistent with the
                    browse card so users don't see a "Book Now" button on a
                    listing whose browse card only shows "Call Now". */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                  {business.marketplaceOptIn && !isMinimalListing ? (
                    <MarketplaceBookingPanel
                      providerTenantId={business.id}
                      providerName={business.name}
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
                        {business.phone ? (
                          <a
                            href={`tel:${business.phone.replace(/[^+\d]/g, '')}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                          >
                            <Phone className="h-5 w-5" />
                            Call {business.phone}
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
                  {business.phone ? (
                    <div className="border-t px-5 py-3">
                      <a
                        href={`tel:${business.phone}`}
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
                  {business.phone && (
                    <InfoRow icon={Phone} label="Phone" value={business.phone} href={`tel:${business.phone}`} />
                  )}
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

                <div className="text-center text-xs text-muted-foreground">
                  Powered by{' '}
                  <Link href="/" className="font-semibold text-emerald-700 hover:underline">
                    Fieseros
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CornerstoneFooter />

      {/* Visitor-facing live chat widget */}
      <ChatWidget businessSlug={business.slug} businessName={business.name} />
    </div>
  )
}

// ── Hero section ────────────────────────────────────────────────────────────

function PublicBusinessHero({
  business,
  services,
}: {
  business: PublicBusinessData
  services: number
}) {
  if (!business) return null
  return (
    <section className="border-b bg-gradient-to-b from-emerald-50/60 to-background dark:from-emerald-950/20">
      {/* Cover image — when no cover is set, hide the entire area (no
          gradient fallback, no empty space). The hero content below still
          renders with its own emerald-tinted background. */}
      {business.coverImage ? (
        <div className="h-40 sm:h-56 w-full overflow-hidden bg-muted">
          <SafeImage
            src={business.coverImage}
            alt={`${business.name} cover`}
            className="w-full h-full object-cover"
            // LCP image — eager + high priority. Cover is rendered at up to
            // 1920px wide × 224px tall on desktop; 1200×400 gives Supabase
            // a sane target (cover resize crops to fit) while staying well
            // below the original 2-5MB upload size.
            priority
            maxWidth={1200}
            maxHeight={400}
          />
        </div>
      ) : null}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
              {business.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={business.rating} />
                  <span className="text-sm font-semibold text-foreground">{business.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({business.reviewCount})</span>
                </div>
              )}
            </div>
            {business.tagline && (
              <p className="text-base text-muted-foreground mb-2">{business.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {business.industry && (
                <span className="inline-flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {business.industry}
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
            </div>
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
  businessSlug,
  canonicalUrl,
}: {
  service: PublicServiceData
  currency: string
  businessSlug: string
  canonicalUrl: string
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
        <a
          href={`#book`}
          className="mt-3 block w-full text-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
        >
          Book this service
        </a>
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

function TrustBadge({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: LucideIcon
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
      <Icon className={`h-5 w-5 shrink-0 ${ok ? 'text-emerald-600' : 'text-amber-500'}`} />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{label}</p>
        <p className={`truncate text-[11px] ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-emerald-700 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground">{value}</div>
      </div>
    </div>
  )
  return href ? (
    <a href={href} className="block hover:opacity-80 transition-opacity">{content}</a>
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
    return JSON.parse(json) as T
  } catch {
    return fallback
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
