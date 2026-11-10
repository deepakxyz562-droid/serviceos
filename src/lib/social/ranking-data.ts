export interface RankScan {
  id: string;
  date: string;
  provider: 'dataforseo';
  placeId: string;
  location: string;
  cost: number;
  keywords: { keyword: string; rank: number | null }[];
}

export interface GeoGridCoord {
  row: number;
  col: number;
  lat: number;
  lng: number;
  coord: string;
}

export interface GeoGridPointResult extends GeoGridCoord {
  rank: number | null;
  topCompetitorName?: string | null;
  topCompetitorRating?: number | null;
}

export interface MapsGridScanResult {
  keyword: string;
  placeId: string;
  gridSize: 3 | 5;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  avgRank: number | null;
  top3Pct: number;
  rankedPoints: number;
  totalPoints: number;
  points: GeoGridPointResult[];
  cost: number;
}

export interface OrganicSerpScanResult {
  keyword: string;
  targetDomain: string;
  organicRank: number | null;
  matchedUrl: string | null;
  aiOverviewPresent: boolean;
  aiOverviewCited: boolean;
  citedDomains: string[];
  topCompetitorDomains: string[];
  cost: number;
}

export function rankingSummary(scans: RankScan[]) {
  const latest = scans.at(-1);
  // Only compare identical search settings and keyword sets.
  const key = (s: RankScan) => JSON.stringify([s.placeId, s.location, s.keywords.map((k) => k.keyword).sort()]);
  const comparable = latest ? scans.filter((s) => key(s) === key(latest)) : [];
  const baseline = comparable[0];
  const average = (s?: RankScan) => {
    const ranks = s?.keywords.flatMap((k) => (k.rank === null ? [] : [k.rank])) || [];
    return ranks.length ? Number((ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1)) : null;
  };
  const currentAvgRank = average(latest);
  const initialAvgRank = average(baseline);
  const allRanked =
    comparable.length > 1 &&
    latest?.keywords.every((k) => k.rank !== null) &&
    baseline?.keywords.every((k) => k.rank !== null);
  return {
    currentAvgRank,
    initialAvgRank,
    totalImprovement:
      allRanked && currentAvgRank !== null && initialAvgRank !== null
        ? Number((initialAvgRank - currentAvgRank).toFixed(1))
        : null,
    totalKeywords: latest?.keywords.length || 0,
    top3Count: latest?.keywords.filter((k) => k.rank !== null && k.rank <= 3).length || 0,
    keywords: latest?.keywords.map((k) => ({ keyword: k.keyword, currentRank: k.rank })) || [],
    history: comparable.map((s) => ({
      date: s.date,
      avgRank: average(s),
      top3Count: s.keywords.filter((k) => k.rank !== null && k.rank <= 3).length,
      location: s.location,
      cost: s.cost,
    })),
    lastScannedAt: latest?.date || null,
  };
}

