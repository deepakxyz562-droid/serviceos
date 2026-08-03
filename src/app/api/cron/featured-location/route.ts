import { NextRequest, NextResponse } from 'next/server';
import type { DirectoryLocation } from '@prisma/client';

import { verifyCronAuth } from '@/lib/cron-auth';
import { db } from '@/lib/db';
import { pickRandomEuropeanLocation } from '@/lib/featured-location';

/**
 * POST /api/cron/featured-location  —  Hourly Featured European Location Picker
 * ============================================================================
 *
 * WHAT THIS CRON DOES
 * -------------------
 * Standalone hourly cron that picks a random European `DirectoryLocation` row
 * (population-weighted, so larger cities surface more often) and stores it as
 * the current `FeaturedLocation` (singleton row with `key='current'`). The
 * homepage hero reads from that singleton via `getCurrentFeaturedLocation()`
 * in `src/lib/featured-location.ts` (cached 5 minutes server-side, with a
 * defensive 1-hour staleness eviction so the homepage eventually notices if
 * this cron stops firing).
 *
 * RECOMMENDED SCHEDULE: `0 * * * *`  — top of every hour, UTC.
 *
 * AUTH
 * ----
 * Shared secret enforced by `verifyCronAuth(request)` from
 * `src/lib/cron-auth.ts`. Accepted sources (in priority order):
 *   1. `x-cron-secret` header                 (preferred — used by cron-job.org)
 *   2. `Authorization: Bearer <secret>` header (used by Vercel Cron, GitHub Actions)
 *   3. `?key=<secret>` OR `?secret=<secret>`   (fallback for services that can't set headers)
 * The secret must match the `CRON_SECRET` env var. In dev (NODE_ENV !==
 * 'production') the route falls back to allow-if-unset. Do NOT add custom
 * auth here — the helper already covers every supported source.
 *
 * NOT WIRED INTO THE MASTER CRON  (explicit user instruction)
 * ----------------------------------------------------------
 * This endpoint is INTENTIONALLY ABSENT from the `DAILY_CRONS` /
 * `MONTHLY_CRONS` arrays in `src/app/api/cron/master/route.ts`. The master
 * cron is daily-only (Vercel Hobby 1-cron limit + 60s timeout); this route
 * needs an hourly cadence, so it is triggered EXTERNALLY via cron-job.org
 * and registered ONLY in `cron-configs/cron-job-org-import.json` (handled by
 * another agent). Do NOT add this endpoint to the master cron or to the
 * "All Cron Jobs (Reference)" table in `cron-configs/README.md`.
 *
 * POPULATION-WEIGHTED SELECTION
 * -----------------------------
 * `pickRandomEuropeanLocation()` fetches all ~350 active European
 * `DirectoryLocation` rows into memory and picks one with per-city weight
 * `Math.max(1, population)`. Larger cities (Moscow, Istanbul, London, Paris)
 * surface proportionally more often — typically every few hours — while the
 * smallest (Vaduz, San Marino) surface roughly once a week. Every city has
 * a non-zero chance on every tick. See `src/lib/featured-location.ts` for
 * the full algorithm.
 *
 * IDEMPOTENCY + SAME-HOUR SHORT-CIRCUIT
 * -------------------------------------
 * The `upsert` on `key='current'` is naturally idempotent: a duplicate fire
 * in the same hour just overwrites the singleton with a fresh `selectedAt`
 * and the same `hourBucket`. As a nice-to-have, we short-circuit BEFORE
 * picking: if a `FeaturedLocation` row with `key='current'` already exists,
 * its `hourBucket` matches the current UTC hour, the joined location is
 * still active, and its `selectedAt` is less than 50 minutes ago, we return
 * `{ success: true, skipped: true, reason: 'already-selected-this-hour' }`
 * without re-picking. This avoids burning a picker query + upsert on
 * cron-job.org's occasional double-fires and keeps the homepage hero stable
 * within an hour.
 *
 * FRESH INSTALL WITH NO SEED DATA
 * -------------------------------
 * If `pickRandomEuropeanLocation()` throws (which it does when the
 * `DirectoryLocation` table has no active European rows — i.e. the seed
 * hasn't been run yet), this endpoint returns HTTP 500 with:
 *   {
 *     error: 'No European locations seeded',
 *     details: <err.message>,
 *     hint: 'Run: bun run prisma/seed-directory.ts'
 *   }
 *
 * RESPONSE SHAPES
 * ---------------
 * Success:
 *   {
 *     success: true,
 *     selectedAt: '2025-01-15T14:00:00.123Z',   // ISO
 *     hourBucket: '2025-01-15T14:00:00.000Z',   // ISO hour bucket
 *     location: {
 *       countryCode: 'DE',
 *       countryName: 'Germany',
 *       city: 'Berlin',
 *       citySlug: 'berlin',
 *       directoryUrl: '/directory/de/berlin',
 *     },
 *   }
 *
 * Skipped (same-hour short-circuit):
 *   {
 *     success: true,
 *     skipped: true,
 *     reason: 'already-selected-this-hour',
 *     selectedAt, hourBucket,
 *     location: { ... },
 *   }
 *
 * No seed (HTTP 500): see "FRESH INSTALL" section above.
 *
 * Other unexpected error (HTTP 500):
 *   { error: 'Cron run failed', details: <err.message> }
 *
 * METHOD ALIAS
 * -----------
 * GET is an alias for POST so the route can be triggered from a browser or
 * curl for manual testing — same pattern as `/api/cron/appointment-reminders`.
 */

