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
export async function extractLocationRef(account: SocialAccountData): Promise<{
  accountName: string;
  locationId: string;
}> {
  const meta = (account.metadata || {}) as Record<string, any>;
  let accountName = meta?.accountName;
  let locationId = meta?.activeProfileId || meta?.locationId;

  if (meta?.locations && Array.isArray(meta.locations) && locationId) {
    const locMatch = meta.locations.find((l: any) => String(l.locationId || l.id) === String(locationId));
    if (locMatch?.accountName) {
      accountName = locMatch.accountName;
    }
  }

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
        signal: AbortSignal.timeout(15000),
      });
      if (accRes.ok) {
        const accData = await accRes.json();
        const accountsList = Array.isArray(accData.accounts) ? accData.accounts : [];
        const allDiscoveredLocs: any[] = [];
        for (const a of accountsList) {
          if (!a.name) continue;
          const locRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title,storefrontAddress,metadata,categories`,
            {
              headers: { Authorization: `Bearer ${account.accessToken}` },
              signal: AbortSignal.timeout(15000),
            },
          );
          if (locRes.ok) {
            const locData = await locRes.json();
            const locList = Array.isArray(locData.locations) ? locData.locations : [];
            for (const loc of locList) {
              const locId = loc.name ? loc.name.split('/').pop()! : '';
              if (!locId) continue;
              allDiscoveredLocs.push({
                id: locId,
                locationId: locId,
                name: loc.name,
                title: loc.title,
                accountName: a.name,
                category: loc.categories?.primaryCategory?.displayName || '',
                address: loc.storefrontAddress ? [loc.storefrontAddress.addressLines?.join(', '), loc.storefrontAddress.locality].filter(Boolean).join(', ') : '',
                metadata: loc.metadata,
                placeId: loc.metadata?.placeId,
                mapsUri: loc.metadata?.mapsUri,
              });
            }
          }
        }

        if (allDiscoveredLocs.length > 0) {
          // Resolve only the selected location, or an unambiguous sole location.
          const primaryLoc = allDiscoveredLocs.find((l) => l.id === locationId) || (allDiscoveredLocs.length === 1 ? allDiscoveredLocs[0] : null);
          if (!primaryLoc) throw new Error('Select a Google Business location before continuing.');
          accountName = primaryLoc.accountName;
          locationId = primaryLoc.id;
          meta.accountName = primaryLoc.accountName;
          meta.locationId = primaryLoc.id;
          meta.activeProfileId = primaryLoc.id;
          meta.locationName = primaryLoc.name;
          meta.locationTitle = primaryLoc.title;
          meta.placeId = primaryLoc.placeId;
          meta.mapsUri = primaryLoc.mapsUri;
          meta.locations = allDiscoveredLocs;

          if (account.id) {
            try {
              const { db } = await import('@/lib/db');
              await db.socialAccount.update({
                where: { id: account.id },
                data: {
                  accountId: primaryLoc.id,
                  accountName: `${primaryLoc.title} (${account.accountName})`,
                  metadata: JSON.stringify(meta),
                },
              });
            } catch {}
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

    // If scheduled as photo media gallery upload, route straight to Google Media API
    if (postType === 'photo_media' || postType === 'media') {
      const photoUrl = params.mediaUrls?.[0];
      if (!photoUrl) throw new Error('Photo or video URL is required for Google Media upload');
      assertPublicMediaUrl(photoUrl);
      const inferredFormat =
        params.mediaFormat === 'VIDEO' || /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i.test(photoUrl)
          ? 'VIDEO'
          : 'PHOTO';
      const mediaResult = await uploadGoogleBusinessMedia(account, {
        sourceUrl: photoUrl,
        mediaFormat: inferredFormat,
        category: params.gbpMediaCategory || 'ADDITIONAL',
        description: params.content || undefined,
      });
      return {
        externalPostId: mediaResult.name || `media_${Date.now()}`,
        permalink: mediaResult.googleUrl,
      };
    }

    const body: Record<string, unknown> = {
      summary: params.content,
    };

    if (postType === 'offer') {
      body.topicType = 'OFFER';
      const offerData = params.gbpOfferData;
      const startD = offerData?.startDate && !isNaN(new Date(offerData.startDate).getTime())
        ? new Date(offerData.startDate)
        : new Date();
      const endD = offerData?.endDate && !isNaN(new Date(offerData.endDate).getTime())
        ? new Date(offerData.endDate)
        : new Date(Date.now() + 7 * 86400000);

      body.event = {
        title: (offerData?.title || params.content).slice(0, 58),
        schedule: {
          startDate: {
            year: startD.getFullYear(),
            month: startD.getMonth() + 1,
            day: startD.getDate(),
          },
          endDate: {
            year: endD.getFullYear(),
            month: endD.getMonth() + 1,
            day: endD.getDate(),
          },
        },
      };

      const offerObj: Record<string, unknown> = {};
      if (offerData?.couponCode) offerObj.couponCode = offerData.couponCode;
      const redeemUrl = offerData?.redeemUrl || params.linkUrl;
      if (redeemUrl) offerObj.redeemOnlineUrl = redeemUrl;
      if (Object.keys(offerObj).length > 0) {
        body.offer = offerObj;
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

    if (!res.ok && postType === 'offer') {
      const errClone = res.clone();
      const errText = await errClone.text().catch(() => '');
      if (errText.includes('INVALID_ARGUMENT') || res.status === 400 || res.status === 500) {
        console.warn('[googlebusiness] OFFER payload not accepted (status ' + res.status + '), falling back to STANDARD post:', errText);
        const fallbackBody: Record<string, unknown> = {
          summary: params.content,
          topicType: 'STANDARD',
        };
        if (body.media) fallbackBody.media = body.media;
        if (params.linkUrl || params.gbpOfferData?.redeemUrl) {
          fallbackBody.callToAction = {
            actionType: 'LEARN_MORE',
            url: params.linkUrl || (params.gbpOfferData?.redeemUrl as string),
          };
        }
        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(fallbackBody),
        });
      }
    }

    await assertOk(res, 'publish');

    let json: { name?: string; searchUrl?: string } | null = null;
    try {
      json = (await res.json()) as { name?: string; searchUrl?: string };
    } catch {
      // GBP should always return JSON — if it didn't, the response is unusable.
    }
    if (!json?.name) {
      throw new Error(
        'GBP publish returned 2xx but no `name` field — cannot record externalPostId.',
      );
    }
    const meta = (account.metadata || {}) as Record<string, unknown>;
    const permalink =
      (typeof json.searchUrl === 'string' && json.searchUrl.trim() ? json.searchUrl.trim() : undefined) ||
      (typeof meta.mapsUri === 'string' && meta.mapsUri.trim() ? meta.mapsUri.trim() : undefined) ||
      (typeof meta.placeId === 'string' && meta.placeId.trim()
        ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(meta.placeId.trim())}`
        : undefined);
    return {
      externalPostId: json.name,
      ...(permalink ? { permalink } : {}),
    };
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
): Promise<{ comment: string; updateTime: string; reviewReplyState?: string; policyViolation?: string }> {
  const { accountName, locationId } = await extractLocationRef(account);
  const fullReviewMatch = reviewId.match(/^(accounts\/[^/]+)\/locations\/([^/]+)\/reviews\/([^/]+)$/);
  const normalizedAccount = fullReviewMatch && fullReviewMatch[2] === String(locationId)
    ? fullReviewMatch[1]
    : accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const cleanReviewId = fullReviewMatch
    ? fullReviewMatch[3]
    : (reviewId.includes('/') ? reviewId.split('/').pop()! : reviewId);
  const reviewLocation = reviewId.match(/(?:^|\/)locations\/([^/]+)\/reviews\/[^/]+$/)?.[1];
  if (reviewLocation && reviewLocation !== String(locationId)) {
    throw new Error('The review belongs to a different Google Business location.');
  }

  if (/^(goog_rev_|sim_|mock_|test_)/.test(cleanReviewId)) {
    throw new Error('This is a sample review. Sync the original Google review before publishing.');
  }

  const url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/reviews/${cleanReviewId}/reply`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: comment.trim() }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new Error(`GBP reply to review network error: ${errorMessage(err, 'request timed out')}`);
  }

  await assertOk(res, 'reply to review');
  const data = (await res.json().catch(() => ({}))) as { comment?: string; updateTime?: string; reviewReplyState?: string; policyViolation?: string };
  return {
    comment: data.comment || comment.trim(),
    updateTime: data.updateTime || new Date().toISOString(),
    reviewReplyState: data.reviewReplyState || 'APPROVED',
    policyViolation: data.policyViolation,
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
  const fullReviewMatch = reviewId.match(/^(accounts\/[^/]+)\/locations\/([^/]+)\/reviews\/([^/]+)$/);
  const normalizedAccount = fullReviewMatch && fullReviewMatch[2] === String(locationId)
    ? fullReviewMatch[1]
    : accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
  const cleanReviewId = fullReviewMatch
    ? fullReviewMatch[3]
    : (reviewId.includes('/') ? reviewId.split('/').pop()! : reviewId);
  const reviewLocation = reviewId.match(/(?:^|\/)locations\/([^/]+)\/reviews\/[^/]+$/)?.[1];
  if (reviewLocation && reviewLocation !== String(locationId)) {
    throw new Error('The review belongs to a different Google Business location.');
  }

  if (/^(goog_rev_|sim_|mock_|test_)/.test(cleanReviewId)) {
    throw new Error('This is a sample review. Sync the original Google review before deleting its reply.');
  }

  const url = `${GBP_V4_BASE}/${normalizedAccount}/locations/${locationId}/reviews/${cleanReviewId}/reply`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new Error(`GBP delete review reply network error: ${errorMessage(err, 'request timed out')}`);
  }

  // 404 NOT_FOUND means there is no active reply on Google (already deleted
  // in Google Business Profile / Maps or never published to Google).
  if (res.status === 404) {
    return false;
  }

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
    updateTime?: string;
    reply?: { comment: string; updateTime: string; reviewReplyState?: string; policyViolation?: string };
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
  const data = (await res.json()) as {
    reviews?: Array<{
      reviewId?: string;
      name?: string;
      reviewer?: { displayName?: string; profilePhotoUrl?: string };
      starRating?: string;
      comment?: string;
      createTime?: string;
      updateTime?: string;
      reviewReply?: { comment?: string; updateTime?: string; reviewReplyState?: string; policyViolation?: string };
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

  if (!data || (data.reviews !== undefined && !Array.isArray(data.reviews))) {
    throw new Error('Google returned an invalid review response. Please retry the sync.');
  }
  const reviews = (data.reviews || []).map((r) => {
    const rId = r.reviewId || (r.name ? r.name.split('/').pop() : '') || '';
    const rating = r.starRating ? starMap[r.starRating.toUpperCase()] : undefined;
    if (!rId || !rating) {
      throw new Error('Google returned a review without a valid ID or rating. Please retry the sync.');
    }
    return {
      reviewId: `locations/${locationId}/reviews/${rId}`,
      authorName: r.reviewer?.displayName || 'Google User',
      profilePhotoUrl: r.reviewer?.profilePhotoUrl,
      rating,
      comment: r.comment || '',
      createTime: r.createTime || new Date().toISOString(),
      updateTime: r.updateTime || r.createTime || new Date().toISOString(),
      reply: r.reviewReply?.comment
        ? {
            comment: r.reviewReply.comment,
            reviewReplyState:r.reviewReply.reviewReplyState,
            policyViolation:r.reviewReply.policyViolation,
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

function assertPublicMediaUrl(sourceUrl: string): void {
  const trimmed = (sourceUrl || '').trim();
  if (!trimmed || trimmed.startsWith('/')) {
    throw new Error(
      'Media URL must be a publicly reachable HTTPS cloud URL for Google Business Profile (local /uploads paths are not accessible by Google).',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid media URL provided for Google Business Profile upload.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Google Business Profile requires an HTTP/HTTPS public media URL.');
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')) {
    throw new Error(
      `Local media URL host (${host}) is not reachable by Google Business Profile. Configure cloud storage (Supabase Storage or S3).`,
    );
  }
}

/**
 * Upload a media photo or video to Google Business Profile.
 *
 * POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media
 */
export async function uploadGoogleBusinessMedia(
  account: SocialAccountData,
  mediaData: {
    sourceUrl: string;
    mediaFormat?: 'PHOTO' | 'VIDEO';
    category?: 'ADDITIONAL' | 'COVER' | 'PROFILE' | 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'AT_WORK' | 'TEAMS';
    description?: string;
  },
): Promise<{
  name: string;
  googleUrl: string;
  thumbnailUrl?: string;
  createTime: string;
}> {
  assertPublicMediaUrl(mediaData.sourceUrl);
  const { accountName, locationId } = await extractLocationRef(account);
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
 * List media photos and videos from Google Business Profile.
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
    mediaFormat?: 'PHOTO' | 'VIDEO' | string;
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
      mediaFormat?: 'PHOTO' | 'VIDEO' | string;
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
    mediaFormat:
      m.mediaFormat ||
      (/\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i.test(m.googleUrl || '') ? 'VIDEO' : 'PHOTO'),
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
  totalViews: number;
  callClicks: number;
  directionRequests: number;
  websiteClicks: number;
  bookings: number;
  conversations: number;
  monthlyTrends: {
    months: string[];
    views: number[];
    calls: number[];
    directions: number[];
    website: number[];
    bookings: number[];
    interactions: number[];
  };
  last30Days: {
    searchImpressions: number;
    mapsImpressions: number;
    totalViews: number;
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    bookings: number;
    conversations: number;
  };
}> {
  const { locationId } = await extractLocationRef(account);
  const now = new Date();

  // Official Google Business Profile Performance API strictly requires the end date
  // to be at least 3-4 days in the past (72-hour aggregation lag). Using today's date causes
  // INVALID_ARGUMENT or empty payloads.
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 184 * 24 * 60 * 60 * 1000);

  const start = startDate || sixMonthsAgo.toISOString().slice(0, 10);
  const end = endDate || fourDaysAgo.toISOString().slice(0, 10);

  const cacheKey = `${locationId}:${start}:${end}`;
  const cached = PERF_METRICS_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const [sYear, sMonth, sDay] = start.split('-').map(Number);
  const [eYear, eMonth, eDay] = end.split('-').map(Number);

  // Generate 6-month historical bucket keys
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months: string[] = [];
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthNames[d.getMonth()]);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const monthlyViews = [0, 0, 0, 0, 0, 0];
  const monthlyCalls = [0, 0, 0, 0, 0, 0];
  const monthlyDirections = [0, 0, 0, 0, 0, 0];
  const monthlyWebsite = [0, 0, 0, 0, 0, 0];
  const monthlyBookings = [0, 0, 0, 0, 0, 0];
  const monthlyInteractions = [0, 0, 0, 0, 0, 0];

  const endMs = Date.UTC(eYear, eMonth - 1, eDay);
  const start30Ms = endMs - 29 * 24 * 60 * 60 * 1000;

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
          datedValues?: Array<{
            date?: { year?: number; month?: number; day?: number };
            value?: string;
          }>;
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

  let l30SearchImpressions = 0;
  let l30MapsImpressions = 0;
  let l30CallClicks = 0;
  let l30DirectionRequests = 0;
  let l30WebsiteClicks = 0;
  let l30Bookings = 0;
  let l30Conversations = 0;

  const seriesList = data.multiDailyMetricTimeSeries?.[0]?.dailyMetricTimeSeries || [];
  for (const s of seriesList) {
    const metric = s.dailyMetric || '';
    const datedVals = s.timeSeries?.datedValues || [];
    const sum = datedVals.reduce((acc, v) => acc + (parseInt(v.value || '0', 10) || 0), 0);

    for (const item of datedVals) {
      const val = parseInt(item.value || '0', 10) || 0;
      if (val <= 0 || !item.date?.year || !item.date?.month) continue;

      if (item.date.day) {
        const itemMs = Date.UTC(item.date.year, item.date.month - 1, item.date.day);
        if (itemMs >= start30Ms && itemMs <= endMs) {
          if (metric.includes('SEARCH')) {
            l30SearchImpressions += val;
          } else if (metric.includes('MAPS')) {
            l30MapsImpressions += val;
          } else if (metric === 'CALL_CLICKS') {
            l30CallClicks += val;
          } else if (metric === 'BUSINESS_DIRECTION_REQUESTS') {
            l30DirectionRequests += val;
          } else if (metric === 'WEBSITE_CLICKS') {
            l30WebsiteClicks += val;
          } else if (metric === 'BUSINESS_BOOKINGS') {
            l30Bookings += val;
          } else if (metric === 'BUSINESS_CONVERSATIONS') {
            l30Conversations += val;
          }
        }
      }

      const key = `${item.date.year}-${String(item.date.month).padStart(2, '0')}`;
      const mIdx = monthKeys.indexOf(key);
      if (mIdx >= 0) {
        if (metric.includes('SEARCH') || metric.includes('MAPS')) {
          monthlyViews[mIdx] += val;
        } else if (metric === 'CALL_CLICKS') {
          monthlyCalls[mIdx] += val;
          monthlyInteractions[mIdx] += val;
        } else if (metric === 'BUSINESS_DIRECTION_REQUESTS') {
          monthlyDirections[mIdx] += val;
          monthlyInteractions[mIdx] += val;
        } else if (metric === 'WEBSITE_CLICKS') {
          monthlyWebsite[mIdx] += val;
          monthlyInteractions[mIdx] += val;
        } else if (metric === 'BUSINESS_BOOKINGS') {
          monthlyBookings[mIdx] += val;
          monthlyInteractions[mIdx] += val;
        } else if (metric === 'BUSINESS_CONVERSATIONS') {
          monthlyInteractions[mIdx] += val;
        }
      }
    }

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

  const perfResult = {
    searchImpressions,
    mapsImpressions,
    totalViews: searchImpressions + mapsImpressions,
    callClicks,
    directionRequests,
    websiteClicks,
    bookings,
    conversations,
    monthlyTrends: {
      months,
      views: monthlyViews,
      calls: monthlyCalls,
      directions: monthlyDirections,
      website: monthlyWebsite,
      bookings: monthlyBookings,
      interactions: monthlyInteractions,
    },
    last30Days: {
      searchImpressions: l30SearchImpressions,
      mapsImpressions: l30MapsImpressions,
      totalViews: l30SearchImpressions + l30MapsImpressions,
      callClicks: l30CallClicks,
      directionRequests: l30DirectionRequests,
      websiteClicks: l30WebsiteClicks,
      bookings: l30Bookings,
      conversations: l30Conversations,
    },
  };
  PERF_METRICS_CACHE.set(cacheKey, { data: perfResult, expiresAt: Date.now() + CACHE_TTL_MS });
  return perfResult;
}

/**
 * Fetch top search keywords from Google Business Profile Performance API.
 * Returns the exact search queries customers used on Google Search and Maps
 * to discover this business location.
 */
export async function fetchGoogleBusinessSearchKeywords(
  account: SocialAccountData,
): Promise<Array<{ keyword: string; count: number; isThreshold?: boolean }>> {
  try {
    const { locationId } = await extractLocationRef(account);
    const now = new Date();
    // Default to last 3 months
    const endYear = now.getUTCFullYear();
    const endMonth = now.getUTCMonth() + 1;
    let startMonth = endMonth - 3;
    let startYear = endYear;
    if (startMonth <= 0) {
      startMonth += 12;
      startYear -= 1;
    }

    const url = `https://businessprofileperformance.googleapis.com/v1/locations/${encodeURIComponent(locationId)}/searchkeywords:fetchSearchKeywordsTimeSeries?monthlyRange.startMonth.year=${startYear}&monthlyRange.startMonth.month=${startMonth}&monthlyRange.endMonth.year=${endYear}&monthlyRange.endMonth.month=${endMonth}&pageSize=50`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json().catch(() => ({}))) as {
      searchKeywordsCounts?: Array<{
        searchKeyword?: string;
        insightsValue?: { value?: string; threshold?: string };
      }>;
    };

    const counts = data.searchKeywordsCounts || [];
    return counts
      .filter((k) => k.searchKeyword)
      .map((k) => {
        const rawVal = k.insightsValue?.value;
        const rawThresh = k.insightsValue?.threshold;
        const parsedVal = rawVal !== undefined ? parseInt(String(rawVal), 10) : NaN;
        const parsedThresh = rawThresh !== undefined ? parseInt(String(rawThresh), 10) : NaN;
        const isThreshold = Number.isNaN(parsedVal) && !Number.isNaN(parsedThresh);
        const count = !Number.isNaN(parsedVal)
          ? parsedVal
          : !Number.isNaN(parsedThresh)
            ? parsedThresh
            : 1;
        return {
          keyword: String(k.searchKeyword).trim(),
          count,
          ...(isThreshold ? { isThreshold: true } : {}),
        };
      })
      .sort((a, b) => b.count - a.count);
  } catch (err) {
    console.warn('[googlebusiness] Search keywords fetch warning:', err instanceof Error ? err.message : err);
    return [];
  }
}

