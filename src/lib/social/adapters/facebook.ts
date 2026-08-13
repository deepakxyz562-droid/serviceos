/**
 * Facebook Platform Adapter
 * --------------------------
 *
 * Implements the `PlatformAdapter` contract from `src/lib/social/types.ts`
 * for Facebook Pages publishing.
 *
 * WHAT THIS ADAPTER DOES:
 *   - `publish`       — creates a text/link post or a photo post on a FB Page
 *   - `refreshToken`  — no-op (FB Page tokens are long-lived and don't expire
 *                        until the user revokes access or 60 days pass with
 *                        no use; we still implement the method to satisfy the
 *                        optional interface contract, returning as-is)
 *   - `fetchMetrics`  — pulls FB post insights + like/comment/share counts,
 *                        normalizes into the unified `PlatformMetrics` shape
 *
 * API ENDPOINTS USED (Graph API v18.0):
 *   - POST /{pageId}/feed       (text + link posts)
 *   - POST /{pageId}/photos     (single-image posts)
 *   - GET  /{postId}/insights   (post_impressions, post_reach, post_engaged_users)
 *   - GET  /{postId}?fields=likes.summary(true),comments.summary(true),shares
 *
 * TOKEN NOTES:
 *   - We require the FB Page access token (long-lived, ~60 days), which the
 *     OAuth callback stores encrypted in SocialAccount.accessToken.
 *   - The Page ID is stored in `account.metadata.pageId` by the OAuth flow.
 *   - We DON'T implement token refresh — FB Page tokens don't have refresh
 *     tokens. The user reconnects via OAuth when they expire.
 *
 * GRAPH API VERSIONING:
 *   We pin to v18.0 (per task spec). Upgrading requires testing the response
 *   shapes — the deprecation calendar is at
 *   https://developers.facebook.com/docs/graph-api/changelog.
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
 * Extract the Facebook Page ID from the account's metadata.
 *
 * Stored by the OAuth callback as `metadata.pageId`. Falls back to
 * `account.accountId` for backwards compatibility (older rows may not have
 * the metadata field populated).
 */
function getPageId(account: SocialAccountData): string {
  const metaPageId = account.metadata?.pageId;
  if (typeof metaPageId === 'string' && metaPageId.trim()) {
    return metaPageId.trim();
  }
  // Fallback: for FB, accountId IS the pageId (OAuth stores it that way).
  return account.accountId;
}

/**
 * Split a "{pageId}_{postId}" composite ID into its parts.
 *
 * FB's /feed endpoint returns post IDs in this format. To call /insights
 * we just need the composite ID (Graph API accepts it as-is), but we also
 * want to log the individual parts for debugging.
 */
function parsePostId(externalPostId: string): { pageId: string; postId: string } {
  const underscoreIdx = externalPostId.indexOf('_');
  if (underscoreIdx === -1) {
    return { pageId: '', postId: externalPostId };
  }
  return {
    pageId: externalPostId.slice(0, underscoreIdx),
    postId: externalPostId.slice(underscoreIdx + 1),
  };
}

