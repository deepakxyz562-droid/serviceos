import { db } from '@/lib/db';
import { loadAiKeyChain } from '@/lib/ai-client';
import {
  buildGeoGridCoordinates,
  type GeoGridPointResult,
  type MapsGridScanResult,
  type OrganicSerpScanResult,
} from '@/lib/social/ranking-data';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';

export interface KeywordWinnabilityItem {
  keyword: string;
  demandSignal: string;
  nativeImpressions: number;
  inAutocomplete: boolean;
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  competitionIndex: number; // 0..100 (higher = tougher competition)
  winnabilityScore: number; // 0..100 (higher = easier/faster win)
  winnabilityTier: 'Quick Win' | 'Winnable' | 'Competitive';
  yourPlacesRank: number | null;
  top3AvgReviews: number | null;
  topCompetitorName: string | null;
  reason: string;
  checkedAt: string;
}

export function getGooglePlacesApiKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    null
  );
}

function normalizePlaceId(id?: string | null): string {
  return (id || '').replace(/^places\//, '').trim();
}

/**
 * Fetch live Google Autocomplete query suggestions for seed local terms.
 * Free public endpoint, fails open cleanly on timeout/error.
 */
export async function fetchGoogleAutocompleteSuggestions(
  seedQueries: string[],
  countryCode = 'in',
): Promise<string[]> {
  const gl = (countryCode || 'in').trim().toLowerCase().slice(0, 2) || 'in';
  const out: string[] = [];
  const seen = new Set<string>();

  await Promise.all(
    seedQueries.slice(0, 4).map(async (q) => {
      const clean = q.trim();
      if (!clean) return;
      try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=${encodeURIComponent(
          gl,
        )}&q=${encodeURIComponent(clean)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as unknown;
        if (Array.isArray(json) && Array.isArray(json[1])) {
          for (const suggestion of json[1]) {
            const s = typeof suggestion === 'string' ? suggestion.trim().toLowerCase() : '';
            if (s && !seen.has(s)) {
              seen.add(s);
              out.push(s);
            }
          }
        }
      } catch {
        // fail open cleanly
      }
    }),
  );

  return out.slice(0, 15);
}

async function searchPlacesForKeyword(params: {
  apiKey: string;
  keyword: string;
  regionCode: string;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  maxResultCount?: number;
}): Promise<
  Array<{
    id?: string;
    name?: string;
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
    primaryTypeDisplayName?: string;
  }>
> {
  const body: Record<string, unknown> = {
    textQuery: params.keyword,
    maxResultCount: params.maxResultCount ?? 10,
    regionCode: params.regionCode,
  };
  if (
    typeof params.centerLat === 'number' &&
    typeof params.centerLng === 'number' &&
    Number.isFinite(params.centerLat) &&
    Number.isFinite(params.centerLng) &&
    !(params.centerLat === 0 && params.centerLng === 0)
  ) {
    body.locationBias = {
      circle: {
        center: { latitude: params.centerLat, longitude: params.centerLng },
        radius: params.radiusMeters ?? 5000,
      },
    };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': params.apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.primaryTypeDisplayName',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { places?: any[] };
  const list = Array.isArray(data.places) ? data.places : [];
  return list.map((p) => ({
    id: typeof p?.id === 'string' ? p.id : undefined,
    name: typeof p?.displayName?.text === 'string' ? p.displayName.text : undefined,
    rating: typeof p?.rating === 'number' ? p.rating : undefined,
    userRatingCount: typeof p?.userRatingCount === 'number' ? p.userRatingCount : undefined,
    websiteUri: typeof p?.websiteUri === 'string' ? p.websiteUri : undefined,
    primaryTypeDisplayName:
      typeof p?.primaryTypeDisplayName?.text === 'string' ? p.primaryTypeDisplayName.text : undefined,
  }));
}

/**
 * Evaluate candidate keywords without DataForSEO:
 * combines real Google Search Terms impressions, Google Autocomplete demand,
 * and live Google Places competitor strength to score local winnability.
 */
export async function analyzeKeywordWinnability(params: {
  tenantId: string;
  keywords: string[];
}): Promise<KeywordWinnabilityItem[]> {
  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    select: {
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      googlePlaceId: true,
      settingsJson: true,
      brandProfile: { select: { businessName: true, location: true } },
    },
  });
  if (!tenant) return [];

  const settings = safeParseJsonObject(tenant.settingsJson);
  const regionCode = (tenant.country || 'IN').toUpperCase();
  const city = (tenant.brandProfile?.location || tenant.city || '').trim();
  const businessName = (tenant.brandProfile?.businessName || tenant.name || '').trim().toLowerCase();
  const placeId = tenant.googlePlaceId || settings.activeGbpPlaceId || null;
  const selfReviews = await db.review.count({ where: { tenantId: params.tenantId } }).catch(() => 0);

  const discoveryRows: Array<{ keyword: string; count: number }> = Array.isArray(
    settings.googleDiscovery?.keywords,
  )
    ? settings.googleDiscovery.keywords
    : [];
  const nativeMap = new Map<string, number>();
  for (const row of discoveryRows) {
    if (row?.keyword) nativeMap.set(row.keyword.trim().toLowerCase(), Number(row.count) || 0);
  }

  const uniqueKeywords = Array.from(
    new Set(params.keywords.map((k) => k.trim()).filter(Boolean)),
  ).slice(0, 8);
  if (uniqueKeywords.length === 0) return [];

  const autocompletePool = await fetchGoogleAutocompleteSuggestions(
    uniqueKeywords.slice(0, 3),
    regionCode.toLowerCase(),
  );
  const autoSet = new Set(autocompletePool);

  const apiKey = getGooglePlacesApiKey();
  const nowIso = new Date().toISOString();

  const evaluated = await Promise.all(
    uniqueKeywords.map(async (keyword): Promise<KeywordWinnabilityItem> => {
      const lower = keyword.toLowerCase();
      const nativeImpressions = nativeMap.get(lower) || 0;
      const inAutocomplete =
        autoSet.has(lower) || autocompletePool.some((s) => s.includes(lower) || lower.includes(s));

      const queryWithGeo =
        city && !lower.includes(city.toLowerCase()) ? `${keyword} ${city}` : keyword;

      const places = apiKey
        ? await searchPlacesForKeyword({
            apiKey,
            keyword: queryWithGeo,
            regionCode,
            centerLat: tenant.latitude || undefined,
            centerLng: tenant.longitude || undefined,
          })
        : [];

      let yourPlacesRank: number | null = null;
      const peerPlaces: typeof places = [];

      const normalizedSelfPlaceId = normalizePlaceId(placeId);
      places.forEach((p, idx) => {
        const isSelf =
          (normalizedSelfPlaceId && normalizePlaceId(p.id) === normalizedSelfPlaceId) ||
          (businessName && p.name && p.name.toLowerCase().includes(businessName));
        if (isSelf) {
          if (yourPlacesRank === null) yourPlacesRank = idx + 1;
        } else {
          peerPlaces.push(p);
        }
      });

      const top3 = peerPlaces.slice(0, 3);
      const top3WithReviews = top3.filter((p) => typeof p.userRatingCount === 'number');
      const top3AvgReviews =
        top3WithReviews.length > 0
          ? Math.round(
              top3WithReviews.reduce((s, p) => s + (p.userRatingCount || 0), 0) /
                top3WithReviews.length,
            )
          : null;
      const top3WithWebsite = top3.filter((p) => Boolean(p.websiteUri)).length;

      // Competition difficulty from real Maps peer review threshold + websites
      let competitionIndex = 45;
      if (top3AvgReviews !== null) {
        if (top3AvgReviews < 25) competitionIndex = 24;
        else if (top3AvgReviews < 75) competitionIndex = 46;
        else if (top3AvgReviews < 200) competitionIndex = 68;
        else competitionIndex = 85;
      }
      competitionIndex = Math.min(95, competitionIndex + top3WithWebsite * 3);
      if (keyword.split(/\s+/).length >= 4) {
        competitionIndex = Math.max(15, competitionIndex - 10); // long-tail local modifier bonus
      }

      const competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
        competitionIndex <= 38 ? 'LOW' : competitionIndex <= 67 ? 'MEDIUM' : 'HIGH';

      // Winnability favors: active Google impressions, striking distance (#4-#12), low peer reviews vs ours
      let winnabilityScore = 100 - competitionIndex;
      if (nativeImpressions > 0) winnabilityScore += 18;
      if (inAutocomplete) winnabilityScore += 8;
      if (yourPlacesRank !== null) {
        if (yourPlacesRank <= 3) winnabilityScore += 14;
        else if (yourPlacesRank <= 10) winnabilityScore += 20; // strike zone quick win!
      }
      if (top3AvgReviews !== null && selfReviews >= top3AvgReviews) {
        winnabilityScore += 12;
      }
      winnabilityScore = Math.max(10, Math.min(98, Math.round(winnabilityScore)));

      const winnabilityTier: 'Quick Win' | 'Winnable' | 'Competitive' =
        winnabilityScore >= 68 ? 'Quick Win' : winnabilityScore >= 45 ? 'Winnable' : 'Competitive';

      const demandSignal =
        nativeImpressions > 0
          ? `${nativeImpressions} Google searches`
          : inAutocomplete
            ? 'Google Suggest match'
            : keyword.split(/\s+/).length >= 3
              ? 'High-intent long tail'
              : 'Local service query';

      let reason = '';
      if (yourPlacesRank !== null && yourPlacesRank >= 4 && yourPlacesRank <= 10) {
        reason = `Strike zone (#${yourPlacesRank} on Places) — optimize Services + Posts to break Top 3.`;
      } else if (top3AvgReviews !== null && top3AvgReviews <= 35) {
        reason = `Low barrier: Top 3 average only ${top3AvgReviews} reviews.`;
      } else if (nativeImpressions > 0) {
        reason = `Customers already find you ${nativeImpressions} times — reinforce in Services & Landing Page.`;
      } else if (top3AvgReviews !== null) {
        reason = `Top 3 average ${top3AvgReviews} reviews${selfReviews >= top3AvgReviews ? ' (you match or beat them)' : ''}.`;
      } else {
        reason = inAutocomplete
          ? 'Real buyer autocomplete query with local intent.'
          : 'Targeted local buyer phrase.';
      }

      return {
        keyword,
        demandSignal,
        nativeImpressions,
        inAutocomplete,
        competitionLevel,
        competitionIndex,
        winnabilityScore,
        winnabilityTier,
        yourPlacesRank,
        top3AvgReviews,
        topCompetitorName: peerPlaces[0]?.name || null,
        reason,
        checkedAt: nowIso,
      };
    }),
  );

  // Cache evaluations into settingsJson so keyword-plan & AI tools reuse them fast
  try {
    const existingCache: Record<string, KeywordWinnabilityItem> =
      settings.keywordWinnabilityCache && typeof settings.keywordWinnabilityCache === 'object'
        ? { ...settings.keywordWinnabilityCache }
        : {};
    for (const item of evaluated) {
      existingCache[item.keyword.toLowerCase()] = item;
    }
    await db.tenant.update({
      where: { id: params.tenantId },
      data: {
        settingsJson: JSON.stringify({
          ...settings,
          keywordWinnabilityCache: existingCache,
        }),
      },
    });
  } catch {}

  return evaluated.sort((a, b) => b.winnabilityScore - a.winnabilityScore);
}

