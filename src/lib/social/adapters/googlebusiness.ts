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
  const { db } = await import('@/lib/db');
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'googlebusiness', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred || !cred.clientId || !cred.clientSecret) {
    throw new Error(
      'Google Business Profile OAuth credentials not found in IntegrationCredential table ' +
        '(provider=googlebusiness, status=active). A superadmin must register them first.',
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
function extractLocationRef(account: SocialAccountData): {
  accountName: string;
  locationId: string;
} {
  const meta = account.metadata as
    | { accountName?: string; locationId?: string; locationName?: string }
    | undefined;
  const accountName = meta?.accountName;
  const locationId = meta?.locationId;
  if (!accountName || !locationId) {
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
    const { accountName, locationId } = extractLocationRef(account);
    const url = `${GBP_API_BASE}/${accountName}/locations/${locationId}/localPosts`;

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

    let body: {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      token_type?: string;
    } | null = null;
    try {
      body = (await res.json()) as typeof body;
    } catch {
      // fall through to the access_token check below
    }
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

// ─── Self-register ─────────────────────────────────────────────────────────

registerAdapter(googleBusinessAdapter);