/**
 * Wrapper around fetch() that throws a typed Error on non-2xx responses,
 * including the Graph API error body in the message for easier debugging.
 *
 * Graph API errors look like:
 *   { error: { message, type, code, fbtrace_id, error_subcode } }
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
      // Graph API error envelope: { error: { message, type, code, ... } }
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
    throw new Error(`[facebook adapter] Graph API ${res.status}: ${detail}`);
  }

  return (await res.json()) as T;
}

// ─── Adapter implementation ────────────────────────────────────────────────

const facebookAdapter: PlatformAdapter = {
  platform: 'facebook',

  /**
   * Publish a post to a Facebook Page.
   *
   * Decision tree:
   *   - If params.mediaUrls has at least one URL → publish as a photo post
   *     via /{pageId}/photos (uses the first image; FB multi-photo posts
   *     require multiple API calls + a published post patch — out of scope
   *     for the v1 adapter).
   *   - Else → publish as a text/link post via /{pageId}/feed. If
   *     params.linkUrl is set, it's attached as a link preview.
   *
   * Returns { externalPostId }:
   *   - Feed posts return `{ id: "{pageId}_{postId}" }` — used as-is.
   *   - Photo posts return `{ id: "photoId", post_id: "{pageId}_{postId}" }`.
   *     We prefer `post_id` (the feed story) when present so /insights works.
   */
  async publish(account, params) {
    const pageId = getPageId(account);
    if (!pageId) {
      throw new Error('[facebook adapter] Cannot publish: missing Facebook Page ID');
    }
    if (!account.accessToken) {
      throw new Error('[facebook adapter] Cannot publish: missing access token');
    }

    const message = (params.content || '').trim();
    const hasMedia = Array.isArray(params.mediaUrls) && params.mediaUrls.length > 0;

    // ─── Photo post (single image) ───
    if (hasMedia) {
      const imageUrl = params.mediaUrls[0];
      if (!imageUrl) {
        throw new Error('[facebook adapter] mediaUrls[0] is empty');
      }

      const body = new URLSearchParams();
      body.set('url', imageUrl);
      body.set('access_token', account.accessToken);
      if (message) body.set('caption', message);
      // `published=true` (default) creates the photo as a Page post
      // immediately. Setting `published=false` would stage it for a
      // later /feed publish — we want the post live now.
      body.set('published', 'true');

      const photoRes = await graphFetch<{
        id: string;
        post_id?: string;
      }>(`${GRAPH_API_BASE}/${pageId}/photos`, {
        method: 'POST',
        body,
      });

      // Prefer post_id (composite, suitable for /insights) over the bare
      // photoId. If only photoId is returned, we synthesize the composite
      // form so callers can treat both shapes uniformly.
      const externalPostId = photoRes.post_id || `${pageId}_${photoRes.id}`;
      return { externalPostId };
    }

    // ─── Text + optional link post ───
    if (!message && !params.linkUrl) {
      throw new Error(
        '[facebook adapter] Cannot publish empty post: provide content or media',
      );
    }

    const body = new URLSearchParams();
    body.set('access_token', account.accessToken);
    if (message) body.set('message', message);
    if (params.linkUrl) body.set('link', params.linkUrl);

    const feedRes = await graphFetch<{ id: string }>(
      `${GRAPH_API_BASE}/${pageId}/feed`,
      {
        method: 'POST',
        body,
      },
    );

    if (!feedRes.id) {
      throw new Error('[facebook adapter] Graph API returned no post ID');
    }
    return { externalPostId: feedRes.id };
  },

  /**
   * Refresh the access token.
   *
   * FB Page tokens obtained via the long-lived user token exchange are
   * themselves long-lived (60 days) and have NO refresh token. There's
   * nothing to refresh here — the user must reconnect via OAuth when the
   * token expires. We return the existing token as-is so the publisher's
   * `refreshExpiredToken()` helper treats this as a no-op.
   */
  async refreshToken(account) {
    return {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiry: account.tokenExpiry,
    };
  },

  /**
   * Fetch metrics for a published FB post.
   *
   * Two Graph API calls:
   *   1. GET /{postId}/insights?metric=post_impressions,post_reach,post_engaged_users
   *      → returns impressions, reach, and engaged_users.
   *   2. GET /{postId}?fields=likes.summary(true),comments.summary(true),shares
   *      → returns total like/comment/share counts (the .summary(true)
   *        modifier returns the aggregate count even on paginated fields).
   *
   * We map these into the unified `PlatformMetrics` shape:
   *   - likes      ← likes.summary.total_count
   *   - comments   ← comments.summary.total_count
   *   - shares     ← shares.count (or 0)
   *   - impressions← post_impressions.values[0].value
   *   - reach      ← post_reach.values[0].value
   *   - clicks     ← post_engaged_users.values[0].value (closest available
   *                  proxy; FB doesn't expose a raw "clicks" metric at this
   *                  tier — engaged_users counts unique users who clicked
   *                  anywhere on the post)
   *
   * Both calls are made in parallel and partial failures (e.g. insights
   * available but like-count call fails) are tolerated — we return what we
   * got with zeros for missing fields.
   */
  async fetchMetrics(account, externalPostId) {
    const { postId } = parsePostId(externalPostId);
    const targetId = postId || externalPostId;
    if (!targetId) {
      throw new Error('[facebook adapter] fetchMetrics: empty externalPostId');
    }
    if (!account.accessToken) {
      throw new Error('[facebook adapter] fetchMetrics: missing access token');
    }

    // Build both request URLs up front so we can fire them in parallel.
    const insightsUrl = new URL(`${GRAPH_API_BASE}/${targetId}/insights`);
    insightsUrl.searchParams.set('metric', 'post_impressions,post_reach,post_engaged_users');
    insightsUrl.searchParams.set('access_token', account.accessToken);

    const fieldsUrl = new URL(`${GRAPH_API_BASE}/${targetId}`);
    fieldsUrl.searchParams.set('fields', 'likes.summary(true),comments.summary(true),shares');
    fieldsUrl.searchParams.set('access_token', account.accessToken);

    // Fire both in parallel. Use allSettled so a failure on one doesn't
    // nuke the entire metrics fetch — we'll gracefully degrade to zeros
    // for whichever call failed.
    const [insightsResult, fieldsResult] = await Promise.allSettled([
      graphFetch<{
        data?: Array<{
          name: string;
          values?: Array<{ value: number }>;
        }>;
      }>(insightsUrl.toString()),
      graphFetch<{
        likes?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
        shares?: { count?: number };
      }>(fieldsUrl.toString()),
    ]);

    // ─── Normalize insights ───
    let impressions = 0;
    let reach = 0;
    let engagedUsers = 0;

    if (insightsResult.status === 'fulfilled') {
      const data = insightsResult.value.data || [];
      for (const metric of data) {
        // Insights metrics return an array of { value } entries — typically
        // one entry per lifetime period. We take the first (current) value.
        const value = metric.values?.[0]?.value;
        if (typeof value !== 'number') continue;
        if (metric.name === 'post_impressions') impressions = value;
        else if (metric.name === 'post_reach') reach = value;
        else if (metric.name === 'post_engaged_users') engagedUsers = value;
      }
    } else {
      console.warn(
        `[facebook adapter] insights call failed for ${targetId}:`,
        insightsResult.reason?.message || insightsResult.reason,
      );
    }

    // ─── Normalize like/comment/share counts ───
    let likes = 0;
    let comments = 0;
    let shares = 0;
    if (fieldsResult.status === 'fulfilled') {
      likes = fieldsResult.value.likes?.summary?.total_count ?? 0;
      comments = fieldsResult.value.comments?.summary?.total_count ?? 0;
      shares = fieldsResult.value.shares?.count ?? 0;
    } else {
      console.warn(
        `[facebook adapter] fields call failed for ${targetId}:`,
        fieldsResult.reason?.message || fieldsResult.reason,
      );
    }

    const metrics: PlatformMetrics = {
      likes,
      comments,
      shares,
      impressions,
      reach,
      // FB doesn't expose a raw "link clicks" metric for organic Page posts
      // at the standard tier. engaged_users (unique users who clicked
      // anywhere on the post) is the closest available proxy.
      clicks: engagedUsers,
      extraMetrics: {
        engagedUsers,
        platform: 'facebook',
      },
    };
    return metrics;
  },
};

// ─── Register ──────────────────────────────────────────────────────────────

registerAdapter(facebookAdapter);

export {};
