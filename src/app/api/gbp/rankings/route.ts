import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { normalizeBgosPlanCode } from '@/lib/bgos-billing';
import { resolveTenantLocale } from '@/lib/locale-timezone';
import { resolveBusinessPresenceMode } from '@/lib/seo/presence-mode';
import {
  rankingSummary,
  scanMaps,
  scanMapsGrid,
  scanOrganicSerp,
  type RankScan,
  type MapsGridScanResult,
  type OrganicSerpScanResult,
} from '@/lib/social/ranking-data';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  fetchGoogleBusinessPerformanceMetrics,
  fetchGoogleBusinessSearchKeywords,
} from '@/lib/social/adapters/googlebusiness';
import {
  getGooglePlacesApiKey,
  scanGeminiGroundedSerpFallback,
  scanPlacesGridFallback,
} from '@/lib/gbp/keyword-planner-free';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function settings(raw: string | null | undefined) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeGooglePlaceId(raw?: string | null): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/^places\//, '').trim();
  return /^ChI[A-Za-z0-9_-]+$/.test(cleaned) ? cleaned : null;
}

async function resolveDefaultGeoAndPlace(tenant: any, googleAccount: any) {
  const stored = settings(tenant?.settingsJson);
  const meta =
    typeof googleAccount?.metadata === 'string'
      ? safeJsonParse<Record<string, any>>(googleAccount.metadata, {})
      : googleAccount?.metadata || {};

  const placeId: string | null =
    normalizeGooglePlaceId(stored?.rankSearch?.placeId) ||
    normalizeGooglePlaceId(stored?.activeGbpPlaceId) ||
    normalizeGooglePlaceId(tenant?.googlePlaceId) ||
    normalizeGooglePlaceId(meta?.placeId) ||
    null;

  let centerLat: number | null =
    typeof tenant?.latitude === 'number' && Number.isFinite(tenant.latitude) && tenant.latitude !== 0
      ? tenant.latitude
      : null;
  let centerLng: number | null =
    typeof tenant?.longitude === 'number' && Number.isFinite(tenant.longitude) && tenant.longitude !== 0
      ? tenant.longitude
      : null;

  if ((centerLat == null || centerLng == null) && meta?.latlng) {
    const mLat = Number(meta.latlng.latitude ?? meta.latlng.lat);
    const mLng = Number(meta.latlng.longitude ?? meta.latlng.lng);
    if (Number.isFinite(mLat) && Number.isFinite(mLng) && (mLat !== 0 || mLng !== 0)) {
      centerLat = mLat;
      centerLng = mLng;
    }
  }

  if ((centerLat == null || centerLng == null) && typeof stored?.rankSearch?.location === 'string') {
    const parts = stored.rankSearch.location.split(',');
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      centerLat = lat;
      centerLng = lng;
    }
  }

  const locationCoord =
    stored?.rankSearch?.location ||
    (centerLat != null && centerLng != null ? `${centerLat},${centerLng},15z` : null);

  return { placeId, centerLat, centerLng, locationCoord };
}

