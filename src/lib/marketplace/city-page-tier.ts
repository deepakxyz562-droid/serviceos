/**
 * city-page-tier.ts — 4-tier classification for city+category directory pages.
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS:
 *   The marketplace has 19 industry routes (one plural browse + 18
 *   "{industry}-contractors" routes) multiplied by every city slug we have
 *   in DirectoryLocation plus any long-tail city slug a user types in. At
 *   50K+ possible city+category combinations, indexing every page that
 *   happens to render even one provider is the textbook programmatic-SEO
 *   failure mode: Google sees thousands of thin pages, decides most aren't
 *   useful, and de-prioritizes the entire subdirectory.
 *
 *   The 4-state EMPTY/SPARSE/READY/STRONG model solves this by only letting
 *   pages with enough aggregate provider quality enter the index:
 *
 *     STRONG  → index aggressively (10+ providers, 5+ quality)  priority 0.8
 *     READY   → index (5+ providers, 2+ quality)                priority 0.6
 *     SPARSE  → noindex, follow (1-4 providers — too thin)      not in sitemap
 *     EMPTY   → noindex, follow (0 providers)                   not in sitemap
 *
 *   `follow` is preserved on the noindex tiers so link equity still flows
 *   to the "list your business" CTA + nearby-city links rendered on those
 *   pages. Discoverable, not indexed — the consultant's recommendation.
 *
 * DISTINCTION FROM profile-tier.ts:
 *   profile-tier.ts scores INDIVIDUAL business profiles (Tier A/B/C) based
 *   on per-listing enrichment (claimed, description length, images, badges).
 *   This file scores CITY+CATEGORY PAGES based on aggregate provider
 *   quality across all the providers the page renders. A page of 12 thin
 *   Tier-C listings is still EMPTY/SPARSE here even though every individual
 *   profile has its own (low) tier.
 */

import type { ProviderListItem } from '@/components/marketplace/types'

export type CityPageTier = 'EMPTY' | 'SPARSE' | 'READY' | 'STRONG'

/**
 * Inputs to the city-page tier scorer. All fields are pre-computed by the
 * caller from the page's `ProviderListItem[]` array (the same array the
 * page body renders). Kept as a flat interface so callers can pass either
 * derived counts or — via `computeCityPageTierFromProviders` below — just
 * the raw provider list + a known-city flag.
 */
export interface CityPageTierInputs {
  /** Total provider count for this city+category (from the page's findMany). */
  providerCount: number
  /** How many of those providers are "quality" — claimed OR ≥1 review OR
   *  ≥1 verification badge (identity/business/insurance). Computed by caller
   *  from the ProviderListItem[] array. */
  qualityProviderCount: number
  /** Whether ANY provider has a website listed. */
  hasAnyWebsite: boolean
  /** Whether ANY provider has a phone number. */
  hasAnyPhone: boolean
  /** Whether the city exists in DirectoryLocation (known city vs. long-tail). */
  isKnownCity: boolean
}

export interface CityPageTierResult {
  tier: CityPageTier
  /** Should this page be indexed by search engines? */
  shouldIndex: boolean
  /** Sitemap priority (0.0-1.0). 0 = don't emit to sitemap. */
  sitemapPriority: number
  /** Human-readable reason for the tier (for logging/debugging). */
  reason: string
}

/**
 * Compute the city-page tier from the inputs. Pure function — no I/O, no
 * side effects. Safe to call from server components, API routes, sitemap
 * generation, and metadata functions.
 *
 * Tiering is deliberately conservative: when in doubt, return the LOWER
 * tier. A borderline-READY page landing in SPARSE (noindex) is fine — the
 * page is still crawlable, just not indexed until more providers enroll.
 * A borderline-SPARSE page landing in READY and getting indexed at scale
 * is the failure mode we're protecting against.
 *
 * Evaluation order matters: STRONG is checked before READY (so a 15-provider
 * page with 7 quality doesn't fall through to READY), and both are checked
 * before SPARSE (so a 6-provider page that misses the READY quality bar
 * falls through to SPARSE, not EMPTY).
 */
