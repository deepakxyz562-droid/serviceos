/**
 * LinkedIn Platform Adapter — REAL IMPLEMENTATION
 * -----------------------------------------------
 *
 * Publishes text + link posts to LinkedIn via the UGC Posts API.
 *
 * ENDPOINTS:
 *   - Publish:    POST https://api.linkedin.com/v2/ugcPosts
 *   - Refresh:    POST https://www.linkedin.com/oauth/v2/accessToken
 *   - Metrics:    GET  https://api.linkedin.com/v2/organizationalEntityShareStatistics
 *
 * SCOPES (set by the OAuth flow at /api/oauth/linkedin):
 *   - w_member_social        — post on member's behalf
 *   - rw_organization        — post on company pages
 *   - r_organization_social  — read org analytics
 *   - r_member_social        — read member analytics
 *
 * TOKEN:
 *   LinkedIn OAuth2 access tokens expire in 60 days. Refresh tokens exist
 *   for some app types (Enterprise / Marketing API partners). We implement
 *   `refreshToken` for completeness; if no refresh_token is stored on the
 *   account, the call throws a clear error and the publisher will mark the
 *   account inactive (user must reconnect via OAuth).
 *
 * MVP SUPPORT:
 *   - Text posts:        ✅
 *   - Link posts:        ✅ (shareMediaCategory: 'ARTICLE')
 *   - Image posts:       ❌  (requires 3-step upload — throws clear error)
 *
 * Author URN comes from `account.metadata.authorUrn` (stored during OAuth):
 *   - Personal profile:   urn:li:person:{id}
 *   - Company page:        urn:li:organization:{id}
 */
import { db } from '@/lib/db';
import { registerAdapter } from '@/lib/social/registry';
import type {
  PlatformAdapter,
  PlatformMetrics,
  PublishParams,
  SocialAccountData,
} from '@/lib/social/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract the author URN from the account metadata. Stored during the
 * LinkedIn OAuth callback (see /api/oauth/linkedin/callback).
 *
 * Throws a clear error if missing — the publish flow can't proceed without
 * knowing whether to post as the member or as an organization.
 */
function getAuthorUrn(account: SocialAccountData): string {
  const urn = account.metadata?.authorUrn;
  if (typeof urn === 'string' && urn.startsWith('urn:li:')) return urn;
  throw new Error(
    `LinkedIn account "${account.accountName}" is missing authorUrn metadata — reconnect the account via OAuth.`,
  );
}

/**
 * Thin wrapper around fetch that throws on non-2xx with a useful message.
 * LinkedIn's API consistently returns JSON errors with a `message` field.
 */
async function linkedinFetch<T>(
  url: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message || body?.error_description || JSON.stringify(body);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '<no body>';
      }
    }
    throw new Error(
      `LinkedIn API ${res.status} ${res.statusText} for ${url}: ${detail}`,
    );
  }

  // Some LinkedIn endpoints (e.g. refreshToken) return 200 + empty body.
  // Guard against JSON parse errors on empty responses.
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Look up the superadmin-configured LinkedIn OAuth app credentials from the
 * IntegrationCredential table. Used by `refreshToken`.
 */
async function getLinkedinCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'linkedin', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred) {
    throw new Error(
      'LinkedIn OAuth app credentials not configured. Ask the superadmin to register a LinkedIn app.',
    );
  }
  return cred;
}

// ─── Adapter ──────────────────────────────────────────────────────────────

