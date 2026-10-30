/**
 * Google Business Profile (GBP) Platform Adapter
 * ----------------------------------------------
 *
 * Implements the `PlatformAdapter` contract from `src/lib/social/types.ts`
 * for Google Business Profile. GBP lets a business publish "local posts"
 * to one of its locations — these appear on Google Search + Maps.
 *
 * API ENDPOINTS
 *   - Publish (create local post):
 *       POST https://mybusinessbusinessinformation.googleapis.com/v1/
 *            {accountName}/locations/{locationId}/localPosts
 *   - Refresh access token (Google OAuth2):
 *       POST https://oauth2.googleapis.com/token
 *   - Fetch post metrics (insights):
 *       GET  https://mybusiness.googleapis.com/v4/{localPostName}/reportInsights
 *
 * OAUTH SCOPES (set up by the OAuth connect flow at
 * `/api/oauth/googlebusiness`):
 *   - https://www.googleapis.com/auth/business.manage
 *
 * TOKEN LIFECYCLE
 *   - Google OAuth2 access tokens expire in 1 hour (3600s).
 *   - We persist the refresh_token at connect time (the OAuth flow uses
 *     `access_type=offline&prompt=consent` so Google returns one).
 *   - `refreshToken()` is implemented — it's called by the token-refresh
 *     helper (`src/lib/social/token-refresh.ts`) when the access token is
 *     about to expire (5-min buffer), so publishes don't fail with 401.
 *
 * POST TYPES
 *   GBP supports 4 local-post topicTypes. We currently handle 3:
 *     - whats_new  → topicType=STANDARD
 *     - offer      → topicType=OFFER  (+ structured offer block)
 *     - event      → topicType=EVENT  (+ structured event block)
 *   (product is not yet supported by the composer UI — adapter would
 *   need additional structured fields to implement it.)
 *
 * METRICS
 *   GBP does NOT have likes / comments / shares. Engagement is measured
 *   differently: how many people saw the post (views → impressions), how
 *   many clicked "Call" (calls), how many clicked "Directions"
 *   (directionRequests). We map views → impressions and put calls +
 *   directionRequests into extraMetrics. likes/comments/shares are 0.
 *
 * REGISTRATION
 *   This module self-registers at import time via `registerAdapter()`.
 *   The registry's `ensureAdaptersLoaded()` lazily imports this module on
 *   the first publish attempt — see `src/lib/social/registry.ts`.
 */
import { registerAdapter } from '@/lib/social/registry';
import type {
  PlatformAdapter,
  PlatformMetrics,
  PublishParams,
  SocialAccountData,
} from '@/lib/social/types';

// ─── Constants ─────────────────────────────────────────────────────────────

const GBP_API_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GBP_V4_BASE = 'https://mybusiness.googleapis.com/v4';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Google OAuth client credentials.
 *
 * These are read from the IntegrationCredential table at refresh time
 * (refresh_token grant requires the client_secret). Because the adapter
 * is intentionally DB-free (per the contract in types.ts), the publisher
 * doesn't pass these in. We resolve them lazily via a small in-module
 * helper that imports `db` ONLY when refreshToken is actually invoked —
 * the lazy import keeps the adapter side-effect-free at module load and
 * avoids a hard db dependency at static analysis time.
 *
 * In practice, the token-refresh helper (`src/lib/social/token-refresh.ts`)
 * persists the refreshed token back to the SocialAccount row, so even if
 * the IntegrationCredential has been rotated since connect, the next
 * publish will use the persisted token.
 */
