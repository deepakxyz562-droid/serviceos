import { db } from '@/lib/db';
import { decryptKey } from '@/lib/ai-key-crypto';
import { extractJson } from '@/lib/ai-client';

export interface SearchTermEntry {
  keyword: string;
  impressions: number;
}

export interface TenantSeoContext {
  businessName: string;
  category: string;
  city: string;
  serviceArea: string;
  website: string;
  products: string[];
  services: string[];
  searchTerms: SearchTermEntry[];
  trackedKeywords: Array<{ keyword: string; city: string | null; score: number | null }>;
  topKeywords: string[];
  latitude: number | null;
  longitude: number | null;
  parsedSettings: Record<string, any>;
}

function parseJsonStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) =>
          typeof v === 'string'
            ? v.trim()
            : typeof v?.name === 'string'
              ? v.name.trim()
              : typeof v?.title === 'string'
                ? v.title.trim()
                : '',
        )
        .filter(Boolean);
    }
  } catch {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeCoord(raw: unknown, maxAbs: number): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n === 0 || Math.abs(n) > maxAbs) return null;
  return Number(n.toFixed(6));
}

function extractDiscoverySearchTerms(parsedSettings: Record<string, any>): SearchTermEntry[] {
  const discovery = parsedSettings?.googleDiscovery;
  if (!discovery || typeof discovery !== 'object') return [];

  const buckets = [
    discovery.searchKeywords,
    discovery.topSearchKeywords,
    discovery.keywords,
    discovery.queries,
  ];

  const merged = new Map<string, SearchTermEntry>();
  for (const list of buckets) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (typeof row === 'string') {
        const kw = row.trim();
        if (kw && !merged.has(kw.toLowerCase())) {
          merged.set(kw.toLowerCase(), { keyword: kw, impressions: 1 });
        }
        continue;
      }
      if (!row || typeof row !== 'object') continue;
      const kw = String(
        row.searchKeyword || row.keyword || row.query || row.term || '',
      ).trim();
      if (!kw) continue;
      const rawImpressions = Number(
        row.insightsValue?.value ??
          row.insightsValue?.threshold ??
          row.impressions ??
          row.count ??
          row.value ??
          1,
      );
      const impressions = Number.isFinite(rawImpressions) && rawImpressions > 0 ? rawImpressions : 1;
      const prev = merged.get(kw.toLowerCase());
      if (!prev || impressions > prev.impressions) {
        merged.set(kw.toLowerCase(), { keyword: kw, impressions });
      }
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
}

/**
 * Loads normalized brand, city, GPS coordinates, GBP Search Terms, TrackedKeywords,
 * and active services/products for a tenant with full tolerance for partial test mocks.
 */
