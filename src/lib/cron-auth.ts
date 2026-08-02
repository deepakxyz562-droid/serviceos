import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Unified cron authentication helper.
 *
 * All cron routes under /api/cron/* MUST use `verifyCronAuth(request)` instead
 * of inline secret checks. This eliminates the historical `fieseros-cron-dev`
 * fallback (a public hardcoded constant that allowed anyone to trigger billing
 * mutations, mass email sends, and Stripe transfers when CRON_SECRET was unset).
 *
 * Auth sources accepted (in priority order):
 *   1. `x-cron-secret` header                 (preferred — used by cron-job.org, Netlify, QStash)
 *   2. `Authorization: Bearer <secret>` header (used by Vercel Cron, GitHub Actions)
 *   3. `?key=<secret>` OR `?secret=<secret>`   (fallback for services that can't set headers)
 *
 * Security policy:
 *   - Production: if CRON_SECRET is unset → 401 (refuse to run, log error)
 *   - Development: if CRON_SECRET is unset → allow with a warning (local testing only)
 *   - If CRON_SECRET is set but the provided secret doesn't match → 401 + warning log
 *
 * Usage:
 *   ```ts
 *   export async function POST(request: NextRequest) {
 *     const auth = await verifyCronAuth(request);
 *     if (!auth.ok) return auth.response;
 *     // ... cron logic
 *   }
 *   ```
 */
export type CronAuthResult =
  | { ok: true; isDev: boolean }
  | { ok: false; response: NextResponse };

export function verifyCronAuth(request: NextRequest): CronAuthResult {
  const component = 'cron-auth';
  const expectedSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV !== 'production';

  // Collect the provided secret from any supported source
  const headerSecret = request.headers.get('x-cron-secret');
  const bearerHeader = request.headers.get('authorization') || '';
  const bearerMatch = bearerHeader.match(/^Bearer\s+(.+)$/i);
  const querySecret =
    new URL(request.url).searchParams.get('key') ||
    new URL(request.url).searchParams.get('secret');

  const providedSecret = headerSecret || bearerMatch?.[1] || querySecret || '';

  // CRON_SECRET not configured
  if (!expectedSecret) {
    if (isDev) {
      logger.warn(
        { component },
        'CRON_SECRET not set — allowing cron in dev mode (no auth). Set CRON_SECRET in production!',
      );
      return { ok: true, isDev: true };
    }
    logger.error(
      { component },
      'CRON_SECRET not set in production — refusing to run cron job',
    );
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Cron authentication not configured' },
        { status: 401 },
      ),
    };
  }

  // CRON_SECRET configured but secret mismatch
  if (providedSecret !== expectedSecret) {
    logger.warn(
      {
        component,
        hasHeader: !!headerSecret,
        hasBearer: !!bearerMatch,
        hasQuery: !!querySecret,
      },
      'Unauthorized cron attempt',
    );
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true, isDev };
}
