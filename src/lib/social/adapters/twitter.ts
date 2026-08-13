/**
 * X (Twitter) Platform Adapter — REAL IMPLEMENTATION
 * ----------------------------------------------------
 *
 * Posts text tweets via the X API v2.
 *
 * ENDPOINTS:
 *   - Publish:    POST https://api.twitter.com/2/tweets
 *   - Refresh:    POST https://api.twitter.com/2/oauth2/token
 *   - Metrics:    GET  https://api.twitter.com/2/tweets/{id}
 *                       ?tweet.fields=public_metrics,non_public_metrics
 *   - User:       GET  https://api.twitter.com/2/users/me
 *
 * SCOPES (set by /api/oauth/twitter with PKCE):
 *   - tweet.read    — read tweets
 *   - tweet.write   — post tweets
 *   - users.read    — fetch user profile
 *   - offline.access — obtain a refresh token
 *
 * TOKEN:
 *   X OAuth 2.0 access tokens expire in 2 HOURS. The `offline.access`
 *   scope grants a refresh_token; we use it to silently refresh before
 *   each publish (the token-refresh.ts helper auto-refreshes tokens
 *   with <5 min remaining). Users never need to reconnect.
 *
 * MVP SUPPORT:
 *   - Text tweets: ✅ (truncated to 280 chars per X policy)
 *   - Media tweets: ❌  (requires v1.1 media/upload then media_ids on /2/tweets
 *                        — throws a clear "text only for now" error)
 *
 * FREE-TIER LIMIT:
 *   X Free tier allows 1,500 posts/month TOTAL across ALL tenants using
 *   the same developer app (the limit is per-app, not per-tenant). Before
 *   publishing, we count posts published this month across the whole DB
 *   whose publishTargets JSON has a twitter target with status='published'.
 *   If the count is >= 1500, we throw a clear "limit reached" error so the
 *   publisher records the failure with an actionable message.
 */
import { db } from '@/lib/db';
import { registerAdapter } from '@/lib/social/registry';
import type {
  PlatformAdapter,
  PlatformMetrics,
  PublishParams,
  PublishTarget,
  SocialAccountData,
} from '@/lib/social/types';

// X Free tier: 1,500 posts/month per app (across all tenants using the app).
const MONTHLY_FREE_TIER_LIMIT = 1500;
const TWEET_MAX_CHARS = 280;

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Thin wrapper around fetch that throws on non-2xx with a useful message.
 * X's v2 API returns `{ title, detail, status, type }` on error.
 */
async function twitterFetch<T>(
  url: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.detail || body?.title || body?.error_description || JSON.stringify(body);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '<no body>';
      }
    }
    throw new Error(
      `X API ${res.status} ${res.statusText} for ${url}: ${detail}`,
    );
  }

  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Count tweets successfully published this calendar month across ALL tenants.
 *
 * Used to enforce the X Free-tier 1,500-posts-per-app-per-month limit. The
 * limit is per-app (not per-tenant) because all tenants share the same
 * developer app credentials configured by the superadmin.
 *
 * Implementation: query SocialPost rows where status IN ('published','partial')
 * and publishedAt >= start-of-month. Then for each row, parse publishTargets
 * JSON and count twitter targets with status='published'.
 *
 * This is O(N) over all posts this month — fine for the MVP. A future
 * optimization could store a denormalized `twitterPublishedAt` column on
 * SocialPost or maintain a counter table.
 */
async function countTweetsPublishedThisMonth(): Promise<number> {
  // Start of current calendar month (UTC).
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const posts = await db.socialPost.findMany({
    where: {
      status: { in: ['published', 'partial'] },
      publishedAt: { gte: monthStart },
    },
    select: { publishTargets: true },
  });

  let count = 0;
  for (const post of posts) {
    if (!post.publishTargets) continue;
    try {
      const targets = JSON.parse(post.publishTargets) as PublishTarget[];
      if (!Array.isArray(targets)) continue;
      for (const t of targets) {
        // Only count successful twitter publishes. A target with status
        // 'published' and an externalPostId represents a real tweet that
        // consumed the app's monthly quota.
        if (
          t.platform === 'twitter' &&
          t.status === 'published' &&
          t.externalPostId
        ) {
          count++;
        }
      }
    } catch {
      // corrupt publishTargets JSON — skip
    }
  }
  return count;
}

/**
 * Look up the superadmin-configured X OAuth 2.0 app credentials.
 *
 * X uses OAuth 2.0 with PKCE (public client) — `clientSecret` may be
 * empty for purely public clients. We only need `clientId` for refresh.
 */
async function getTwitterCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'twitter', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred) {
    throw new Error(
      'X (Twitter) OAuth app credentials not configured. Ask the superadmin to register an X app.',
    );
  }
  return cred;
}

// ─── Adapter ──────────────────────────────────────────────────────────────

