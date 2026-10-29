import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isMissingTableError } from '@/lib/gbp/marketing-score';

export const dynamic = 'force-dynamic';

interface CompetitorRow {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  address: string | null;
  category: string | null;
  placeId: string | null;
  mapsUrl: string | null;
  source: string;
}

function emptyPayload(migrationRequired: boolean) {
  return { competitors: [] as CompetitorRow[], source: 'none', migrationRequired };
}

/**
 * GET /api/gbp/competitors
 * Local competitor businesses (≈5 KM) for the Competitor Analysis table.
 *
 * - Returns stored rows first (manual + previously fetched).
 * - `?refresh=1` re-queries Google Places Nearby using the tenant's location
 *   and upserts results. When the Places API is unavailable the stored rows
 *   are still served (honest `placesUnavailable: true` flag).
 * - If the Competitor table has not been migrated yet the response is an
 *   honest empty payload with `migrationRequired: true` — the UI renders a
 *   "connect/setup" state instead of crashing.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const refresh = request.nextUrl.searchParams.get('refresh') === '1';
    let migrationRequired = false;

    let rows: CompetitorRow[] = [];
    try {
      const found = await db.competitor.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ rating: 'desc' }, { createdAt: 'asc' }],
        take: 20,
      });
      rows = found as unknown as CompetitorRow[];
    } catch (err: any) {
      if (isMissingTableError(err)) {
        migrationRequired = true;
      } else {
        throw err;
      }
    }

    let placesUnavailable = false;
    if (refresh && !migrationRequired) {
      try {
        const upserted = await refreshFromPlaces(user.tenantId);
        if (upserted.length > 0) {
          const found = await db.competitor.findMany({
            where: { tenantId: user.tenantId },
            orderBy: [{ rating: 'desc' }, { createdAt: 'asc' }],
            take: 20,
          });
          rows = found as unknown as CompetitorRow[];
        } else {
          placesUnavailable = true;
        }
      } catch {
        placesUnavailable = true;
      }
    }

    return NextResponse.json({
      competitors: rows,
      source: rows.length > 0 ? (rows.some((r) => r.source === 'places') ? 'places' : 'manual') : 'none',
      migrationRequired,
      placesUnavailable,
    });
  } catch (error: unknown) {
    console.error('[competitors] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(emptyPayload(false), { status: 200 });
  }
}

/**
 * POST /api/gbp/competitors — manually add a competitor.
 * Body: { name, rating?, reviewCount?, distanceKm?, address?, category? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const competitor = await db.competitor.upsert({
      where: { tenantId_name: { tenantId: user.tenantId, name } },
      create: {
        tenantId: user.tenantId,
        name,
        rating: body.rating != null ? Number(body.rating) : null,
        reviewCount: body.reviewCount != null ? Number(body.reviewCount) : null,
        distanceKm: body.distanceKm != null ? Number(body.distanceKm) : null,
        address: body.address ? String(body.address) : null,
        category: body.category ? String(body.category) : null,
        source: 'manual',
      },
      update: {
        rating: body.rating != null ? Number(body.rating) : undefined,
        reviewCount: body.reviewCount != null ? Number(body.reviewCount) : undefined,
        distanceKm: body.distanceKm != null ? Number(body.distanceKm) : undefined,
        address: body.address ? String(body.address) : undefined,
        category: body.category ? String(body.category) : undefined,
      },
    });

    return NextResponse.json({ success: true, competitor });
  } catch (error: unknown) {
    const missing = isMissingTableError(error);
    console.error('[competitors] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      missing
        ? { error: 'MIGRATION_REQUIRED', message: 'Competitor table not created yet — apply the bgos_dhanda_redesign migration.' }
        : { error: error instanceof Error ? error.message : 'Failed to add competitor' },
      { status: missing ? 503 : 500 },
    );
  }
}

/** DELETE /api/gbp/competitors?id=... */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await db.competitor.deleteMany({ where: { id, tenantId: user.tenantId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[competitors] DELETE failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete competitor' },
      { status: 500 },
    );
  }
}

// ── Google Places Nearby refresh ────────────────────────────────────────────

const PLACES_TEXTSEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

async function refreshFromPlaces(tenantId: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, industry: true, address: true, city: true, googlePlaceId: true },
  });
  const queryCity = (tenant as any)?.city || (tenant as any)?.address || '';
  if (!queryCity) return [];

  const industry = (tenant as any)?.industry || '';
  const query = `${industry ? industry + ' ' : ''}near ${queryCity}`.trim();

  const res = await fetch(`${PLACES_TEXTSEARCH_URL}?query=${encodeURIComponent(query)}&key=${apiKey}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  const upserted: string[] = [];

  for (const r of results.slice(0, 12)) {
    if (!r?.name || r.name === tenant?.name) continue;
    try {
      await db.competitor.upsert({
        where: { tenantId_name: { tenantId, name: r.name } },
        create: {
          tenantId,
          name: String(r.name).slice(0, 180),
          rating: r.rating != null ? Number(r.rating) : null,
          reviewCount: r.user_ratings_total != null ? Number(r.user_ratings_total) : null,
          address: r.formatted_address ? String(r.formatted_address).slice(0, 300) : null,
          category: Array.isArray(r.types) && r.types.length ? String(r.types[0]) : null,
          placeId: r.place_id ? String(r.place_id) : null,
          mapsUrl: r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : null,
          source: 'places',
        },
        update: {
          rating: r.rating != null ? Number(r.rating) : undefined,
          reviewCount: r.user_ratings_total != null ? Number(r.user_ratings_total) : undefined,
          address: r.formatted_address ? String(r.formatted_address).slice(0, 300) : undefined,
          placeId: r.place_id ? String(r.place_id) : undefined,
          source: 'places',
        },
      });
      upserted.push(r.name);
    } catch {
      // row-level failure must not abort the batch
    }
  }
  return upserted;
}
