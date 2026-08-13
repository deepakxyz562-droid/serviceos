/**
 * Instagram Platform Adapter
 * ---------------------------
 *
 * Implements the `PlatformAdapter` contract from `src/lib/social/types.ts`
 * for Instagram Business publishing via the Instagram Content Publishing API.
 *
 * WHAT THIS ADAPTER DOES:
 *   - `publish`       — two-step IG publishing (create media container,
 *                        then publish the container). Image required.
 *   - `refreshToken`  — no-op (IG uses FB Page tokens which are long-lived)
 *   - `fetchMetrics`  — pulls IG media insights (impressions, reach, likes,
 *                        comments, saves), normalizes into PlatformMetrics.
 *
 * TWO-STEP PUBLISH FLOW (Graph API v18.0):
 *   Step 1 — Create a media container:
 *     POST /{igBusinessId}/media?image_url={publicUrl}&caption={caption}
 *          &access_token=...
 *     Returns: { id: containerId }
 *
 *   Step 2 — Publish the container:
 *     POST /{igBusinessId}/media_publish?creation_id={containerId}
 *          &access_token=...
 *     Returns: { id: igMediaId }
 *
 * The two-step flow exists because IG needs to fetch the image from a
 * public URL before it can publish it. The container is a staging area
 * where IG downloads + validates the image; only then can media_publish
 * push it live.
 *
 * TOKEN NOTES:
 *   - IG uses the same long-lived FB Page token as FB publishing. The OAuth
 *     callback stores this in SocialAccount.accessToken (encrypted).
 *   - The IG Business Account ID is stored in `account.metadata.igBusinessId`
 *     by the OAuth callback. We fall back to `account.accountId` (which the
 *     callback also sets to the IG Business ID) for older rows.
 *
 * IMAGE URL REQUIREMENT:
 *   - IG Content Publishing API requires a PUBLICLY accessible image URL.
 *     Our /api/upload route returns public S3-style URLs that satisfy this.
 *   - If params.mediaUrls is empty, we throw — IG does NOT support
 *     text-only posts via the Content Publishing API.
 *
 * METRICS NOTES:
 *   - IG insights are only available for Business/Creator accounts.
 *   - The `saves` metric has no direct counterpart in our unified schema
 *     (likes/comments/shares/impressions/reach/clicks). We map it to
 *     `shares` (closest semantic — both indicate users taking an action
 *     to retain the post) AND surface the raw value in `extraMetrics.saves`
 *     so the analytics dashboard can display it accurately.
 */

import { registerAdapter } from '@/lib/social/registry';
import type {
  PlatformAdapter,
  PlatformMetrics,
  PublishParams,
  SocialAccountData,
} from '@/lib/social/types';

// ─── Constants ─────────────────────────────────────────────────────────────

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract the Instagram Business Account ID from the account metadata.
 *
 * Stored by the OAuth callback as `metadata.igBusinessId`. Falls back to
 * `account.accountId` (which the callback also sets to the IG Business ID
 * for IG-platform rows).
 */
function getIgBusinessId(account: SocialAccountData): string {
  const metaId = account.metadata?.igBusinessId;
  if (typeof metaId === 'string' && metaId.trim()) {
    return metaId.trim();
  }
  return account.accountId;
}

/**
 * Wrapper around fetch() that throws a typed Error on non-2xx responses,
 * including the Graph API error body in the message for easier debugging.
 */
async function graphFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      const graphErr = (errBody as { error?: { message?: string; type?: string; code?: number } }).error;
      detail = graphErr?.message
        ? `${graphErr.message}${graphErr.code ? ` (code ${graphErr.code})` : ''}`
        : JSON.stringify(errBody);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = `<status ${res.status}>`;
      }
    }
    throw new Error(`[instagram adapter] Graph API ${res.status}: ${detail}`);
  }

  return (await res.json()) as T;
}

// ─── Adapter implementation ────────────────────────────────────────────────

