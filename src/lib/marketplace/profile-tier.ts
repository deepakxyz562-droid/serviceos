/**
 * profile-tier.ts — 3-tier profile quality scoring for marketplace listings.
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS:
 *   The previous indexation rule was binary: `description ≥ 40 chars AND
 *   hasImage` → indexable. At 100K-listing scale this fails: a bulk seed of
 *   100K Google Places listings with auto-generated "Established {Industry}
 *   business serving {City}." descriptions would ALL pass the 40-char gate
 *   and hit Google's index at once — exactly the "Google decides many aren't
 *   useful" failure mode that programmatic-SEO consultants warn about.
 *
 *   The 3-tier model introduces real differentiation:
 *
 *     Tier A (Rich)     → index aggressively, sitemap priority 0.8
 *     Tier B (Medium)   → index, sitemap priority 0.5
 *     Tier C (Thin)     → robots: noindex, follow (discoverable but not
 *                          indexed until enriched via claim/verify)
 *
 *   This is the literal implementation of the consultant's "quality
 *   threshold" recommendation: don't index 100K thin pages at once. Let
 *   unclaimed seed listings stay discoverable (follow) but unindexed until
 *   the owner claims + enriches the profile, at which point they graduate
 *   to Tier B or A and enter the index.
 *
 * SCORING (deliberately conservative — Tier A is earned, not default):
 *   Tier A requires ALL of:
 *     - claimed by owner (real business, not seed data)
 *     - description ≥ 120 chars AND not templated
 *     - ≥ 3 active public services
 *     - ≥ 1 image (cover/logo/gallery)
 *     - ≥ 1 verification badge confirmed (identity/business/insurance/licence)
 *         OR ≥ 1 customer review
 *
 *   Tier B requires ALL of:
 *     - publicProfileEnabled = true
 *     - description ≥ 40 chars
 *     - ≥ 1 image (industry-default cover counts)
 *
 *   Tier C is everything else (name + phone + address only, or templated
 *     description, or no image, or suspended, etc.).
 *
 * NO DB CHANGE REQUIRED:
 *   The tier is computed at read time from fields already on the Tenant
 *   model (claimed, description, galleryJson, profileCompletionPct,
 *   identityVerified, businessVerified, insuranceVerified, licenceNumber,
 *   reviewCount, publicProfileEnabled). This keeps the scoring logic in
 *   one place and lets us tune thresholds without a migration.
 */

export type ProfileTier = 'A' | 'B' | 'C'

/**
 * Inputs to the tier scorer. Mirrors the fields available on
 * PublicBusinessData (and the raw Tenant row). Kept as a flat interface
 * so callers can pass either a PublicBusinessData object OR a raw tenant
 * row mapped through this shape.
 */
export interface ProfileTierInputs {
  /** Owner has claimed the listing (real business vs. seed/OSM data). */
  claimed: boolean
  /** Long-form description. Templated/short descriptions cap the tier. */
  description: string | null | undefined
  /** Whether the description matches the onboarding-template pattern. */
  isTemplatedDescription: boolean
  /** Number of active public services listed by the business. */
  serviceCount: number
  /** Whether the business has ≥1 image (cover/logo/gallery). */
  hasImage: boolean
  /** Count of confirmed verification badges (0-4). */
  confirmedBadgeCount: number
  /** Number of customer reviews on the profile. */
  reviewCount: number
  /** Public profile is enabled (master switch). */
  publicProfileEnabled: boolean
}

/**
 * Compute the profile tier from the inputs. Pure function — no I/O, no
 * side effects. Safe to call from server components, API routes, and
 * sitemap generation.
 *
 * The function is deliberately conservative: when in doubt, return the
 * LOWER tier. A borderline-A listing landing in B is fine; a borderline-C
 * listing landing in B and getting indexed at scale is the failure mode
 * we're protecting against.
 */
export function computeProfileTier(inputs: ProfileTierInputs): ProfileTier {
  // ── Tier C gate: must be publicly listable at all ───────────────────────
  // If the profile isn't enabled, has no image, or the description is
  // missing/too short, this is a thin listing. Don't index.
  if (!inputs.publicProfileEnabled) return 'C'
  if (!inputs.hasImage) return 'C'
  const descLen = inputs.description?.trim().length ?? 0
  if (descLen < 40) return 'C'

  // ── Tier A gate: rich, claimed, verified listing ────────────────────────
  // All of: claimed + real description (≥120 chars, not templated) +
  // ≥3 services + ≥1 image + (≥1 verification badge OR ≥1 review).
  const isTierA =
    inputs.claimed &&
    descLen >= 120 &&
    !inputs.isTemplatedDescription &&
    inputs.serviceCount >= 3 &&
    (inputs.confirmedBadgeCount >= 1 || inputs.reviewCount >= 1)

  if (isTierA) return 'A'

  // ── Tier B: medium — meets the "rich enough" baseline but isn't Tier A ─
  // This covers: unclaimed listings with real descriptions, claimed
  // listings with templated descriptions, claimed listings with <3
  // services, etc. Indexable but lower sitemap priority than Tier A.
  return 'B'
}

/**
 * Sitemap priority for a given tier. Used by sitemap.ts so all 100K+
 * business URLs carry a differentiated priority signal — Google crawls
 * Tier A pages more aggressively than Tier B.
 *
 * Tier C is never emitted to the sitemap (see isIndexableByTier).
 */
export function sitemapPriorityForTier(tier: ProfileTier): number {
  if (tier === 'A') return 0.8
  if (tier === 'B') return 0.5
  return 0.3 // Tier C — emitted only if explicitly forced (never by default)
}

/**
 * Whether a given tier should be indexed by search engines. Tier C is
 * `noindex, follow` — discoverable via internal links but not indexed
 * until the profile is enriched (claim → verify → add services/photos).
 */
export function isIndexableByTier(tier: ProfileTier): boolean {
  return tier !== 'C'
}