async function resolveGoogleClientCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
}> {
  const envClientId = process.env.GOOGLE_BUSINESS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (envClientId && envClientSecret) {
    return { clientId: envClientId, clientSecret: envClientSecret };
  }

  const { db } = await import('@/lib/db');
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'googlebusiness', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred || !cred.clientId || !cred.clientSecret) {
    throw new Error(
      'Google Business Profile OAuth credentials not found in environment or IntegrationCredential table ' +
        '(provider=googlebusiness, status=active).',
    );
  }
  return { clientId: cred.clientId, clientSecret: cred.clientSecret };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract the GBP accountName (e.g. "accounts/123") and locationId
 * (e.g. the numeric location ID, NOT the full path) from account.metadata.
 *
 * The OAuth callback stores metadata as:
 *   { accountName: "accounts/123", locationId: "456", locationName: "ACME Plumber HQ" }
 *
 * Throws if metadata is missing or malformed — the publish flow will
 * surface this as a per-target failure ("GBP account metadata is missing
 * accountName/locationId — reconnect the account").
 */
async function extractLocationRef(account: SocialAccountData): Promise<{
  accountName: string;
  locationId: string;
}> {
  const meta = (account.metadata || {}) as Record<string, any>;
  let accountName = meta?.accountName;
  let locationId = meta?.locationId;

  const isPlaceholder =
    !accountName ||
    !locationId ||
    accountName === 'accounts/primary' ||
    locationId === 'primary' ||
    locationId === '5008';

  if (isPlaceholder && account.accessToken) {
    try {
      const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });
      if (accRes.ok) {
        const accData = await accRes.json();
        const accountsList = Array.isArray(accData.accounts) ? accData.accounts : [];
        for (const a of accountsList) {
          if (!a.name) continue;
          const locRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title,storefrontAddress,metadata`,
            {
              headers: { Authorization: `Bearer ${account.accessToken}` },
            },
          );
          if (locRes.ok) {
            const locData = await locRes.json();
            const locList = Array.isArray(locData.locations) ? locData.locations : [];
            if (locList.length > 0 && locList[0].name) {
              const realAccountName = a.name;
              const realLocationId = locList[0].name.split('/').pop()!;
              const realTitle = locList[0].title || meta.locationTitle || account.accountName;

              accountName = realAccountName;
              locationId = realLocationId;
              meta.accountName = realAccountName;
              meta.locationId = realLocationId;
              meta.locationName = locList[0].name;
              meta.locationTitle = realTitle;
              meta.placeId = locList[0].metadata?.placeId;
              meta.mapsUri = locList[0].metadata?.mapsUri;

              if (account.id) {
                try {
                  const { db } = await import('@/lib/db');
                  await db.socialAccount.update({
                    where: { id: account.id },
                    data: {
                      accountId: realLocationId,
                      accountName: `${realTitle} (${account.accountName})`,
                      metadata: JSON.stringify(meta),
                    },
                  });
                } catch {}
              }
              break;
            }
          }
        }
      }
    } catch (resolveErr) {
      console.warn('[googlebusiness] Failed to auto-resolve genuine location:', resolveErr);
    }
  }

  if (!accountName || !locationId || accountName === 'accounts/primary' || locationId === '5008') {
    throw new Error(
      `GBP account '${account.accountName}' is missing metadata.accountName or ` +
        `metadata.locationId — reconnect it via the OAuth flow.`,
    );
  }
  return { accountName, locationId };
}

/**
 * Convert an error into a readable message. Network/parse errors from
 * `fetch` often come back as plain objects or typed errors; we want the
 * adapter to throw human-readable strings so the publisher can record
 * them in `publishTargets[].error`.
 */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err;
  return fallback;
}

/**
 * Throw a structured error if the GBP API returned a non-2xx response.
 * Includes the HTTP status, GBP error code (if present), and message —
 * enough for the publisher to record + the user to act on.
 */
async function assertOk(
  res: Response,
  context: string,
): Promise<void> {
  if (res.ok) return;
  let detail = '';
  try {
    const body = await res.json();
    // GBP error shape: { error: { code, message, status, details: [] } }
    const errObj = (body as { error?: { message?: string; status?: string; code?: number } })
      .error;
    if (errObj) {
      detail = `: ${errObj.message || ''}${errObj.status ? ` (${errObj.status})` : ''}`;
    } else {
      detail = `: ${JSON.stringify(body).slice(0, 300)}`;
    }
  } catch {
    try {
      const text = await res.text();
      detail = text ? `: ${text.slice(0, 300)}` : '';
    } catch {
      detail = '';
    }
  }

  // Provide actionable hints for common GBP Google Cloud issues
  if (res.status === 403) {
    if (detail.includes('has not been used in project') || detail.includes('is disabled') || detail.includes('PERMISSION_DENIED')) {
      throw new Error(
        `Google Business Profile API access is not yet approved or enabled for your Google Cloud project (HTTP 403). ` +
        `Google requires an approved API Access Request before posts can be published via API. ` +
        `Use "Copy & Open Google Business" to publish this post directly on Google in the meantime.`,
      );
    }
    throw new Error(`Google Business Profile API access denied (HTTP 403)${detail}. Check your OAuth scopes and project approval.`);
  }

  if (res.status === 429) {
    throw new Error(`Google Business Profile rate limit exceeded (HTTP 429). Please wait 1 minute before retrying.`);
  }

  if (res.status === 401) {
    throw new Error(`Google Business Profile authorization expired or revoked (HTTP 401). Please reconnect your Google Business account in Social Accounts.`);
  }

  throw new Error(`GBP ${context} failed (HTTP ${res.status})${detail}`);
}

// ─── Adapter implementation ────────────────────────────────────────────────

export const googleBusinessAdapter: PlatformAdapter = {
  platform: 'googlebusiness',

  /**
   * Publish a local post to a GBP location.
   *
   * Body shape depends on `params.gbpPostType`:
   *   - 'whats_new' (or unset) → topicType STANDARD, just summary
   *   - 'offer'                → topicType OFFER + offer{} block
   *   - 'event'                → topicType EVENT + event{} block
   *
   * If `params.mediaUrls` contains image URLs, they're attached as a
   * `media[]` array (PHOTO format, sourceUrl = remote image URL). GBP
   * fetches the image server-side, so the URL must be publicly reachable.
   *
   * Returns `{ externalPostId }` where externalPostId is the full GBP
   * resource name (e.g. "accounts/xxx/locations/yyy/localPosts/zzz").
   */
  async publish(account, params) {
    const { accountName, locationId } = await extractLocationRef(account);
    const normalizedAccount = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
    const url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/localPosts`;

    // Build the request body based on post type.
    const postType = (params.gbpPostType || 'whats_new').toLowerCase();
    const body: Record<string, unknown> = {
      summary: params.content,
    };

    if (postType === 'offer') {
      body.topicType = 'OFFER';
      if (params.gbpOfferData) {
        const offer: Record<string, unknown> = {
          title: params.gbpOfferData.title,
        };
        // GBP expects dates in YYYY-MM-DD format. If the composer sends
        // ISO strings (with time), we strip the time portion.
        if (params.gbpOfferData.startDate) {
          offer.startDate = normalizeGbpDate(params.gbpOfferData.startDate);
        }
        if (params.gbpOfferData.endDate) {
          offer.endDate = normalizeGbpDate(params.gbpOfferData.endDate);
        }
        if (params.gbpOfferData.couponCode) {
          offer.couponCode = params.gbpOfferData.couponCode;
        }
        body.offer = offer;
      }
    } else if (postType === 'event') {
      body.topicType = 'EVENT';
      // The composer doesn't currently capture event title/startTime/endTime
      // as separate structured fields — fall back to the post content for
      // title and use the gbpOfferData block if it was populated (some
      // users reuse the offer fields for events).
      const eventData = params.gbpOfferData;
      const event: Record<string, unknown> = {
        title: eventData?.title || params.content.slice(0, 80),
      };
      if (eventData?.startDate) {
        event.startTime = eventData.startDate;
      }
      if (eventData?.endDate) {
        event.endTime = eventData.endDate;
      }
      body.event = event;
    } else {
      // whats_new / standard
      body.topicType = 'STANDARD';
    }

    // Attach media (only photo URLs — GBP local posts don't support video
    // via this endpoint).
    if (Array.isArray(params.mediaUrls) && params.mediaUrls.length > 0) {
      body.media = params.mediaUrls.slice(0, 10).map((sourceUrl) => ({
        mediaFormat: 'PHOTO',
        sourceUrl,
      }));
    }

    // Attach call-to-action if a link URL was provided.
    if (params.linkUrl) {
      body.callToAction = {
        actionType: 'LEARN_MORE',
        url: params.linkUrl,
      };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(
        `GBP publish network error: ${errorMessage(err, 'fetch failed')}`,
      );
    }

    await assertOk(res, 'publish');

    let json: { name?: string } | null = null;
    try {
      json = (await res.json()) as { name?: string };
    } catch {
      // GBP should always return JSON — if it didn't, the response is unusable.
    }
    if (!json?.name) {
      throw new Error(
        'GBP publish returned 2xx but no `name` field — cannot record externalPostId.',
      );
    }
    return { externalPostId: json.name };
  },

  /**
   * Refresh an expired Google OAuth2 access token.
   *
   * Uses the standard Google OAuth2 refresh_token grant:
   *   POST https://oauth2.googleapis.com/token
   *   body: grant_type=refresh_token, client_id, client_secret, refresh_token
   *
   * Returns the new access token + expiry. Google does NOT issue a new
   * refresh token on refresh (the original refresh_token stays valid
   * indefinitely unless revoked), so we return `refreshToken: undefined`
   * and the caller (token-refresh helper) keeps the existing one.
   *
   * The client_id / client_secret come from the IntegrationCredential
   * table — the superadmin registers the Google OAuth app there.
   */
  async refreshToken(account) {
    if (!account.refreshToken) {
      throw new Error(
        `GBP account '${account.accountName}' has no refresh_token — ` +
          `reconnect it via the OAuth flow (the original consent must include ` +
          `access_type=offline&prompt=consent).`,
      );
    }

    const { clientId, clientSecret } = await resolveGoogleClientCredentials();

    let res: Response;
    try {
      res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: account.refreshToken,
        }),
      });
    } catch (err) {
      throw new Error(
        `GBP token refresh network error: ${errorMessage(err, 'fetch failed')}`,
      );
    }

    await assertOk(res, 'token refresh');

    const body = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      token_type?: string;
    };
    if (!body?.access_token) {
      throw new Error('GBP token refresh returned 2xx but no access_token field.');
    }

    return {
      accessToken: body.access_token,
      // Google typically does NOT return a new refresh_token on refresh —
      // leave it undefined so the caller keeps the original.
      refreshToken: body.refresh_token || undefined,
      tokenExpiry: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000)
        : undefined,
    };
  },

  /**
   * Fetch metrics for a GBP local post.
   *
   * Endpoint (per task spec):
   *   GET https://mybusiness.googleapis.com/v4/{localPostName}/reportInsights
   *
   * The `externalPostId` stored at publish time IS the localPostName
   * (e.g. "accounts/xxx/locations/yyy/localPosts/zzz") — passed through
   * verbatim.
   *
   * GBP metrics are different from social platforms — there are no
   * likes/comments/shares. The reportInsights response contains metric
   * values like:
   *   - LOCAL_POST_VIEWS_SEARCH  (views via Search)
   *   - LOCAL_POST_VIEWS_MAPS    (views via Maps)
   *   - LOCAL_POST_CALL_CLICKS   (calls driven by the post)
   *   - LOCAL_POST_DIRECTION_REQUESTS (driving-directions requests)
   *   - LOCAL_POST_URL_CLICKS    (website clicks)
   *
   * We sum the *_VIEWS_* metrics into `impressions`, the *_CALL_CLICKS*
   * into extraMetrics.calls, *_DIRECTION_REQUESTS* into
   * extraMetrics.directionRequests, and *_URL_CLICKS* into `clicks`.
   * likes/comments/shares = 0 (GBP doesn't have them).
   */
  async fetchMetrics(account, externalPostId) {
    const url = `${GBP_V4_BASE}/${externalPostId}/reportInsights`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      throw new Error(
        `GBP fetchMetrics network error: ${errorMessage(err, 'fetch failed')}`,
      );
    }

    // 404 = post was deleted on Google's side (e.g. user removed it from
    // the GBP dashboard). Return all-zero metrics rather than throwing —
    // a missing post isn't a transient error worth retrying.
    if (res.status === 404) {
      return zeroMetrics({ deleted: true });
    }
    // 401/403 = token expired or revoked. Throw so the caller knows to
    // refresh / mark inactive.
    if (res.status === 401 || res.status === 403) {
      await assertOk(res, 'fetchMetrics');
    }
    await assertOk(res, 'fetchMetrics');

    let body: GbpInsightsResponse | null = null;
    try {
      body = (await res.json()) as GbpInsightsResponse;
    } catch {
      // No parseable body — return zeros.
      return zeroMetrics({ parseError: true });
    }

    return parseGbpInsights(body);
  },
};