// Caches to avoid hammering external Google APIs and speed up mobile/web load times
const PLACE_DETAILS_CACHE = new Map<string, { data: any; expiresAt: number }>();
const PERF_METRICS_CACHE = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateGooglePlaceCache(locationIdOrResource?: string) {
  if (!locationIdOrResource) {
    PLACE_DETAILS_CACHE.clear();
    PERF_METRICS_CACHE.clear();
    return;
  }
  for (const key of PLACE_DETAILS_CACHE.keys()) {
    if (key.includes(locationIdOrResource)) PLACE_DETAILS_CACHE.delete(key);
  }
  for (const key of PERF_METRICS_CACHE.keys()) {
    if (key.includes(locationIdOrResource)) PERF_METRICS_CACHE.delete(key);
  }
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
  regularHours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;
}> {
  const { accountName, locationId } = await extractLocationRef(account);
  const meta = (account.metadata || {}) as Record<string, any>;
  const locationResourceName =
    meta.locationName ||
    (accountName.startsWith('accounts/')
      ? `${accountName}/locations/${locationId}`
      : `accounts/${accountName}/locations/${locationId}`);

  const cacheKey = locationResourceName;
  const cached = PLACE_DETAILS_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let title = account.accountName || meta.locationTitle || '';
  let category = meta.category || undefined;
  let address = meta.address || undefined;
  let phone = meta.phone || undefined;
  let website = meta.website || undefined;
  let placeId = meta.placeId || undefined;
  let mapsUri = meta.mapsUri || undefined;
  let regularHours: Record<string, { open: boolean; openTime: string; closeTime: string }> | undefined =
    undefined;

  try {
    const detailUrl = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${locationResourceName}`,
    );
    detailUrl.searchParams.set(
      'readMask',
      'name,title,phoneNumbers,websiteUri,storefrontAddress,categories,metadata,regularHours',
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
      if (detail.phoneNumbers?.primaryPhone) {
        phone = detail.phoneNumbers.primaryPhone;
      } else if (detail.phoneNumbers?.[0]?.phoneNumber) {
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
      const periods = detail.regularHours?.periods;
      if (Array.isArray(periods) && periods.length > 0) {
        const dayMap: Record<string, string> = {
          MONDAY: 'Monday',
          TUESDAY: 'Tuesday',
          WEDNESDAY: 'Wednesday',
          THURSDAY: 'Thursday',
          FRIDAY: 'Friday',
          SATURDAY: 'Saturday',
          SUNDAY: 'Sunday',
        };
        const padClock = (t?: { hours?: number; minutes?: number }) => {
          const hh = String(typeof t?.hours === 'number' ? t.hours : 0).padStart(2, '0');
          const mm = String(typeof t?.minutes === 'number' ? t.minutes : 0).padStart(2, '0');
          return `${hh}:${mm}`;
        };
        const parsedHours: Record<string, { open: boolean; openTime: string; closeTime: string }> = {
          Monday: { open: false, openTime: '09:00', closeTime: '17:00' },
          Tuesday: { open: false, openTime: '09:00', closeTime: '17:00' },
          Wednesday: { open: false, openTime: '09:00', closeTime: '17:00' },
          Thursday: { open: false, openTime: '09:00', closeTime: '17:00' },
          Friday: { open: false, openTime: '09:00', closeTime: '17:00' },
          Saturday: { open: false, openTime: '09:00', closeTime: '17:00' },
          Sunday: { open: false, openTime: '09:00', closeTime: '17:00' },
        };
        for (const p of periods) {
          const key = dayMap[String(p.openDay || '').toUpperCase()];
          if (!key) continue;
          const openTime = padClock(p.openTime);
          let closeTime = padClock(p.closeTime);
          if (p.closeTime?.hours === 24) closeTime = '23:59';
          parsedHours[key] = { open: true, openTime, closeTime };
        }
        regularHours = parsedHours;
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

  const placeResult = { title, category, address, phone, website, placeId, mapsUri, regularHours };
  PLACE_DETAILS_CACHE.set(cacheKey, { data: placeResult, expiresAt: Date.now() + CACHE_TTL_MS });
  return placeResult;
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
export interface GbpProfileUpdateInput {
  description?: string; // max 750 chars per Google policy
  websiteUri?: string;
  additionalCategories?: string[]; // display names or 'categories/gcid:...' / 'gcid:...'
  serviceItems?: Array<{ name: string; description?: string; categoryName?: string }>;
  attributes?: Record<string, boolean | string | string[]>;
  regionCode?: string;
}

export interface GbpProfileUpdateResult {
  descriptionApplied: boolean;
  appliedMasks: string[];
  warnings: string[];
}

async function resolveGoogleCategoryRefs(
  accessToken: string,
  namesOrIds: string[],
  regionCode = 'IN',
): Promise<{ resolved: Array<{ name: string; displayName?: string }>; unmatched: string[] }> {
  const resolved: Array<{ name: string; displayName?: string }> = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const raw of namesOrIds.slice(0, 9)) {
    const clean = String(raw || '').trim();
    if (!clean) continue;

    if (clean.startsWith('categories/gcid:') || clean.startsWith('gcid:')) {
      const resourceName = clean.startsWith('categories/') ? clean : `categories/${clean}`;
      if (!seen.has(resourceName)) {
        seen.add(resourceName);
        resolved.push({ name: resourceName });
      }
      continue;
    }

    try {
      const url = new URL(`${GBP_API_BASE}/categories`);
      url.searchParams.set('regionCode', regionCode);
      url.searchParams.set('languageCode', 'en');
      url.searchParams.set('filter', `displayName=${clean}`);
      url.searchParams.set('readMask', 'name,displayName');
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          categories?: Array<{ name?: string; displayName?: string }>;
        };
        const list = Array.isArray(data.categories) ? data.categories : [];
        const exact =
          list.find((c) => c.displayName?.toLowerCase() === clean.toLowerCase()) || list[0];
        if (exact?.name && !seen.has(exact.name)) {
          seen.add(exact.name);
          resolved.push({ name: exact.name, displayName: exact.displayName });
          continue;
        }
      }
    } catch {
      // ignore lookup timeout, record unmatched
    }
    unmatched.push(clean);
  }

  return { resolved, unmatched };
}

async function fetchLocationPrimaryCategoryResource(
  accessToken: string,
  locationId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${GBP_API_BASE}/locations/${encodeURIComponent(locationId)}?readMask=categories`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as {
      categories?: { primaryCategory?: { name?: string } };
    };
    return data.categories?.primaryCategory?.name || null;
  } catch {
    return null;
  }
}

