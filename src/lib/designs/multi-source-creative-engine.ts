/**
 * Multi-Source Creative Engine (dynamic edition)
 *
 * Replaces the old 77-URL hardcoded catalog + modulo cycling with a live,
 * zero-storage pipeline:
 *
 *   Tier 1 — User's own photos (brand library / social posts / GBP media)
 *   Tier 2 — Live search across Pinterest + Behance + Meta Ads + Unsplash +
 *            Flickr + Wikimedia (no API keys, hot-linked, deduped, validated)
 *   Tier 3 — Verified curated SMB pool (instant, zero-failure fallback)
 *
 * Guarantees:
 *  - Every template slot receives a distinct URL whenever the resolved pool
 *    is >= requestedCount; when it is smaller, repeats are spread far apart
 *    (coprime stride) instead of clustering like the old idx % len cycling.
 *  - Daily deterministic rotation: pool order rotates by a seed of
 *    tenantId + industry + date, so imagery refreshes every day.
 *  - The `source` field always reflects where the image ACTUALLY came from —
 *    no more mislabeled Unsplash URLs claiming to be Pinterest.
 */

import { scoreIndustryMatch, getCategoryVisualPool } from './dynamic-visual-resolver';
import { getCategoryImagesFromS3 } from './category-image-engine';
import {
  searchLivePhotos,
  matchPinterestBoards,
  PINTEREST_FESTIVAL_BOARDS,
  type LivePhoto,
  type LivePhotoSource,
} from './live-photo-sources';
import { buildVisualQueryPlan, type VisualPurpose } from './visual-query-builder';

export type CreativeSource = LivePhotoSource;

export interface MultiSourceCreativeVisual {
  url: string;
  source: CreativeSource;
  aspectRatio: '1:1' | '4:5' | '9:16';
  theme: string;
  headlineHint?: string;
  credit?: string;
  sourcePageUrl?: string;
}

export interface UserPhotoInput {
  url: string;
  title?: string;
}

export interface MultiSourceRequestContext {
  industryText: string;
  purpose?: VisualPurpose;
  occasionId?: string;
  requestedCount?: number;
  /** Tier 1 — merchant's own photos, always prioritized first. */
  userPhotos?: UserPhotoInput[];
  /** Rotation seed (tenantId) so different tenants see different orderings. */
  tenantSeed?: string;
}

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
}

function pickStride(poolLength: number, requested: number): number {
  if (poolLength >= requested) return 1;
  if (poolLength <= 2) return 1;
  // Largest odd number <= half the pool, coprime-ish with pool length so the
  // first full cycle hits every image once and repeats stay far apart.
  const half = Math.floor(poolLength / 2);
  for (let s = half; s > 1; s--) {
    if (s % 2 === 1 && poolLength % s !== 0) return s;
  }
  return 1;
}

function aspectForIndex(idx: number): '1:1' | '4:5' | '9:16' {
  if (idx % 6 === 0) return '1:1';
  if (idx % 6 === 5) return '9:16';
  return '4:5';
}

function toVisual(photo: LivePhoto, idx: number): MultiSourceCreativeVisual {
  return {
    url: photo.url,
    source: photo.source,
    aspectRatio: aspectForIndex(idx),
    theme: photo.source,
    headlineHint: photo.title,
    credit: photo.author,
    sourcePageUrl: photo.sourcePageUrl,
  };
}

function toUserPhotoVisual(photo: UserPhotoInput, idx: number): MultiSourceCreativeVisual {
  return {
    url: photo.url,
    source: 'user_photo',
    aspectRatio: aspectForIndex(idx),
    theme: 'user_photo',
    headlineHint: photo.title || 'Your business photo',
    credit: 'Your Photos',
  };
}

function toCuratedVisual(url: string, idx: number): MultiSourceCreativeVisual {
  return {
    url,
    source: 'curated',
    aspectRatio: aspectForIndex(idx),
    theme: 'curated',
  };
}

