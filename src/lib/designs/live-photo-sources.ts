/**
 * Live Photo Sources — dynamic, hot-linked imagery pipeline with ZERO API keys
 * and ZERO storage. Every image is streamed directly from the source CDN.
 *
 * Sources (verified live from server-side Node fetch):
 *  1. pinterest  — widgets.pinterest.com public pidgets API, driven by a curated
 *                  board map per business vertical + festival (real pins, i.pinimg.com)
 *  2. behance    — public search page; survives the JS cookie challenge by
 *                  replaying `js_challenge_value`, then parses embedded project covers
 *  3. meta_ads   — Facebook Ad Library page; performs the `__rd_verify` POST
 *                  challenge dance and extracts ad creative images (best effort,
 *                  degrades silently when Facebook blocks the deploying IP)
 *  4. unsplash   — unsplash.com/napi internal search endpoint (best effort)
 *  5. flickr     — public photos feed API (no key)
 *  6. wikimedia  — Wikimedia Commons search API (no key)
 *
 * Hardening:
 *  - In-memory TTL cache (6h success / 30min negative) keyed by source+query
 *  - Circuit breaker: 2 consecutive source failures -> 10 min cooldown
 *  - Per-source timeout + HEAD/Range liveness validation before serving URLs
 *  - All fetches abort-safe; nothing here ever throws outward
 */

export type LivePhotoSource =
  | 'pinterest'
  | 'behance'
  | 'meta_ads'
  | 'unsplash'
  | 'flickr'
  | 'wikimedia'
  | 'user_photo'
  | 'curated';

export interface LivePhoto {
  url: string;
  source: LivePhotoSource;
  width?: number;
  height?: number;
  title?: string;
  author?: string;
  sourcePageUrl?: string;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const NEGATIVE_TTL_MS = 30 * 60 * 1000; // 30min
const BREAKER_COOLDOWN_MS = 10 * 60 * 1000; // 10min
const BREAKER_FAILURE_THRESHOLD = 2;
const DEFAULT_SOURCE_TIMEOUT_MS = 9000;

// ─────────────────────────────────────────────────────────────────────────────
// Cache + circuit breaker
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  expires: number;
  photos: LivePhoto[];
}

const photoCache = new Map<string, CacheEntry>();
const breaker = new Map<LivePhotoSource, { failures: number; cooldownUntil: number }>();

function cacheKey(source: LivePhotoSource, query: string): string {
  return `${source}::${query.toLowerCase().trim()}`;
}

function getCached(key: string): LivePhoto[] | null {
  const hit = photoCache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    photoCache.delete(key);
    return null;
  }
  return hit.photos;
}