// ─── GBP Insights response shape + parser ──────────────────────────────────

/**
 * Subset of the GBP reportInsights response we care about.
 *
 * The actual response is much richer (multiple `localPostMetrics` entries
 * broken down by day), but for the unified metrics snapshot we only need
 * the aggregate metric values.
 */
interface GbpInsightsResponse {
  name?: string;
  localPostMetrics?: Array<{
    metric?: string;
    totalValue?: { value?: number };
    dimensionalValues?: Array<{ value?: number }>;
  }>;
}

/**
 * Parse the GBP insights response into the unified PlatformMetrics shape.
 *
 * Sums:
 *   - LOCAL_POST_VIEWS_* → impressions
 *   - LOCAL_POST_CALL_CLICKS → extraMetrics.calls
 *   - LOCAL_POST_DIRECTION_REQUESTS → extraMetrics.directionRequests
 *   - LOCAL_POST_URL_CLICKS → clicks
 */
function parseGbpInsights(body: GbpInsightsResponse): PlatformMetrics {
  const extraMetrics: Record<string, unknown> = {};
  let calls = 0;
  let directionRequests = 0;
  let urlClicks = 0;
  let totalViews = 0;

  if (Array.isArray(body.localPostMetrics)) {
    for (const m of body.localPostMetrics) {
      const metricName = (m.metric || '').toUpperCase();
      // Each metric entry has either a `totalValue.value` (aggregate) or
      // a `dimensionalValues[]` array (broken down by dimension). Sum
      // both to be safe.
      let value = m.totalValue?.value || 0;
      if (Array.isArray(m.dimensionalValues)) {
        for (const dv of m.dimensionalValues) {
          value += dv.value || 0;
        }
      }
      if (metricName.includes('VIEWS')) {
        totalViews += value;
      } else if (metricName.includes('CALL_CLICKS')) {
        calls += value;
      } else if (metricName.includes('DIRECTION')) {
        directionRequests += value;
      } else if (metricName.includes('URL_CLICKS')) {
        urlClicks += value;
      }
    }
  }

  extraMetrics.calls = calls;
  extraMetrics.directionRequests = directionRequests;

  return {
    likes: 0,
    comments: 0,
    shares: 0,
    impressions: totalViews,
    // GBP doesn't expose unique reach — leave at 0 (consistent with the
    // "not available" convention used by the analytics dashboard).
    reach: 0,
    clicks: urlClicks,
    extraMetrics,
  };
}