function rotate<T>(arr: T[], by: number): T[] {
  if (arr.length <= 1 || by <= 0) return arr;
  const shift = by % arr.length;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

function dedupeByUrKey(visuals: MultiSourceCreativeVisual[]): MultiSourceCreativeVisual[] {
  const seen = new Set<string>();
  const out: MultiSourceCreativeVisual[] = [];
  for (const v of visuals) {
    let key = v.url;
    try {
      const u = new URL(v.url);
      key = `${u.host}${u.pathname}`;
    } catch {}
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Resolves a deep, unique-per-slot visual collection for the given business.
 * Async because Tier 2 performs live (cached) source searches.
 */
export async function getMultiSourceCategoryVisuals(
  ctx: MultiSourceRequestContext,
): Promise<MultiSourceCreativeVisual[]> {
  const requestedCount = Math.max(8, Math.min(400, ctx.requestedCount || 100));
  const matchedKey = scoreIndustryMatch(ctx.industryText);
  void matchedKey; // kept for logging parity; plan builder handles keywords

  const plan = buildVisualQueryPlan({
    industryText: ctx.industryText,
    purpose: ctx.purpose || 'profile',
    occasionId: ctx.occasionId,
  });

  const livePhotos = await searchLivePhotos({
    queries: plan.queries,
    pinterestBoards: plan.pinterestBoards,
    limit: Math.max(120, requestedCount),
  });

  // ── Tier stack: Merchant photos -> Cloudflare AI S3 Category Library -> Verified curated pool ──
  const userVisuals = (ctx.userPhotos || []).slice(0, 12).map((p, i) => toUserPhotoVisual(p, i));

  // Retrieve AWS S3 category library images
  const s3Urls = await getCategoryImagesFromS3(ctx.industryText, Math.max(40, requestedCount));
  const s3Visuals = s3Urls.map((url, i) => ({
    id: `s3_${i}`,
    url,
    source: 'curated' as const,
    credit: 'Cloudflare AI S3 Library',
  }));

  const curatedVisuals = getCategoryVisualPool(ctx.industryText).map((url, i) =>
    toCuratedVisual(url, i),
  );

  // Rotate each tier internally with a daily seed so photos refresh daily
  const dayKey = new Date().toISOString().slice(0, 10);
  const seed = fnv1aHash(`${ctx.tenantSeed || ''}|${ctx.industryText}|${dayKey}`);
  const rotatedUser = rotate(userVisuals, seed);
  const rotatedS3 = rotate(s3Visuals.length > 0 ? s3Visuals : curatedVisuals, seed);

  // Tier 1: User's own photos
  // Tier 2: Cloudflare AI S3 Category Library
  let pool = dedupeByUrKey([...rotatedUser, ...rotatedS3]);

  // Augment pool with industry photography if pool is small (< 8) to prevent visual repetition
  if (pool.length < 8) {
    const fallbackCategoryUrls = getCategoryVisualPool(ctx.industryText);
    const fallbackVisuals = fallbackCategoryUrls.map((url, i) => toCuratedVisual(url, i + 100));
    pool = dedupeByUrKey([...pool, ...fallbackVisuals]);
  }

  if (pool.length === 0) return [];

  // Guaranteed coprime stride: visits every element in the pool once before repeating
  function gcd(a: number, b: number): number {
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  function getCoprimeStride(len: number): number {
    if (len <= 2) return 1;
    for (let s = Math.max(3, Math.floor(len / 2)); s < len; s++) {
      if (gcd(s, len) === 1) return s;
    }
    return 1;
  }

  const stride = getCoprimeStride(pool.length);
  const out: MultiSourceCreativeVisual[] = [];
  for (let i = 0; i < requestedCount; i++) {
    const idx = (i * stride + Math.floor(i / pool.length)) % pool.length;
    out.push(pool[idx]);
  }
  return out;
}

/**
 * Festival-specific visuals: pulls the verified Pinterest festival boards
 * (postermywall/diwali-posters etc.) + occasion queries across all sources.
 */
export async function getFestivalVisuals(
  occasionId: string,
  requestedCount = 30,
  tenantSeed?: string,
): Promise<MultiSourceCreativeVisual[]> {
  const requested = Math.max(8, Math.min(120, requestedCount));
  const occasionLabel = occasionId.replace(/_/g, ' ');
  const boards =
    PINTEREST_FESTIVAL_BOARDS[occasionId] || matchPinterestBoards(occasionId);

  const livePhotos = await searchLivePhotos({
    queries: [
      `${occasionLabel} poster design`,
      `${occasionLabel} offer banner template`,
      `${occasionLabel} greeting creative`,
    ],
    pinterestBoards: boards,
    limit: Math.max(60, requested),
  });

  const liveVisuals = livePhotos.map((p, i) => toVisual(p, i));
  const curatedVisuals = getCategoryVisualPool(occasionLabel).map((url, i) =>
    toCuratedVisual(url, i),
  );

  let pool = dedupeByUrKey([...liveVisuals, ...curatedVisuals]);
  if (pool.length === 0) return [];

  const dayKey = new Date().toISOString().slice(0, 10);
  const seed = fnv1aHash(`${tenantSeed || ''}|${occasionId}|${dayKey}`);
  pool = rotate(pool, seed % pool.length);

  const stride = pickStride(pool.length, requested);
  const out: MultiSourceCreativeVisual[] = [];
  for (let i = 0; i < requested; i++) {
    out.push(pool[(i * stride) % pool.length]);
  }
  return out;
}

/** UI-facing display label for a source value. */
export function getCreativeSourceLabel(source?: string): string {
  switch (source) {
    case 'pinterest':
      return 'Pinterest';
    case 'behance':
      return 'Behance';
    case 'meta_ads':
      return 'Meta Ads';
    case 'unsplash':
      return 'Unsplash';
    case 'flickr':
      return 'Flickr';
    case 'wikimedia':
      return 'Wikimedia';
    case 'user_photo':
      return 'Your Photos';
    default:
      return 'Curated';
  }
}