function setCached(key: string, photos: LivePhoto[]): void {
  photoCache.set(key, {
    expires: Date.now() + (photos.length > 0 ? SUCCESS_TTL_MS : NEGATIVE_TTL_MS),
    photos,
  });
  // Keep the cache bounded
  if (photoCache.size > 600) {
    const oldest = [...photoCache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
    if (oldest) photoCache.delete(oldest[0]);
  }
}

function breakerOpen(source: LivePhotoSource): boolean {
  const b = breaker.get(source);
  return Boolean(b && b.cooldownUntil > Date.now());
}

function recordFailure(source: LivePhotoSource): void {
  const b = breaker.get(source) || { failures: 0, cooldownUntil: 0 };
  b.failures += 1;
  if (b.failures >= BREAKER_FAILURE_THRESHOLD) {
    b.cooldownUntil = Date.now() + BREAKER_COOLDOWN_MS;
    b.failures = 0;
  }
  breaker.set(source, b);
}

function recordSuccess(source: LivePhotoSource): void {
  breaker.set(source, { failures: 0, cooldownUntil: 0 });
}

/** Observability helper for debugging which sources are healthy. */
export function getLiveSourceHealth(): Record<string, { open: boolean; cooldownUntil: number }> {
  const out: Record<string, { open: boolean; cooldownUntil: number }> = {};
  for (const [source, b] of breaker.entries()) {
    out[source] = { open: b.cooldownUntil > Date.now(), cooldownUntil: b.cooldownUntil };
  }
  return out;
}

async function withBreaker(
  source: LivePhotoSource,
  fn: () => Promise<LivePhoto[]>,
): Promise<LivePhoto[]> {
  if (breakerOpen(source)) return [];
  try {
    const photos = await fn();
    if (photos.length > 0) recordSuccess(source);
    return photos;
  } catch (err) {
    console.warn(
      `[live-photo-sources] ${source} failed:`,
      err instanceof Error ? err.message : err,
    );
    recordFailure(source);
    return [];
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_SOURCE_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'user-agent': BROWSER_UA, ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dedupe + validation
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    // Unsplash serves the same photo under many query variants — key by pathname
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

const JUNK_FLYER_PATTERN =
  /\b(dance\s*party|night\s*club|nightclub|dj\s*party|for\s*rent|house\s*rent|apartment\s*rent|room\s*rent|cleaning\s*service|maid\s*service|disco|club\s*flyer|party\s*flyer|editable\s*flyer)\b/i;

export function dedupeLivePhotos(photos: LivePhoto[]): LivePhoto[] {
  const seen = new Set<string>();
  const out: LivePhoto[] = [];
  for (const p of photos) {
    if (!p?.url || !/^https?:\/\//i.test(p.url)) continue;
    // Reject irrelevant pre-printed third-party flyers (e.g. dance parties, rental signs, cleaning ads)
    if (p.title && JUNK_FLYER_PATTERN.test(p.title)) continue;
    if (p.url && JUNK_FLYER_PATTERN.test(p.url)) continue;
    const key = normalizeUrlKey(p.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** HEAD liveness check with a GET Range fallback for CDNs that reject HEAD. */
async function isUrlAlive(url: string, timeoutMs = 4000): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, { method: 'HEAD' }, timeoutMs);
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (!ct || ct.startsWith('image/') || ct === 'application/octet-stream') return true;
    }
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      const res2 = await fetchWithTimeout(
        url,
        { method: 'GET', headers: { Range: 'bytes=0-0' } },
        timeoutMs,
      );
      if (res2.ok || res2.status === 206) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Validates photos concurrently, trying per-photo candidate URLs in order. */
async function validateLivePhotos(
  photos: LivePhoto[],
  candidateMap?: Map<string, string[]>,
  concurrency = 16,
): Promise<LivePhoto[]> {
  const queue = [...photos];
  const out: LivePhoto[] = [];

  async function worker(): Promise<void> {
    for (;;) {
      const photo = queue.shift();
      if (!photo) return;
      const candidates = candidateMap?.get(photo.url) || [photo.url];
      for (const candidate of candidates) {
        if (await isUrlAlive(candidate)) {
          out.push({ ...photo, url: candidate });
          break;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pinterest (widget pidgets API — no key, real pins)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Curated, live-verified public Pinterest boards mapped to business verticals.
 * Every board below returned HTTP 200 with 50 pins via the widget API.
 */
const PINTEREST_BOARD_MAP: Array<{ keywords: RegExp; boards: string[] }> = [
  {
    keywords: /\b(salon|beauty|spa|hair|grooming|makeup|parlour|parlor|barber|nail|facial|cosmetic)\b/i,
    boards: ['postermywall/salon-posters', 'easil/hair-styles', 'easil/skin-care-wrinkles'],
  },
  {
    keywords: /\b(real estate|real-estate|property|realtor|builder|apartment|flat|villa|interior|interiors|architect)\b/i,
    boards: ['postermywall/real-estate-flyers-posters', 'postermywall/real-estate-posters'],
  },
  {
    keywords: /\b(restaurant|food|cafe|coffee|bakery|sweet|mithai|sweets|pizza|kitchen|catering|dine|confectionery|hotel|mess|tiffin)\b/i,
    boards: ['postermywall/restaurant-flyers-posters', 'easil/food-and-drink'],
  },
  {
    keywords: /\b(car|auto|garage|detailing|carwash|car wash|tyre|tire|mechanic|bike|motorcycle|diesel|puncture)\b/i,
    boards: ['postermywall/car-posters', 'postermywall/car-wash-flyers-posters'],
  },
  {
    keywords: /\b(gym|fitness|yoga|workout|trainer|sports|zumba|crossfit|physio)\b/i,
    boards: ['postermywall/fitness-flyers', 'easil/exercise'],
  },
  {
    keywords: /\b(bridal|wedding|marriage|shadi|engagement)\b/i,
    boards: ['easil/davids-bridal'],
  },
  {
    keywords: /\b(software|it\b|it\s+service|information technology|tech|developer|coding|web dev|app dev|saas|cloud|programming|fieseros|serviceos)\b/i,
    boards: ['envato/web-design', 'envato/design-trends'],
  },
  {
    keywords: /\b(sale|offer|discount|deal|promo|clearance| fest)\b/i,
    boards: ['envato/design-trends'],
  },
  {
    keywords: /\b(pet|dog|cat|clinic|vet)\b/i,
    boards: ['easil/exercise'],
  },
  {
    keywords: /\b(design|graphic|creative|branding|agency|studio|marketing)\b/i,
    boards: ['envato/graphic-design', 'envato/design-trends'],
  },
  {
    keywords: /\b(security|guard|surveillance|cctv|patrol|protection|bouncer|sos|safety)\b/i,
    boards: ['postermywall/security-flyers', 'postermywall/cctv-camera-posters'],
  },
];

/** Live-verified festival boards on postermywall. */
export const PINTEREST_FESTIVAL_BOARDS: Record<string, string[]> = {
  diwali: ['postermywall/diwali-posters'],
  holi: ['postermywall/holi-posters'],
  christmas: ['postermywall/christmas-greeting-cards-posters'],
  new_year: [
    'postermywall/new-year-flyers-posters',
    'postermywall/new-year-flyers-free-christmas-templates-posters',
  ],
};

const PINTEREST_GENERIC_BOARDS = [
  'envato/design-trends',
];

/** Matches a business/festival context to verified Pinterest boards. */
export function matchPinterestBoards(contextText: string, occasionId?: string): string[] {
  const boards: string[] = [];
  if (occasionId && PINTEREST_FESTIVAL_BOARDS[occasionId]) {
    boards.push(...PINTEREST_FESTIVAL_BOARDS[occasionId]);
  }
  for (const entry of PINTEREST_BOARD_MAP) {
    if (entry.keywords.test(contextText)) boards.push(...entry.boards);
  }
  if (boards.length === 0) boards.push(...PINTEREST_GENERIC_BOARDS);
  return [...new Set(boards)].slice(0, 6);
}

function upgradePinimgUrl(url: string, target = '736x'): string {
  return url.replace(/\/(236x|237x|474x|564x)\//, `/${target}/`);
}

interface PinImages {
  orig?: { url?: string; width?: number; height?: number };
  '736x'?: { url?: string; width?: number; height?: number };
  '600x'?: { url?: string; width?: number; height?: number };
  '564x'?: { url?: string; width?: number; height?: number };
  '236x'?: { url?: string; width?: number; height?: number };
}

interface PinItem {
  id?: string;
  images?: PinImages;
  description?: string;
  repin_count?: number;
  board?: { name?: string; url?: string };
}

async function fetchPinterestBoardPins(boardPath: string, limit: number): Promise<LivePhoto[]> {
  const safePath = boardPath.replace(/^\/+|\/+$/g, '');
  const url = `https://widgets.pinterest.com/v3/pidgets/boards/${encodeURIComponent(safePath).replace(/%2F/g, '/')}/pins/`;
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`pidgets HTTP ${res.status}`);
  const data = (await res.json()) as { data?: { pins?: PinItem[] } };
  const pins = data.data?.pins || [];
  const out: LivePhoto[] = [];
  const seenIds = new Set<string>();
  for (const pin of pins) {
    if (out.length >= limit) break;
    const pinId = pin.id || '';
    if (pinId && seenIds.has(pinId)) continue;
    if (pinId) seenIds.add(pinId);
    const imgs = pin.images || {};
    const best =
      imgs['736x']?.url ||
      imgs['600x']?.url ||
      imgs['564x']?.url ||
      imgs.orig?.url ||
      imgs['236x']?.url;
    if (!best || !best.includes('i.pinimg.com')) continue;
    const upgraded = upgradePinimgUrl(best);
    out.push({
      url: upgraded,
      source: 'pinterest',
      width: imgs['736x']?.width || imgs['564x']?.width,
      height: imgs['736x']?.height || imgs['564x']?.height,
      title: (pin.description || '').slice(0, 90) || undefined,
      sourcePageUrl: pin.board?.url ? `https://www.pinterest.com${pin.board.url}` : undefined,
    });
  }
  return out;
}

async function searchPinterest(
  boards: string[],
  limit: number,
  signalTimeout = DEFAULT_SOURCE_TIMEOUT_MS,
): Promise<{ photos: LivePhoto[]; candidates: Map<string, string[]> }> {
  const photos: LivePhoto[] = [];
  const candidates = new Map<string, string[]>();
  const results = await Promise.allSettled(
    boards.map((b) => fetchPinterestBoardPins(b, Math.ceil(limit / Math.max(1, boards.length)) + 10)),
  );
  for (const r of results) {
    if (r.status === 'fulfilled') photos.push(...r.value);
  }
  for (const p of photos) {
    const fallback = p.url.replace(/\/736x\//, '/564x/');
    candidates.set(p.url, [p.url, fallback]);
  }
  void signalTimeout;
  return { photos, candidates };
}

// ─────────────────────────────────────────────────────────────────────────────
// Behance (public search + JS cookie challenge dance)
// ─────────────────────────────────────────────────────────────────────────────

let behanceCookie: { value: string; expires: number } | null = null;

async function fetchBehanceHtml(searchUrl: string): Promise<string | null> {
  const attempt = async (cookieValue?: string): Promise<Response> =>
    fetchWithTimeout(
      searchUrl,
      {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en-US,en;q=0.9',
          ...(cookieValue ? { cookie: `js_challenge_value=${cookieValue}` } : {}),
        },
      },
      15000,
    );

  let res = await attempt(behanceCookie && behanceCookie.expires > Date.now() ? behanceCookie.value : undefined);
  if (res.status === 403) {
    const challengeHtml = await res.text();
    const match = /js_challenge_value=([a-f0-9]{40,})/.exec(challengeHtml);
    if (match) {
      behanceCookie = { value: match[1], expires: Date.now() + 60 * 60 * 1000 };
      res = await attempt(match[1]);
    }
  }
  if (!res.ok) return null;
  return res.text();
}

async function searchBehance(query: string, limit: number): Promise<LivePhoto[]> {
  const searchUrl = `https://www.behance.net/search/projects?search=${encodeURIComponent(query)}`;
  const html = await fetchBehanceHtml(searchUrl);
  if (!html) return [];

  const out: LivePhoto[] = [];
  const coverRe =
    /mir-s3-cdn-cf\.behance\.net(?:\\\/|\/)projects(?:\\\/|\/)(original_webp|max_1200|max_632|source)(?:\\\/|\/)([A-Za-z0-9._%-]+?\.(?:png|jpe?g|webp))/g;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = coverRe.exec(html)) !== null && out.length < limit) {
    const url = `https://mir-s3-cdn-cf.behance.net/projects/${match[1]}/${match[2]}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, source: 'behance' });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta Ads (Facebook Ad Library challenge dance — best effort, silent degrade)
// ─────────────────────────────────────────────────────────────────────────────

let fbCookieHeader: string | null = null;

function mergeSetCookies(res: Response): void {
  const setCookies = res.headers.getSetCookie?.() || [];
  if (setCookies.length === 0) return;
  const jar = new Map<string, string>();
  for (const existing of (fbCookieHeader || '').split('; ')) {
    const idx = existing.indexOf('=');
    if (idx > 0) jar.set(existing.slice(0, idx), existing.slice(idx + 1));
  }
  for (const raw of setCookies) {
    const pair = raw.split(';')[0];
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  fbCookieHeader = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function decodeJsonStringLiteral(literal: string): string {
  try {
    return JSON.parse(`"${literal}"`) as string;
  } catch {
    return literal.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
}

async function fetchAdLibraryHtml(query: string): Promise<string | null> {
  const adLibUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IN&q=${encodeURIComponent(query)}&media_type=all&search_type=keyword_unordered`;
  const cookieInit = fbCookieHeader ? { cookie: fbCookieHeader } : {};

  for (let round = 0; round < 3; round++) {
    const res = await fetchWithTimeout(adLibUrl, { headers: cookieInit, redirect: 'follow' }, 15000);
    mergeSetCookies(res);
    if (res.ok) return res.text();
    if (res.status !== 403) return null;
    const challengeHtml = await res.text();
    const verifyPath = /\/__rd_verify_[A-Za-z0-9_-]+\?challenge=\d+/.exec(challengeHtml);
    if (!verifyPath) return null;
    try {
      const verifyRes = await fetchWithTimeout(
        `https://www.facebook.com${verifyPath[0]}`,
        { method: 'POST', headers: cookieInit, redirect: 'follow' },
        10000,
      );
      mergeSetCookies(verifyRes);
      if (verifyRes.headers.getSetCookie?.().length === 0 && fbCookieHeader) {
        // keep whatever jar we already have
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function searchMetaAds(query: string, limit: number): Promise<LivePhoto[]> {
  const html = await fetchAdLibraryHtml(query);
  if (!html) return [];

  const out: LivePhoto[] = [];
  const seen = new Set<string>();
  const imgRe = /"(original_image_url|resized_image_url|video_thumbnail_url)":"(https:[^"]{20,700}?)"/g;
  let match: RegExpExecArray | null;
  while ((match = imgRe.exec(html)) !== null && out.length < limit) {
    const url = decodeJsonStringLiteral(match[2]);
    if (!/scontent[^"']*\.fbcdn\.net/.test(url) && !/fbcdn\.net/.test(url)) continue;
    const key = normalizeUrlKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url, source: 'meta_ads' });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unsplash napi (internal search, no key — best effort)
// ─────────────────────────────────────────────────────────────────────────────

async function searchUnsplashNapi(query: string, limit: number): Promise<LivePhoto[]> {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.min(30, limit)}`;
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      urls?: { raw?: string; regular?: string; full?: string };
      width?: number;
      height?: number;
      alt_description?: string;
      links?: { html?: string };
      user?: { name?: string };
    }>;
  };
  const results = data.results || [];
  return results.slice(0, limit).map((r) => ({
    url:
      r.urls?.regular ||
      (r.urls?.raw ? `${r.urls.raw}&w=1200&auto=format&fit=crop&q=80` : '') ||
      '',
    source: 'unsplash' as LivePhotoSource,
    width: r.width,
    height: r.height,
    title: (r.alt_description || '').slice(0, 90) || undefined,
    author: r.user?.name,
    sourcePageUrl: r.links?.html,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Flickr public feed (no key)
// ─────────────────────────────────────────────────────────────────────────────

async function searchFlickr(query: string, limit: number): Promise<LivePhoto[]> {
  const tags = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4)
    .join(',');
  if (!tags) return [];
  const url = `https://www.flickr.com/services/feeds/photos_public.gne?tags=${encodeURIComponent(tags)}&tagmode=all&format=json&nojsoncallback=1`;
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    items?: Array<{ media?: { m?: string }; title?: string; link?: string; author?: string }>;
  };
  return (data.items || [])
    .slice(0, limit)
    .map((item) => {
      const mUrl = item.media?.m || '';
      if (!mUrl) return null;
      return {
        url: mUrl.replace(/_m\.jpg$/, '_b.jpg'), // upgrade 240px -> 1024px
        source: 'flickr' as LivePhotoSource,
        title: (item.title || '').slice(0, 90) || undefined,
        author: (item.author || '').replace(/nobody@flickr\.com \("/, '').replace(/"\)$/, '') || undefined,
        sourcePageUrl: item.link,
      };
    })
    .filter((p): p is LivePhoto => Boolean(p && p.url));
}

// ─────────────────────────────────────────────────────────────────────────────
// Wikimedia Commons (no key)
// ─────────────────────────────────────────────────────────────────────────────

async function searchWikimedia(query: string, limit: number): Promise<LivePhoto[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrlimit=${Math.min(30, limit)}&prop=imageinfo&iiprop=url|mime&iiurlwidth=1200&format=json&origin=*`;
  const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: {
      pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; mime?: string; descriptionurl?: string }> }>;
    };
  };
  const pages = Object.values(data.query?.pages || {});
  return pages
    .map((p) => p.imageinfo?.[0])
    .filter((info): info is NonNullable<typeof info> => Boolean(info?.thumburl))
    .filter((info) => !info.mime || /image\/(jpeg|png|webp)/.test(info.mime))
    .slice(0, limit)
    .map((info) => ({
      url: info.thumburl as string,
      source: 'wikimedia' as LivePhotoSource,
      sourcePageUrl: info.descriptionurl,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveSearchOptions {
  /** Ordered search queries — first is primary. */
  queries: string[];
  /** Explicit Pinterest board paths (e.g. 'postermywall/diwali-posters'). */
  pinterestBoards?: string[];
  /** Merged target size (default 120). */
  limit?: number;
  /** Skip liveness validation (used when the caller validates separately). */
  skipValidation?: boolean;
}

function interleaveBySource(buckets: LivePhoto[][]): LivePhoto[] {
  // Unsplash is prioritized first: clean, pure photography with no pre-printed text or irrelevant flyers
  const order: LivePhotoSource[] = [
    'unsplash',
    'behance',
    'flickr',
    'wikimedia',
    'meta_ads',
    'pinterest',
  ];
  const cursors = new Map<LivePhotoSource, number>();
  const out: LivePhoto[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const source of order) {
      const bucket = buckets.find((b) => b[0]?.source === source);
      if (!bucket) continue;
      const cursor = cursors.get(source) || 0;
      if (cursor < bucket.length) {
        out.push(bucket[cursor]);
        cursors.set(source, cursor + 1);
        remaining = true;
      }
    }
  }
  return out;
}

/**
 * Searches all live sources in parallel, merges + dedupes + validates, and
 * returns hot-linked photos tagged with their true origin source.
 * Fully cached; never throws.
 */
export async function searchLivePhotos(options: LiveSearchOptions): Promise<LivePhoto[]> {
  const { queries, pinterestBoards, skipValidation } = options;
  const limit = Math.max(20, Math.min(400, options.limit || 120));
  const primaryQuery = (queries[0] || 'local business marketing poster').trim();
  const secondaryQuery = (queries[1] || queries[0] || primaryQuery).trim();

  const cacheKeyFull = cacheKey('wikimedia', `merged|${primaryQuery}|${secondaryQuery}|${(pinterestBoards || []).join(',')}|${limit}`);
  const cached = getCached(cacheKeyFull);
  if (cached) return cached;

  const boards = (pinterestBoards && pinterestBoards.length > 0
    ? pinterestBoards
    : matchPinterestBoards(primaryQuery));

  const [pinterestRes, behanceRes, metaRes, unsplashRes, flickrRes, wikimediaRes] =
    await Promise.allSettled([
      withBreaker('pinterest', () => searchPinterest(boards, limit)),
      withBreaker('behance', () => searchBehance(primaryQuery, Math.ceil(limit / 3))),
      withBreaker('meta_ads', () => searchMetaAds(primaryQuery, Math.ceil(limit / 4))),
      withBreaker('unsplash', () => searchUnsplashNapi(secondaryQuery, Math.ceil(limit / 3))),
      withBreaker('flickr', () => searchFlickr(primaryQuery, 24)),
      withBreaker('wikimedia', () => searchWikimedia(secondaryQuery, 20)),
    ]);

  const pinterestData = pinterestRes.status === 'fulfilled' ? pinterestRes.value : { photos: [], candidates: undefined };
  const candidateMap = new Map<string, string[]>(pinterestData.candidates || []);

  const buckets: LivePhoto[][] = [];
  if (pinterestRes.status === 'fulfilled') buckets.push(pinterestData.photos);
  buckets.push(
    behanceRes.status === 'fulfilled' ? behanceRes.value : [],
    metaRes.status === 'fulfilled' ? metaRes.value : [],
    unsplashRes.status === 'fulfilled' ? unsplashRes.value : [],
    flickrRes.status === 'fulfilled' ? flickrRes.value : [],
    wikimediaRes.status === 'fulfilled' ? wikimediaRes.value : [],
  );

  const merged = dedupeLivePhotos(interleaveBySource(buckets));

  let validated: LivePhoto[];
  if (skipValidation) {
    validated = merged.slice(0, limit);
  } else {
    validated = await validateLivePhotos(merged.slice(0, Math.max(limit, 90)), candidateMap);
    validated = validated.slice(0, limit);
  }

  setCached(cacheKeyFull, validated);
  return validated;
}

/** Direct per-source raw search with cache (used by festival + blueprint flows). */
export async function searchSingleSource(
  source: LivePhotoSource,
  query: string,
  limit = 40,
): Promise<LivePhoto[]> {
  const key = cacheKey(source, `${query}|${limit}`);
  const cached = getCached(key);
  if (cached) return cached;
  let photos: LivePhoto[] = [];
  if (source === 'pinterest') {
    const { photos: pinPhotos } = await searchPinterest(matchPinterestBoards(query), limit);
    photos = pinPhotos;
  } else if (source === 'behance') {
    photos = await withBreaker('behance', () => searchBehance(query, limit));
  } else if (source === 'meta_ads') {
    photos = await withBreaker('meta_ads', () => searchMetaAds(query, limit));
  } else if (source === 'unsplash') {
    photos = await withBreaker('unsplash', () => searchUnsplashNapi(query, limit));
  } else if (source === 'flickr') {
    photos = await withBreaker('flickr', () => searchFlickr(query, limit));
  } else if (source === 'wikimedia') {
    photos = await withBreaker('wikimedia', () => searchWikimedia(query, limit));
  }
  const deduped = dedupeLivePhotos(photos).slice(0, limit);
  setCached(key, deduped);
  return deduped;
}