async function lookupPlaceAndCoordsFromText(params: {
  tenantId: string;
  query: string;
  regionCode?: string;
}): Promise<{ placeId: string | null; centerLat: number | null; centerLng: number | null }> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey || !params.query.trim()) {
    return { placeId: null, centerLat: null, centerLng: null };
  }
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.location',
      },
      body: JSON.stringify({
        textQuery: params.query.trim(),
        maxResultCount: 1,
        regionCode: params.regionCode || 'IN',
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return { placeId: null, centerLat: null, centerLng: null };
    const data = (await res.json().catch(() => ({}))) as { places?: Array<any> };
    const top = data.places?.[0];
    const resolvedPlaceId = normalizeGooglePlaceId(top?.id);
    const lat = typeof top?.location?.latitude === 'number' ? top.location.latitude : null;
    const lng = typeof top?.location?.longitude === 'number' ? top.location.longitude : null;
    if (resolvedPlaceId || (lat != null && lng != null)) {
      await db.tenant
        .update({
          where: { id: params.tenantId },
          data: {
            ...(resolvedPlaceId ? { googlePlaceId: resolvedPlaceId } : {}),
            ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
          } as any,
        })
        .catch(() => {});
    }
    return { placeId: resolvedPlaceId, centerLat: lat, centerLng: lng };
  } catch {
    return { placeId: null, centerLat: null, centerLng: null };
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      publicSlug: true,
      industry: true,
      city: true,
      country: true,
      website: true,
      publicProfileEnabled: true,
      claimed: true,
      latitude: true,
      longitude: true,
      googlePlaceId: true,
      settingsJson: true,
    },
  });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const stored = settings(tenant.settingsJson);
  const summary = rankingSummary(stored.measuredRankScans || []);

  const [googleAccount, customDomains, gridRows, trackedRows] = await Promise.all([
    prepareGoogleAccount(user.tenantId).catch(() => null),
    (db as any).customDomain?.findMany
      ? (db as any).customDomain
          .findMany({ where: { tenantId: user.tenantId }, orderBy: { updatedAt: 'desc' }, take: 3 })
          .catch(() => [])
      : [],
    (db as any).rankGridScan?.findMany
      ? (db as any).rankGridScan
          .findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 25 })
          .catch(() => [])
      : [],
    (db as any).trackedKeyword?.findMany
      ? (db as any).trackedKeyword
          .findMany({
            where: { tenantId: user.tenantId },
            select: { keyword: true, mapsRank: true, organicRank: true },
            orderBy: { position: 'asc' },
            take: 15,
          })
          .catch(() => [])
      : [],
  ]);

  const verifiedCustomDomain = Array.isArray(customDomains)
    ? customDomains.find((d: any) => d.status === 'SSL_ACTIVE' || d.status === 'DNS_VERIFIED') || customDomains[0]
    : null;

  const presence = resolveBusinessPresenceMode({
    tenant: tenant as any,
    customDomain: verifiedCustomDomain
      ? { domain: verifiedCustomDomain.domain, status: verifiedCustomDomain.status }
      : null,
  });

  const geoDefaults = await resolveDefaultGeoAndPlace(tenant, googleAccount);

  const storedGridScans = Array.isArray(stored.measuredGridScans)
    ? [...stored.measuredGridScans].reverse()
    : [];
  const storedGridModeMap = new Map<string, string>();
  for (const s of storedGridScans) {
    if (s?.id && s?.providerMode) storedGridModeMap.set(s.id, s.providerMode);
  }

  const storedOrganicScans = Array.isArray(stored.measuredOrganicScans)
    ? [...stored.measuredOrganicScans].reverse()
    : [];
  const storedOrganicModeMap = new Map<string, string>();
  for (const s of storedOrganicScans) {
    if (s?.id && s?.providerMode) storedOrganicModeMap.set(s.id, s.providerMode);
  }

  const dbGridScans = Array.isArray(gridRows)
    ? gridRows
        .filter((r: any) => r.scanType === 'maps_grid')
        .map((r: any) => {
          const pts = safeJsonParse<any[]>(r.pointsJson, []);
          const gs: 3 | 5 = r.gridSize === 5 ? 5 : 3;
          return {
            id: r.id,
            date: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
            keyword: r.keyword,
            placeId: r.placeId,
            gridSize: gs,
            radiusKm: r.radiusKm || 3,
            centerLat: r.centerLat,
            centerLng: r.centerLng,
            avgRank: r.avgRank ?? null,
            top3Pct: r.top3Pct ?? 0,
            rankedPoints: pts.filter((p) => typeof p?.rank === 'number' && p.rank > 0).length,
            totalPoints: gs === 5 ? 25 : 9,
            points: pts,
            cost: r.cost || 0,
            providerMode: storedGridModeMap.get(r.id) || (r.cost === 0 ? 'places_area_grid' : 'dataforseo'),
          };
        })
    : [];

  const dbOrganicScans = Array.isArray(gridRows)
    ? gridRows
        .filter((r: any) => r.scanType === 'organic_serp')
        .map((r: any) => {
          const citedDomains = safeJsonParse<string[]>(r.aiCitedUrlsJson, []);
          return {
            id: r.id,
            date: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
            keyword: r.keyword,
            targetDomain: r.targetDomain || presence.domain,
            organicRank: r.organicRank ?? null,
            aiOverviewPresent: Boolean(r.aiOverviewPresent),
            aiOverviewCited: Boolean(r.aiOverviewCited),
            citedDomains,
            cost: r.cost || 0,
            providerMode: storedOrganicModeMap.get(r.id) || (r.cost === 0 ? 'gemini_grounded_search' : 'dataforseo'),
          };
        })
    : [];

  const gridScans = dbGridScans.length > 0 ? dbGridScans : storedGridScans;
  const organicScans = dbOrganicScans.length > 0 ? dbOrganicScans : storedOrganicScans;

  const trackedKeywordStrings = Array.isArray(trackedRows)
    ? trackedRows.map((k: any) => k.keyword).filter(Boolean)
    : Array.isArray(stored.trackedKeywords)
      ? stored.trackedKeywords.map((k: any) => k.keyword).filter(Boolean)
      : [];

  const nativeDiscovery = stored.googleDiscovery || null;

  // Build real measured keyword list (never synthesize fake 1.4/1.6 ranks when empty)
  const measuredKeywordMap = new Map<string, { keyword: string; rank: number | null; rankChange: number | null }>();
  const rawScans: RankScan[] = Array.isArray(stored.measuredRankScans) ? stored.measuredRankScans : [];
  const prevScan = rawScans.length >= 2 ? rawScans[rawScans.length - 2] : null;
  for (const k of summary.keywords) {
    if (!k?.keyword) continue;
    const curr = typeof k.currentRank === 'number' ? Number(k.currentRank.toFixed(1)) : null;
    const prevKw = prevScan?.keywords?.find((pk) => pk.keyword.toLowerCase() === k.keyword.toLowerCase());
    const delta =
      curr != null && typeof prevKw?.rank === 'number'
        ? Number((prevKw.rank - curr).toFixed(1))
        : null;
    measuredKeywordMap.set(k.keyword.toLowerCase(), {
      keyword: k.keyword,
      rank: curr,
      rankChange: delta,
    });
  }
  for (const gs of gridScans) {
    const key = String(gs?.keyword || '').trim().toLowerCase();
    if (!key || measuredKeywordMap.has(key)) continue;
    const earlier = gridScans.find(
      (other: any) => other.id !== gs.id && String(other.keyword || '').trim().toLowerCase() === key && other.avgRank != null,
    );
    const curr = typeof gs.avgRank === 'number' ? Number(gs.avgRank.toFixed(1)) : null;
    const delta =
      curr != null && typeof earlier?.avgRank === 'number'
        ? Number((earlier.avgRank - curr).toFixed(1))
        : null;
    measuredKeywordMap.set(key, {
      keyword: gs.keyword,
      rank: curr,
      rankChange: delta,
    });
  }
  if (Array.isArray(trackedRows)) {
    for (const row of trackedRows) {
      const key = String(row?.keyword || '').trim().toLowerCase();
      if (!key || measuredKeywordMap.has(key)) continue;
      const r = typeof row.mapsRank === 'number' ? row.mapsRank : typeof row.organicRank === 'number' ? row.organicRank : null;
      if (r != null) {
        measuredKeywordMap.set(key, {
          keyword: row.keyword,
          rank: Number(r.toFixed(1)),
          rankChange: null,
        });
      }
    }
  }
  const rawKeywords = Array.from(measuredKeywordMap.values());

  const latestGrid = gridScans[0] || null;
  const gridSize: 3 | 5 = latestGrid?.gridSize === 5 ? 5 : 3;
  const centerIdx = Math.floor(gridSize / 2);

  const geoGrid = latestGrid
    ? {
        hasScans: true,
        scanId: latestGrid.id,
        keyword: latestGrid.keyword,
        lastUpdated: latestGrid.date
          ? new Date(latestGrid.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null,
        avgRank: typeof latestGrid.avgRank === 'number' ? latestGrid.avgRank : null,
        top3Pct: typeof latestGrid.top3Pct === 'number' ? latestGrid.top3Pct : 0,
        gridSize,
        radiusKm: latestGrid.radiusKm || 3,
        centerLat: typeof latestGrid.centerLat === 'number' ? latestGrid.centerLat : geoDefaults.centerLat,
        centerLng: typeof latestGrid.centerLng === 'number' ? latestGrid.centerLng : geoDefaults.centerLng,
        points: Array.isArray(latestGrid.points)
          ? latestGrid.points.map((p: any, idx: number) => {
              const row = typeof p.row === 'number' ? p.row : Math.floor(idx / gridSize);
              const col = typeof p.col === 'number' ? p.col : idx % gridSize;
              return {
                row,
                col,
                rank: typeof p.rank === 'number' && p.rank > 0 ? p.rank : null,
                isCenter: row === centerIdx && col === centerIdx,
                lat: p.lat,
                lng: p.lng,
                topCompetitorName: p.topCompetitorName || null,
                topCompetitorRating: p.topCompetitorRating ?? null,
              };
            })
          : [],
      }
    : {
        hasScans: false,
        scanId: null,
        keyword: trackedKeywordStrings[0] || rawKeywords[0]?.keyword || '',
        lastUpdated: null,
        avgRank: null,
        top3Pct: null,
        gridSize: 3 as const,
        radiusKm: 3,
        centerLat: geoDefaults.centerLat,
        centerLng: geoDefaults.centerLng,
        points: [],
      };

  const dataForSeoConfigured = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  const placesConfigured = Boolean(getGooglePlacesApiKey());

  return NextResponse.json({
    success: true,
    ...summary,
    cityName: tenant.city,
    provider: dataForSeoConfigured ? 'dataforseo' : placesConfigured ? 'google_places_grid' : 'none',
    configured: dataForSeoConfigured || placesConfigured,
    dataForSeoConfigured,
    placesConfigured,
    hasGoogleConnection: Boolean(googleAccount),
    nativeDiscovery,
    inTop3PackPct: summary.totalKeywords
      ? Math.round((summary.top3Count / summary.totalKeywords) * 100)
      : null,
    search: stored.rankSearch || null,
    presence,
    autoDefaults: {
      ...geoDefaults,
      city: tenant.city || null,
      websiteUrl: presence.websiteUrl,
      canonicalUrl: presence.canonicalUrl,
      domain: presence.domain,
      suggestedKeywords: trackedKeywordStrings.slice(0, 5),
    },
    rankedKeywords: rawKeywords,
    geoGrid,
    gridScans: gridScans.slice(0, 10),
    organicScans: organicScans.slice(0, 15),
  });
}

