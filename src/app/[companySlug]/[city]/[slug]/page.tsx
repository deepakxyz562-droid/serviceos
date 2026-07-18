import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import {
  Star,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  Camera,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Wrench,
} from 'lucide-react'

import { StructuredData } from '@/components/seo/structured-data'
import { Breadcrumbs } from '@/components/seo/breadcrumbs'
import { CornerstoneHeader } from '@/components/seo/cornerstone-header'
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
  getPublicBusinessByUrl,
  getPublicServices,
  getPublicReviews,
  formatAddressForDisplay,
  type PublicBusinessData,
  type PublicServiceData,
} from '@/lib/public-business'
import { PublicBookingForm } from './booking-form'

// ── Route config ────────────────────────────────────────────────────────────
// ISR: revalidate every 60 minutes so reviews / profile edits propagate
// without forcing every visitor to wait for a DB query.
export const revalidate = 3600
export const dynamicParams = true

const SITE_URL = 'https://serviceos.com'

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
    `${business.name} — ${business.industry || 'Service'} in ${business.city || 'Your Area'} | ServiceOS`
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
      siteName: 'ServiceOS',
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
  const { business, needsRedirect, canonicalUrl } = await getPublicBusinessByUrl(industry, city, slug)

  // 301 redirect to canonical URL when segments don't match the DB.
  // Use a RELATIVE path (strip the origin) so the redirect works on any
  // domain — localhost in dev, serviceos.cc in prod, or a custom domain.
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

  // Fetch services + reviews in parallel.
  const [services, reviews] = await Promise.all([
    getPublicServices(business.id),
    getPublicReviews(business.id, 10),
  ])

  // Parse JSON fields safely.
  const gallery: Array<{ url?: string; caption?: string }> = safeJson(business.galleryJson, [])
  const faqs: FaqItem[] = safeJson(business.faqsJson, [])
  const serviceAreas: string[] = safeJson(business.serviceAreasJson, [])
  const socialLinks: Record<string, string> = safeJson(business.socialLinksJson, {})
  const businessHours: Record<string, { open?: string; close?: string }> = safeJson(business.businessHoursJson, {})

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
  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: business.industry || 'Service', url: `${SITE_URL}/${business.industryUrlSlug}` },
    { name: business.city || 'Area', url: `${SITE_URL}/${business.industryUrlSlug}/${business.cityUrlSlug}` },
    { name: business.name, url: business.canonicalUrl },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <StructuredData data={allSchema} />
      <CornerstoneHeader />

      <main className="flex-1">
        {/* Breadcrumb bar */}
        <div className="border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        </div>

        {/* Hero */}
        <PublicBusinessHero business={business} services={services.length} />

        {/* Main content grid */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
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

              {/* Services */}
              {services.length > 0 && (
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
                          <img
                            src={img.url}
                            alt={img.caption || `${business.name} project ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading={i < 3 ? 'eager' : 'lazy'}
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
                {/* Booking CTA */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-br from-emerald-700 to-teal-700 p-5 text-white">
                    <h3 className="text-lg font-bold mb-1">Book a Service</h3>
                    <p className="text-sm text-emerald-50">
                      Get a free quote or schedule a visit in under 2 minutes.
                    </p>
                  </div>
                  <div className="p-5">
                    <PublicBookingForm business={business} services={services} />

                    {/* Quick action buttons */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {business.phone && (
                        <a
                          href={`tel:${business.phone}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          Call
                        </a>
                      )}
                      {business.whatsappPhone && (
                        <a
                          href={`https://wa.me/${business.whatsappPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
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
                    ServiceOS
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CornerstoneFooter />
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
      {/* Cover image — or a gradient banner fallback when no cover is set */}
      {business.coverImage ? (
        <div className="h-40 sm:h-56 w-full overflow-hidden bg-muted">
          <img
            src={business.coverImage}
            alt={`${business.name} cover`}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="h-32 sm:h-40 w-full bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-900"
        />
      )}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Logo */}
          {business.logo && (
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-muted shrink-0 border">
              <img src={business.logo} alt={`${business.name} logo`} className="w-full h-full object-cover" />
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
          <img src={service.image} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
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

// ── generateStaticParams (empty — fully dynamic with ISR) ───────────────────
// We deliberately don't pre-render any business pages at build time because
// the set of businesses is dynamic and potentially huge. ISR with
// revalidate=3600 (1 hour) gives us near-real-time freshness without
// per-request DB hits for popular pages.

export async function generateStaticParams() {
  return []
}