export function computeCityPageTier(inputs: CityPageTierInputs): CityPageTierResult {
  const { providerCount, qualityProviderCount, hasAnyPhone, isKnownCity } = inputs

  // ── EMPTY: zero providers ──────────────────────────────────────────────
  // No providers at all → never index. We still keep `follow` (handled by
  // the caller's robots config) so nearby-city + "list your business"
  // links on the empty-state page still pass link equity.
  if (providerCount <= 0) {
    const reason = isKnownCity
      ? 'No providers listed'
      : 'No providers listed (unknown city)'
    return { tier: 'EMPTY', shouldIndex: false, sitemapPriority: 0.0, reason }
  }

  // ── STRONG: 10+ providers with 5+ quality + at least one phone ─────────
  // The "index aggressively" tier. A page this rich is genuinely useful to
  // searchers and earns a high sitemap priority so Google crawls it sooner.
  if (
    providerCount >= 10 &&
    qualityProviderCount >= 5 &&
    hasAnyPhone
  ) {
    return {
      tier: 'STRONG',
      shouldIndex: true,
      sitemapPriority: 0.8,
      reason: '10+ providers with 5+ quality',
    }
  }

  // ── READY: 5+ providers with 2+ quality + at least one phone ───────────
  // The baseline "indexable" tier. Enough providers + enough enrichment
  // that the page offers real value vs. a bare directory listing.
  if (
    providerCount >= 5 &&
    qualityProviderCount >= 2 &&
    hasAnyPhone
  ) {
    return {
      tier: 'READY',
      shouldIndex: true,
      sitemapPriority: 0.6,
      reason: '5-9 providers with 2+ quality',
    }
  }

  // ── SPARSE: 1-4 providers (or missed the READY quality bar) ────────────
  // Catch-all for "page rendered something but not enough to index".
  // Covers both 1-4 provider pages AND 5+ provider pages where the quality
  // bar wasn't met (e.g. 7 unclaimed seed listings with no reviews/badges).
  return {
    tier: 'SPARSE',
    shouldIndex: false,
    sitemapPriority: 0.0,
    reason: '1-4 providers — too thin to index',
  }
}

/**
 * Count how many providers in a list are "quality" — meaning the profile
 * has real enrichment beyond just a name + address. A provider counts as
 * quality if ANY of:
 *   - claimed === true (owner has claimed the listing)
 *   - reviewCount >= 1
 *   - identityVerified OR businessVerified OR insuranceVerified
 *   - has a website (googleBusinessProfileUrl OR website field is non-empty)
 *
 * Exported so route files don't each reimplement this logic. Mirrors the
 * per-listing enrichment signals used by profile-tier.ts but uses OR (any
 * one signal is enough) instead of AND, because at the page level we're
 * counting "how many listings have ANY signal" — not scoring each one.
 *
 * Defensive about nulls/undefined: the ProviderListItem type marks
 * `claimed`, `website`, `phone`, `googleBusinessProfileUrl` as optional,
 * and `reviewCount` is `number | null`. All branches handle the missing
 * case without throwing.
 */
export function computeQualityProviderCount(providers: ProviderListItem[]): number {
  let count = 0
  for (const p of providers) {
    if (p.claimed) {
      count++
      continue
    }
    if ((p.reviewCount ?? 0) >= 1) {
      count++
      continue
    }
    if (p.identityVerified || p.businessVerified || p.insuranceVerified) {
      count++
      continue
    }
    if (p.googleBusinessProfileUrl || p.website) {
      count++
      continue
    }
  }
  return count
}

/**
 * Convenience wrapper: take a raw `ProviderListItem[]` + `isKnownCity` flag
 * and return the full `CityPageTierResult`. Internally computes the
 * providerCount, qualityProviderCount, hasAnyWebsite, and hasAnyPhone
 * inputs in a single pass over the array, then delegates to
 * `computeCityPageTier`.
 *
 * Use this from route `generateMetadata` / sitemap builders when you
 * already have the provider array loaded for the page body — avoids a
 * second DB round-trip just to compute the tier.
 */
export function computeCityPageTierFromProviders(
  providers: ProviderListItem[],
  isKnownCity: boolean,
): CityPageTierResult {
  let qualityProviderCount = 0
  let hasAnyWebsite = false
  let hasAnyPhone = false

  for (const p of providers) {
    if (p.claimed) {
      qualityProviderCount++
    } else if ((p.reviewCount ?? 0) >= 1) {
      qualityProviderCount++
    } else if (p.identityVerified || p.businessVerified || p.insuranceVerified) {
      qualityProviderCount++
    } else if (p.googleBusinessProfileUrl || p.website) {
      qualityProviderCount++
    }

    if (!hasAnyWebsite && (p.googleBusinessProfileUrl || p.website)) {
      hasAnyWebsite = true
    }
    if (!hasAnyPhone && p.phone) {
      hasAnyPhone = true
    }
  }

  return computeCityPageTier({
    providerCount: providers.length,
    qualityProviderCount,
    hasAnyWebsite,
    hasAnyPhone,
    isKnownCity,
  })
}
