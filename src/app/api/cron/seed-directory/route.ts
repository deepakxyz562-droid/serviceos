import { NextRequest, NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/cron-auth';
import { seedDirectory, type SeedResult } from '@/lib/directory-seed';

/**
 * POST /api/cron/seed-directory  —  Seed DirectoryLocation Table (European Cities)
 * ============================================================================
 *
 * WHAT THIS ENDPOINT DOES
 * -----------------------
 * Seeds (or refreshes) the `DirectoryLocation` table with ~350 major European
 * cities across 40+ countries. This is the production-safe equivalent of
 * running `bun run prisma/seed-directory.ts` locally — for servers where you
 * cannot run a CLI script (e.g. Vercel, shared hosting, PaaS without shell
 * access).
 *
 * Trigger it once from a browser or curl:
 *
 *   curl 'https://fieseros.com/api/cron/seed-directory?secret=$CRON_SECRET'
 *
 * WHY THIS EXISTS
 * ---------------
 * The hourly `/api/cron/featured-location` picker draws from `DirectoryLocation`
 * rows. If that table is empty (or only has one city like London seeded), the
 * homepage hero will be "stuck" on that single city forever. This endpoint
 * lets an operator populate the full European city set from production without
 * shell access.
 *
 * IDEMPOTENT — SAFE TO RE-RUN
 * ---------------------------
 * Every row is upserted on the composite unique key `(countryCode, citySlug)`.
 * Re-running refreshes population/lat/lng/timezone/currency/locale and
 * re-activates any soft-deleted row, but does NOT change the row id, so
 * existing `FeaturedLocation` foreign keys keep resolving. Run it as often as
 * you like.
 *
 * AUTH
 * ----
 * Shared secret enforced by `verifyCronAuth(request)` from
 * `src/lib/cron-auth.ts`. Accepted sources (in priority order):
 *   1. `x-cron-secret` header                 (preferred)
 *   2. `Authorization: Bearer <secret>` header
 *   3. `?key=<secret>` OR `?secret=<secret>`   (browser/curl fallback)
 * The secret must match the `CRON_SECRET` env var — the SAME secret your other
 * crons (`featured-location`, `appointment-reminders`, etc.) already use.
 *
 * NOT A RECURRING CRON
 * --------------------
 * This endpoint is intentionally a ONE-SHOT seeding tool, NOT a scheduled job.
 * Do NOT register it in cron-job.org or in `DAILY_CRONS`/`MONTHLY_CRONS` in
 * the master cron. Hit it manually whenever you (re)deploy to a fresh
 * database. (Re-running is harmless, just wasteful.)
 *
 * RESPONSE SHAPES
 * ---------------
 * Success (HTTP 200):
 *   {
 *     success: true,
 *     total: 350,                 // number of city rows upserted
 *     countries: 43,              // number of countries
 *     perCountry: { DE: 24, FR: 23, ... },
 *     durationMs: 4123,
 *     message: 'Seeded 350 DirectoryLocation rows across 43 countries'
 *   }
 *
 * Unauthorized (HTTP 401):
 *   { error: 'Unauthorized' } | { error: 'Cron authentication not configured' }
 *
 * Unexpected error (HTTP 500):
 *   { error: 'Directory seed failed', details: <err.message> }
 *
 * METHOD ALIAS
 * -----------
 * GET is an alias for POST so the route can be triggered from a browser
 * address bar for a one-shot manual run — same pattern as
 * `/api/cron/featured-location`.
 */

export async function POST(request: NextRequest) {
  try {
    // ─── Auth: unified cron secret (same as featured-location cron) ────
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    // ─── Run the shared seeding logic ──────────────────────────────────
    const result: SeedResult = await seedDirectory();

    console.log(
      `[cron seed-directory] ✅ Seeded ${result.total} DirectoryLocation rows ` +
        `across ${result.countries} countries in ${result.durationMs}ms`,
    );

    return NextResponse.json({
      success: true,
      total: result.total,
      countries: result.countries,
      perCountry: result.perCountry,
      durationMs: result.durationMs,
      message: `Seeded ${result.total} DirectoryLocation rows across ${result.countries} countries`,
    });
  } catch (error) {
    console.error('[cron seed-directory]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Directory seed failed', details: message },
      { status: 500 },
    );
  }
}

// GET alias — allows easy browser address-bar triggering for a one-shot
// manual seed (same pattern as /api/cron/featured-location).
export async function GET(request: NextRequest) {
  return POST(request);
}
