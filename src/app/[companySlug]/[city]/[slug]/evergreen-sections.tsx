/**
 * evergreen-sections.tsx — Always-present content sections for the marketplace
 * detail page (src/app/[companySlug]/[city]/[slug]/page.tsx).
 *
 * WHY THIS EXISTS:
 *   Most marketplace detail pages were "thin" — About, Services, Gallery,
 *   Reviews, FAQs all render conditionally on the business owner having
 *   entered data. For unclaimed / seed / expired-trial listings, every
 *   one of those sections vanishes and the page collapses to Hero → Trust
 *   badges → Similar → footer. Google treats such pages as thin content.
 *
 *   The 7 sections in this file render for EVERY listing, regardless of
 *   how much the business owner has filled in. Content is generated from
 *   `industry + city + country + verification flags` alone — no fake data,
 *   no empty placeholders. All copy comes from
 *   `@/lib/marketplace/industry-content.ts` (industry-specific generators
 *   with a generic fallback).
 *
 * DESIGN:
 *   - All sections are SERVER components (no client JS, no useState).
 *   - The FAQ accordion uses native <details>/<summary> — no JS needed.
 *   - The Google Maps embed uses the `?output=embed` URL pattern, which
 *     works WITHOUT a Google Maps API key.
 *   - Visual language matches the existing detail page: emerald accent,
 *     rounded-xl cards, prose styling for paragraphs.
 *
 * NARRATIVE ORDER (where each section sits on the page):
 *   1. QuickFacts           — top of left column (at-a-glance stats)
 *   2. AboutIndustryInCity  — left column (SEO paragraph)
 *   3. [existing sections: About business, Services, Gallery]
 *   4. ServiceAreaMap       — left column (map + service-area chips)
 *   5. HiringChecklist      — left column (industry-specific hiring guide)
 *   6. HowBookingWorks      — left column (3-step booking flow)
 *   7. [existing sections: Certifications, Reviews, business FAQs]
 *   8. PlatformFaqs         — left column (platform-level FAQs, always)
 *   9. TrustVerification    — left column (explains the 4 badges)
 *   10. [existing: CRM CTA, Similar Businesses]
 */

import Link from 'next/link'
import {
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  BadgeCheck,
  Award,
  Zap,
  Building2,
  ClipboardCheck,
  Calendar,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Navigation,
  type LucideIcon,
} from 'lucide-react'

import type { PublicBusinessData } from '@/lib/public-business'
import {
  getIndustryDisplayName,
} from '@/lib/seo/industry-software-pages'
import {
  getIndustryAboutParagraph,
  getIndustryHiringChecklist,
  getIndustryPlatformFaqs,
  type PlatformFaq,
} from '@/lib/marketplace/industry-content'

// ── Shared prop type ────────────────────────────────────────────────────────

interface EvergreenProps {
  business: PublicBusinessData
  /** Service areas parsed from business.serviceAreasJson (passed from page). */
  serviceAreas: string[]
  /**
   * Whether this is a "minimal" listing (seed data / expired trial / unclaimed).
   * Used by HowBookingWorks to pick the right 3-step flow.
   */
  isMinimalListing: boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert an ISO 3166-1 alpha-2 country code to its English display name.
 * Duplicated here (page.tsx has its own copy) so this module is self-contained.
 */
function countryNameFromCode(code: string): string {
  if (!code) return ''
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    return names.of(code) || code
  } catch {
    return code
  }
}

/**
 * Build a Google Maps embed URL (no API key required) for a location.
 * Uses the `?output=embed` pattern which works in an <iframe> without
 * any Google Maps API key — shows a basic map centered on the location
 * with a pin.
 */
function googleMapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
}

// ════════════════════════════════════════════════════════════════════════════
// 1. QuickFacts — at-a-glance stats card
// ════════════════════════════════════════════════════════════════════════════

/**
 * A 2×N grid of label/value pairs showing the essential facts about this
 * business: industry, service area, emergency service availability,
 * listing status, plan tier. Distinct from the trust-badges strip above
 * (which shows verification status); this card shows operational facts.
 */