const twitterAdapter: PlatformAdapter = {
  platform: 'twitter',

  /**
   * Post a text tweet.
   *
   * MVP: text-only. Media tweets require v1.1 media/upload + media_ids
   * attachment — throws a clear error if mediaUrls is non-empty.
   *
   * ENFORCES the 1,500-tweets-per-month Free-tier cap BEFORE making the
   * API call. If the cap is hit, throws a clear message asking the
   * superadmin to upgrade to Basic ($100/mo, 50k posts) or Pro.
   *
   * Truncates content to 280 chars per X policy.
   */
  async publish(account, params: PublishParams) {
    // 1. Free-tier limit check (per-app, all tenants).
    const monthCount = await countTweetsPublishedThisMonth();
    if (monthCount >= MONTHLY_FREE_TIER_LIMIT) {
      throw new Error(
        `Monthly X post limit reached (${MONTHLY_FREE_TIER_LIMIT}/month on Free tier). Contact superadmin to upgrade to Basic or Pro.`,
      );
    }

    // 2. Media guard — image tweets not supported in MVP.
    if (params.mediaUrls && params.mediaUrls.length > 0) {
      throw new Error(
        'Image posts not yet supported for X (Twitter) — text only for now.',
      );
    }

    // 3. Truncate to 280 chars (X's hard limit).
    const text = (params.content || '').slice(0, TWEET_MAX_CHARS);
    if (!text) {
      throw new Error('Tweet text is empty.');
    }

    // 4. POST /2/tweets
    const response = await twitterFetch<{ data?: { id: string; text: string } }>(
      'https://api.twitter.com/2/tweets',
      {
        method: 'POST',
        accessToken: account.accessToken,
        body: JSON.stringify({ text }),
      },
    );

    const tweetId = response?.data?.id;
    if (!tweetId) {
      throw new Error('X did not return a tweet ID.');
    }

    return { externalPostId: tweetId };
  },

  /**
   * Refresh an X OAuth 2.0 access token using the stored refresh_token.
   *
   * X OAuth 2.0 with PKCE: access tokens expire in 2 hours; refresh tokens
   * expire in 18 months (or until user revokes). The refresh endpoint is
   * `POST /2/oauth2/token` with `grant_type=refresh_token`.
   *
   * Auth: client_id only (public client). For confidential clients, also
   * send client_secret as Basic auth. We support both: if clientSecret is
   * non-empty, use Basic; else, send client_id in the form body.
   */
  async refreshToken(account) {
    if (!account.refreshToken) {
      throw new Error(
        'X account has no refresh_token — user must reconnect via OAuth.',
      );
    }

    const { clientId, clientSecret } = await getTwitterCredentials();

    const formBody = new URLSearchParams({
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
      client_id: clientId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    // Confidential client: send Basic auth header instead of client_id in body.
    if (clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: formBody,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.error_description || body?.error || JSON.stringify(body);
      } catch {
        detail = await res.text().catch(() => '<no body>');
      }
      throw new Error(`X token refresh failed: ${detail}`);
    }

    const token = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? account.refreshToken,
      // expires_in is typically 7200 (2 hours) for X.
      tokenExpiry: new Date(Date.now() + (token.expires_in ?? 7200) * 1000),
    };
  },

  /**
   * Fetch public + non-public metrics for a tweet.
   *
   * Endpoint:
   *   GET /2/tweets/{id}?tweet.fields=public_metrics,non_public_metrics
   *
   * Response shape:
   *   {
   *     data: {
   *       id: "...",
   *       text: "...",
   *       public_metrics: {
   *         like_count, reply_count, retweet_count, quote_count, impression_count
   *       },
   *       non_public_metrics: {
   *         impression_count, url_link_clicks, user_profile_clicks, ...
   *       }
   *     }
   *   }
   *
   * Mapping:
   *   - likes       ← public_metrics.like_count
   *   - comments    ← public_metrics.reply_count
   *   - shares      ← public_metrics.retweet_count
   *   - impressions ← public_metrics.impression_count (falls back to non_public)
   *   - clicks      ← non_public_metrics.url_link_clicks (0 if not available)
   *   - reach       ← 0 (X doesn't expose unique reach on Free tier)
   */
  async fetchMetrics(account, externalPostId) {
    const url =
      `https://api.twitter.com/2/tweets/${encodeURIComponent(externalPostId)}` +
      `?tweet.fields=public_metrics,non_public_metrics`;

    try {
      const data = await twitterFetch<{
        data?: {
          public_metrics?: {
            like_count?: number;
            reply_count?: number;
            retweet_count?: number;
            quote_count?: number;
            impression_count?: number;
          };
          non_public_metrics?: {
            impression_count?: number;
            url_link_clicks?: number;
            user_profile_clicks?: number;
          };
        };
      }>(url, { method: 'GET', accessToken: account.accessToken });

      const pm = data?.data?.public_metrics || {};
      const npm = data?.data?.non_public_metrics || {};

      return {
        likes: Number(pm.like_count ?? 0),
        comments: Number(pm.reply_count ?? 0),
        shares: Number(pm.retweet_count ?? 0),
        impressions: Number(pm.impression_count ?? npm.impression_count ?? 0),
        reach: 0,
        clicks: Number(npm.url_link_clicks ?? 0),
        extraMetrics: {
          source: 'twitter.public_metrics+non_public_metrics',
          quote_count: Number(pm.quote_count ?? 0),
          user_profile_clicks: Number(npm.user_profile_clicks ?? 0),
          note: 'non_public_metrics require an OAuth 1.0a user context on Basic+ tier.',
        },
      };
    } catch (err) {
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        extraMetrics: {
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }
  },
};

registerAdapter(twitterAdapter);

export { twitterAdapter };
