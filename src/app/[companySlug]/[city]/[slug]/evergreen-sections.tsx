/**
 * evergreen-sections.tsx — Always-present + on-demand content sections for the
 * marketplace detail page (src/app/[companySlug]/[city]/[slug]/page.tsx).
 *
 * WHY THIS EXISTS:
 *   Most marketplace detail pages were "thin" — About, Services, Gallery,
 *   Reviews, FAQs all render conditionally on the business owner having
 *   entered data. For unclaimed / seed / expired-trial listings, every
 *   one of those sections vanishes and the page collapses to Hero → Trust
 *   badges → Similar → footer. Google treats such pages as thin content.
 *
 *   The sections in this file render for EVERY listing (or are triggered by
 *   specific conditions like unclaimed status). Content is generated from
 *   `industry + city + country + verification flags + businessName + tagline`
 *   — no fake data, no empty placeholders. All copy comes from
 *   `@/lib/marketplace/industry-content.ts` (industry + sub-industry
 *   generators with a generic fallback).
 *
 * DESIGN:
 *   - All sections are SERVER components (no client JS, no useState).
 *   - The FAQ accordion uses native <details>/<summary> — no JS needed.
 *   - The Google Maps embed uses the `?output=embed` URL pattern, which
 *     works WITHOUT a Google Maps API key.
 *   - Visual language matches the existing detail page: emerald accent,
 *     rounded-xl cards, prose styling for paragraphs.
 *   - Sub-industry aware: a "Window Cleaning" business gets window-cleaning-
 *     specific content, not generic house-cleaning content.
 *
 * NARRATIVE ORDER (where each section sits on the page):
 *   1. QuickFacts           — top of left column (at-a-glance stats)
 *   2. AboutIndustryInCity  — left column (SEO paragraph, sub-industry aware)
 *   3. [existing: About business — now via AboutBusiness component]
 *   4. [existing: Services, Gallery]
 *   5. ServiceAreaMap       — left column (map + service-area chips)
 *   6. CommonServices       — left column (generic category service cards)
 *   7. HiringChecklist      — left column (compact industry hiring guide)
 *   8. HowBookingWorks      — left column (3-step flow, unclaimed-aware)
 *   9. [existing: Certifications, Reviews, business FAQs]
 *  10. PlatformFaqs         — left column (platform-level FAQs, always)
 *  11. TrustVerification    — left column (compact 4-row status table)
 *  12. [existing: CRM CTA, Similar Businesses]
 *
 * HERO + SIDEBAR additions:
 *   - HeroActions           — Call/Website/Directions buttons in hero for
 *                             unclaimed listings (where sidebar has minimal CTA)
 *   - MobileContactCard     — compact contact card under hero on mobile only
 *                             (desktop keeps the right sidebar with full info)
 *   - CompactTrustBadges    — replaces the always-4-badge strip; shows a
 *                             single "Not yet verified" summary when <3
 *                             badges confirmed, full 4-badge strip when ≥3
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
  Globe,
  Mail,
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
  getIndustryCommonServices,
  getResolvedIndustryDisplayName,
  isTemplatedDescription,
  type PlatformFaq,
  type CommonService,
} from '@/lib/marketplace/industry-content'
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs'
import {
  getLocationContext,
  getLocationContextSentence,
} from '@/lib/marketplace/location-context'
import type { PublicServiceData } from '@/lib/public-business'

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

/**
 * Normalize a phone number for href="tel:" links (strip everything except
 * digits and leading +).
 */
function normalizePhoneForTel(phone: string | null): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\s*\(\/\)\s*/g, '').trim()
  return cleaned.replace(/[^+\d]/g, '')
}

/**
 * Compute the count of confirmed verification badges for a business.
 * Used by CompactTrustBadges and TrustVerification.
 */
function countConfirmedBadges(business: PublicBusinessData): number {
  return [
    business.identityVerified,
    business.businessVerified,
    business.insuranceVerified,
    Boolean(business.licenceNumber),
  ].filter(Boolean).length
}

// ════════════════════════════════════════════════════════════════════════════
// HERO + SIDEBAR additions
// ════════════════════════════════════════════════════════════════════════════

