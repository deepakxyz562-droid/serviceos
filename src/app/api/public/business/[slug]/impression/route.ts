/**
 * POST /api/public/business/[slug]/impression
 * ─────────────────────────────────────────────────────────────────────────
 * Anonymous impression tracking for public business hub pages.
 *
 * Fires when a visitor lands on a Fieseros-powered business page
 * (/{industry}/{city}/{slug}). Used by the superadmin funnel widget to
 * measure: "X visitors to Fieseros-powered business pages this week →
 * Y leads from Google → Z conversions".
 *
 * PRIVACY (per review direction)
 * ------------------------------
 * "I would not assume that anonymous tracking automatically means 'no
 *  privacy-policy implications.' Even if you don't store IP addresses or
 *  cookies, you should still make sure the analytics behavior matches your
 *  privacy disclosures."
 *
 * What we store:
 *   - tenantId (which business page was viewed)
 *   - date (YYYY-MM-DD, for daily aggregation)
 *   - source (google / direct / other — derived from Referer header, NOT IP)
 *   - count (aggregated daily total)
 *
 * What we do NOT store:
 *   - IP addresses
 *   - Cookies (no Set-Cookie header)
 *   - User agents
 *   - Any PII
 *
 * This is aggregated daily counting — no per-visitor tracking. Two visits
 * from the same person on the same day increment the count by 2 (we can't
 * deduplicate without cookies, and we deliberately don't set cookies).
 *
 * The Referer header is used ONLY to categorize the source as
 * google/direct/other — the full Referer URL is never stored.
 *
 * NOTE: This endpoint does NOT block on errors. If the DB write fails, we
 * still return 204 so the page render isn't affected. Tracking is best-effort.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Categorize a Referer header into a traffic source.
 * Only returns 'google' / 'direct' / 'other' — never the full URL.
 */
function categorizeSource(referer: string | null): 'google' | 'direct' | 'other' {
  if (!referer) return 'direct';
  const lower = referer.toLowerCase();
  if (lower.includes('google.')) return 'google';
  if (lower.includes('bing.com') || lower.includes('yahoo.com') || lower.includes('duckduckgo.com')) {
    return 'other'; // other search engines
  }
  return 'other';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return new NextResponse(null, { status: 400 });
    }

    // Find the tenant by slug (the public URL uses the tenant slug).
    // We only need the ID — no PII, no business data.
    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) {
      // Don't 404 — that would break the client. Just silently no-op.
      return new NextResponse(null, { status: 204 });
    }

    // Categorize the source from the Referer header (NOT stored — only the
    // category is stored).
    const referer = request.headers.get('referer') || request.headers.get('referrer');
    const source = categorizeSource(referer);

    // Today's date in YYYY-MM-DD format (UTC — consistent across timezones).
    const today = new Date().toISOString().slice(0, 10);

    // Upsert the daily aggregated count.
    // metric: 'public_page_impression'
    // dimensionsJson: { "source": "google" | "direct" | "other" }
    // value: daily count (incremented by 1)
    const dimensionsJson = JSON.stringify({ source });
    const metric = 'public_page_impression';

    // Try to find an existing snapshot for today + this source.
    const existing = await db.analyticsSnapshot.findFirst({
      where: {
        date: today,
        metric,
        tenantId: tenant.id,
        dimensionsJson,
      },
      select: { id: true },
    });

    if (existing) {
      await db.analyticsSnapshot.update({
        where: { id: existing.id },
        data: { value: { increment: 1 } },
      });
    } else {
      await db.analyticsSnapshot.create({
        data: {
          date: today,
          metric,
          value: 1,
          dimensionsJson,
          tenantId: tenant.id,
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    // Never block the page render on a tracking error.
    return new NextResponse(null, { status: 204 });
  }
}