/**
 * Update live Google Business Profile location fields via Business Information API v1.
 *
 * Uses `locations/{locationId}` (canonical v1 PATCH resource) and isolates optional
 * field groups (description, websiteUri, categories.additionalCategories, serviceItems,
 * attributes) so non-fatal warnings on one field never discard valid updates.
 */
export async function updateGoogleBusinessProfile(
  account: SocialAccountData,
  updates: GbpProfileUpdateInput,
): Promise<GbpProfileUpdateResult> {
  const { locationId } = await extractLocationRef(account);
  const locationPath = `locations/${encodeURIComponent(locationId)}`;
  const appliedMasks: string[] = [];
  const warnings: string[] = [];
  let descriptionApplied = false;

  const patchGroup = async (mask: string, body: Record<string, unknown>, label: string): Promise<boolean> => {
    const res = await fetch(`${GBP_API_BASE}/${locationPath}?updateMask=${encodeURIComponent(mask)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      warnings.push(`${label}: ${errJson.error?.message || `HTTP ${res.status}`}`);
      return false;
    }
    appliedMasks.push(mask);
    return true;
  };

  // 1. Core safe profile fields (description & websiteUri)
  const coreBody: Record<string, unknown> = {};
  const coreMasks: string[] = [];
  if (updates.description !== undefined) {
    coreBody.profile = { description: updates.description.trim().slice(0, 750) };
    coreMasks.push('profile.description');
  }
  if (updates.websiteUri !== undefined && updates.websiteUri.trim()) {
    coreBody.websiteUri = updates.websiteUri.trim();
    coreMasks.push('websiteUri');
  }
  if (coreMasks.length > 0) {
    const res = await fetch(
      `${GBP_API_BASE}/${locationPath}?updateMask=${encodeURIComponent(coreMasks.join(','))}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(coreBody),
        signal: AbortSignal.timeout(15000),
      },
    );
    await assertOk(res, 'update Google Business Profile');
    appliedMasks.push(...coreMasks);
    if (coreMasks.includes('profile.description')) {
      descriptionApplied = true;
    }
  }

  // 2. Additional (secondary) categories — resolved against Google's live category taxonomy
  if (Array.isArray(updates.additionalCategories)) {
    const { resolved, unmatched } = await resolveGoogleCategoryRefs(
      account.accessToken,
      updates.additionalCategories,
      updates.regionCode || 'IN',
    );
    if (unmatched.length > 0) {
      warnings.push(`Skipped unmatched Google categories: ${unmatched.join(', ')}`);
    }
    if (resolved.length > 0 || updates.additionalCategories.length === 0) {
      await patchGroup(
        'categories.additionalCategories',
        {
          categories: {
            additionalCategories: resolved.map((c) => ({ name: c.name })),
          },
        },
        'Secondary categories',
      );
    }
  }

  // 3. Service items with localized 300-500 char descriptions
  if (Array.isArray(updates.serviceItems) && updates.serviceItems.length > 0) {
    const primaryCat = await fetchLocationPrimaryCategoryResource(account.accessToken, locationId);
    const fallbackCategory = primaryCat || 'categories/gcid:local_business';
    const formattedItems = updates.serviceItems
      .filter((s) => s.name && s.name.trim())
      .slice(0, 40)
      .map((s) => ({
        freeFormServiceItem: {
          category: s.categoryName || fallbackCategory,
          label: {
            displayName: s.name.trim().slice(0, 100),
            ...(s.description?.trim() ? { description: s.description.trim().slice(0, 500) } : {}),
            languageCode: 'en',
          },
        },
      }));
    if (formattedItems.length > 0) {
      await patchGroup('serviceItems', { serviceItems: formattedItems }, 'Services catalog');
    }
  }

  // 4. Business attributes (hours/service options/payments)
  if (updates.attributes && Object.keys(updates.attributes).length > 0) {
    const attrEntries = Object.entries(updates.attributes)
      .filter(([key, val]) => key.startsWith('attributes/') || typeof val === 'boolean')
      .slice(0, 20)
      .map(([key, val]) => ({
        name: key.startsWith('attributes/') ? key : `attributes/${key}`,
        valueType: typeof val === 'boolean' ? 'BOOL' : 'ENUM',
        values: [val],
      }));
    if (attrEntries.length > 0) {
      const attrMask = attrEntries.map((a) => a.name).join(',');
      const attrRes = await fetch(
        `${GBP_API_BASE}/${locationPath}/attributes?attributeMask=${encodeURIComponent(attrMask)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ name: `${locationPath}/attributes`, attributes: attrEntries }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (attrRes.ok) {
        appliedMasks.push('attributes');
      } else {
        const errJson = (await attrRes.json().catch(() => ({}))) as { error?: { message?: string } };
        warnings.push(`Attributes: ${errJson.error?.message || `HTTP ${attrRes.status}`}`);
      }
    }
  }

  if (appliedMasks.length > 0) {
    invalidateGooglePlaceCache(locationId);
  }
  return { descriptionApplied, appliedMasks, warnings };
}

const GBP_PLACE_ACTIONS_API_BASE = 'https://mybusinessplaceactions.googleapis.com/v1';

export type GbpPlaceActionType =
  | 'APPOINTMENT'
  | 'ONLINE_ORDERING'
  | 'FOOD_ORDERING'
  | 'SHOP_ONLINE';

export interface GbpPlaceActionLinkItem {
  name: string;
  placeActionType: string;
  uri: string;
}

/**
 * List existing Place Action Links (Booking, Online Ordering, Food Ordering) on Google Business Profile.
 */
export async function listGooglePlaceActions(
  account: SocialAccountData,
): Promise<GbpPlaceActionLinkItem[]> {
  const { locationId } = await extractLocationRef(account);
  const res = await fetch(
    `${GBP_PLACE_ACTIONS_API_BASE}/locations/${encodeURIComponent(locationId)}/placeActionLinks`,
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as {
    placeActionLinks?: Array<{ name?: string; placeActionType?: string; uri?: string }>;
  };
  return (data.placeActionLinks || [])
    .filter((l) => l.name && l.placeActionType && l.uri)
    .map((l) => ({
      name: String(l.name),
      placeActionType: String(l.placeActionType),
      uri: String(l.uri),
    }));
}

/**
 * Create or update a Google Place Action Link (`APPOINTMENT`, `ONLINE_ORDERING`, `FOOD_ORDERING`)
 * so Google Search & Maps show the owner's BGOS Booking / Ordering URL directly on the profile.
 */
export async function upsertGooglePlaceActionLink(
  account: SocialAccountData,
  input: { placeActionType: GbpPlaceActionType; uri: string },
): Promise<{ ok: boolean; linkName?: string; warning?: string }> {
  try {
    const cleanUri = input.uri.trim();
    if (!/^https?:\/\//i.test(cleanUri)) {
      return { ok: false, warning: `Invalid Place Action URL for ${input.placeActionType}` };
    }
    const { locationId } = await extractLocationRef(account);
    const existing = await listGooglePlaceActions(account);
    const match = existing.find((l) => l.placeActionType === input.placeActionType);

    if (match) {
      if (match.uri === cleanUri) {
        return { ok: true, linkName: match.name };
      }
      const res = await fetch(
        `${GBP_PLACE_ACTIONS_API_BASE}/${match.name}?updateMask=uri,placeActionType`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            uri: cleanUri,
            placeActionType: input.placeActionType,
          }),
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        return {
          ok: false,
          warning: `${input.placeActionType}: ${err.error?.message || `HTTP ${res.status}`}`,
        };
      }
      const updated = (await res.json().catch(() => ({}))) as { name?: string };
      return { ok: true, linkName: updated.name || match.name };
    }

    const res = await fetch(
      `${GBP_PLACE_ACTIONS_API_BASE}/locations/${encodeURIComponent(locationId)}/placeActionLinks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          placeActionType: input.placeActionType,
          uri: cleanUri,
          isPreferred: true,
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return {
        ok: false,
        warning: `${input.placeActionType}: ${err.error?.message || `HTTP ${res.status}`}`,
      };
    }
    const created = (await res.json().catch(() => ({}))) as { name?: string };
    return { ok: true, linkName: created.name };
  } catch (err) {
    return {
      ok: false,
      warning: `${input.placeActionType}: ${(err as Error).message || 'Sync failed'}`,
    };
  }
}

// ─── Self-register ─────────────────────────────────────────────────────────

registerAdapter(googleBusinessAdapter);