/**
 * Action buttons shown in the hero for UNCLAIMED listings only. Claimed
 * marketplace listings have the full booking panel in the right sidebar —
 * duplicating Call/Book in the hero would be redundant. Unclaimed listings
 * have a minimal sidebar (just "Call to Book"), so the hero gets Call +
 * Website + Directions to surface all contact options upfront.
 *
 * Renders as a horizontal button row that wraps on mobile. Hidden entirely
 * when the listing is claimed (returns null).
 */
export function HeroActions({ business }: { business: PublicBusinessData }) {
  // Only render for unclaimed listings. Claimed listings get the full
  // booking panel in the right sidebar — no need for hero actions.
  if (business.claimed) return null

  const tel = normalizePhoneForTel(business.phone)
  const hasWebsite = Boolean(business.website)
  const hasAddress = Boolean(business.address)
  const hasAnyAction = tel || hasWebsite || hasAddress
  if (!hasAnyAction) return null

  // Build the directions URL if we have an address.
  let directionsUrl: string | null = null
  if (hasAddress) {
    const addressParts = [
      business.address,
      business.city,
      business.state,
      business.country,
    ].filter(Boolean)
    directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressParts.join(', '))}`
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {tel && (
        <a
          href={`tel:${tel}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <Phone className="h-4 w-4" />
          Call
        </a>
      )}
      {hasWebsite && (
        <a
          href={business.website!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Globe className="h-4 w-4" />
          Website
        </a>
      )}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Navigation className="h-4 w-4" />
          Directions
        </a>
      )}
    </div>
  )
}

/**
 * Compact contact card shown under the hero on MOBILE only (hidden on lg+
 * where the right sidebar's Business Information card is visible the whole
 * scroll). Solves the problem of Business Information being buried below
 * all evergreen sections on mobile.
 *
 * Shows: phone, website, address, directions — the essentials a mobile
 * visitor needs without scrolling the whole page.
 */