/**
 * 100% DataForSEO-free 3x3 / 5x5 Area Grid powered by Google Places API (New)
 * using per-pin locationBias circles. Zero proxies, zero CAPTCHAs.
 */
export async function scanPlacesGridFallback(params: {
  keyword: string;
  placeId: string;
  businessName?: string;
  centerLat: number;
  centerLng: number;
  gridSize?: 3 | 5;
  radiusKm?: number;
  regionCode?: string;
}): Promise<MapsGridScanResult & { providerMode: 'places_area_grid' }> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    throw new Error('Configure GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_SERVER_API_KEY on the server');
  }

  const normalizedTargetPlaceId = normalizePlaceId(params.placeId);
  const businessLower = (params.businessName || '').trim().toLowerCase();
  const gridSize: 3 | 5 = params.gridSize === 5 ? 5 : 3;
  const radiusKm = Math.min(25, Math.max(0.5, Number(params.radiusKm) || 3));
  const coords = buildGeoGridCoordinates(params.centerLat, params.centerLng, gridSize, radiusKm, 15);
  const keyword = params.keyword.trim();
  const pinRadiusMeters = Math.max(800, Math.round((radiusKm * 1000) / Math.max(1, gridSize - 1)));
  const points: GeoGridPointResult[] = [];

  const BATCH_SIZE = 5;
  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batch = coords.slice(i, i + BATCH_SIZE);
    const settled = await Promise.all(
      batch.map(async (pt) => {
        const list = await searchPlacesForKeyword({
          apiKey,
          keyword,
          regionCode: params.regionCode || 'IN',
          centerLat: pt.lat,
          centerLng: pt.lng,
          radiusMeters: pinRadiusMeters,
          maxResultCount: 20,
        });
        const matchIdx = list.findIndex(
          (item) =>
            (normalizedTargetPlaceId && normalizePlaceId(item.id) === normalizedTargetPlaceId) ||
            (businessLower && item.name && item.name.toLowerCase().includes(businessLower)),
        );
        const top = list[0];
        return {
          ...pt,
          rank: matchIdx >= 0 ? matchIdx + 1 : null,
          topCompetitorName: top?.name || null,
          topCompetitorRating: top?.rating ?? null,
        } satisfies GeoGridPointResult;
      }),
    );
    points.push(...settled);
  }

  const ranked = points.filter((p) => p.rank != null).map((p) => p.rank as number);
  const avgRank =
    ranked.length > 0 ? Number((ranked.reduce((a, b) => a + b, 0) / ranked.length).toFixed(1)) : null;
  const top3Count = ranked.filter((r) => r <= 3).length;
  const top3Pct = Math.round((top3Count / points.length) * 100);

  return {
    keyword,
    placeId: params.placeId,
    gridSize,
    radiusKm,
    centerLat: params.centerLat,
    centerLng: params.centerLng,
    avgRank,
    top3Pct,
    rankedPoints: ranked.length,
    totalPoints: points.length,
    points,
    cost: 0,
    providerMode: 'places_area_grid',
  };
}