/**
 * Return an all-zero PlatformMetrics object, optionally annotated with
 * the reason (deleted post / parse error) for debugging.
 */
function zeroMetrics(reason: { deleted?: boolean; parseError?: boolean }): PlatformMetrics {
  return {
    likes: 0,
    comments: 0,
    shares: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    extraMetrics: {
      ...(reason.deleted ? { deleted: true } : {}),
      ...(reason.parseError ? { parseError: true } : {}),
    },
  };
}

/**
 * Normalize an ISO date / date-string to GBP's expected YYYY-MM-DD format.
 *
 * GBP's API expects `startDate` and `endDate` on offers/events as plain
 * `YYYY-MM-DD` strings (no time, no timezone). The composer UI may send
 * full ISO strings (e.g. from `<input type="datetime-local">`); we
 * truncate at the first 'T' or use the first 10 chars.
 */
function normalizeGbpDate(input: string): string {
  if (!input) return input;
  // ISO datetime: "2025-01-15T14:30:00.000Z" → "2025-01-15"
  // Already YYYY-MM-DD: "2025-01-15" → unchanged
  const t = input.indexOf('T');
  if (t > 0) return input.slice(0, t);
  return input.slice(0, 10);
}

/**
 * Reply to a customer review on Google Business Profile.
 *
 * PUT https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
 * Body: { comment: string }
 */