export async function extractTenantGeoAndSeoContext(
  tenantId: string,
  options?: {
    gbpMeta?: Record<string, any> | null;
    overrideBusinessName?: string;
    overrideCategory?: string;
  },
): Promise<TenantSeoContext> {
  const [brandProfile, tenant, trackedRows, serviceRows] = await Promise.all([
    db.brandProfile?.findUnique?.({ where: { tenantId } }).catch(() => null) ?? Promise.resolve(null),
    db.tenant
      ?.findUnique?.({
        where: { id: tenantId },
        select: {
          name: true,
          industry: true,
          address: true,
          city: true,
          state: true,
          country: true,
          latitude: true,
          longitude: true,
          settingsJson: true,
        },
      })
      .catch(() => null) ?? Promise.resolve(null),
    typeof (db as any).trackedKeyword?.findMany === 'function'
      ? (db as any).trackedKeyword
          .findMany({
            where: { tenantId },
            orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
            take: 12,
            select: { keyword: true, city: true, score: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    typeof (db as any).service?.findMany === 'function'
      ? (db as any).service
          .findMany({
            where: { tenantId, isActive: true },
            take: 15,
            select: { name: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  let parsedSettings: Record<string, any> = {};
  if (typeof tenant?.settingsJson === 'string' && tenant.settingsJson.trim()) {
    try {
      const parsed = JSON.parse(tenant.settingsJson);
      if (parsed && typeof parsed === 'object') parsedSettings = parsed;
    } catch {}
  }

  const gbpMeta = options?.gbpMeta || {};
  const activeGbpTitle = String(
    parsedSettings.activeGbpTitle || gbpMeta.locationTitle || '',
  ).trim();
  const activeGbpCategory = String(parsedSettings.activeGbpCategory || '').trim();

  let businessName =
    options?.overrideBusinessName?.trim() ||
    activeGbpTitle ||
    String(brandProfile?.businessName || '').trim() ||
    String(tenant?.name || '').trim() ||
    'Local Business';

  let category =
    options?.overrideCategory?.trim() ||
    (activeGbpCategory && !/corporate|holding|community centre/i.test(activeGbpCategory)
      ? activeGbpCategory
      : '') ||
    String(brandProfile?.industry || '').trim() ||
    String(tenant?.industry || '').trim() ||
    'Local Business';

  if (
    /^(corporate office|community centre|it company|software)/i.test(category) &&
    /(farmhouse|resort|villa|pool|market|mart|grocery|bakery|cake|hardware|paint|clinic|salon|hotel|cafe|restaurant)/i.test(
      businessName,
    )
  ) {
    if (/(farmhouse|resort|villa|pool|lawn)/i.test(businessName)) {
      category = 'Farmhouse & Hospitality Venue';
    } else if (/(market|mart|grocery)/i.test(businessName)) {
      category = 'Grocery & Supermarket';
    } else if (/(bakery|cake|sweet)/i.test(businessName)) {
      category = 'Bakery & Patisserie';
    }
  }

  const city =
    String(tenant?.city || '').trim() ||
    String(parsedSettings.activeGbpCity || '').trim() ||
    String(parsedSettings.city || '').trim() ||
    String(brandProfile?.location || '').trim() ||
    String(tenant?.address || '').trim() ||
    '';

  const serviceArea = String(brandProfile?.serviceArea || city || '').trim();
  const website = String(brandProfile?.website || '').trim();

  const products = Array.from(
    new Set([
      ...parseJsonStringArray(parsedSettings.activeGbpProducts),
      ...parseJsonStringArray(brandProfile?.products),
      ...parseJsonStringArray(parsedSettings.brandBrain?.sellingItems),
    ]),
  ).slice(0, 12);

  const dbServices = Array.isArray(serviceRows)
    ? serviceRows.map((r: any) => String(r?.name || '').trim()).filter(Boolean)
    : [];
  const services = Array.from(
    new Set([
      ...parseJsonStringArray(parsedSettings.activeGbpServices),
      ...parseJsonStringArray(brandProfile?.services),
      ...dbServices,
    ]),
  ).slice(0, 12);

  const searchTerms = extractDiscoverySearchTerms(parsedSettings);
  const trackedKeywords = Array.isArray(trackedRows)
    ? trackedRows
        .map((r: any) => ({
          keyword: String(r?.keyword || '').trim(),
          city: typeof r?.city === 'string' ? r.city.trim() : null,
          score: typeof r?.score === 'number' ? r.score : null,
        }))
        .filter((r) => Boolean(r.keyword))
    : [];

  const topKeywords = Array.from(
    new Set([
      ...searchTerms.map((s) => s.keyword),
      ...trackedKeywords.map((t) => t.keyword),
    ]),
  ).slice(0, 12);

  const latCandidates = [
    tenant?.latitude,
    parsedSettings.activeGbpLatLng?.latitude,
    parsedSettings.activeGbpLatLng?.lat,
    parsedSettings.gbpCoords?.latitude,
    parsedSettings.gbpCoords?.lat,
    parsedSettings.gbpPlaceCache?.location?.latitude,
    gbpMeta?.latlng?.latitude,
    gbpMeta?.latlng?.lat,
  ];
  const lngCandidates = [
    tenant?.longitude,
    parsedSettings.activeGbpLatLng?.longitude,
    parsedSettings.activeGbpLatLng?.lng,
    parsedSettings.gbpCoords?.longitude,
    parsedSettings.gbpCoords?.lng,
    parsedSettings.gbpPlaceCache?.location?.longitude,
    gbpMeta?.latlng?.longitude,
    gbpMeta?.latlng?.lng,
  ];

  let latitude: number | null = null;
  for (const c of latCandidates) {
    const val = normalizeCoord(c, 90);
    if (val !== null) {
      latitude = val;
      break;
    }
  }
  let longitude: number | null = null;
  for (const c of lngCandidates) {
    const val = normalizeCoord(c, 180);
    if (val !== null) {
      longitude = val;
      break;
    }
  }

  return {
    businessName,
    category,
    city,
    serviceArea,
    website,
    products,
    services,
    searchTerms,
    trackedKeywords,
    topKeywords,
    latitude,
    longitude,
    parsedSettings,
  };
}

/**
 * Converts decimal degrees to EXIF DMS rational string `"deg/1 min/1 secTimes100/100"`.
 */
export function toExifDmsRational(decimalDegrees: number): string {
  const abs = Math.abs(decimalDegrees);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const secTimes100 = Math.round((minFloat - min) * 60 * 100);
  return `${deg}/1 ${min}/1 ${secTimes100}/100`;
}

function sanitizeExifAscii(raw: string | undefined, maxLen = 240): string {
  if (!raw) return '';
  return raw
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Builds sharp `.withExif(...)` payload with IFD0 business/keyword metadata + IFD3 GPS geo-tags.
 */
export function buildJpegExifData(input: {
  businessName?: string | null;
  title?: string | null;
  description?: string | null;
  city?: string | null;
  tags?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
}): { IFD0: Record<string, string>; IFD3?: Record<string, string> } {
  const artist = sanitizeExifAscii(input.businessName || 'Local Business', 80) || 'Local Business';
  const tagsSuffix = Array.isArray(input.tags) && input.tags.length > 0
    ? ` | Keywords: ${input.tags.slice(0, 6).join(', ')}`
    : '';
  const citySuffix =
    input.city &&
    !`${input.title || ''} ${input.description || ''}`.toLowerCase().includes(input.city.toLowerCase())
      ? ` (${input.city})`
      : '';
  const desc = sanitizeExifAscii(
    `${input.title || ''} ${input.description || ''}${citySuffix}${tagsSuffix}`,
    240,
  ) || artist;

  const exif: { IFD0: Record<string, string>; IFD3?: Record<string, string> } = {
    IFD0: {
      ImageDescription: desc,
      Artist: artist,
      Copyright: artist,
      Software: 'BGOS Local SEO Studio',
    },
  };

  if (
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number' &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude) &&
    (input.latitude !== 0 || input.longitude !== 0)
  ) {
    exif.IFD3 = {
      GPSLatitudeRef: input.latitude >= 0 ? 'N' : 'S',
      GPSLatitude: toExifDmsRational(input.latitude),
      GPSLongitudeRef: input.longitude >= 0 ? 'E' : 'W',
      GPSLongitude: toExifDmsRational(input.longitude),
    };
  }

  return exif;
}

export interface VisionInspectionSummary {
  subjectSummary: string;
  suggestedCategory: 'ADDITIONAL' | 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'AT_WORK' | 'TEAMS';
  visualDetails: string[];
}

const VALID_VISION_CATS = new Set([
  'ADDITIONAL',
  'EXTERIOR',
  'INTERIOR',
  'PRODUCT',
  'AT_WORK',
  'TEAMS',
]);

/**
 * Optional multimodal vision inspection of an uploaded/generated photo using active Gemini key.
 * Returns null gracefully when unconfigured, offline, or in minimal test mocks.
 */
export async function inspectImageWithVision(params: {
  imageUrl?: string | null;
  businessName?: string;
  category?: string;
}): Promise<VisionInspectionSummary | null> {
  const url = (params.imageUrl || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    let apiKey = process.env.GEMINI_API_KEY?.trim() || '';
    if (!apiKey && typeof (db as any).aiProviderKey?.findFirst === 'function') {
      const keyRow = await (db as any).aiProviderKey
        .findFirst({ where: { provider: 'gemini', isActive: true }, orderBy: { priority: 'asc' } })
        .catch(() => null);
      if (keyRow?.encryptedKey) {
        const decrypted = decryptKey(keyRow.encryptedKey);
        try {
          const parsed = JSON.parse(decrypted);
          apiKey = String(parsed?.apiKey || parsed?.key || decrypted).trim();
        } catch {
          apiKey = decrypted.trim();
        }
      }
    }
    if (!apiKey) return null;

    const imgRes = await fetch(url, { signal: AbortSignal.timeout(3_500) });
    if (!imgRes.ok) return null;
    const ct = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length === 0 || buf.length > 6_000_000) return null;

    const geminiModel = 'gemini-2.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(4_500),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: ct, data: buf.toString('base64') } },
                {
                  text: `Analyze this Google Business Profile photo for ${params.businessName || 'a local business'} (${params.category || 'Local Business'}). Return strict JSON: {"subjectSummary":"concise 1-sentence description of what is visibly in the photo","suggestedCategory":"EXTERIOR|INTERIOR|PRODUCT|AT_WORK|TEAMS|ADDITIONAL","visualDetails":["detail1","detail2","detail3"]}`,
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join(' ')
      .trim();
    if (!text) return null;
    const parsed = extractJson<Record<string, unknown>>(text);
    const catRaw = String(parsed?.suggestedCategory || 'ADDITIONAL').toUpperCase();
    return {
      subjectSummary: String(parsed?.subjectSummary || '').trim().slice(0, 220),
      suggestedCategory: VALID_VISION_CATS.has(catRaw)
        ? (catRaw as VisionInspectionSummary['suggestedCategory'])
        : 'ADDITIONAL',
      visualDetails: Array.isArray(parsed?.visualDetails)
        ? parsed.visualDetails.map((d) => String(d || '').trim()).filter(Boolean).slice(0, 5)
        : [],
    };
  } catch {
    return null;
  }
}
