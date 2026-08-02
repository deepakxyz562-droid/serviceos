/**
 * IndexNow integration — push changed URLs to search engines instantly.
 * ============================================================
 *
 * What is IndexNow?
 *   An open protocol (Microsoft/Bing, Yandex, Naver, Seznam, Yep) that lets
 *   a site owner NOTIFY search engines when a URL's content changes, instead
 *   of waiting for crawlers to discover the change via the sitemap.
 *
 *   - Submit once to api.indexnow.org → all partner engines get it
 *   - Google does NOT participate (it crawls via sitemap + its own scheduler)
 *   - Free, no API key signup needed beyond the ownership key file
 *
 * How it works:
 *   1. A key file at https://fieseros.com/{KEY}.txt proves domain ownership.
 *      (This file already exists at public/{KEY}.txt — created during initial
 *      Bing Webmaster verification. We reuse it for IndexNow.)
 *   2. POST { host, key, keyLocation, urlList } to api.indexnow.org/indexnow
 *   3. Partner engines recrawl the submitted URLs within minutes-to-hours.
 *
 * When to call submitToIndexNow():
 *   - A blog post is published/updated/deleted
 *   - A public business profile (/{industry}/{city}/{slug}) changes
 *   - Any indexable public page meaningfully changes
 *
 * IMPORTANT — call patterns:
 *   - Fire-and-forget: never `await` this in a user-facing request handler.
 *     Use `void submitToIndexNow(...)` or `submitToIndexNow(...).catch(...)`.
 *   - The function is safe to call in development (it no-ops if the site URL
 *     is localhost or if NODE_ENV !== 'production').
 */

import { logger } from '@/lib/logger';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';

/**
 * The IndexNow ownership key.
 *
 * This MUST match the contents of `public/{KEY}.txt`.
 * The file `public/120d26ffeba34c528feebf382dcbdafd.txt` already exists and
 * contains this exact string — it was originally created for Bing Webmaster
 * Tools verification and is reused here for IndexNow (a single key file can
 * serve both purposes).
 *
 * To rotate: generate a new 32-char hex key, replace both the constant below
 * AND the contents of the .txt file, then re-submit the keyLocation URL to
 * Bing Webmaster Tools.
 */
export const INDEXNOW_KEY = '120d26ffeba34c528feebf382dcbdafd';

/**
 * The public URL where search engines can fetch the key file to verify
 * ownership. IndexNow requires this to be on the same host as the submitted
 * URLs.
 */
export const INDEXNOW_KEY_LOCATION = `https://fieseros.com/${INDEXNOW_KEY}.txt`;

/**
 * The shared IndexNow endpoint. Submitting here fans out to all partner
 * search engines (Bing, Yandex, Naver, Seznam, Yep) — no need to ping each
 * individually.
 *
 * Docs: https://www.indexnow.org/documentation
 */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Maximum URLs per submission. IndexNow allows up to 10,000 per request; we
 * cap at 1,000 to keep payloads reasonable and avoid timeouts.
 */
const MAX_URLS_PER_BATCH = 1000;

/**
 * Determine if IndexNow submissions should be active.
 *
 * Disabled in:
 *   - Non-production environments (no point pinging Bing from a staging URL)
 *   - When the site URL is localhost or an IP (IndexNow requires a real domain)
 */
function isIndexNowEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
  try {
    const host = new URL(siteUrl).hostname;
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export interface IndexNowResult {
  ok: boolean;
  submitted: number;
  /** HTTP status from IndexNow API (200 = accepted, 202 = queued, 422 = invalid, etc.) */
  status?: number;
  error?: string;
}

/**
 * Submit a list of URLs to IndexNow for instant re-crawling.
 *
 * @param urls  Array of absolute URLs on fieseros.com that have changed.
 *              Non-fieseros.com URLs are filtered out (IndexNow requires URLs
 *              to be on the same host as the key file).
 *
 * @returns {Promise<IndexNowResult>} — always resolves (never throws), so it's
 *          safe to call fire-and-forget.
 *
 * @example
 *   // Fire-and-forget after a blog post is published:
 *   void submitToIndexNow([
 *     'https://fieseros.com/blog/my-new-post',
 *     'https://fieseros.com/blog',
 *   ]);
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!isIndexNowEnabled()) {
    return { ok: false, submitted: 0, error: 'IndexNow disabled (non-production or localhost)' };
  }

  // Filter to only fieseros.com URLs (IndexNow requires same-host as key file).
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
  let host = 'fieseros.com';
  try {
    host = new URL(siteUrl).hostname;
  } catch {
    // fall through with default
  }

  const validUrls = urls
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
    .filter((u) => {
      try {
        return new URL(u).hostname === host;
      } catch {
        return false;
      }
    })
    .slice(0, MAX_URLS_PER_BATCH);

  if (validUrls.length === 0) {
    return { ok: false, submitted: 0, error: 'No valid same-host URLs to submit' };
  }

  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: validUrls,
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      // Don't let a slow IndexNow API block the caller — cap at 10s.
      signal: AbortSignal.timeout(10_000),
    });

    // 200 = submitted & accepted; 202 = accepted for processing later;
    // both are success. 422 = invalid key/URLs. 429 = rate limited.
    const ok = res.status === 200 || res.status === 202;
    if (!ok) {
      logger.warn(
        { component: 'indexnow', status: res.status, urlCount: validUrls.length },
        'IndexNow submission rejected',
      );
    } else {
      logger.info(
        { component: 'indexnow', status: res.status, urlCount: validUrls.length },
        'IndexNow submission accepted',
      );
    }
    return { ok, submitted: validUrls.length, status: res.status };
  } catch (err) {
    // Network error, timeout, DNS — never throw to the caller.
    logger.warn({ component: 'indexnow', err }, 'IndexNow submission failed (network)');
    return { ok: false, submitted: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Build the canonical public business hub URL for a tenant.
 *
 * Mirrors the URL pattern used by `src/lib/public-business.ts`:
 *   https://fieseros.com/{industrySlug}/{citySlug}/{tenant.slug}
 *
 * Exported here (instead of imported from public-business.ts) to avoid pulling
 * the heavy `public-business.ts` module (which imports `db`, `unstable_cache`,
 * etc.) into lightweight callers like API route handlers that already have the
 * tenant record in memory.
 */
export function buildTenantPublicUrl(tenant: {
  slug: string;
  industry?: string | null;
  city?: string | null;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
  const industrySlug = mapIndustryToUrlSlug(tenant.industry);
  const citySlug = slugifyCity(tenant.city);
  return `${siteUrl}/${industrySlug}/${citySlug}/${tenant.slug}`;
}

/**
 * Submit a single tenant's public business hub URL to IndexNow.
 *
 * Convenience wrapper for the most common case: a business profile was just
 * updated and we want to notify search engines.
 *
 * @example
 *   void submitTenantUrlToIndexNow({ slug, industry, city });
 */
export function submitTenantUrlToIndexNow(tenant: {
  slug: string;
  industry?: string | null;
  city?: string | null;
}): Promise<IndexNowResult> {
  return submitToIndexNow([buildTenantPublicUrl(tenant)]);
}