export async function replyToGoogleBusinessReview(
  account: SocialAccountData,
  reviewId: string,
  comment: string,
): Promise<{ comment: string; updateTime: string }> {
  const { accountName, locationId } = await extractLocationRef(account);
  const normalizedAccount = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const cleanReviewId = reviewId.includes('/') ? reviewId.split('/').pop()! : reviewId;

  // Handle mock/simulated/seeded reviews seamlessly in development & sandbox
  if (
    cleanReviewId.startsWith('goog_rev_') ||
    cleanReviewId.startsWith('sim_') ||
    cleanReviewId.startsWith('mock_') ||
    cleanReviewId.startsWith('test_')
  ) {
    return {
      comment: comment.trim(),
      updateTime: new Date().toISOString(),
    };
  }

  const url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/reviews/${cleanReviewId}/reply`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment: comment.trim() }),
  });

  await assertOk(res, 'reply to review');
  const data = (await res.json().catch(() => ({}))) as { comment?: string; updateTime?: string };
  return {
    comment: data.comment || comment.trim(),
    updateTime: data.updateTime || new Date().toISOString(),
  };
}

/**
 * Delete a review reply from Google Business Profile.
 *
 * DELETE https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
 */
export async function deleteGoogleBusinessReviewReply(
  account: SocialAccountData,
  reviewId: string,
): Promise<boolean> {
  const { accountName, locationId } = await extractLocationRef(account);
  const normalizedAccount = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const cleanReviewId = reviewId.includes('/') ? reviewId.split('/').pop()! : reviewId;

  // Handle mock/simulated/seeded reviews seamlessly in development & sandbox
  if (
    cleanReviewId.startsWith('goog_rev_') ||
    cleanReviewId.startsWith('sim_') ||
    cleanReviewId.startsWith('mock_') ||
    cleanReviewId.startsWith('test_')
  ) {
    return true;
  }

  const url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/reviews/${cleanReviewId}/reply`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
  });

  await assertOk(res, 'delete review reply');
  return true;
}

