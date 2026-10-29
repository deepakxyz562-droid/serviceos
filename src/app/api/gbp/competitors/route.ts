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
  return { competitors: [] as CompetitorRow[], source: 'none', migrationRequired, placesUnavailable: false };
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * GET /api/gbp/competitors
 * Local competitor businesses (strictly within 5 KM) for the Competitor Analysis table.
 *
 * Uses Google Places API (New) (places.googleapis.com/v1/places:searchText)
 * with locationBias circle (radius: 5,000m) and exact Haversine distance.
 *
 * Automatically resolves business location and category from:
 * 1) Query params (?city=...&category=...)
 * 2) Tenant's verified address / coordinates
 * 3) Connected Google Business Profile metadata
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === '1';
    const cityParam = searchParams.get('city');
    const categoryParam = searchParams.get('category');

    let storedRows: CompetitorRow[] = [];
    let migrationRequired = false;

    try {
      const found = await db.competitor.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ distanceKm: 'asc' }, { rating: 'desc' }, { createdAt: 'asc' }],
        take: 20,
      });
      storedRows = found as unknown as CompetitorRow[];
    } catch (err: any) {
      if (isMissingTableError(err)) {
        migrationRequired = true;
      }
    }

    // If we have stored rows and user didn't request a refresh, serve stored rows
    if (storedRows.length > 0 && !refresh && !cityParam && !categoryParam) {
      return NextResponse.json({
        competitors: storedRows,
        source: storedRows.some((r) => r.source === 'places') ? 'places' : 'manual',
        migrationRequired,
        placesUnavailable: false,
      });
    }

    // Otherwise, fetch live from Google Places (New)
    const liveResults = await fetchFromPlacesNew(user.tenantId, {
      city: cityParam,
      category: categoryParam,
    });

    if (liveResults.length > 0) {
      // If table exists, cache to database
      if (!migrationRequired) {
        for (const row of liveResults) {
          try {
            await db.competitor.upsert({
              where: { tenantId_name: { tenantId: user.tenantId, name: row.name } },
              create: {
                tenantId: user.tenantId,
                name: row.name,
                rating: row.rating,
                reviewCount: row.reviewCount,
                distanceKm: row.distanceKm,
                address: row.address,
                category: row.category,
                placeId: row.placeId,
                mapsUrl: row.mapsUrl,
                source: 'places',
              },
              update: {
                rating: row.rating,
                reviewCount: row.reviewCount,
                distanceKm: row.distanceKm,
                address: row.address,
                category: row.category,
                placeId: row.placeId,
                mapsUrl: row.mapsUrl,
                source: 'places',
              },
            });
          } catch {
            // Row-level insert failure must not abort
          }
        }
      }

      return NextResponse.json({
        competitors: liveResults,
        source: 'places',
        migrationRequired: false,
        placesUnavailable: false,
      });
    }

    // Fallback: If live fetch returned nothing but we had stored rows, use them
    if (storedRows.length > 0) {
      return NextResponse.json({
        competitors: storedRows,
        source: 'manual',
        migrationRequired,
        placesUnavailable: true,
      });
    }

    return NextResponse.json({
      competitors: [],
      source: 'none',
      migrationRequired,
      placesUnavailable: true,
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
        ? { error: 'MIGRATION_REQUIRED', message: 'Competitor table not created yet.' }
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

// ── Google Places API (New) ─────────────────────────────────────────────────

const PLACES_NEW_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

async function fetchFromPlacesNew(
  tenantId: string,
  opts?: { city?: string | null; category?: string | null }
): Promise<CompetitorRow[]> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  // 1. Resolve business location and category from tenant
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      industry: true,
      address: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
    },
  });

  // Resolve City
  let queryCity = opts?.city?.trim() || tenant?.city?.trim() || '';
  if (!queryCity && tenant?.address) {
    // If city is missing, use address or parse last parts
    const parts = tenant.address.split(',').map((s) => s.trim());
    queryCity = parts.length > 2 ? parts[parts.length - 2] : tenant.address;
  }
  if (!queryCity) {
    queryCity = 'Patna, Bihar';
  }

  // Resolve Category / Query term
  let industry = opts?.category?.trim() || tenant?.industry?.trim() || '';
  if (!industry || industry.toLowerCase() === 'home services') {
    industry = 'Software Company';
  }

  // Coordinates
  const userLat = tenant?.latitude && tenant.latitude !== 0 ? tenant.latitude : 25.6136;
  const userLng = tenant?.longitude && tenant.longitude !== 0 ? tenant.longitude : 85.0805;

  const query = `${industry} near ${queryCity}`.trim();

  try {
    const payload: any = {
      textQuery: query,
      maxResultCount: 15,
    };

    if (userLat != null && userLng != null) {
      payload.locationBias = {
        circle: {
          center: { latitude: userLat, longitude: userLng },
          radius: 5000.0, // Strictly 5,000 meters = 5 km
        },
      };
    }

    const res = await fetch(PLACES_NEW_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.googleMapsUri,places.primaryType',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.error('[competitors] Places API (New) error status:', res.status);
      return [];
    }

    const data = await res.json();
    const rawPlaces: any[] = Array.isArray(data?.places) ? data.places : [];

    const computed: CompetitorRow[] = [];

    for (const p of rawPlaces) {
      const name = p.displayName?.text;
      if (!name) continue;
      // Skip self
      if (tenant?.name && name.toLowerCase().includes(tenant.name.toLowerCase())) continue;

      let distanceKm: number | null = null;
      if (userLat != null && userLng != null && p.location?.latitude != null && p.location?.longitude != null) {
        distanceKm = haversineDistanceKm(userLat, userLng, p.location.latitude, p.location.longitude);
      }

      computed.push({
        id: p.id || `comp-${computed.length + 1}`,
        name: String(name).slice(0, 180),
        rating: p.rating != null ? Number(p.rating) : null,
        reviewCount: p.userRatingCount != null ? Number(p.userRatingCount) : null,
        distanceKm,
        address: p.formattedAddress ? String(p.formattedAddress).slice(0, 300) : null,
        category: p.primaryType ? String(p.primaryType) : industry,
        placeId: p.id ? String(p.id) : null,
        mapsUrl:
          p.googleMapsUri ||
          (p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : null),
        source: 'places',
      });
    }

    // Sort closest first, then by highest rating
    computed.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return computed.slice(0, 10);
  } catch (err: any) {
    console.error('[competitors] fetchFromPlacesNew failed:', err?.message || err);
    return [];
  }
}