/**
 * DataForSEO-free Organic Web + Google Search Grounding check using GEMINI_API_KEY
 * (`tools: [{ google_search: {} }]`). Checks whether Google Search Grounding cites target domain.
 */
export async function scanGeminiGroundedSerpFallback(params: {
  keyword: string;
  businessName: string;
  targetDomain: string;
  city?: string | null;
}): Promise<OrganicSerpScanResult & { providerMode: 'gemini_grounded_search' }> {
  const keyChain = await loadAiKeyChain().catch(() => ({ gemini: [] as string[] }));
  const firstGeminiKey = Array.isArray(keyChain.gemini) ? keyChain.gemini[0] : undefined;
  const geminiKey =
    (typeof firstGeminiKey === 'string' ? firstGeminiKey : firstGeminiKey?.plaintext) ||
    process.env.GEMINI_API_KEY ||
    '';
  if (!geminiKey) {
    throw new Error('Configure GEMINI_API_KEY on the server to run free Google Search Grounding checks.');
  }

  const cleanTarget = params.targetDomain.toLowerCase().replace(/^www\./, '').trim();
  const promptText = params.city
    ? `Top websites and businesses for "${params.keyword}" in ${params.city}. Include official website links.`
    : `Top websites and businesses for "${params.keyword}". Include official website links.`;

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini Grounded Search HTTP ${res.status}`);
  }

  const json: any = await res.json().catch(() => ({}));
  const cand = json?.candidates?.[0];
  const parts: any[] = Array.isArray(cand?.content?.parts) ? cand.content.parts : [];
  const text = parts.map((p) => p?.text || '').join('\n');
  const chunks: any[] = Array.isArray(cand?.groundingMetadata?.groundingChunks)
    ? cand.groundingMetadata.groundingChunks
    : [];

  const citedDomainsSet = new Set<string>();
  let matchedUrl: string | null = null;
  let aiOverviewCited = false;
  let inferredPos: number | null = null;

  chunks.forEach((c, idx) => {
    const uri = typeof c?.web?.uri === 'string' ? c.web.uri : '';
    const title = typeof c?.web?.title === 'string' ? c.web.title : '';
    if (!uri) return;
    try {
      const host = new URL(uri).hostname.toLowerCase().replace(/^www\./, '');
      citedDomainsSet.add(host);
      if (host === cleanTarget || host.endsWith(`.${cleanTarget}`)) {
        aiOverviewCited = true;
        matchedUrl = uri;
        if (inferredPos === null) inferredPos = idx + 1;
      }
    } catch {}
    if (!aiOverviewCited && title.toLowerCase().includes(params.businessName.toLowerCase())) {
      aiOverviewCited = true;
    }
  });

  if (!aiOverviewCited && text.toLowerCase().includes(cleanTarget)) {
    aiOverviewCited = true;
  }

  return {
    keyword: params.keyword,
    targetDomain: cleanTarget,
    organicRank: inferredPos,
    matchedUrl,
    aiOverviewPresent: chunks.length > 0,
    aiOverviewCited,
    citedDomains: Array.from(citedDomainsSet).slice(0, 12),
    topCompetitorDomains: Array.from(citedDomainsSet)
      .filter((d) => d !== cleanTarget && !d.endsWith(`.${cleanTarget}`))
      .slice(0, 8),
    cost: 0,
    providerMode: 'gemini_grounded_search',
  };
}