/**
 * Fetch reviews from Google Business Profile for a location.
 *
 * GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews
 */
export async function fetchGoogleBusinessReviews(
  account: SocialAccountData,
  options?: { pageSize?: number; pageToken?: string },
): Promise<{
  reviews: Array<{
    reviewId: string;
    authorName: string;
    profilePhotoUrl?: string;
    rating: number;
    comment: string;
    createTime: string;
    reply?: { comment: string; updateTime: string };
  }>;
  averageRating: number;
  totalReviewCount: number;
  nextPageToken?: string;
}> {
  const { accountName, locationId } = await extractLocationRef(account);
  const normalizedAccount = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const pageSize = options?.pageSize || 50;
  let url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/reviews?pageSize=${pageSize}`;
  if (options?.pageToken) {
    url += `&pageToken=${encodeURIComponent(options.pageToken)}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
  });

  await assertOk(res, 'fetch reviews');
  const data = (await res.json().catch(() => ({}))) as {
    reviews?: Array<{
      reviewId?: string;
      name?: string;
      reviewer?: { displayName?: string; profilePhotoUrl?: string };
      starRating?: string;
      comment?: string;
      createTime?: string;
      reviewReply?: { comment?: string; updateTime?: string };
    }>;
    averageRating?: number;
    totalReviewCount?: number;
    nextPageToken?: string;
  };

  const starMap: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };

  const reviews = (data.reviews || []).map((r) => {
    const rId = r.reviewId || (r.name ? r.name.split('/').pop() : '') || '';
    const rating = r.starRating ? starMap[r.starRating.toUpperCase()] || 5 : 5;
    return {
      reviewId: rId,
      authorName: r.reviewer?.displayName || 'Google User',
      profilePhotoUrl: r.reviewer?.profilePhotoUrl,
      rating,
      comment: r.comment || '',
      createTime: r.createTime || new Date().toISOString(),
      reply: r.reviewReply?.comment
        ? {
            comment: r.reviewReply.comment,
            updateTime: r.reviewReply.updateTime || new Date().toISOString(),
          }
        : undefined,
    };
  });

  return {
    reviews,
    averageRating: data.averageRating || 0,
    totalReviewCount: data.totalReviewCount || reviews.length,
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Upload a media photo to Google Business Profile.
 *
 * POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media
 */
export async function uploadGoogleBusinessMedia(
  account: SocialAccountData,
  mediaData: {
    sourceUrl: string;
    mediaFormat?: 'PHOTO';
    category?: 'ADDITIONAL' | 'COVER' | 'PROFILE' | 'EXTERIOR' | 'INTERIOR' | 'PRODUCT';
    description?: string;
  },
): Promise<{
  name: string;
  googleUrl: string;
  thumbnailUrl?: string;
  createTime: string;
}> {
  const { accountName, locationId } = extractLocationRef(account);
  const normalizedAccount = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/media`;

  const payload = {
    mediaFormat: mediaData.mediaFormat || 'PHOTO',
    locationAssociation: {
      category: mediaData.category || 'ADDITIONAL',
    },
    sourceUrl: mediaData.sourceUrl,
    description: mediaData.description,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  await assertOk(res, 'upload media photo');
  const data = (await res.json().catch(() => ({}))) as {
    name?: string;
    googleUrl?: string;
    thumbnailUrl?: string;
    createTime?: string;
  };

  return {
    name: data.name || '',
    googleUrl: data.googleUrl || mediaData.sourceUrl,
    thumbnailUrl: data.thumbnailUrl,
    createTime: data.createTime || new Date().toISOString(),
  };
}

/**
 * List media photos from Google Business Profile.
 *
 * GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media
 */
export async function listGoogleBusinessMedia(
  account: SocialAccountData,
  options?: { pageSize?: number; pageToken?: string },
): Promise<{
  mediaItems: Array<{
    name: string;
    googleUrl: string;
    thumbnailUrl?: string;
    createTime: string;
    category?: string;
  }>;
  nextPageToken?: string;
}> {
  const { accountName, locationId } = await extractLocationRef(account);
  const normalizedAccount = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const pageSize = options?.pageSize || 50;
  let url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/media?pageSize=${pageSize}`;
  if (options?.pageToken) {
    url += `&pageToken=${encodeURIComponent(options.pageToken)}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
  });

  await assertOk(res, 'list media');
  const data = (await res.json().catch(() => ({}))) as {
    mediaItems?: Array<{
      name?: string;
      googleUrl?: string;
      thumbnailUrl?: string;
      createTime?: string;
      locationAssociation?: { category?: string };
    }>;
    nextPageToken?: string;
  };

  const items = (data.mediaItems || []).map((m) => ({
    name: m.name || '',
    googleUrl: m.googleUrl || '',
    thumbnailUrl: m.thumbnailUrl,
    createTime: m.createTime || new Date().toISOString(),
    category: m.locationAssociation?.category || 'ADDITIONAL',
  }));

  return {
    mediaItems: items,
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Fetch Performance Telemetry metrics from Google Business Profile Performance API.
 *
 * GET https://businessprofileperformance.googleapis.com/v1/locations/{locationId}:fetchMultiDailyMetricsTimeSeries
 */
export async function fetchGoogleBusinessPerformanceMetrics(
  account: SocialAccountData,
  startDate?: string,
  endDate?: string,
): Promise<{
  searchImpressions: number;
  mapsImpressions: number;
  callClicks: number;
  directionRequests: number;
  websiteClicks: number;
  bookings: number;
  conversations: number;
}> {
  const { locationId } = await extractLocationRef(account);
  const now = new Date();
  const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end = endDate || now.toISOString().slice(0, 10);

  const [sYear, sMonth, sDay] = start.split('-').map(Number);
  const [eYear, eMonth, eDay] = end.split('-').map(Number);

  const url = `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries?dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_SEARCH&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_SEARCH&dailyMetrics=CALL_CLICKS&dailyMetrics=BUSINESS_DIRECTION_REQUESTS&dailyMetrics=WEBSITE_CLICKS&dailyMetrics=BUSINESS_BOOKINGS&dailyMetrics=BUSINESS_CONVERSATIONS&dailyRange.startDate.year=${sYear}&dailyRange.startDate.month=${sMonth}&dailyRange.startDate.day=${sDay}&dailyRange.endDate.year=${eYear}&dailyRange.endDate.month=${eMonth}&dailyRange.endDate.day=${eDay}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
  });

  await assertOk(res, 'fetch performance telemetry');
  const data = (await res.json().catch(() => ({}))) as {
    multiDailyMetricTimeSeries?: Array<{
      dailyMetricTimeSeries?: Array<{
        dailyMetric?: string;
        timeSeries?: {
          datedValues?: Array<{ value?: string }>;
        };
      }>;
    }>;
  };

  let searchImpressions = 0;
  let mapsImpressions = 0;
  let callClicks = 0;
  let directionRequests = 0;
  let websiteClicks = 0;
  let bookings = 0;
  let conversations = 0;

  const seriesList = data.multiDailyMetricTimeSeries?.[0]?.dailyMetricTimeSeries || [];
  for (const s of seriesList) {
    const metric = s.dailyMetric || '';
    const sum = (s.timeSeries?.datedValues || []).reduce((acc, v) => acc + (parseInt(v.value || '0', 10) || 0), 0);

    if (metric.includes('SEARCH')) {
      searchImpressions += sum;
    } else if (metric.includes('MAPS')) {
      mapsImpressions += sum;
    } else if (metric === 'CALL_CLICKS') {
      callClicks += sum;
    } else if (metric === 'BUSINESS_DIRECTION_REQUESTS') {
      directionRequests += sum;
    } else if (metric === 'WEBSITE_CLICKS') {
      websiteClicks += sum;
    } else if (metric === 'BUSINESS_BOOKINGS') {
      bookings += sum;
    } else if (metric === 'BUSINESS_CONVERSATIONS') {
      conversations += sum;
    }
  }

  return {
    searchImpressions,
    mapsImpressions,
    callClicks,
    directionRequests,
    websiteClicks,
    bookings,
    conversations,
  };
}