async function updateTrackedKeywordRanks(params: {
  tenantId: string;
  keyword: string;
  mapsRank?: number | null;
  organicRank?: number | null;
  aiOverviewCited?: boolean | null;
}) {
  const lower = params.keyword.trim().toLowerCase();
  const now = new Date();

  if ((db as any).trackedKeyword?.updateMany) {
    try {
      const updateData: Record<string, any> = { lastCheckedAt: now };
      if (params.mapsRank !== undefined) updateData.mapsRank = params.mapsRank;
      if (params.organicRank !== undefined) updateData.organicRank = params.organicRank;
      if (params.aiOverviewCited !== undefined) updateData.aiOverviewCited = params.aiOverviewCited;

      await (db as any).trackedKeyword.updateMany({
        where: { tenantId: params.tenantId, keyword: lower },
        data: updateData,
      });
    } catch {}
  }

  try {
    const t = await db.tenant.findUnique({ where: { id: params.tenantId }, select: { settingsJson: true } });
    const fresh = settings(t?.settingsJson);
    if (Array.isArray(fresh.trackedKeywords)) {
      let changed = false;
      fresh.trackedKeywords = fresh.trackedKeywords.map((k: any) => {
        if (String(k?.keyword || '').toLowerCase() === lower) {
          changed = true;
          return {
            ...k,
            ...(params.mapsRank !== undefined ? { mapsRank: params.mapsRank } : {}),
            ...(params.organicRank !== undefined ? { organicRank: params.organicRank } : {}),
            ...(params.aiOverviewCited !== undefined ? { aiOverviewCited: params.aiOverviewCited } : {}),
            lastCheckedAt: now.toISOString(),
          };
        }
        return k;
      });
      if (changed) {
        await db.tenant.update({
          where: { id: params.tenantId },
          data: { settingsJson: JSON.stringify(fresh) },
        });
      }
    }
  } catch {}
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  // 1. Native Google Business Profile discovery & search keywords scan (Free, $0)
  if (body?.provider === 'google_native' || body?.mode === 'native' || body?.refreshNative) {
    const googleAccount = await prepareGoogleAccount(user.tenantId);
    if (!googleAccount) {
      return NextResponse.json(
        { error: 'Connect your Google Business Profile to view live Search and Maps discovery metrics.' },
        { status: 409 },
      );
    }

    try {
      const [perf, keywords] = await Promise.all([
        fetchGoogleBusinessPerformanceMetrics(googleAccount).catch(() => ({
          searchImpressions: 0,
          mapsImpressions: 0,
          callClicks: 0,
          directionRequests: 0,
          websiteClicks: 0,
          bookings: 0,
          conversations: 0,
        })),
        fetchGoogleBusinessSearchKeywords(googleAccount).catch(() => []),
      ]);

      const totalViews = (perf.searchImpressions || 0) + (perf.mapsImpressions || 0);
      const discoverySnapshot = {
        updatedAt: new Date().toISOString(),
        totalViews,
        mapsImpressions: perf.mapsImpressions,
        searchImpressions: perf.searchImpressions,
        callClicks: perf.callClicks,
        directionRequests: perf.directionRequests,
        websiteClicks: perf.websiteClicks,
        keywords:
          keywords.length > 0
            ? keywords
            : [
                { keyword: 'Direct Brand Searches', count: perf.searchImpressions || 1 },
                { keyword: 'Maps Navigation & Directions', count: perf.directionRequests || 1 },
              ],
      };

      const tenant = await db.tenant.findUniqueOrThrow({
        where: { id: user.tenantId },
        select: { settingsJson: true },
      });
      const fresh = settings(tenant.settingsJson);
      const history = (fresh.googleDiscoveryHistory || [])
        .concat({
          date: discoverySnapshot.updatedAt,
          totalViews,
          mapsImpressions: perf.mapsImpressions,
          directionRequests: perf.directionRequests,
        })
        .slice(-90);

      await db.tenant.update({
        where: { id: user.tenantId },
        data: {
          settingsJson: JSON.stringify({
            ...fresh,
            googleDiscovery: discoverySnapshot,
            googleDiscoveryHistory: history,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Google Maps search visibility & keywords refreshed from Google Business Profile.',
        nativeDiscovery: discoverySnapshot,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to refresh Google Business discovery metrics' },
        { status: 502 },
      );
    }
  }

  // 1b. Save verified Google Place ID & map center coordinates
  if (body?.mode === 'save_geo_config') {
    const cleanPlaceId = normalizeGooglePlaceId(body.placeId);
    const lat = Number(body.centerLat);
    const lng = Number(body.centerLng);
    if (!cleanPlaceId || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
      return NextResponse.json(
        { error: 'Enter a valid Google Place ID (ChI…) and non-zero latitude/longitude coordinates.' },
        { status: 400 },
      );
    }
    const existing = await db.tenant.findUnique({ where: { id: user.tenantId }, select: { settingsJson: true } });
    const parsed = settings(existing?.settingsJson);
    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        googlePlaceId: cleanPlaceId,
        latitude: lat,
        longitude: lng,
        settingsJson: JSON.stringify({
          ...parsed,
          rankSearch: {
            ...(parsed.rankSearch || {}),
            placeId: cleanPlaceId,
            location: `${lat},${lng},15z`,
          },
        }),
      } as any,
    });
    return NextResponse.json({
      success: true,
      placeId: cleanPlaceId,
      centerLat: lat,
      centerLng: lng,
      message: 'Map center and Place ID saved.',
    });
  }

  // 2. Maps Geo-Grid Scan (3x3 / 5x5)
  if (body?.mode === 'maps_grid') {
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const gridSize: 3 | 5 = Number(body.gridSize) === 5 ? 5 : 3;
    const ent = (gate as any).entitlement;
    if (gridSize === 5 && ent && !ent.isTrial) {
      const planCode = normalizeBgosPlanCode(ent.plan);
      if (!['business', 'enterprise'].includes(planCode)) {
        return NextResponse.json(
          {
            error: '5x5 Geo-Grid scans require a Business or Enterprise plan. Use the 3x3 grid on Starter/Growth.',
            code: 'PLAN_UPGRADE_REQUIRED',
          },
          { status: 403 },
        );
      }
    }

    const hasDataForSeo = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
    const hasPlaces = Boolean(getGooglePlacesApiKey());

    if (!hasDataForSeo && !hasPlaces) {
      return NextResponse.json(
        { error: 'Configure Google Places API key or DataForSEO credentials on the server before running Geo-Grid scans.' },
        { status: 503 },
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        settingsJson: true,
        googlePlaceId: true,
        latitude: true,
        longitude: true,
        country: true,
        brandProfile: { select: { businessName: true, location: true } },
      },
    });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);
    const geoDefaults = await resolveDefaultGeoAndPlace(tenant, googleAccount);

    const keyword = String(body.keyword || '').trim();
    let placeId = normalizeGooglePlaceId(body.placeId) || geoDefaults.placeId || '';
    let centerLat = body.centerLat != null && body.centerLat !== '' ? Number(body.centerLat) : (geoDefaults.centerLat ?? NaN);
    let centerLng = body.centerLng != null && body.centerLng !== '' ? Number(body.centerLng) : (geoDefaults.centerLng ?? NaN);
    const radiusKm = Number(body.radiusKm || 3);

    // Auto-resolve Place ID and/or coordinates via Google Places Text Search when missing
    const needsGeoResolve =
      !placeId ||
      !Number.isFinite(centerLat) ||
      !Number.isFinite(centerLng) ||
      (centerLat === 0 && centerLng === 0);
    if (needsGeoResolve && hasPlaces) {
      const bizLabel = tenant.brandProfile?.businessName || tenant.name || '';
      const locLabel = tenant.address || tenant.brandProfile?.location || tenant.city || '';
      const resolved = await lookupPlaceAndCoordsFromText({
        tenantId: user.tenantId,
        query: `${bizLabel} ${locLabel}`.trim(),
        regionCode: ((tenant as any).country || 'IN').toUpperCase(),
      });
      if (!placeId && resolved.placeId) placeId = resolved.placeId;
      if ((!Number.isFinite(centerLat) || centerLat === 0) && resolved.centerLat != null) {
        centerLat = resolved.centerLat;
      }
      if ((!Number.isFinite(centerLng) || centerLng === 0) && resolved.centerLng != null) {
        centerLng = resolved.centerLng;
      }
    }

    if (
      !keyword ||
      keyword.length > 150 ||
      !/^ChI[A-Za-z0-9_-]+$/.test(placeId) ||
      !Number.isFinite(centerLat) ||
      Math.abs(centerLat) > 90 ||
      !Number.isFinite(centerLng) ||
      Math.abs(centerLng) > 180 ||
      (centerLat === 0 && centerLng === 0)
    ) {
      return NextResponse.json(
        {
          error: !keyword
            ? 'Enter a target keyword to run a Maps Geo-Grid scan.'
            : !/^ChI[A-Za-z0-9_-]+$/.test(placeId)
              ? 'Google Place ID (ChI…) is required. Connect your Google Business Profile or enter your Place ID in Settings.'
              : 'Map center latitude/longitude coordinates are missing. Enter valid coordinates or set your business address.',
        },
        { status: 400 },
      );
    }

    const stored = settings(tenant.settingsJson);
    const claimKey = `${keyword.toLowerCase()}::${gridSize}`;
    const lastClaimAt = stored.rankGridClaims?.[claimKey];
    if (lastClaimAt && Date.now() - Date.parse(lastClaimAt) < 6 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Geo-Grid scan for this keyword ran within the last 6 hours. View cached results or test another keyword.' },
        { status: 429 },
      );
    }

    try {
      const usePlacesFallback = !(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
      const gridResult: MapsGridScanResult & { providerMode?: string } = usePlacesFallback
        ? await scanPlacesGridFallback({
            keyword,
            placeId,
            businessName: tenant.brandProfile?.businessName || tenant.name || undefined,
            centerLat,
            centerLng,
            gridSize,
            radiusKm,
            regionCode: ((tenant as any).country || 'IN').toUpperCase(),
          })
        : await scanMapsGrid({
            keyword,
            placeId,
            centerLat,
            centerLng,
            gridSize,
            radiusKm,
          });

      const id = randomUUID();
      const scannedAt = new Date().toISOString();
      const savedGridRecord = {
        id,
        date: scannedAt,
        providerMode: gridResult.providerMode || (usePlacesFallback ? 'places_area_grid' : 'dataforseo'),
        ...gridResult,
      };

      if ((db as any).rankGridScan?.create) {
        await (db as any).rankGridScan
          .create({
            data: {
              id,
              tenantId: user.tenantId,
              scanType: 'maps_grid',
              keyword: gridResult.keyword,
              placeId: gridResult.placeId,
              gridSize: gridResult.gridSize,
              radiusKm: gridResult.radiusKm,
              centerLat: gridResult.centerLat,
              centerLng: gridResult.centerLng,
              pointsJson: JSON.stringify(gridResult.points),
              avgRank: gridResult.avgRank,
              top3Pct: gridResult.top3Pct,
              cost: gridResult.cost,
            },
          })
          .catch(() => {});
      }

      // Record cooldown claim ONLY after the scan succeeded so failed scans don't lock out the user
      const freshTenant = await db.tenant.findUnique({ where: { id: user.tenantId }, select: { settingsJson: true } });
      const freshStored = settings(freshTenant?.settingsJson);
      await db.tenant.update({
        where: { id: user.tenantId },
        data: {
          settingsJson: JSON.stringify({
            ...freshStored,
            rankGridClaims: {
              ...(freshStored.rankGridClaims || {}),
              [claimKey]: scannedAt,
            },
            measuredGridScans: [...(freshStored.measuredGridScans || []), savedGridRecord].slice(-20),
          }),
        },
      });

      await updateTrackedKeywordRanks({
        tenantId: user.tenantId,
        keyword: gridResult.keyword,
        mapsRank: gridResult.avgRank != null ? Math.round(gridResult.avgRank) : null,
      });

      return NextResponse.json({
        success: true,
        scan: savedGridRecord,
        cost: gridResult.cost,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Maps Geo-Grid scan failed' },
        { status: 502 },
      );
    }
  }

  // 3. Organic Google Web SERP + AI Overview Citation Scan
  if (body?.mode === 'organic_serp') {
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        industry: true,
        city: true,
        country: true,
        website: true,
        publicProfileEnabled: true,
        claimed: true,
        settingsJson: true,
      },
    });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const customDomains = (db as any).customDomain?.findMany
      ? await (db as any).customDomain
          .findMany({ where: { tenantId: user.tenantId }, orderBy: { updatedAt: 'desc' }, take: 3 })
          .catch(() => [])
      : [];
    const verifiedCustomDomain = Array.isArray(customDomains)
      ? customDomains.find((d: any) => d.status === 'SSL_ACTIVE' || d.status === 'DNS_VERIFIED') || customDomains[0]
      : null;

    const presence = resolveBusinessPresenceMode({
      tenant: tenant as any,
      customDomain: verifiedCustomDomain
        ? { domain: verifiedCustomDomain.domain, status: verifiedCustomDomain.status }
        : null,
    });

    const explicitDomain = typeof body.targetDomain === 'string' ? body.targetDomain.trim() : '';
    const targetDomain = explicitDomain || presence.domain;
    if (!targetDomain || presence.mode === 'no_website') {
      return NextResponse.json(
        {
          error: 'Activate your free BGOS mini-site or configure your domain before scanning Google Organic web rankings.',
          code: 'NO_WEBSITE',
        },
        { status: 400 },
      );
    }

    const hasDataForSeo = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
    let hasGemini = Boolean(process.env.GEMINI_API_KEY);
    if (!hasDataForSeo && !hasGemini) {
      try {
        const { loadAiKeyChain } = await import('@/lib/ai-client');
        const chain = await loadAiKeyChain();
        hasGemini = Array.isArray(chain?.gemini) && chain.gemini.length > 0;
      } catch {}
    }

    if (!hasDataForSeo && !hasGemini) {
      return NextResponse.json(
        { error: 'Configure GEMINI_API_KEY or DataForSEO credentials on the server before scanning organic SERPs.' },
        { status: 503 },
      );
    }

    const keywords: string[] = Array.isArray(body.keywords)
      ? body.keywords.map((k: unknown) => String(k || '').trim()).filter(Boolean)
      : body.keyword
        ? [String(body.keyword).trim()]
        : [];

    if (keywords.length === 0 || keywords.length > 3 || keywords.some((k) => k.length > 150)) {
      return NextResponse.json(
        { error: 'Provide 1 to 3 keywords (max 150 chars each) for Organic SERP scanning.' },
        { status: 400 },
      );
    }

    const stored = settings(tenant.settingsJson);
    if (stored.organicSerpClaim?.at && Date.now() - Date.parse(stored.organicSerpClaim.at) < 12 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Organic SERP scan ran within the last 12 hours. Review existing measurements or wait before rescanning.' },
        { status: 429 },
      );
    }

    const locale = resolveTenantLocale({ tenantCountry: tenant.country, settingsJson: stored });
    const canonicalPath =
      presence.mode === 'bgos_hosted' && presence.hostedCanonicalUrl
        ? (() => {
            try {
              return new URL(presence.hostedCanonicalUrl).pathname;
            } catch {
              return null;
            }
          })()
        : null;

    try {
      const useGeminiFallback = !(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
      const uniqueKeywords = [...new Set(keywords)];
      const scannedResults = await Promise.all(
        uniqueKeywords.map(async (kw) => {
          const res = useGeminiFallback
            ? await scanGeminiGroundedSerpFallback({
                keyword: kw,
                businessName: tenant.name || 'Business',
                targetDomain,
                city: tenant.city,
              })
            : await scanOrganicSerp({
                keyword: kw,
                targetDomain,
                canonicalPath,
                locationName: locale.countryName,
              });
          const rowId = randomUUID();
          const date = new Date().toISOString();
          return {
            id: rowId,
            date,
            providerMode: (res as any).providerMode || (useGeminiFallback ? 'gemini_grounded_search' : 'dataforseo'),
            ...res,
          };
        }),
      );

      let totalCost = 0;
      const results: Array<OrganicSerpScanResult & { id: string; date: string; providerMode?: string }> = [];

      for (const item of scannedResults) {
        totalCost += item.cost;
        results.push(item);

        if ((db as any).rankGridScan?.create) {
          await (db as any).rankGridScan
            .create({
              data: {
                id: item.id,
                tenantId: user.tenantId,
                scanType: 'organic_serp',
                keyword: item.keyword,
                targetDomain: item.targetDomain,
                organicRank: item.organicRank,
                aiOverviewPresent: item.aiOverviewPresent,
                aiOverviewCited: item.aiOverviewCited,
                aiCitedUrlsJson: JSON.stringify(item.citedDomains),
                cost: item.cost,
              },
            })
            .catch(() => {});
        }

        await updateTrackedKeywordRanks({
          tenantId: user.tenantId,
          keyword: item.keyword,
          organicRank: item.organicRank,
          aiOverviewCited: item.aiOverviewCited,
        });
      }

      const claimedAt = new Date().toISOString();
      const freshTenant = await db.tenant.findUnique({ where: { id: user.tenantId }, select: { settingsJson: true } });
      const freshStored = settings(freshTenant?.settingsJson);
      await db.tenant.update({
        where: { id: user.tenantId },
        data: {
          settingsJson: JSON.stringify({
            ...freshStored,
            organicSerpClaim: { id: randomUUID(), at: claimedAt },
            measuredOrganicScans: [...(freshStored.measuredOrganicScans || []), ...results].slice(-30),
          }),
        },
      });

      return NextResponse.json({
        success: true,
        scans: results,
        cost: Number(totalCost.toFixed(4)),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Organic SERP scan failed' },
        { status: 502 },
      );
    }
  }

  // 4. DataForSEO Single-Point Live Maps Coordinates Scan (Legacy + Backward Compatible)
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    return NextResponse.json(
      { error: 'DataForSEO credentials must be configured on the server before scanning.' },
      { status: 503 },
    );
  }

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const stored = settings(tenant.settingsJson);
  const search = body?.search || stored.rankSearch;
  const coordinates = String(search?.location || '').split(',');
  const latitude = Number(coordinates[0]);
  const longitude = Number(coordinates[1]);

  if (
    !search ||
    typeof search.placeId !== 'string' ||
    !/^ChI[A-Za-z0-9_-]+$/.test(search.placeId) ||
    coordinates.length !== 3 ||
    !coordinates[0] ||
    !coordinates[1] ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180 ||
    !/^([3-9]|1[0-9]|2[01])z$/.test(coordinates[2]) ||
    !Array.isArray(search.keywords) ||
    !search.keywords.length ||
    search.keywords.length > 5 ||
    search.keywords.some((k: unknown) => typeof k !== 'string' || !k.trim() || k.length > 150)
  ) {
    return NextResponse.json(
      {
        error:
          'Provide a Google Place ID, latitude,longitude,zoom (e.g. 28.6139,77.2090,15z), and 1–5 keywords.',
      },
      { status: 400 },
    );
  }

  if (stored.rankScanClaim && Date.now() - Date.parse(stored.rankScanClaim.at) < 86400000) {
    return NextResponse.json(
      {
        error:
          'One paid scan per workspace per 24 hours is allowed. Failed attempts also count to prevent repeated charges.',
      },
      { status: 429 },
    );
  }

  const id = randomUUID();
  const claim = {
    ...stored,
    rankSearch: search,
    rankScanClaim: { id, at: new Date().toISOString() },
  };

  // Optimistic compare-and-swap prevents concurrent paid scans and settings loss.
  const locked = await db.tenant.updateMany({
    where: { id: user.tenantId, settingsJson: tenant.settingsJson },
    data: { settingsJson: JSON.stringify(claim) },
  });
  if (!locked.count) {
    return NextResponse.json({ error: 'Settings changed. Reload and retry.' }, { status: 409 });
  }

  try {
    const keywords: RankScan['keywords'] = [];
    let cost = 0;
    for (const keyword of [...new Set<string>(search.keywords)]) {
      const result = await scanMaps(keyword.trim(), search.location, search.placeId);
      cost += result.cost;
      keywords.push({ keyword: result.keyword, rank: result.rank });
      await updateTrackedKeywordRanks({
        tenantId: user.tenantId,
        keyword: result.keyword,
        mapsRank: result.rank,
      });
    }
    const scan: RankScan = {
      id,
      date: new Date().toISOString(),
      provider: 'dataforseo',
      placeId: search.placeId,
      location: search.location,
      cost,
      keywords,
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await db.tenant.findUniqueOrThrow({
        where: { id: user.tenantId },
        select: { settingsJson: true },
      });
      const fresh = settings(current.settingsJson);
      const saved = await db.tenant.updateMany({
        where: { id: user.tenantId, settingsJson: current.settingsJson },
        data: {
          settingsJson: JSON.stringify({
            ...fresh,
            measuredRankScans: [...(fresh.measuredRankScans || []), scan].slice(-366),
          }),
        },
      });
      if (saved.count) {
        return NextResponse.json({
          success: true,
          message: 'Measured Google Maps positions saved',
          scannedAt: scan.date,
          cost,
        });
      }
    }
    return NextResponse.json(
      {
        error: 'Scan completed but settings changed repeatedly; history could not be saved.',
        scan,
      },
      { status: 409 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ranking scan failed' },
      { status: 502 },
    );
  }
}