export async function scanMaps(keyword: string, location: string, placeId: string) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error('Configure DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD on the server');
  }
  const response = await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ keyword, location_coordinate: location, language_code: 'en', depth: 100, search_places: false }]),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Rank provider HTTP ${response.status}`);
  const result = await response.json();
  const task = result.tasks?.[0];
  if (result.status_code !== 20000 || task?.status_code !== 20000 || !Array.isArray(task.result)) {
    throw new Error('DataForSEO could not complete this scan. Check provider account and task logs.');
  }
  const items = task.result.flatMap((r: { items?: unknown[] }) => r.items || []);
  const match = items.find((item: { place_id?: string }) => item.place_id === placeId);
  const top = items[0] as { title?: string; rating?: { value?: number } } | undefined;
  return {
    keyword,
    rank: Number.isInteger(match?.rank_absolute) && match.rank_absolute > 0 ? match.rank_absolute : null,
    cost: Number(task.cost) || 0,
    topCompetitorName: top?.title || null,
    topCompetitorRating: typeof top?.rating?.value === 'number' ? top.rating.value : null,
  };
}

/**
 * Generates an NxN square coordinate matrix (3x3 = 9 pts, 5x5 = 25 pts) centered around
 * `(centerLat, centerLng)` spanning `radiusKm` in every cardinal direction.
 */
export function buildGeoGridCoordinates(
  centerLat: number,
  centerLng: number,
  gridSize: 3 | 5 = 3,
  radiusKm = 3,
  zoom = 15,
): GeoGridCoord[] {
  const halfSpan = Math.floor(gridSize / 2);
  const stepKm = halfSpan > 0 ? radiusKm / halfSpan : 0;
  const cosLat = Math.max(0.15, Math.abs(Math.cos((centerLat * Math.PI) / 180)));
  const points: GeoGridCoord[] = [];

  for (let row = 0; row < gridSize; row++) {
    // North to South so row 0 is top of the map grid
    const northOffsetKm = (halfSpan - row) * stepKm;
    const lat = Number((centerLat + northOffsetKm / 111.32).toFixed(6));

    for (let col = 0; col < gridSize; col++) {
      // West to East
      const eastOffsetKm = (col - halfSpan) * stepKm;
      const lng = Number((centerLng + eastOffsetKm / (111.32 * cosLat)).toFixed(6));
      points.push({
        row,
        col,
        lat,
        lng,
        coord: `${lat},${lng},${zoom}z`,
      });
    }
  }

  return points;
}

async function scanMapsPoint(
  keyword: string,
  locationCoord: string,
  placeId: string,
): Promise<{
  rank: number | null;
  cost: number;
  topCompetitorName: string | null;
  topCompetitorRating: number | null;
}> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error('Configure DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD on the server');
  }

  const response = await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ keyword, location_coordinate: locationCoord, language_code: 'en', depth: 20, search_places: false }]),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Rank provider HTTP ${response.status}`);
  const result = await response.json();
  const task = result.tasks?.[0];
  if (result.status_code !== 20000 || task?.status_code !== 20000 || !Array.isArray(task.result)) {
    throw new Error('DataForSEO grid scan failed. Check provider account and task logs.');
  }
  const items = task.result.flatMap((r: { items?: any[] }) => r.items || []);
  const match = items.find((item: any) => item?.place_id === placeId);
  const top = items[0];
  const rankRaw = match?.rank_absolute ?? match?.rank_group;
  return {
    rank: Number.isInteger(rankRaw) && rankRaw > 0 && rankRaw <= 20 ? rankRaw : null,
    cost: Number(task.cost) || 0,
    topCompetitorName: typeof top?.title === 'string' ? top.title : null,
    topCompetitorRating: typeof top?.rating?.value === 'number' ? top.rating.value : null,
  };
}

export async function scanMapsGrid(params: {
  keyword: string;
  placeId: string;
  centerLat: number;
  centerLng: number;
  gridSize?: 3 | 5;
  radiusKm?: number;
}): Promise<MapsGridScanResult> {
  const gridSize: 3 | 5 = params.gridSize === 5 ? 5 : 3;
  const radiusKm = Math.min(25, Math.max(0.5, Number(params.radiusKm) || 3));
  const coords = buildGeoGridCoordinates(params.centerLat, params.centerLng, gridSize, radiusKm, 15);
  const keyword = params.keyword.trim();

  const points: GeoGridPointResult[] = [];
  let cost = 0;

  // Concurrency batch of 5 coordinates per burst
  const BATCH_SIZE = 5;
  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batch = coords.slice(i, i + BATCH_SIZE);
    const settled = await Promise.all(
      batch.map(async (pt) => {
        const res = await scanMapsPoint(keyword, pt.coord, params.placeId);
        return { pt, res };
      }),
    );
    for (const { pt, res } of settled) {
      cost += res.cost;
      points.push({
        ...pt,
        rank: res.rank,
        topCompetitorName: res.topCompetitorName,
        topCompetitorRating: res.topCompetitorRating,
      });
    }
  }

  const ranked = points.filter((p) => p.rank != null).map((p) => p.rank as number);
  const avgRank = ranked.length > 0 ? Number((ranked.reduce((a, b) => a + b, 0) / ranked.length).toFixed(1)) : null;
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
    cost: Number(cost.toFixed(4)),
  };
}