/**
 * Fetch detailed place metadata from Google Business Profile Information API.
 * Returns title, real Google category (e.g. Steel Fabricator), storefront address,
 * place ID, and direct Google Maps place link.
 */
export async function fetchGoogleBusinessPlaceDetails(
  account: SocialAccountData,
): Promise<{
  title: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  placeId?: string;
  mapsUri?: string;
}> {
  const { accountName, locationId } = await extractLocationRef(account);
  const meta = (account.metadata || {}) as Record<string, any>;
  const locationResourceName =
    meta.locationName ||
    (accountName.startsWith('accounts/')
      ? `${accountName}/locations/${locationId}`
      : `accounts/${accountName}/locations/${locationId}`);

  let title = account.accountName || meta.locationTitle || '';
  let category = meta.category || undefined;
  let address = meta.address || undefined;
  let phone = meta.phone || undefined;
  let website = meta.website || undefined;
  let placeId = meta.placeId || undefined;
  let mapsUri = meta.mapsUri || undefined;

  try {
    const detailUrl = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${locationResourceName}`,
    );
    detailUrl.searchParams.set(
      'readMask',
      'name,title,phoneNumbers,websiteUri,storefrontAddress,categories,metadata',
    );
    const detailRes = await fetch(detailUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (detailRes.ok) {
      const detail = (await detailRes.json()) as any;
      if (detail.title) title = detail.title;
      if (detail.categories?.primaryCategory?.displayName) {
        category = detail.categories.primaryCategory.displayName;
      }
      if (detail.metadata?.placeId) {
        placeId = detail.metadata.placeId;
      }
      if (detail.metadata?.mapsUri) {
        mapsUri = detail.metadata.mapsUri;
      } else if (placeId) {
        mapsUri = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
      }
      if (detail.phoneNumbers?.[0]?.phoneNumber) {
        phone = detail.phoneNumbers[0].phoneNumber;
      }
      if (detail.websiteUri) {
        website = detail.websiteUri;
      }
      if (detail.storefrontAddress) {
        const parts: string[] = [];
        if (detail.storefrontAddress.addressLines) parts.push(...detail.storefrontAddress.addressLines);
        if (detail.storefrontAddress.locality) parts.push(detail.storefrontAddress.locality);
        if (detail.storefrontAddress.administrativeArea) parts.push(detail.storefrontAddress.administrativeArea);
        if (detail.storefrontAddress.postalCode) parts.push(detail.storefrontAddress.postalCode);
        if (detail.storefrontAddress.country) parts.push(detail.storefrontAddress.country);
        if (parts.length > 0) address = parts.join(', ');
      }
    }
  } catch (err) {
    console.warn('[googlebusiness] Failed to fetch live place details, falling back to account metadata:', err);
  }

  if (!mapsUri) {
    mapsUri = placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title || 'Google Business')}`;
  }

  return { title, category, address, phone, website, placeId, mapsUri };
}