const linkedinAdapter: PlatformAdapter = {
  platform: 'linkedin',

  /**
   * Publish a post to LinkedIn.
   *
   * MVP supports:
   *   - Text-only posts  → shareMediaCategory: 'NONE'
   *   - Link posts       → shareMediaCategory: 'ARTICLE'
   *
   * Image posts are explicitly NOT supported yet — they require a 3-step
   * upload flow (registerUpload → upload binary → reference media URN in
   * the ugcPosts body). Throws a clear error if mediaUrls is non-empty so
   * the publisher records a per-target failure with an actionable message.
   */
  async publish(account, params: PublishParams) {
    const authorUrn = getAuthorUrn(account);

    // MVP guard — LinkedIn image uploads need a 3-step flow that's out of scope.
    if (params.mediaUrls && params.mediaUrls.length > 0) {
      throw new Error(
        'Image posts not yet supported for LinkedIn — text and link posts only for now.',
      );
    }

    const hasLink = Boolean(params.linkUrl);

    const body = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: params.content || '' },
          shareMediaCategory: hasLink ? 'ARTICLE' : 'NONE',
          ...(hasLink
            ? {
                media: [
                  {
                    status: 'READY',
                    originalUrl: params.linkUrl,
                    // title/description are optional — LinkedIn will scrape them
                    // from the page's OG tags if omitted.
                  },
                ],
              }
            : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await linkedinFetch<{ id: string }>(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        method: 'POST',
        accessToken: account.accessToken,
        body: JSON.stringify(body),
      },
    );

    if (!response?.id) {
      throw new Error('LinkedIn did not return a post ID.');
    }

    return { externalPostId: response.id };
  },

  /**
   * Refresh a LinkedIn access token using the stored refresh_token.
   *
   * LinkedIn refresh tokens are long-lived (1 year) and only issued for
   * certain app types (e.g. Enterprise / Marketing API partners). For
   * typical apps the access token expires in 60 days and the user must
   * re-authenticate. This method supports refresh when a refresh_token
   * is present; if not, it throws a clear error.
   */
  async refreshToken(account) {
    if (!account.refreshToken) {
      throw new Error(
        'LinkedIn account has no refresh_token — user must reconnect via OAuth (LinkedIn access tokens expire in 60 days).',
      );
    }

    const { clientId, clientSecret } = await getLinkedinCredentials();

    const res = await fetch(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      },
    );

    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.error_description || body?.error || JSON.stringify(body);
      } catch {
        detail = await res.text().catch(() => '<no body>');
      }
      throw new Error(`LinkedIn token refresh failed: ${detail}`);
    }

    const token = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
    };

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? account.refreshToken,
      tokenExpiry: new Date(Date.now() + (token.expires_in || 5184000) * 1000),
    };
  },

  /**
   * Fetch share statistics for a published post.
   *
   * Uses the organizationalEntityShareStatistics endpoint when the author
   * is an organization; for personal profiles the API exposes per-post
   * statistics via socialMetadata on the ugcPosts endpoint (likes/comments
   * counts only — no impressions/clicks without the Marketing API).
   *
   * We normalize the response into the 6 common PlatformMetrics fields:
   *   - likes       ← likeCount
   *   - comments    ← commentCount
   *   - shares      ← totalShareCount
   *   - impressions ← uniqueImpressionsCount
   *   - reach       ← uniqueImpressionsCount (LinkedIn doesn't distinguish)
   *   - clicks      ← clickCount
   *
   * For personal-profile posts, returns 0s if the analytics endpoint
   * returns no data (organizational stats are org-only).
   */
  async fetchMetrics(account, externalPostId) {
    const authorUrn = getAuthorUrn(account);
    const isOrg = authorUrn.startsWith('urn:li:organization:');

    // For organization posts, use the share-statistics endpoint.
    if (isOrg) {
      const url =
        'https://api.linkedin.com/v2/organizationalEntityShareStatistics' +
        `?q=organizationalEntity&organizationalEntity=${encodeURIComponent(authorUrn)}` +
        `&ugcPosts=List(${encodeURIComponent(externalPostId)})`;

      try {
        const data = await linkedinFetch<{
          elements?: Array<{
            totalShareCount?: number;
            uniqueImpressionsCount?: number;
            clickCount?: number;
            likeCount?: number;
            commentCount?: number;
          }>;
        }>(url, { method: 'GET', accessToken: account.accessToken });

        const el = data?.elements?.[0] || {};
        const impressions = el.uniqueImpressionsCount ?? 0;
        return {
          likes: el.likeCount ?? 0,
          comments: el.commentCount ?? 0,
          shares: el.totalShareCount ?? 0,
          impressions,
          reach: impressions,
          clicks: el.clickCount ?? 0,
          extraMetrics: {
            source: 'organizationalEntityShareStatistics',
          },
        };
      } catch (err) {
        // Don't crash the metrics-fetch cron — return zeros with the error
        // captured in extraMetrics so it's visible in the DB.
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
    }

    // Personal-profile posts: best-effort via ugcPosts socialMetadata.
    try {
      const url =
        `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(externalPostId)}` +
        `?projection=(specificContent*(com.linkedin.ugc.ShareContent*(shareStatistics~(shareCounts,uniqueImpressionsCount))))`;

      const data = await linkedinFetch<{
        specificContent?: {
          'com.linkedin.ugc.ShareContent'?: {
            'shareStatistics~'?: {
              shareCounts?: {
                likeCount?: number;
                commentCount?: number;
                shareCount?: number;
              };
              uniqueImpressionsCount?: number;
            };
          };
        };
      }>(url, { method: 'GET', accessToken: account.accessToken });

      const stats = data?.specificContent?.['com.linkedin.ugc.ShareContent']?.[
        'shareStatistics~'
      ];
      const counts = stats?.shareCounts || {};
      const impressions = stats?.uniqueImpressionsCount ?? 0;
      return {
        likes: counts.likeCount ?? 0,
        comments: counts.commentCount ?? 0,
        shares: counts.shareCount ?? 0,
        impressions,
        reach: impressions,
        clicks: 0,
        extraMetrics: {
          source: 'ugcPosts.shareStatistics',
          note: 'LinkedIn personal-profile posts do not expose click metrics without the Marketing API.',
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

registerAdapter(linkedinAdapter);

export { linkedinAdapter };