function normalizeHost(raw: string): string {
  return raw.toLowerCase().replace(/^www\./, '').trim();
}

function matchesTargetDomainOrPath(
  candidateUrl: string | null | undefined,
  candidateDomain: string | null | undefined,
  targetDomain: string,
  canonicalPath?: string | null,
): boolean {
  const cleanTarget = normalizeHost(targetDomain);
  const urlStr = String(candidateUrl || '').toLowerCase();
  const domStr = normalizeHost(String(candidateDomain || ''));

  if (cleanTarget === 'fieseros.com' && canonicalPath) {
    const normPath = canonicalPath.toLowerCase().replace(/\/+$/, '');
    return urlStr.includes(normPath);
  }

  if (domStr && (domStr === cleanTarget || domStr.endsWith(`.${cleanTarget}`))) {
    return true;
  }
  if (urlStr) {
    try {
      const host = normalizeHost(new URL(urlStr).hostname);
      return host === cleanTarget || host.endsWith(`.${cleanTarget}`);
    } catch {
      return urlStr.includes(cleanTarget);
    }
  }
  return false;
}

export async function scanOrganicSerp(params: {
  keyword: string;
  targetDomain: string;
  canonicalPath?: string | null;
  locationName?: string | null;
  locationCoordinate?: string | null;
}): Promise<OrganicSerpScanResult> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error('Configure DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD on the server');
  }

  const reqItem: Record<string, unknown> = {
    keyword: params.keyword.trim(),
    language_code: 'en',
    depth: 30,
  };
  if (params.locationCoordinate) {
    reqItem.location_coordinate = params.locationCoordinate;
  } else {
    reqItem.location_name = params.locationName || 'India';
  }

  const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([reqItem]),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Organic SERP provider HTTP ${response.status}`);
  const result = await response.json();
  const task = result.tasks?.[0];
  if (result.status_code !== 20000 || task?.status_code !== 20000 || !Array.isArray(task.result)) {
    throw new Error('DataForSEO organic SERP scan failed.');
  }

  const items: any[] = task.result.flatMap((r: { items?: any[] }) => r.items || []);
  let organicRank: number | null = null;
  let matchedUrl: string | null = null;
  const competitorDomainsSet = new Set<string>();

  let aiOverviewPresent = false;
  let aiOverviewCited = false;
  const citedDomainsSet = new Set<string>();

  for (const item of items) {
    if (item?.type === 'organic') {
      const rankNum = item.rank_group ?? item.rank_absolute;
      if (item.domain) {
        competitorDomainsSet.add(normalizeHost(String(item.domain)));
      }
      if (
        organicRank === null &&
        matchesTargetDomainOrPath(item.url, item.domain, params.targetDomain, params.canonicalPath)
      ) {
        organicRank = Number.isInteger(rankNum) && rankNum > 0 ? rankNum : null;
        matchedUrl = item.url || null;
      }
    }

    if (item?.type === 'ai_overview') {
      aiOverviewPresent = true;
      const refs: any[] = [
        ...(Array.isArray(item.references) ? item.references : []),
        ...(Array.isArray(item.items)
          ? item.items.flatMap((sub: any) => (Array.isArray(sub?.references) ? sub.references : []))
          : []),
      ];
      for (const ref of refs) {
        if (ref?.domain) citedDomainsSet.add(normalizeHost(String(ref.domain)));
        else if (ref?.url) {
          try {
            citedDomainsSet.add(normalizeHost(new URL(ref.url).hostname));
          } catch {}
        }
        if (matchesTargetDomainOrPath(ref?.url, ref?.domain, params.targetDomain, params.canonicalPath)) {
          aiOverviewCited = true;
        }
      }
    }
  }

  return {
    keyword: params.keyword.trim(),
    targetDomain: normalizeHost(params.targetDomain),
    organicRank,
    matchedUrl,
    aiOverviewPresent,
    aiOverviewCited,
    citedDomains: [...citedDomainsSet].slice(0, 12),
    topCompetitorDomains: [...competitorDomainsSet]
      .filter((d) => d !== normalizeHost(params.targetDomain))
      .slice(0, 8),
    cost: Number(task.cost) || 0,
  };
}