/**
 * Update the business profile description (and optionally primary category) on the
 * live Google Business Profile location via the Business Information API.
 *
 * Used by the "AI GBP Optimisation" flow: the AI-generated 750-char SEO description
 * is written straight to the connected location with updateMask=profile, so the
 * change is REAL (visible on Google Maps/Search) — not just saved locally.
 *
 * Returns the updated fields. Throws structured errors with actionable messages.
 */
export async function updateGoogleBusinessProfile(
  account: SocialAccountData,
  updates: {
    description?: string; // max 750 chars per Google policy
  },
): Promise<{ descriptionApplied: boolean }> {
  const { accountName, locationId } = await extractLocationRef(account);
  const locationResourceName = accountName.startsWith('accounts/')
    ? `${accountName}/locations/${locationId}`
    : `accounts/${accountName}/locations/${locationId}`;

  const body: Record<string, unknown> = {};
  const updateMasks: string[] = [];

  if (updates.description !== undefined) {
    const desc = updates.description.slice(0, 750);
    body.profile = { description: desc };
    updateMasks.push('profile.description');
  }

  if (updateMasks.length === 0) {
    return { descriptionApplied: false };
  }

  const res = await fetch(`${GBP_API_BASE}/${locationResourceName}?updateMask=${updateMasks.join(',')}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  await assertOk(res, 'update Google Business Profile description');
  return { descriptionApplied: true };
}

// ─── Self-register ─────────────────────────────────────────────────────────

registerAdapter(googleBusinessAdapter);