export function MobileContactCard({ business }: { business: PublicBusinessData }) {
  const tel = normalizePhoneForTel(business.phone)
  const hasWebsite = Boolean(business.website)
  const hasAddress = Boolean(business.address)
  const hasEmail = Boolean(business.email)
  const hasAny = tel || hasWebsite || hasAddress || hasEmail
  if (!hasAny) return null

  let directionsUrl: string | null = null
  if (hasAddress) {
    const addressParts = [
      business.address,
      business.city,
      business.state,
      business.country,
    ].filter(Boolean)
    directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressParts.join(', '))}`
  }

  return (
    <div className="lg:hidden border-b bg-card">
      <div className="w-full px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {tel && (
            <a
              href={`tel:${tel}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          )}
          {hasWebsite && (
            <a
              href={business.website!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              Website
            </a>
          )}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Navigation className="h-3.5 w-3.5" />
              Directions
            </a>
          )}
          {hasEmail && (
            <a
              href={`mailto:${business.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Replaces the always-4-badge strip in the hero. Shows a compact single-row
 * summary when the business has fewer than 3 confirmed badges (the common
 * case for unclaimed/seed listings) — instead of 4 badges with 3× "Pending"
 * + 1× "Verified" which looks visually broken.
 *
 * When ≥3 badges are confirmed (claimed + verified businesses), shows the
 * full 4-badge strip — that's a genuine trust signal worth surfacing.
 *
 * `marketplaceOptIn === false` businesses render nothing (they never had
 * the trust badges strip).
 */
export function CompactTrustBadges({ business }: { business: PublicBusinessData }) {
  if (!business.marketplaceOptIn) return null

  const confirmed = countConfirmedBadges(business)

  // ── Compact summary mode (0–2 confirmed) ────────────────────────────────
  // Single row: "Verification status: Not yet verified" + small text.
  // Much better UX than 4 badges with mostly "Pending".
  if (confirmed < 3) {
    return (
      <div className="border-b bg-muted/20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="font-semibold text-foreground">
              Verification status: {confirmed === 0 ? 'Not yet verified' : `${confirmed} of 4 checks complete`}
            </span>
            <span className="text-muted-foreground hidden sm:inline">
              · Identity, business, insurance, and licence checks pending
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Full 4-badge strip (3–4 confirmed) ──────────────────────────────────
  // Genuine trust signal — show all 4 badges.
  const badges: Array<{ icon: LucideIcon; label: string; value: string; ok: boolean }> = [
    {
      icon: ShieldCheck,
      label: 'Identity Verified',
      value: business.identityVerified ? 'Confirmed' : 'Pending',
      ok: business.identityVerified,
    },
    {
      icon: BadgeCheck,
      label: 'Business Verified',
      value: business.businessVerified ? 'Confirmed' : 'Pending',
      ok: business.businessVerified,
    },
    {
      icon: ShieldCheck,
      label: 'Insured',
      value: business.insuranceProvider ??
        (business.insuranceVerified ? 'Verified' : 'Pending'),
      ok: business.insuranceVerified,
    },
    {
      icon: Award,
      label: 'Licence',
      value: business.licenceNumber ?? 'Verified',
      ok: Boolean(business.licenceNumber),
    },
  ]

  return (
    <div className="border-b bg-muted/20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((badge) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.label}
                className="flex items-center gap-2 rounded-lg border bg-card p-3"
              >
                <Icon className={`h-5 w-5 shrink-0 ${badge.ok ? 'text-emerald-600' : 'text-amber-500'}`} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{badge.label}</p>
                  <p className={`truncate text-[11px] ${badge.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                    {badge.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
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
  // Use sub-industry-aware display name so "Window Cleaning" shows as
  // "Window Cleaning" (not the broad "Cleaning").
  const industryName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )

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
 * land on the page (e.g. "window cleaning in san antonio"). Sub-industry
 * aware content from @/lib/marketplace/industry-content.ts.
 *
 * Title is "{Industry} services in {City}" (without "About" prefix — the
 * "About" label is reserved for the business-specific AboutBusiness section).
 * Distinct from the AboutBusiness section which is about the specific
 * business.
 *
 * SEO LAYERING (consultant model — Layer 2 CONTEXT):
 *   The paragraph body is industry+city scoped (category/location content).
 *   Two sentences are appended to bridge category → business and add local
 *   variation:
 *
 *   1. BUSINESS-SPECIFIC BRIDGE SENTENCE (always):
 *      "{business.name} is listed on Fieseros as a {industry} business
 *      serving {city}." — connects the category context to THIS specific
 *      listing without claiming the business offers every category service.
 *
 *   2. LOCATION-CONTEXT VARIATION SENTENCE (when region is mapped):
 *      Weaves in climate zone + foundation type + state licensing body for
 *      US states / CA provinces / AU states / UK nations. This breaks the
 *      city-name-swap template-spinning pattern at 100K-listing scale —
 *      a Texas plumber paragraph mentions slab foundations + Texas State
 *      Board of Plumbing Examiners; an Ontario plumber paragraph mentions
 *      basement foundations + TSSA. Same industry, genuinely different
 *      content per region. Returns '' for unmapped regions (graceful
 *      omit — the base paragraph still renders fine).
 */
export function AboutIndustryInCity({ business }: EvergreenProps) {
  // Sub-industry aware: "Window Cleaning" instead of broad "Cleaning".
  const industryName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )
  const cityName = business.city || 'your area'
  const baseParagraph = getIndustryAboutParagraph(
    business.industry,
    business.city,
    business.country,
    business.name,
    business.tagline,
  )

  // ── Business-specific bridge sentence ────────────────────────────────────
  // Always appended. Connects the category/location paragraph to THIS
  // specific listing. The consultant model: "Squeaky Dan's Window Cleaning
  // San Antonio is listed on Fieseros as a local window-cleaning business
  // serving the San Antonio area."
  const businessSentence = business.city
    ? `${business.name} is listed on Fieseros as a ${industryName.toLowerCase()} business serving ${cityName}.`
    : `${business.name} is listed on Fieseros as a ${industryName.toLowerCase()} business.`

  // ── Location-context variation sentence (anti-template-spinning) ────────
  // Returns '' when the country+state combo isn't in our mapping. The
  // sentence is grounded in real climate/foundation/licensing data so it
  // reads as genuine local context, not filler.
  const locationContext = getLocationContext(
    business.country,
    business.state,
    business.industry,
  )
  const locationSentence = getLocationContextSentence(locationContext, business.industry)

  const fullParagraph = locationSentence
    ? `${baseParagraph} ${locationSentence} ${businessSentence}`
    : `${baseParagraph} ${businessSentence}`

  return (
    <section aria-labelledby="about-industry-heading" className="space-y-4">
      <h2 id="about-industry-heading" className="text-2xl font-bold tracking-tight">
        {industryName} services in {cityName}
      </h2>
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground">
        <p>{fullParagraph}</p>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 3. AboutBusiness — honest business-specific About section (Tier 1 / Tier 2)
// ════════════════════════════════════════════════════════════════════════════

/**
 * The business-specific "About" section. Two tiers based on description
 * quality:
 *
 *   Tier 1 (genuine authored description): Renders the owner's real HTML
 *   description verbatim. Gold standard for E-E-A-T — original content,
 *   passes every Google quality check.
 *
 *   Tier 2 (templated / empty / missing): Renders an honest business-
 *   specific paragraph generated from real data fields (industry, city,
 *   state, claim status) + a prominent "Claim this business" CTA. This
 *   is BETTER for SEO than showing the templated boilerplate because:
 *     - It's honest (explains what the page IS — a listing the owner
 *       hasn't claimed yet)
 *     - It's business-specific (uses the actual business name, industry,
 *       city, state — not a generic template)
 *     - It has a conversion purpose (Claim CTA)
 *     - It passes Google's Helpful Content Update (no boilerplate)
 *
 * The section title is always "About {business.name}" — distinct from
 * the AboutIndustryInCity section which is about the industry in the city.
 *
 * Note: The actual Claim CTA button is rendered by the parent page (which
 * already has the CrmCtaSection component with auth-gated modal logic).
 * This section just shows the honest text + an anchor link to #claim-cta.
 */
export function AboutBusiness({ business }: EvergreenProps) {
  const industryName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )
  const cityName = business.city || 'your area'
  const stateName = business.state || ''
  const countryName = countryNameFromCode(business.country)

  // ── Tier 1: genuine authored description ──────────────────────────────────
  if (business.description && !isTemplatedDescription(business.description)) {
    return (
      <section id="about" aria-labelledby="about-heading">
        <h2 id="about-heading" className="text-2xl font-bold tracking-tight mb-4">
          About {business.name}
        </h2>
        <div
          className="prose prose-slate dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-headings:text-foreground"
          dangerouslySetInnerHTML={{ __html: business.description }}
        />
      </section>
    )
  }

  // ── Tier 2: honest rewrite for templated / empty descriptions ─────────────
  // Generate an honest, business-specific paragraph from real data fields.
  // This replaces the templated boilerplate ("Looking for reliable {X}...")
  // with something that has genuine unique value + passes Helpful Content.
  const locationParts = [cityName, stateName, countryName].filter(Boolean)
  const locationString = locationParts.join(', ')

  return (
    <section id="about" aria-labelledby="about-heading" className="space-y-4">
      <h2 id="about-heading" className="text-2xl font-bold tracking-tight">
        About {business.name}
      </h2>
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <p className="text-sm text-foreground leading-relaxed">
          {business.name} is a {industryName.toLowerCase()} business based in{' '}
          {locationString || 'this area'}. This Fieseros listing includes the
          business&apos;s contact information, service area, hours, and
          verification status.
        </p>
        {!business.claimed && (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The business has not yet claimed its Fieseros profile. Claiming
              allows the owner to add a full description, services, photos,
              FAQs, and verification documentation — giving customers a
              complete picture of what {business.name} offers.
            </p>
            <div className="pt-2">
              <a
                href="#claim-cta"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Claim this business
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </>
        )}
        {business.claimed && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            This listing is claimed and managed by the business owner. Contact{' '}
            {business.name} directly using the details on this page to inquire
            about services, availability, and pricing.
          </p>
        )}
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 4. ServiceAreaMap — service-area chips + embedded Google Map
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

  const mapCaption = business.address
    ? `Map showing the location of ${business.name} at ${business.address}, ${cityName}.`
    : `Map showing the approximate service area for ${business.name} in ${cityName || countryName}.`

  return (
    <section aria-labelledby="service-area-heading" className="space-y-4">
      <h2 id="service-area-heading" className="text-2xl font-bold tracking-tight flex items-center gap-2">
        <MapPin className="h-5 w-5 text-emerald-700" />
        Service Area
      </h2>

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
// 5. CommonServices — generic category service cards (always present)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generic service cards showing the common services offered in this industry
 * category. Clearly labeled "Common services in this category — not
 * necessarily offered by this business" so we never claim the specific
 * business offers these services.
 *
 * Sub-industry aware: a Window Cleaning business shows window-cleaning
 * services (Exterior Window Cleaning, Screen Cleaning, Hard-Water Stain
 * Removal, etc.) — not generic house-cleaning services.
 *
 * BUSINESS VERIFIED TAGS (3-state verification roadmap):
 *   When `businessServices` is passed (the business's real services list),
 *   each common-service card is fuzzy-matched against the business's real
 *   service names. A match renders a "Business Verified" badge on that
 *   card — signaling that THIS business actually offers that service
 *   (vs. the generic disclaimer on non-matching cards).
 *
 *   This wires the 3-state verification roadmap without claiming the
 *   business offers services it doesn't:
 *     🟡 Publicly reported (no match)  → "Common service, not confirmed for this business"
 *     🔵 Business verified (match)     → "Offered by {business.name}"
 *     🟢 Fieseros verified (future)    → deferred — requires service-level verification flow
 *
 * The fuzzy match normalizes both sides (lowercase, strip punctuation,
 * collapse whitespace) and matches on substring containment in EITHER
 * direction. This catches "Residential Window Cleaning" matching a
 * business service named "Residential Window Cleaning Service" or vice
 * versa.
 */
export function CommonServices({
  business,
  businessServices = [],
}: EvergreenProps & { businessServices?: PublicServiceData[] }) {
  const industryName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )
  const services: CommonService[] = getIndustryCommonServices(
    business.industry,
    business.name,
    business.tagline,
  )

  // ── Fuzzy-match helper ───────────────────────────────────────────────────
  // Normalize a service name for matching: lowercase, strip non-alphanumerics,
  // collapse whitespace. "Residential Window Cleaning!" → "residential window cleaning".
  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  // Pre-normalize the business's real service names once.
  const normalizedBusinessServices = businessServices
    .map((s) => normalize(s.name))
    .filter(Boolean)

  // Returns true if a common-service name fuzzy-matches any of the
  // business's real services. Match logic: substring containment in EITHER
  // direction after normalization. "exterior window cleaning" matches
  // "exterior window cleaning service" and vice versa.
  const isOfferedByBusiness = (commonServiceName: string): boolean => {
    const normalizedCommon = normalize(commonServiceName)
    if (!normalizedCommon) return false
    return normalizedBusinessServices.some((real) => {
      if (!real) return false
      // Exact match (after normalization).
      if (real === normalizedCommon) return true
      // Substring containment — either direction. Guards against
      // "cleaning" matching "window cleaning" by requiring the SHORTER
      // string to be ≥ 8 chars (avoids trivial 1-2 word false positives).
      const shorter = real.length < normalizedCommon.length ? real : normalizedCommon
      const longer = real.length < normalizedCommon.length ? normalizedCommon : real
      if (shorter.length < 8) return false
      return longer.includes(shorter)
    })
  }

  // Pre-compute the match results for each common service so we don't
  // mutate state during render (React Compiler rule). Also lets us derive
  // `hasAnyMatch` without a side-effecting loop.
  const servicesWithMatch = services.map((service) => ({
    service,
    offered: isOfferedByBusiness(service.name),
  }))
  const hasAnyMatch = servicesWithMatch.some((s) => s.offered)

  return (
    <section aria-labelledby="common-services-heading" className="space-y-4">
      <div>
        <h2 id="common-services-heading" className="text-2xl font-bold tracking-tight">
          Common {industryName} services
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Common services in this category — not necessarily offered by {business.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {servicesWithMatch.map(({ service, offered }, i) => {
          return (
            <div
              key={i}
              className={`rounded-lg border bg-card p-4 shadow-sm transition-colors ${
                offered ? 'border-emerald-300 dark:border-emerald-700' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  offered
                    ? 'bg-emerald-100 dark:bg-emerald-950/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/30'
                }`}>
                  <CheckCircle2 className={`h-4 w-4 ${
                    offered
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-emerald-700/70 dark:text-emerald-400/70'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {service.name}
                    </h3>
                    {offered && (
                      <span
                        title={`Confirmed offered by ${business.name}`}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                      >
                        <BadgeCheck className="h-3 w-3" />
                        Business Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend — only shown when at least one card has a Business Verified
          badge. Explains the badge + the disclaimer so visitors understand
          the distinction between verified vs. common services. */}
      {hasAnyMatch && (
        <p className="text-xs text-muted-foreground mt-2">
          <BadgeCheck className="inline h-3 w-3 text-emerald-600 mr-1" />
          <span className="font-medium text-foreground">Business Verified</span>
          {' '}— this service is confirmed offered by {business.name}. Other
          services listed above are common in the {industryName.toLowerCase()}{' '}
          category and may or may not be offered by this business; confirm
          directly with the provider before booking.
        </p>
      )}
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 6. HiringChecklist — COMPACT industry-specific "before hiring" card
// ════════════════════════════════════════════════════════════════════════════

/**
 * A compact single-card checklist of what to look for / ask when hiring
 * a provider in this industry. Industry-specific content from
 * @/lib/marketplace/industry-content.ts. Sub-industry aware.
 *
 * Redesigned (per UX feedback) from a 5-card vertical list to a single
 * compact card with 5 checkmark lines — same content, ~1/3 the vertical
 * space. Each line shows the title only (hover/expand reveals the full
 * description via the title attribute).
 *
 * Genuinely useful content (not SEO filler) — references real
 * certifications, real red flags, real consumer-protection steps.
 */
export function HiringChecklist({ business }: EvergreenProps) {
  const industryName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )
  const checklist = getIndustryHiringChecklist(
    business.industry,
    business.name,
    business.tagline,
  )

  return (
    <section aria-labelledby="hiring-heading" className="space-y-4">
      <h2 id="hiring-heading" className="text-2xl font-bold tracking-tight">
        Before hiring a {industryName.toLowerCase()} provider
      </h2>
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <ul className="space-y-2.5">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground" title={item.description}>
                  {item.title}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 7. HowBookingWorks — 3-step visual explainer (unclaimed-aware)
// ════════════════════════════════════════════════════════════════════════════

interface BookingStep {
  icon: LucideIcon
  title: string
  description: string
}

/**
 * Picks the right 3-step flow based on the listing type:
 *   - Full marketplace listing  → Book online / request quote flow
 *   - Unclaimed w/ email        → Quote request flow (provider responds directly)
 *   - Unclaimed (no email)      → "Contact this business" flow (NOT "browse
 *                                 their services" — they have no services)
 *   - Non-marketplace business  → Submit-a-request flow
 *
 * The unclaimed flow was redesigned per UX feedback: the old "Browse their
 * services" step was misleading because unclaimed businesses typically have
 * no services listed. The new flow is honest: review info → contact
 * directly → confirm availability/pricing.
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

  if (isMinimalListing && !business.claimed) {
    // Unclaimed (no email) — honest "Contact this business" flow.
    // Previously said "Browse their services" which was misleading —
    // unclaimed businesses typically have no services listed.
    return [
      {
        icon: ClipboardCheck,
        title: 'Review the business information',
        description: `Check the contact details, service area, and hours shown on this page to confirm ${business.name} serves your location.`,
      },
      {
        icon: Phone,
        title: 'Contact the business directly',
        description: business.phone
          ? `Call ${business.phone} during business hours, or visit their website if listed.`
          : `Use the website or email shown on this page to reach ${business.name}.`,
      },
      {
        icon: Calendar,
        title: 'Confirm availability + pricing',
        description: `Agree on the scope of work, price, and visit time directly with the provider. Get the agreement in writing before the work begins.`,
      },
    ]
  }

  if (isMinimalListing) {
    // Claimed minimal (expired trial etc.) — call to inquire flow
    return [
      {
        icon: ClipboardCheck,
        title: 'Review the business information',
        description: `Check the contact details, service area, and hours shown on this page.`,
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
 * 3-step horizontal flow (vertical on mobile) explaining how contacting /
 * booking works for this specific listing type. Helps visitors understand
 * what to expect and reduces abandonment.
 *
 * Title changes based on listing type:
 *   - Unclaimed → "How contacting this business works"
 *   - Claimed   → "How booking with {business.name} works"
 */
export function HowBookingWorks({ business, isMinimalListing }: EvergreenProps) {
  const steps = pickBookingSteps(business, isMinimalListing)
  const isUnclaimed = !business.claimed
  const title = isUnclaimed
    ? 'How contacting this business works'
    : `How booking with ${business.name} works`

  return (
    <section aria-labelledby="how-booking-heading" className="space-y-4">
      <h2 id="how-booking-heading" className="text-2xl font-bold tracking-tight">
        {title}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={i}
              className="relative rounded-xl border bg-card p-5 shadow-sm"
            >
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
// 8. TrustVerification — COMPACT 4-row status table (always present)
// ════════════════════════════════════════════════════════════════════════════

interface BadgeRow {
  icon: LucideIcon
  name: string
  status: 'confirmed' | 'pending'
  value: string
}

/**
 * Compact verification status table. Replaces the previous 4-card explainer
 * grid (which was too large for every detail page) with a clean 4-row table
 * + a "How verification works →" link.
 *
 * The full badge explainers belong on a dedicated /how-verification-works
 * page (future), not on every individual marketplace page. On the detail
 * page, visitors just need to see THIS provider's verification status at
 * a glance.
 */
export function TrustVerification({ business }: EvergreenProps) {
  const rows: BadgeRow[] = [
    {
      icon: ShieldCheck,
      name: 'Identity',
      status: business.identityVerified ? 'confirmed' : 'pending',
      value: business.identityVerified ? 'Confirmed' : 'Pending',
    },
    {
      icon: BadgeCheck,
      name: 'Business',
      status: business.businessVerified ? 'confirmed' : 'pending',
      value: business.businessVerified ? 'Confirmed' : 'Pending',
    },
    {
      icon: ShieldCheck,
      name: 'Insurance',
      status: business.insuranceVerified ? 'confirmed' : 'pending',
      value: business.insuranceProvider ??
        (business.insuranceVerified ? 'Verified' : 'Pending'),
    },
    {
      icon: Award,
      name: 'Licence',
      status: Boolean(business.licenceNumber) ? 'confirmed' : 'pending',
      value: business.licenceNumber ?? 'Pending',
    },
  ]

  const confirmedCount = countConfirmedBadges(business)

  return (
    <section aria-labelledby="trust-heading" className="space-y-4">
      <div>
        <h2 id="trust-heading" className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          Fieseros Verification
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {confirmedCount === 4
            ? `${business.name} has completed all 4 verification checks.`
            : `${business.name} has ${confirmedCount} of 4 verification checks confirmed.`}
        </p>
      </div>

      {/* Compact 4-row status table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <dl className="divide-y">
          {rows.map((row) => {
            const Icon = row.icon
            const isConfirmed = row.status === 'confirmed'
            return (
              <div key={row.name} className="flex items-center gap-3 p-3 sm:p-4">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isConfirmed
                    ? 'bg-emerald-50 dark:bg-emerald-950/30'
                    : 'bg-amber-50 dark:bg-amber-950/20'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    isConfirmed
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-500'
                  }`} />
                </div>
                <dt className="flex-1 min-w-0 text-sm font-medium text-foreground">
                  {row.name}
                </dt>
                <dd className={`text-sm font-semibold shrink-0 ${
                  isConfirmed
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {isConfirmed && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />}
                  {!isConfirmed && <Clock className="inline h-3.5 w-3.5 mr-1" />}
                  {row.value}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>

      {/* Footer link to learn more (future /how-verification-works page) */}
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
// 9. PlatformFaqs — industry-specific platform-level FAQs (always renders)
// ════════════════════════════════════════════════════════════════════════════

/**
 * 3 platform-level FAQs about hiring this industry in this city. Always
 * renders — even when the business has no FAQs of their own. Sub-industry
 * aware (window cleaning, carpet cleaning, etc.). Uses the same native
 * <details>/<summary> accordion pattern as the existing business-authored
 * FAQs section.
 *
 * The FAQs returned here are ALSO merged into the FAQ JSON-LD schema
 * by page.tsx so every detail page is eligible for FAQ rich results
 * in Google Search.
 *
 * Clearly labeled as category/location FAQs (not business-authored) so
 * visitors understand the distinction.
 */
export function PlatformFaqs({ business }: EvergreenProps) {
  const industryName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )
  const cityName = business.city || 'your area'
  const faqs: PlatformFaq[] = getIndustryPlatformFaqs(
    business.industry,
    business.city,
    business.name,
    business.tagline,
  )

  return (
    <section aria-labelledby="platform-faqs-heading" className="space-y-4">
      <div>
        <h2 id="platform-faqs-heading" className="text-2xl font-bold tracking-tight">
          Frequently asked questions about {industryName.toLowerCase()} in {cityName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Common questions about hiring a {industryName.toLowerCase()} provider —
          these are category-level FAQs, not answers supplied by {business.name}.
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

// ════════════════════════════════════════════════════════════════════════════
// 10. ExploreCategoryInCity — DISCOVERY LAYER internal-linking hub
// ════════════════════════════════════════════════════════════════════════════

/**
 * Internal-linking hub at the bottom of the detail page. Part of the
 * consultant's "Layer 3 DISCOVERY" — connects this business page to the
 * broader marketplace topical architecture so Google understands how the
 * page relates to its category, its location, and the marketplace as a
 * whole.
 *
 * Renders three blocks:
 *
 *   1. "Explore {Industry} in {City}" — sub-category links derived from
 *      the CommonServices list. Each links to the existing
 *      /{pluralSlug}/{city} browse page with a `?service={slugified}` query
 *      param so the marketplace grid can pre-filter (the browse page
 *      already reads query params for filtering). Sub-industry aware.
 *
 *   2. "View all {industry} businesses in {city} →" — the primary CTA
 *      linking to /{pluralSlug}/{city}. This is the same URL the
 *      Similar Businesses subtitle links to, but presented here as a
 *      prominent full-width CTA so visitors who scroll past the similar
 *      cards still see the discovery path.
 *
 *   3. "Browse {industry} nationwide →" — secondary CTA linking to
 *      /{pluralSlug} (the industry-only hub page). Captures visitors
 *      whose intent is broader than one city.
 *
 * Renders always (even when similarProviders is empty) because the
 * internal-linking value is independent of peer listings — the
 * category/location pages exist regardless.
 *
 * URLs are RELATIVE so they work on any host (localhost / fieseros.com /
 * custom domains). The plural industry slug is derived from the business's
 * canonical industry via mapIndustryToPluralSlug().
 */
export function ExploreCategoryInCity({ business }: EvergreenProps) {
  const industryName = getResolvedIndustryDisplayName(
    business.industry,
    business.name,
    business.tagline,
  )
  const cityName = business.city || 'your area'
  const pluralSlug = mapIndustryToPluralSlug(business.industry)
  // If we can't resolve a plural slug (unknown industry), don't render the
  // section — the links would 404. The business page still has all the
  // other content sections; this is a progressive enhancement.
  if (!pluralSlug) return null

  const cityBrowseUrl = `/${pluralSlug}/${business.cityUrlSlug}`
  const industryBrowseUrl = `/${pluralSlug}`

  // Derive sub-category links from the CommonServices list. Each links to
  // the city browse page with a `?service={slugified}` query param. The
  // marketplace browse page reads this param and pre-filters the grid.
  // Cap at 6 links so the section stays compact.
  const commonServices = getIndustryCommonServices(
    business.industry,
    business.name,
    business.tagline,
  )
  const subCategoryLinks = commonServices.slice(0, 6).map((s) => {
    const serviceSlug = s.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    return {
      label: s.name,
      href: `${cityBrowseUrl}?service=${encodeURIComponent(serviceSlug)}`,
    }
  })

  return (
    <section
      aria-labelledby="explore-heading"
      className="mt-12 lg:mt-16 pt-12 lg:pt-16 border-t"
    >
      <h2 id="explore-heading" className="text-2xl font-bold tracking-tight mb-2">
        Explore {industryName} in {cityName}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        More {industryName.toLowerCase()} businesses, services, and hiring
        resources in {cityName} and across the marketplace.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Sub-category links (derived from CommonServices) ─────────── */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Common {industryName} services in {cityName}
          </h3>
          {subCategoryLinks.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {subCategoryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1.5 text-sm text-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sub-category links available for this industry.
            </p>
          )}
        </div>

        {/* ── Primary + secondary CTAs ─────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Link
            href={cityBrowseUrl}
            className="group flex-1 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-5 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  View all {industryName} businesses in {cityName}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse the full marketplace listing for {cityName}.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </Link>
          <Link
            href={industryBrowseUrl}
            className="group rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                Browse {industryName} nationwide
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

// Re-export the templated-description detector for the page to use if needed.
export { isTemplatedDescription } from '@/lib/marketplace/industry-content'

// Keep the getIndustryDisplayName import available for downstream consumers
// that import from this module (back-compat).
export { getIndustryDisplayName } from '@/lib/seo/industry-software-pages'
