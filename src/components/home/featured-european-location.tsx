import Link from 'next/link';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import {
  getCurrentFeaturedLocation,
  type FeaturedLocationInfo,
} from '@/lib/featured-location';

/**
 * FeaturedEuropeanLocation
 * =========================
 * Server-rendered homepage hero that surfaces the currently-featured European
 * city. The city is picked by a STANDALONE hourly cron at
 * `/api/cron/featured-location` (registered on cron-job.org — NOT wired into
 * the Vercel master cron, per the user's explicit instruction).
 *
 * Why this exists:
 *   • SEO: rotating internal links to /directory/{country}/{city} pages
 *     distributes link equity across all 350 seeded European cities.
 *   • Freshness: returning visitors see a new city every hour, which makes
 *     the homepage feel alive without requiring manual content updates.
 *   • Discovery: surfaces the directory feature to homepage visitors who
 *     might not otherwise know it exists.
 *
 * Rendering rules:
 *   • Anonymous visitors only — authed users skip the landing page entirely
 *     (handled by the parent page.tsx which doesn't render this component
 *     when the auth cookie is present).
 *   • If no FeaturedLocation row exists yet (fresh install, cron hasn't
 *     run), renders nothing — the homepage layout doesn't have a gap because
 *     this component returns null.
 *   • If `isStale === true` (cron hasn't fired in 2h+), still renders but
 *     shows a small "last updated Xh ago" hint so visitors know it isn't
 *     actively rotating.
 *
 * Performance:
 *   • `getCurrentFeaturedLocation()` uses a 5-minute in-process cache, so a
 *     busy homepage doesn't hammer the DB on every request.
 *   • This component is a server component (no `'use client'`) so it adds
 *     zero JS to the client bundle.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Human-readable "X hours ago" formatter for the staleness hint.
 * Returns null for < 1 hour (no hint shown — fresh enough).
 */
function formatHoursAgo(selectedAtIso: string): string | null {
  const selectedAt = new Date(selectedAtIso);
  if (Number.isNaN(selectedAt.getTime())) return null;
  const diffMs = Date.now() - selectedAt.getTime();
  const diffH = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffH < 1) return null;
  if (diffH === 1) return '1 hour ago';
  if (diffH < 24) return `${diffH} hours ago`;
  const diffD = Math.floor(diffH / 24);
  return diffD === 1 ? '1 day ago' : `${diffD} days ago`;
}

/**
 * Format the city's population for display: 3669491 → "3.7M", 75036 → "75K".
 */
function formatPopulation(pop: number): string {
  if (pop >= 1_000_000) {
    return `${(pop / 1_000_000).toFixed(1)}M`;
  }
  if (pop >= 1_000) {
    return `${Math.round(pop / 1_000)}K`;
  }
  return String(pop);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StalenessBadge({ selectedAt }: { selectedAt: string }) {
  const ago = formatHoursAgo(selectedAt);
  if (!ago) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/60"
      title={`Last rotated ${ago}`}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      Updated {ago}
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export async function FeaturedEuropeanLocation() {
  // ─── TEMPORARILY DISABLED ───────────────────────────────────────────────
  // The CTA links in this banner (/directory and /directory/{cc}/{city}) are
  // 404s — the /directory route does not exist in src/app/ yet. Showing the
  // banner sends anonymous visitors + crawlers to dead pages, which hurts SEO
  // and UX. The banner is hidden until the /directory route is built.
  //
  // To re-enable: build the /directory route, verify the FeaturedLocation cron
  // is rotating through a fully-seeded DirectoryLocation table, then delete
  // this early return. Everything below is preserved as-is.
  return null;

  let featured: FeaturedLocationInfo | null;
  try {
    featured = await getCurrentFeaturedLocation();
  } catch (err) {
    // Defensive: never let a DB error break the homepage. Log and render nothing.
    console.error('[FeaturedEuropeanLocation] read failed:', err);
    return null;
  }

  if (!featured) {
    // Fresh install: cron hasn't run yet, or no European cities are seeded.
    // Render nothing — homepage layout doesn't have a gap because this
    // component returns null.
    return null;
  }

  const {
    city,
    countryName,
    countryCode,
    citySlug,
    directoryUrl,
    population,
    selectedAt,
    isStale,
  } = featured;

  return (
    <section
      aria-label={`Featured European location: ${city}, ${countryName}`}
      className="border-b border-border bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-950/30 dark:via-background dark:to-sky-950/30"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: location identity */}
          <div className="flex flex-1 items-start gap-4">
            {/* Flag-style country badge — uses emoji flag derived from ISO code */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10"
              aria-hidden="true"
              title={`${countryName} (${countryCode})`}
            >
              {countryCodeToFlagEmoji(countryCode)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  Featured European location
                </span>
                {isStale && <StalenessBadge selectedAt={selectedAt} />}
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {city}, {countryName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {population > 0 && (
                  <>
                    Population ~{formatPopulation(population)}.{' '}
                  </>
                )}
                Discover verified service businesses across {city} and the
                wider {countryName} region.
              </p>
            </div>
          </div>

          {/* Right: CTA */}
          <Link
            href={directoryUrl}
            className="group inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            aria-label={`Browse service businesses in ${city}, ${countryName}`}
          >
            Browse {city}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Tiny "rotates every hour" hint — invisible to screen readers (aria-hidden)
            because it's purely informational and already implied by the badge above. */}
        <p
          className="mt-6 text-center text-[11px] uppercase tracking-wider text-muted-foreground/70 sm:text-left sm:text-xs"
          aria-hidden="true"
        >
          Spotlight rotates every hour ·{' '}
          <Link
            href="/directory"
            className="underline-offset-2 hover:underline"
            tabIndex={-1}
          >
            Browse all 350+ European cities →
          </Link>
        </p>

        {/* Hidden semantic link for crawlers — the city + country name as anchor
            text gives Google clear context for the directory page. */}
        <Link
          href={directoryUrl}
          className="sr-only"
          aria-label={`Directory of service businesses in ${city}, ${countryName}`}
        >
          {city}, {countryName} service businesses directory
        </Link>

        {/* Structured data: declare the city so Google can rich-result it */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'City',
              name: city,
              addressRegion: countryName,
              addressCountry: countryCode,
              url: directoryUrl,
            }),
          }}
        />
      </div>
    </section>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Convert an ISO-3166 alpha-2 country code to its emoji flag.
 *   'DE' → 🇩🇪, 'GB' → 🇬🇧, 'UA' → 🇺🇦
 *
 * Implementation: each letter's codepoint is mapped to a regional indicator
 * symbol by adding 0x1F1E6 - 0x41 (i.e. regional indicator A = 'A' + 0x1F1E6 - 0x41).
 * Works for all valid ISO-3166 alpha-2 codes. Returns the seeded globe emoji
 * 🌍 as a fallback for invalid input (so the UI never renders a blank badge).
 */
function countryCodeToFlagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  const cpA = 0x1f1e6; // regional indicator symbol letter A
  const cpBase = 'A'.charCodeAt(0);
  const cp1 = cpA + (code.charCodeAt(0) - cpBase);
  const cp2 = cpA + (code.charCodeAt(1) - cpBase);
  return String.fromCodePoint(cp1, cp2);
}