const instagramAdapter: PlatformAdapter = {
  platform: 'instagram',

  /**
   * Publish a post to Instagram.
   *
   * Two-step flow:
   *   1. Create a media container with the image URL + caption.
   *   2. Publish the container — IG downloads the image, validates it,
   *      and pushes it to the user's feed.
   *
   * Image is REQUIRED. IG Content Publishing API does NOT support
   * text-only posts (unlike FB, where you can publish to /feed without
   * media). If params.mediaUrls is empty, we throw a clear error.
   *
   * Multi-image carousels are NOT supported in this v1 adapter — we
   * publish only the first image. Carousel support would require:
   *   - N x POST /media (one per image, with `is_carousel_item=true`)
   *   - 1 x POST /media?children={id1,id2,...}&media_type=CAROUSEL
   *   - 1 x POST /media_publish?creation_id={carouselContainerId}
   * Out of scope for v1.
   */
  async publish(account, params) {
    const igBusinessId = getIgBusinessId(account);
    if (!igBusinessId) {
      throw new Error('[instagram adapter] Cannot publish: missing IG Business Account ID');
    }
    if (!account.accessToken) {
      throw new Error('[instagram adapter] Cannot publish: missing access token');
    }

    if (!Array.isArray(params.mediaUrls) || params.mediaUrls.length === 0) {
      throw new Error(
        '[instagram adapter] Instagram requires at least one image — text-only posts are not supported',
      );
    }

    const imageUrl = params.mediaUrls[0];
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('[instagram adapter] mediaUrls[0] is empty or invalid');
    }

    const caption = (params.content || '').trim();

    // ─── Step 1: create media container ───
    const createBody = new URLSearchParams();
    createBody.set('image_url', imageUrl);
    createBody.set('access_token', account.accessToken);
    if (caption) createBody.set('caption', caption);

    const createRes = await graphFetch<{ id: string }>(
      `${GRAPH_API_BASE}/${igBusinessId}/media`,
      {
        method: 'POST',
        body: createBody,
      },
    );

    if (!createRes.id) {
      throw new Error('[instagram adapter] Container creation returned no ID');
    }
    const containerId = createRes.id;

    // ─── Step 2: publish the container ───
    //
    // NOTE: Graph API may return a 400 "media not ready" error if we
    // publish immediately after creating the container, because IG
    // downloads + processes the image asynchronously. In practice, for
    // small images (<5MB) on a stable public URL, this is rarely an
    // issue. If we wanted to be robust against slow image processing,
    // we'd poll GET /{containerId}?fields=status_code until status_code
    // === 'FINISHED' before publishing. That's a future enhancement —
    // for v1 we publish immediately and surface the error to the user.
    const publishBody = new URLSearchParams();
    publishBody.set('creation_id', containerId);
    publishBody.set('access_token', account.accessToken);

    const publishRes = await graphFetch<{ id: string }>(
      `${GRAPH_API_BASE}/${igBusinessId}/media_publish`,
      {
        method: 'POST',
        body: publishBody,
      },
    );

    if (!publishRes.id) {
      throw new Error('[instagram adapter] media_publish returned no ID');
    }

    return { externalPostId: publishRes.id };
  },

  /**
   * Refresh the access token.
   *
   * IG publishing uses the same long-lived FB Page token as FB. No refresh
   * token exists — the user reconnects via OAuth when the token expires.
   * Returning as-is signals to the publisher that the token is still valid.
   */
  async refreshToken(account) {
    return {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiry: account.tokenExpiry,
    };
  },

  /**
   * Fetch metrics for a published IG media post.
   *
   * Single Graph API call:
   *   GET /{igMediaId}/insights?metric=impressions,reach,likes,comments,saves
   *
   * IG insights metrics (for image media):
   *   - impressions: total views (incl. repeats from same user)
   *   - reach:       unique viewers
   *   - likes:       like count
   *   - comments:    comment count
   *   - saves:       number of users who saved the post
   *
   * Mapping to unified PlatformMetrics:
   *   - likes       ← likes
   *   - comments    ← comments
   *   - shares      ← saves  (closest proxy; IG has no native "shares")
   *   - impressions ← impressions
   *   - reach       ← reach
   *   - clicks      ← 0  (IG doesn't expose a clicks metric for image posts)
   *   - extraMetrics.saves ← saves (preserved for accurate analytics display)
   */
  async fetchMetrics(account, externalPostId) {
    if (!externalPostId) {
      throw new Error('[instagram adapter] fetchMetrics: empty externalPostId');
    }
    if (!account.accessToken) {
      throw new Error('[instagram adapter] fetchMetrics: missing access token');
    }

    const insightsUrl = new URL(`${GRAPH_API_BASE}/${externalPostId}/insights`);
    insightsUrl.searchParams.set('metric', 'impressions,reach,likes,comments,saves');
    insightsUrl.searchParams.set('access_token', account.accessToken);

    const result = await graphFetch<{
      data?: Array<{
        name: string;
        values?: Array<{ value: number }>;
      }>;
    }>(insightsUrl.toString());

    let impressions = 0;
    let reach = 0;
    let likes = 0;
    let comments = 0;
    let saves = 0;

    const data = result.data || [];
    for (const metric of data) {
      // IG insights return one entry per metric, each with a single-value
      // `values` array (lifetime aggregation).
      const value = metric.values?.[0]?.value;
      if (typeof value !== 'number') continue;
      switch (metric.name) {
        case 'impressions':
          impressions = value;
          break;
        case 'reach':
          reach = value;
          break;
        case 'likes':
          likes = value;
          break;
        case 'comments':
          comments = value;
          break;
        case 'saves':
          saves = value;
          break;
      }
    }

    const metrics: PlatformMetrics = {
      likes,
      comments,
      // IG has no native "shares" metric — saves is the closest semantic
      // proxy (user took an action to retain the post). We surface the
      // raw saves value in extraMetrics so the analytics dashboard can
      // display "Saves" distinctly when relevant.
      shares: saves,
      impressions,
      reach,
      // IG doesn't expose a clicks metric for image posts.
      clicks: 0,
      extraMetrics: {
        saves,
        platform: 'instagram',
      },
    };
    return metrics;
  },
};

// ─── Register ──────────────────────────────────────────────────────────────

registerAdapter(instagramAdapter);

export {};