export function QuickFacts({ business }: EvergreenProps) {
  const industryName = getIndustryDisplayName(business.industry)

  const facts: Array<{ icon: LucideIcon; label: string; value: string; tone?: 'default' | 'warning' | 'success' }> = [
    {
      icon: Building2,
      label: 'Industry',
      value: industryName,
    },
    {
      icon: MapPin,
      label: 'Service Area',
      value: business.city
        ? `${business.city}${business.state ? `, ${business.state}` : ''}${business.country ? `, ${countryNameFromCode(business.country)}` : ''}`
        : countryNameFromCode(business.country) || 'Not specified',
    },
    {
      icon: Zap,
      label: 'Emergency Service',
      value: business.emergencyServiceAvailable ? 'Available' : 'Not listed',
      tone: business.emergencyServiceAvailable ? 'success' : 'default',
    },
    {
      icon: ShieldCheck,
      label: 'Listing Status',
      value: business.claimed ? 'Claimed by owner' : 'Unclaimed listing',
      tone: business.claimed ? 'success' : 'warning',
    },
  ]

  // Add plan tier for marketplace providers
  if (business.marketplaceOptIn && business.plan) {
    const planLabel =
      business.plan === 'enterprise' ? 'Enterprise'
      : business.plan === 'business' ? 'Business'
      : business.plan === 'growth' ? 'Growth'
      : business.plan === 'starter' ? 'Starter'
      : business.plan.charAt(0).toUpperCase() + business.plan.slice(1)
    facts.push({
      icon: Award,
      label: 'Plan',
      value: `${planLabel} marketplace provider`,
    })
  }

  return (
    <section aria-labelledby="quick-facts-heading" className="space-y-4">
      <h2 id="quick-facts-heading" className="text-2xl font-bold tracking-tight">
        Quick Facts
      </h2>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <dl className="divide-y sm:divide-y-0 sm:grid sm:grid-cols-2 sm:divide-x">
          {facts.map((fact) => {
            const Icon = fact.icon
            return (
              <div key={fact.label} className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className={`mt-0.5 text-sm font-semibold ${
                    fact.tone === 'success'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : fact.tone === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-foreground'
                  }`}>
                    {fact.value}
                  </dd>
                </div>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 2. AboutIndustryInCity — SEO paragraph about the industry in this city
// ════════════════════════════════════════════════════════════════════════════

/**
 * An ~120-150 word evergreen paragraph about hiring this industry in this
 * city. Directly targets the long-tail search query the visitor used to
 * land on the page (e.g. "hvac in new york"). Industry-specific content
 * from @/lib/marketplace/industry-content.ts.
 *
 * Title is "About {Industry} services in {City}" — distinct from the
 * existing "About {business.name}" section which shows the business's
 * own description.
 */
export function AboutIndustryInCity({ business }: EvergreenProps) {
  const industryName = getIndustryDisplayName(business.industry)
  const cityName = business.city || 'your area'
  const paragraph = getIndustryAboutParagraph(
    business.industry,
    business.city,
    business.country,
  )

  return (
    <section aria-labelledby="about-industry-heading" className="space-y-4">
      <h2 id="about-industry-heading" className="text-2xl font-bold tracking-tight">
        About {industryName} services in {cityName}
      </h2>
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground">
        <p>{paragraph}</p>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 3. ServiceAreaMap — service-area chips + embedded Google Map
// ════════════════════════════════════════════════════════════════════════════

/**
 * Renders a Google Map embed of the business's address (or city center
 * if no address is set) plus any service-area chips the business has
 * declared. The map uses the `?output=embed` URL pattern which works
 * without a Google Maps API key.
 *
 * Always renders — even unclaimed listings get a map of their city,
 * which is genuinely useful for visitors and adds real geographic
 * content to the page.
 */
export function ServiceAreaMap({ business, serviceAreas }: EvergreenProps) {
  const cityName = business.city || ''
  const countryName = countryNameFromCode(business.country)

  // Build the map query: prefer full address, fall back to city + country.
  // The embed URL pattern doesn't require an API key.
  const addressParts = [
    business.address,
    business.city,
    business.state,
    business.country,
  ].filter(Boolean)
  const mapQuery = addressParts.length > 0
    ? addressParts.join(', ')
    : [cityName, countryName].filter(Boolean).join(', ')
  const mapSrc = googleMapsEmbedUrl(mapQuery)

  // Caption for screen readers + visible text below the map
  const mapCaption = business.address
    ? `Map showing the location of ${business.name} at ${business.address}, ${cityName}.`
    : `Map showing the approximate service area for ${business.name} in ${cityName || countryName}.`

  return (
    <section aria-labelledby="service-area-heading" className="space-y-4">
      <h2 id="service-area-heading" className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <MapPin className="h-5 w-5 text-emerald-700" />
        Service Area
      </h2>

      {/* Service-area chips (only if the business has declared any) */}
      {serviceAreas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {serviceAreas.map((area, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
            >
              <MapPin className="h-3 w-3" />
              {area}
            </span>
          ))}
        </div>
      )}

      {/* Map embed */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="relative aspect-[16/9] sm:aspect-[2/1] bg-muted">
          <iframe
            src={mapSrc}
            title={`Map showing ${business.name} location`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
            aria-label={mapCaption}
          />
        </div>
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {business.address || `${cityName}, ${countryName}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {serviceAreas.length > 0
                ? `Serves ${serviceAreas.length} ${serviceAreas.length === 1 ? 'area' : 'areas'} in and around ${cityName || countryName}.`
                : `Primarily serves ${cityName || countryName} and the surrounding area.`}
            </p>
          </div>
          {business.address && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Get directions
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 4. HiringChecklist — industry-specific "what to look for" guide
// ════════════════════════════════════════════════════════════════════════════

/**
 * A numbered checklist (4-6 items) of what to look for / ask when hiring
 * a provider in this industry. Industry-specific content from
 * @/lib/marketplace/industry-content.ts. Each item is a small card with
 * the number badge, title, and description.
 *
 * This is genuinely useful content (not SEO filler) — the items reference
 * real certifications, real red flags, and real consumer-protection steps.
 */
export function HiringChecklist({ business }: EvergreenProps) {
  const industryName = getIndustryDisplayName(business.industry)
  const cityName = business.city || 'your area'
  const checklist = getIndustryHiringChecklist(business.industry)

  return (
    <section aria-labelledby="hiring-heading" className="space-y-4">
      <div>
        <h2 id="hiring-heading" className="text-2xl font-bold tracking-tight">
          What to expect when hiring a {industryName} in {cityName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          A practical checklist for evaluating any {industryName.toLowerCase()} provider — including {business.name} and the other businesses listed on Fieseros.
        </p>
      </div>

      <ol className="space-y-3">
        {checklist.map((item, i) => (
          <li
            key={i}
            className="flex gap-4 rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
              {i + 1}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 5. HowBookingWorks — 3-step visual explainer
// ════════════════════════════════════════════════════════════════════════════

interface BookingStep {
  icon: LucideIcon
  title: string
  description: string
}

/**
 * Picks the right 3-step booking flow based on the listing type:
 *   - Full marketplace listing  → Book online / request quote flow
 *   - Unclaimed w/ email        → Quote request flow (provider responds directly)
 *   - Minimal (no email)        → Call to inquire flow
 *   - Non-marketplace business  → Submit-a-request flow
 *
 * Keeps the visitor oriented: they always know what happens next,
 * regardless of which listing type they're viewing.
 */
function pickBookingSteps(
  business: PublicBusinessData,
  isMinimalListing: boolean,
): BookingStep[] {
  if (!business.marketplaceOptIn) {
    // Non-marketplace business — lead form flow
    return [
      {
        icon: ClipboardCheck,
        title: 'Submit a request',
        description: `Fill out the short booking form on this page with your service needs and contact details.`,
      },
      {
        icon: MessageSquare,
        title: `${business.name} responds`,
        description: `The business receives your request directly and replies with availability and next steps.`,
      },
      {
        icon: Calendar,
        title: 'Get a quote',
        description: `Compare the quote with other providers on Fieseros, then schedule your service.`,
      },
    ]
  }

  if (isMinimalListing && !business.claimed && business.email) {
    // Unclaimed marketplace provider with email — quote request flow
    return [
      {
        icon: ClipboardCheck,
        title: 'Request a quote',
        description: `Use the "Request a Quote" panel on this page to send your service needs to ${business.name} directly.`,
      },
      {
        icon: MessageSquare,
        title: `${business.name} responds`,
        description: `The provider receives your request by email and replies with pricing, availability, and next steps.`,
      },
      {
        icon: Calendar,
        title: 'Schedule your service',
        description: `Once you agree on scope and price, schedule the visit directly with the provider.`,
      },
    ]
  }

  if (isMinimalListing) {
    // Minimal listing (no email or already claimed) — call-to-inquire flow
    return [
      {
        icon: Phone,
        title: 'Browse their services',
        description: `Review the information on this page to understand what ${business.name} offers.`,
      },
      {
        icon: Phone,
        title: 'Call to inquire',
        description: business.phone
          ? `Call ${business.phone} during business hours to ask about availability and pricing.`
          : `Use the contact details on this page to reach ${business.name} directly.`,
      },
      {
        icon: Calendar,
        title: 'Schedule a visit',
        description: `Agree on scope and price over the phone, then book the service visit directly.`,
      },
    ]
  }

  // Full marketplace listing — book online / request quote flow
  return [
    {
      icon: ClipboardCheck,
      title: 'Browse services',
      description: `Review ${business.name}'s services and pricing in the "Services Offered" section above.`,
    },
    {
      icon: Calendar,
      title: 'Book online or request a quote',
      description: `Use the booking panel on this page to instantly book a service or request a detailed quote.`,
    },
    {
      icon: CheckCircle2,
      title: 'Get confirmed & scheduled',
      description: `${business.name} confirms your booking. You'll receive details by email — no back-and-forth phone tags.`,
    },
  ]
}

/**
 * 3-step horizontal flow (vertical on mobile) explaining how booking
 * works for this specific listing type. Helps visitors understand
 * what to expect and reduces abandonment.
 */
export function HowBookingWorks({ business, isMinimalListing }: EvergreenProps) {
  const steps = pickBookingSteps(business, isMinimalListing)

  return (
    <section aria-labelledby="how-booking-heading" className="space-y-4">
      <h2 id="how-booking-heading" className="text-2xl font-bold tracking-tight">
        How booking with {business.name} works
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={i}
              className="relative rounded-xl border bg-card p-5 shadow-sm"
            >
              {/* Step number badge — top-right corner */}
              <div className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {i + 1}
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white mb-3">
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="text-sm font-semibold text-foreground pr-8">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {step.description}
              </p>

              {/* Arrow connector between steps (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-1/2 -right-2.5 -translate-y-1/2 z-10">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 6. TrustVerification — explains what the 4 verification badges mean
// ════════════════════════════════════════════════════════════════════════════

interface BadgeExplainer {
  icon: LucideIcon
  name: string
  description: string
}

const BADGE_EXPLAINERS: BadgeExplainer[] = [
  {
    icon: ShieldCheck,
    name: 'Identity Verified',
    description:
      'The business owner’s identity has been confirmed via government-issued photo ID and a selfie check. This prevents impersonation and ensures the person behind the listing is real.',
  },
  {
    icon: BadgeCheck,
    name: 'Business Verified',
    description:
      'We’ve confirmed the business is a legitimate registered entity — EIN / company registration number checked against public records. "Pending" means documentation is still being reviewed.',
  },
  {
    icon: ShieldCheck,
    name: 'Insured',
    description:
      'The provider carries active general liability insurance. We verify the certificate (carrier name + policy number) so you’re protected if property damage occurs during service.',
  },
  {
    icon: Award,
    name: 'Licensed',
    description:
      'The provider holds the trade licence required for their industry in their jurisdiction (e.g. Master Plumber licence, EPA Section 608 for HVAC, state contractor licence).',
  },
]

/**
 * Explains what each of the 4 Fieseros verification badges means. Always
 * renders — builds trust even on unclaimed listings by showing that
 * Fieseros has a real verification process, and that the provider
 * showing "Pending" badges is in the process of completing it.
 */
export function TrustVerification({ business }: EvergreenProps) {
  // Count how many of the 4 badges are confirmed for THIS provider, so
  // we can show a contextual note. Avoids claiming the provider is
  // fully verified when they aren't.
  const confirmedCount = [
    business.identityVerified,
    business.businessVerified,
    business.insuranceVerified,
    Boolean(business.licenceNumber),
  ].filter(Boolean).length

  return (
    <section aria-labelledby="trust-heading" className="space-y-4">
      <div>
        <h2 id="trust-heading" className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          Trust &amp; Verification on Fieseros
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Every Fieseros provider can complete our 4-step verification process. Here’s what each badge means.
        </p>
      </div>

      {/* Contextual status note for THIS provider */}
      <div className={`rounded-lg border p-4 ${
        confirmedCount === 4
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
      }`}>
        <div className="flex items-start gap-3">
          {confirmedCount === 4 ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {confirmedCount === 4
                ? `${business.name} has completed all 4 verification steps.`
                : `${business.name} has ${confirmedCount} of 4 verification steps confirmed.`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {confirmedCount === 4
                ? 'You can hire with confidence — identity, business, insurance, and licensing have all been independently checked.'
                : 'Providers showing "Pending" badges are still submitting documentation. You can still contact them, but we recommend confirming credentials directly before hiring.'}
            </p>
          </div>
        </div>
      </div>

      {/* 4-badge explainer grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BADGE_EXPLAINERS.map((badge) => {
          const Icon = badge.icon
          return (
            <div
              key={badge.name}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {badge.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {badge.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer link to learn more */}
      <p className="text-xs text-muted-foreground">
        Learn more about{' '}
        <Link
          href="/marketplace"
          className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline"
        >
          how Fieseros verifies providers
        </Link>
        .
      </p>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 7. PlatformFaqs — industry-specific platform-level FAQs (always renders)
// ════════════════════════════════════════════════════════════════════════════

/**
 * 3 platform-level FAQs about hiring this industry in this city. Always
 * renders — even when the business has no FAQs of their own. Uses the
 * same native <details>/<summary> accordion pattern as the existing
 * business-authored FAQs section.
 *
 * The FAQs returned here are ALSO merged into the FAQ JSON-LD schema
 * by page.tsx (see the `getIndustryPlatformFaqs` call in the page) so
 * every detail page is eligible for FAQ rich results in Google Search.
 */
export function PlatformFaqs({ business }: EvergreenProps) {
  const industryName = getIndustryDisplayName(business.industry)
  const cityName = business.city || 'your area'
  const faqs: PlatformFaq[] = getIndustryPlatformFaqs(business.industry, business.city)

  return (
    <section aria-labelledby="platform-faqs-heading" className="space-y-4">
      <div>
        <h2 id="platform-faqs-heading" className="text-2xl font-bold tracking-tight">
          Frequently asked questions about {industryName} in {cityName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Common questions about hiring a {industryName.toLowerCase()} provider through Fieseros.
        </p>
      </div>

      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group rounded-lg border bg-card text-card-foreground overflow-hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-accent transition-colors">
              <span>{faq.question}</span>
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
            </summary>
            <div
              className="prose prose-sm dark:prose-invert max-w-none px-4 pb-4 pt-0 prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground"
              dangerouslySetInnerHTML={{ __html: faq.answer }}
            />
          </details>
        ))}
      </div>
    </section>
  )
}