/**
 * Window within which a duplicate cron tick in the same hour is short-circuited.
 * 50 minutes — generous enough to absorb cron-job.org's occasional double-fires,
 * narrow enough that a tick near the end of one hour (e.g. HH:59) won't block
 * the next hour's tick (HH+1:00).
 */
const SAME_HOUR_SKIP_MS = 50 * 60 * 1000;

/**
 * Compute the current UTC hour bucket as an ISO string truncated to the hour,
 * e.g. `2025-01-15T14:00:00.000Z`. Matches the hour-bucketing convention used
 * elsewhere in the codebase.
 */
function computeHourBucket(d: Date = new Date()): string {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
    ),
  ).toISOString();
}

/**
 * Project a `DirectoryLocation` row into the public response shape. We expose
 * only the fields the homepage / external integrations need — `id`, lat/lng,
 * population, etc. stay server-side.
 */
function formatLocationResponse(location: DirectoryLocation): {
  countryCode: string;
  countryName: string;
  city: string;
  citySlug: string;
  directoryUrl: string;
} {
  return {
    countryCode: location.countryCode,
    countryName: location.countryName,
    city: location.city,
    citySlug: location.citySlug,
    directoryUrl: `/directory/${location.countryCode.toLowerCase()}/${location.citySlug}`,
  };
}

/**
 * Coerce a `selectedAt` value (which may be a `Date` under Prisma or an ISO
 * string under the Supabase REST adapter — see `src/lib/db.ts` and
 * `src/lib/supabase-db.ts`) to an epoch-ms number, or `null` if unparseable.
 * Duplicated locally from `src/lib/featured-location.ts`'s `toDate()` rather
 * than imported, to keep this route self-contained (and because that helper
 * is not exported). Keep both in sync if extended.
 */
function toEpochMs(value: Date | string): number | null {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'string') {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // ─── Auth: unified cron secret ────────────────────────────────────
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const hourBucket = computeHourBucket();
    const nowMs = Date.now();

    // ─── Same-hour short-circuit (best-effort) ────────────────────────
    // cron-job.org occasionally double-fires within the same hour. If we
    // already picked a location this hour (matching hourBucket, < 50 min
    // ago, and the joined location is still active), skip the re-pick.
    // Wrapped in its own try/catch so a failure here never blocks the main
    // pick path — at worst we waste one extra picker query.
    try {
      const existing = await db.featuredLocation.findUnique({
        where: { key: 'current' },
        include: { location: true },
      });

      if (existing) {
        const selectedAtMs = toEpochMs(existing.selectedAt);
        // Defensive cast: Prisma types `existing.location` as non-null, but
        // the Supabase REST adapter may not enforce FKs strictly.
        const existingLocation =
          existing.location as DirectoryLocation | null | undefined;

        if (
          selectedAtMs !== null &&
          existing.hourBucket === hourBucket &&
          nowMs - selectedAtMs < SAME_HOUR_SKIP_MS &&
          existingLocation &&
          existingLocation.isActive
        ) {
          console.log(
            `[cron featured-location] ⏭️  Skipped (already selected this hour): ${existingLocation.city}, ${existingLocation.countryCode} (hourBucket=${hourBucket})`,
          );
          return NextResponse.json({
            success: true,
            skipped: true,
            reason: 'already-selected-this-hour',
            selectedAt: new Date(selectedAtMs).toISOString(),
            hourBucket: existing.hourBucket,
            location: formatLocationResponse(existingLocation),
          });
        }
      }
    } catch (shortCircuitErr) {
      // Best-effort: log and fall through to the main pick path.
      console.warn(
        '[cron featured-location] short-circuit check failed, continuing to pick:',
        shortCircuitErr,
      );
    }

    // ─── Pick a random European location (population-weighted) ────────
    let picked: DirectoryLocation;
    try {
      picked = await pickRandomEuropeanLocation();
    } catch (pickErr) {
      // No European rows seeded → tell the operator exactly what to run.
      console.error('[cron featured-location]', pickErr);
      const details = pickErr instanceof Error ? pickErr.message : String(pickErr);
      return NextResponse.json(
        {
          error: 'No European locations seeded',
          details,
          hint: 'Run: bun run prisma/seed-directory.ts',
        },
        { status: 500 },
      );
    }

    // ─── Upsert the singleton FeaturedLocation row (key='current') ────
    const selectedAt = new Date();
    await db.featuredLocation.upsert({
      where: { key: 'current' },
      create: {
        key: 'current',
        locationId: picked.id,
        hourBucket,
        selectedAt,
      },
      update: {
        locationId: picked.id,
        hourBucket,
        selectedAt,
      },
    });

    console.log(
      `[cron featured-location] ✅ Selected: ${picked.city}, ${picked.countryCode} (hourBucket=${hourBucket})`,
    );

    return NextResponse.json({
      success: true,
      selectedAt: selectedAt.toISOString(),
      hourBucket,
      location: formatLocationResponse(picked),
    });
  } catch (error) {
    // Catch-all for any unexpected error (DB connection failure, upsert
    // error, etc.). Don't leak stack traces — just the message.
    console.error('[cron featured-location]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Cron run failed', details: message },
      { status: 500 },
    );
  }
}

// GET alias — allows easy browser/curl testing and GET triggers from
// cron-job.org (same pattern as /api/cron/appointment-reminders).
export async function GET(request: NextRequest) {
  return POST(request);
}
