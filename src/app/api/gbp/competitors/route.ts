import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isMissingTableError } from '@/lib/gbp/marketing-score';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPlaceDetails } from '@/lib/social/adapters/googlebusiness';

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
 * Automatically resolves business location and category dynamically from:
 * 1) Query params (?city=...&category=...)
 * 2) Connected Google Business Profile verified primary category & place coordinates
 * 3) Tenant's BrandProfile (industry & location)
 * 4) Tenant's verified address / coordinates
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const refresh = searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';
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

    // Check if stored rows contain legacy hardcoded defaults (e.g. Patna IT companies for a non-software business)
    const isLegacyCorrupt = storedRows.length > 0 && storedRows.some((r) =>
      r.address?.toLowerCase().includes('patna') ||
      r.name?.toLowerCase().includes('mlm software') ||
      r.name?.toLowerCase().includes('wetsoft infotech')
    );

    // If we have clean stored rows and user didn't request a refresh, serve stored rows
    if (storedRows.length > 0 && !refresh && !cityParam && !categoryParam && !isLegacyCorrupt) {
      return NextResponse.json({
        competitors: storedRows,
        source: storedRows.some((r) => r.source === 'places') ? 'places' : 'manual',
        migrationRequired,
        placesUnavailable: false,
      });
    }

    // If refreshing or clearing corrupt cache, delete stale competitor records
    if (refresh || isLegacyCorrupt) {
      try {
        await db.competitor.deleteMany({ where: { tenantId: user.tenantId } });
      } catch {}
    }

    // Fetch live from Google Places (New) with dynamic GBP & Brand Profile resolution
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

    // Fallback: If live fetch returned nothing but we had stored rows (and not corrupt), use them
    if (storedRows.length > 0 && !isLegacyCorrupt) {
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

// ── Google Places API (New) with Dynamic Multi-Source Resolution ─────────────

const PLACES_NEW_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

async function fetchFromPlacesNew(
  tenantId: string,
  opts?: { city?: string | null; category?: string | null }
): Promise<CompetitorRow[]> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  // 1. Resolve business information from tenant
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
      googlePlaceId: true,
    },
  });

  // 2. Resolve from BrandProfile (Tone, Story, Industry, Location)
  const brandProfile = await db.brandProfile.findUnique({
    where: { tenantId },
    select: {
      businessName: true,
      industry: true,
      location: true,
      serviceArea: true,
    },
  }).catch(() => null);

  // 3. Resolve from connected Google Business Profile
  let gbpCategory: string | null = null;
  let gbpAddress: string | null = null;
  let gbpPlaceId: string | null = tenant?.googlePlaceId || null;
  let gbpTitle: string | null = null;

  try {
    const googleAccount = await prepareGoogleAccount(tenantId);
    if (googleAccount) {
      const placeDetails = await fetchGoogleBusinessPlaceDetails(googleAccount);
      if (placeDetails) {
        if (placeDetails.category && placeDetails.category !== 'Professional Services') {
          gbpCategory = placeDetails.category;
        }
        if (placeDetails.address) gbpAddress = placeDetails.address;
        if (placeDetails.placeId) gbpPlaceId = placeDetails.placeId;
        if (placeDetails.title) gbpTitle = placeDetails.title;
      }
    }
  } catch (err) {
    console.warn('[competitors] prepareGoogleAccount lookup warning:', err);
  }

  // 4. Resolve Category / Query term
  let industry =
    opts?.category?.trim() ||
    gbpCategory?.trim() ||
    brandProfile?.industry?.trim() ||
    tenant?.industry?.trim() ||
    '';

  // If generic 'home services' or empty, intelligently derive from business title
  if (!industry || industry.toLowerCase() === 'home services' || industry.toLowerCase() === 'professional services') {
    const nameToCheck = (gbpTitle || brandProfile?.businessName || tenant?.name || '').toLowerCase();
    if (nameToCheck.includes('farm') || nameToCheck.includes('resort')) industry = 'Farmhouse Resort';
    else if (nameToCheck.includes('pool') || nameToCheck.includes('swim')) industry = 'Swimming Pool';
    else if (nameToCheck.includes('salon') || nameToCheck.includes('hair') || nameToCheck.includes('beauty')) industry = 'Beauty Salon';
    else if (nameToCheck.includes('dental') || nameToCheck.includes('clinic')) industry = 'Dental Clinic';
    else if (nameToCheck.includes('hvac') || nameToCheck.includes('air')) industry = 'HVAC Service';
    else if (nameToCheck.includes('clean')) industry = 'Cleaning Service';
    else if (nameToCheck.includes('plumb')) industry = 'Plumber';
    else if (nameToCheck.includes('restaurant') || nameToCheck.includes('cafe')) industry = 'Restaurant';
    else industry = 'Local Business';
  }

  // 5. Resolve Coordinates (Strictly accurate)
  let userLat = tenant?.latitude && tenant.latitude !== 0 ? tenant.latitude : null;
  let userLng = tenant?.longitude && tenant.longitude !== 0 ? tenant.longitude : null;

  // If coordinates are missing, resolve from placeId using Google Places API
  if ((userLat == null || userLng == null) && gbpPlaceId) {
    try {
      const placeRes = await fetch(
        `https://places.googleapis.com/v1/places/${gbpPlaceId}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'location,formattedAddress,primaryTypeDisplayName',
          },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (placeRes.ok) {
        const placeData = await placeRes.json();
        if (placeData.location?.latitude && placeData.location?.longitude) {
          userLat = placeData.location.latitude;
          userLng = placeData.location.longitude;
          if (!gbpAddress && placeData.formattedAddress) {
            gbpAddress = placeData.formattedAddress;
          }
          // Persist coordinates to tenant so future calls are instantaneous
          await db.tenant.update({
            where: { id: tenantId },
            data: { latitude: userLat, longitude: userLng },
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[competitors] Place ID coordinate lookup failed:', err);
    }
  }

  // 6. Resolve City / Search Area
  let queryCity =
    opts?.city?.trim() ||
    brandProfile?.location?.trim() ||
    tenant?.city?.trim() ||
    '';

  if (!queryCity && (gbpAddress || tenant?.address)) {
    const rawAddr = gbpAddress || tenant?.address || '';
    const parts = rawAddr.split(',').map((s) => s.trim());
    queryCity = parts.length > 2 ? parts[parts.length - 2] : rawAddr;
  }

  // Build high-intent local query (never defaults to Patna!)
  const query = queryCity ? `${industry} in ${queryCity}`.trim() : `${industry} near me`.trim();

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
    const selfName = (gbpTitle || brandProfile?.businessName || tenant?.name || '').toLowerCase();

    for (const p of rawPlaces) {
      const name = p.displayName?.text;
      if (!name) continue;
      // Skip self
      if (selfName && name.toLowerCase().includes(selfName)) continue;

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
