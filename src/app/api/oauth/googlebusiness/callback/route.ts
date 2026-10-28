import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';
import { logActivity } from '@/lib/activity-log';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

/**
 * CRITICAL: OAuth callback routes MUST be dynamic. Without this, Next.js may
 * cache or prefetch the GET response — and since Google auth codes are
 * SINGLE-USE, a prefetch request consumes the code before the real navigation
 * arrives. This was the root cause of the "invalid_grant: Bad Request" error:
 * the browser prefetched the callback URL, the prefetch consumed the code,
 * then the real navigation got "code already used" from Google.
 *
 * `force-dynamic` tells Next.js to NEVER cache this route + treat every
 * request as unique.
 */
export const dynamic = 'force-dynamic';

// NOTE: The in-memory code-lock (processedCodes Map + isCodeAlreadyProcessed +
// markCodeAsProcessed) was REMOVED because it caused a false-positive
// "duplicate" redirect. The lock marked the code BEFORE the token exchange,
// then when the exchange failed (invalid_grant), the fallback handler found
// the code in the Map and redirected to duplicate=true — even though no
// duplicate request had actually occurred.
//
// force-dynamic + Cache-Control: no-store already prevent the browser
// prefetch/caching that the code-lock was trying to solve. If the token
// exchange fails with invalid_grant AND a SocialAccount already exists,
// we redirect to success (the first exchange worked). Otherwise we show
// the actual Google error.

/**
 * GET /api/oauth/googlebusiness/callback
 *
 * OAuth2 callback for Google Business Profile.
 *
 * Google redirects here with `?code={authCode}&state={state}` after the
 * user consents. We:
 *   1. Validate state (CSRF cookie match + not expired).
 *   2. Exchange the auth code for access_token + refresh_token at Google's
 *      token endpoint.
 *   3. List the user's GBP accounts:
 *        GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
 *   4. For each account, list its locations:
 *        GET https://mybusinessbusinessinformation.googleapis.com/v1/
 *            {accountName}/locations?readMask=name,title
 *   5. Store each location as a SocialAccount row (one row per location —
 *      the publisher publishes to a specific location, not a GBP account).
 *   6. Redirect back to /?view=verification&google=connected.
 *
 * The SocialAccount stores:
 *   - platform: 'googlebusiness'
 *   - accountId: the locationId (last segment of the location's `name`)
 *   - accountName: the location's `title` (human-readable)
 *   - accessToken / refreshToken: encrypted at rest
 *   - tokenExpiry: now + expires_in (Google = 3600s)
 *   - metadata: { accountName, locationId, locationName }
 *     (accountName = "accounts/{id}", the GBP-account resource name)
 *
 * AUTH MODEL: We do NOT call getAuthUser() here. The OAuth round-trip
 * starts from an authenticated session, but Google's redirect back to
 * this callback may arrive without cookies in some browsers (Safari
 * ITP, third-party-cookie-blocked popups). The state blob is the source
 * of truth for tenantId + userId — we trust it ONLY because:
 *   - It's base64url JSON, not a JWT — but the csrf-cookie check proves
 *     it was minted by our connect route.
 *   - The csrf cookie is HTTP-only + same-site=lax, so it survives the
 *     top-level Google→callback redirect.
 */
export async function GET(request: NextRequest) {
  // Top-level catch — any unhandled error in the callback MUST be caught
  // and shown as an error page. If the callback crashes with HTTP 500,
  // the Google auth code is consumed but the user sees a blank error page
  // (or the SW intercepts the 500 response). This catch ensures the user
  // always sees a meaningful error message.
  try {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // ── 1. Handle Google-side error (user denied consent, etc.) ────────────
  if (errorParam) {
    return renderErrorPage(`Google denied authorization: ${errorParam}`);
  }
  if (!code || !stateParam) {
    return renderErrorPage('Missing authorization code or state parameter.');
  }

  // ── 2. Validate state ──────────────────────────────────────────────────
  let state: {
    tenantId?: string;
    userId?: string;
    csrf?: string;
    expires?: number;
    sig?: string;
    originHost?: string;
    returnProduct?: string | null;
    returnView?: string | null;
    context?: string; // 'SETTINGS_VERIFICATION' | 'CLAIM_BUSINESS'
    claimTenantId?: string | null;
    userTenantId?: string;
  };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return renderErrorPage('Invalid state parameter — could not decode.');
  }
  if (!state.tenantId || !state.userId || !state.csrf || !state.expires) {
    return renderErrorPage('Invalid state — missing required fields.');
  }
  if (Date.now() > state.expires) {
    return renderErrorPage(
      'Authorization timed out — please reconnect from the dashboard.',
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    getAppUrlFromRequest(request);

  // Subdomain & product preservation (e.g. https://bgos.fieseros.com)
  const originBase = state.originHost && isAllowedOriginHost(state.originHost)
    ? state.originHost.replace(/\/+$/, '')
    : appUrl;

  const productParam = state.returnProduct
    ? `&product=${encodeURIComponent(state.returnProduct)}`
    : originBase.includes('bgos.')
    ? '&product=bgos'
    : '';

  const viewParam =
    state.returnView ||
    (originBase.includes('bgos.') ? 'socialMedia' : 'verification');

  const backUrl = `${originBase}/?view=${viewParam}${productParam}`;
  const retryUrl = `${appUrl}/api/oauth/googlebusiness/connect?originHost=${encodeURIComponent(originBase)}&returnView=${viewParam}${productParam}`;

  // CSRF validation:
  // 1. Primary defense: Cookie match against state.csrf
  // 2. Cryptographic defense: HMAC signature verification (prevents false failures when
  //    mobile/desktop browsers drop cookies during cross-site OAuth redirects)
  const cookieCsrf = request.cookies.get('gbp_oauth_csrf')?.value;
  const cookieMatches = !!(cookieCsrf && cookieCsrf === state.csrf);

  let sigMatches = false;
  if (state.sig && state.tenantId && state.userId && state.csrf && state.expires) {
    try {
      const signingSecret =
        process.env.JWT_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.CRON_SECRET ||
        'gbp-oauth-secret';
      const sigPayload = `${state.tenantId}:${state.userId}:${state.csrf}:${state.expires}`;
      const expectedSig = createHmac('sha256', signingSecret).update(sigPayload).digest('hex');
      sigMatches =
        state.sig.length === expectedSig.length &&
        timingSafeEqual(Buffer.from(state.sig), Buffer.from(expectedSig));
    } catch {
      sigMatches = false;
    }
  }

  if (!cookieMatches && !sigMatches) {
    return renderErrorPage('CSRF validation failed — please reconnect.', retryUrl, backUrl);
  }

  // NOTE: The code-lock (isCodeAlreadyProcessed / markCodeAsProcessed) was
  // REMOVED because it caused a false-positive "duplicate" redirect. The
  // lock marked the code BEFORE the token exchange, then when the exchange
  // failed (invalid_grant), the fallback handler found the code in the Map
  // and redirected to duplicate=true — even though no duplicate request
  // had actually occurred. force-dynamic + Cache-Control: no-store already
  // prevent browser prefetch/caching, which was the original problem the
  // code-lock was trying to solve.

  // ── 3. Look up Google OAuth app credentials ────────────────────────────
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'googlebusiness', status: 'active' },
    select: {
      clientId: true,
      clientSecret: true,
      redirectUri: true,
      scopes: true,
    },
  });

  const clientId = cred?.clientId || process.env.GOOGLE_BUSINESS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = cred?.clientSecret || process.env.GOOGLE_BUSINESS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return renderErrorPage(
      'Platform credentials for Google Business Profile are not configured in DB or environment variables.',
      null,
      backUrl,
    );
  }

  const redirectUri = cred?.redirectUri
    ? cred.redirectUri
    : `${appUrl}/api/oauth/googlebusiness/callback`;

  // ── 4. Exchange auth code for tokens ───────────────────────────────────
  const meta = OAUTH_PROVIDERS.googlebusiness;
  let tokenResponse: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  // Log the exact redirect_uri being sent so we can verify it matches the
  // Google Cloud Console → Authorized redirect URIs config. This is the #1
  // cause of "redirect_uri_mismatch" errors.
  console.log('[oauth/googlebusiness/callback] Token exchange:', {
    codePreview: code.slice(0, 12) + '...',
    redirectUri,
    tokenUrl: meta.tokenUrl,
  });

  try {
    const tokenReq = await fetch(meta.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenReq.ok) {
      const errText = await tokenReq.text();
      console.error(
        '[oauth/googlebusiness/callback] Token exchange failed:',
        tokenReq.status,
        errText,
      );

      // ── Fix 1: Parse Google's actual error so we can show the real reason ──
      // Google returns JSON like:
      //   {"error":"invalid_grant","error_description":"Bad Request"}
      //   {"error":"redirect_uri_mismatch","error_description":"..."}
      //   {"error":"invalid_client","error_description":"..."}
      let googleError = errText;
      let errorCode = '';
      try {
        const errJson = JSON.parse(errText);
        errorCode = errJson.error || '';
        googleError = errJson.error_description || errJson.error || errText;
      } catch {
        // not JSON — keep the raw text
      }

      // ── Handle "code already used" gracefully ──
      // Google auth codes are single-use. If the user refreshed the callback
      // page or the browser auto-retried, the code was already consumed by
      // the first request. Check if a SocialAccount was already created from
      // a previous successful exchange — if so, redirect to the verification
      // dashboard with success instead of showing an error.
      //
      // NOTE: The code-lock (isCodeAlreadyProcessed) check was REMOVED here
      // because it created a false positive: markCodeAsProcessed ran before
      // the exchange, so the fallback always found the code in the Map →
      // always redirected to duplicate=true. Now we ONLY check if a
      // SocialAccount exists (the real indicator that a prior exchange
      // succeeded).
      if (errorCode === 'invalid_grant' && state.tenantId) {
        try {
          const existingAccount = await db.socialAccount.findFirst({
            where: {
              tenantId: state.tenantId,
              platform: 'googlebusiness',
              isActive: true,
            },
            select: { id: true, accountName: true },
          });
          if (existingAccount) {
            // The first exchange worked — this is just a duplicate retry.
            // Redirect to the dashboard with success on the originating domain.
            console.log('[oauth/googlebusiness/callback] Code already used but SocialAccount exists — redirecting to success');
            const redirectUrl = new URL(
              `/?view=${viewParam}&google=connected${productParam}`,
              originBase,
            );
            const res = NextResponse.redirect(redirectUrl.toString());
            res.cookies.delete('gbp_oauth_csrf');
            res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res;
          }
        } catch (checkErr) {
          // Non-blocking — fall through to the error page.
          console.warn('[oauth/googlebusiness/callback] Could not check existing SocialAccount:', checkErr);
        }
      }

      // ── Build a helpful, specific error message ──
      let helpfulMessage: string;
      if (errorCode === 'redirect_uri_mismatch') {
        helpfulMessage =
          `Google rejected the connection: redirect_uri_mismatch.\n\n` +
          `The redirect URI we sent was:\n  ${redirectUri}\n\n` +
          `This must EXACTLY match an entry in Google Cloud Console → APIs & Credentials → ` +
          `OAuth 2.0 Client ID → Authorized redirect URIs. Contact support to fix the config.`;
      } else if (errorCode === 'invalid_grant') {
        helpfulMessage =
          `Google rejected the authorization code: ${googleError}.\n\n` +
          `This usually means the code was already used (e.g. you refreshed the page) or expired. ` +
          `Click "Try again" below to start a fresh connection.`;
      } else if (errorCode === 'invalid_client') {
        helpfulMessage =
          `Google rejected the OAuth client credentials: ${googleError}.\n\n` +
          `The GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET may be wrong or the project may be paused. ` +
          `Contact support to fix the config.`;
      } else {
        helpfulMessage =
          `Google rejected the authorization (HTTP ${tokenReq.status}): ${googleError}.\n\n` +
          `Click "Try again" below to start a fresh connection.`;
      }
      return renderErrorPage(helpfulMessage, retryUrl, backUrl);
    }
    tokenResponse = (await tokenReq.json()) as typeof tokenResponse;
  } catch (err) {
    console.error('[oauth/googlebusiness/callback] Token exchange error:', err);
    return renderErrorPage(
      'Network error while exchanging the authorization code. Click "Try again" below.',
      retryUrl,
      backUrl,
    );
  }
  if (!tokenResponse.access_token) {
    return renderErrorPage('Google did not return an access token.', retryUrl, backUrl);
  }
  // `refresh_token` is only returned the FIRST time the user consents
  // (or when prompt=consent forces re-issue). If it's missing, the user
  // previously connected and we'll keep using the stored refresh_token.
  // We handle the missing case below when upserting.
  const accessToken = tokenResponse.access_token;
  const refreshToken = tokenResponse.refresh_token || null;
  const tokenExpiry = tokenResponse.expires_in
    ? new Date(Date.now() + tokenResponse.expires_in * 1000)
    : null;
  const scopes = tokenResponse.scope || cred?.scopes || meta.scopes;

  // ── 5. List GBP accounts ───────────────────────────────────────────────
  // Account Management API returns the GBP "accounts" the user has access
  // to (one per business group / chain / individual business).
  //
  // CRITICAL: This call can FAIL with 403 if the Google Business Profile API
  // is not enabled for this OAuth client, or if the user's Google account
  // doesn't have GBP access. We MUST catch this error and show a proper error
  // page — otherwise the callback crashes with HTTP 500 (which consumes the
  // auth code but doesn't show the user what went wrong).
  let accounts: Array<{ name: string; accountName: string }> = [];
  const createdAccounts: Array<{ accountName: string; locationName: string }> = [];
  let firstError: string | null = null;
  let quotaPendingApproval = false;
  const allFoundLocationNames: string[] = [];

  try {
    accounts = await listGbpAccounts(accessToken);
  } catch (apiErr) {
    console.warn('[oauth/googlebusiness/callback] listGbpAccounts error:', apiErr);
    const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
    const isQuotaError = errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('rate limit');

    if (isQuotaError && state.tenantId && state.userId) {
      // Google Cloud projects start with 0 QPM for GBP until manual Google form approval.
      // Since the user has genuinely authenticated with Google OAuth and granted business.manage scope,
      // save the verified Google connection for the tenant so they are not blocked by Google's API queue.
      //
      // IMPORTANT (honesty): this is a PENDING connection, not a working one — Google
      // hasn't listed the real accounts/locations yet, so publishes/reviews/insights
      // will fail until the API access request is approved. We mark the account with
      // pendingApiApproval so the UI can label it truthfully.
      try {
        const tenant = await db.tenant.findUnique({
          where: { id: state.tenantId },
          select: { id: true, name: true },
        });
        const businessTitle = tenant?.name || 'Google Business Profile';
        await upsertLocationAccount({
          tenantId: state.tenantId,
          userId: state.userId,
          accountName: 'accounts/primary',
          locationName: 'locations/primary',
          locationTitle: businessTitle,
          accessToken,
          refreshToken,
          tokenExpiry,
          scopes,
          pendingApiApproval: true,
        });
        createdAccounts.push({
          accountName: 'accounts/primary',
          locationName: businessTitle,
        });
        quotaPendingApproval = true;
      } catch (saveErr) {
        console.error('[oauth/googlebusiness/callback] Fallback account upsert failed:', saveErr);
        firstError = saveErr instanceof Error ? saveErr.message : String(saveErr);
      }
    } else {
      return renderErrorPage(
        `We connected to your Google account but couldn't access your Google Business Profile accounts.\n\n` +
        `This usually means the Google Business Profile API is not enabled for this OAuth client, ` +
        `or your Google account doesn't have Business Profile access.\n\n` +
        `Error: ${errMsg}\n\n` +
        `Click "Try again" to reconnect, or contact support if the problem persists.`,
        retryUrl,
        backUrl,
      );
    }
  }

  if (createdAccounts.length === 0 && accounts.length === 0) {
    return renderErrorPage(
      `Your Google account doesn't own any Google Business Profile accounts.\n\n` +
      `To use Fieseros marketplace verification, you need to:\n` +
      `1. Create a Business Profile at https://business.google.com\n` +
      `2. Verify it with Google (postcard/phone/email)\n` +
      `3. Come back here and click "Try again" to connect it.\n\n` +
      `Make sure you sign in with the Google account that OWNS the Business Profile for your business.`,
      retryUrl,
      backUrl,
    );
  }

  // ── 6. For each account, list its locations ────────────────────────────
  // We then create one SocialAccount row per location. Locations are the
  // actual publish targets — a single GBP account can manage many locations.

  for (const account of accounts) {
    let locations: Array<{ name: string; title: string }>;
    try {
      locations = await listGbpLocations(accessToken, account.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[oauth/googlebusiness/callback] Could not list locations for ${account.name}:`,
        msg,
      );
      if (!firstError) firstError = `Could not list locations for ${account.name}: ${msg}`;
      continue;
    }

    // NOTE: listGbpAdmins was REMOVED from the OAuth callback to reduce API
    // calls (was causing 429 rate limit). The admin role is NOT needed during
    // the initial OAuth connection — it can be fetched later during the
    // verification step (google-business-service.ts) if needed.

    for (const location of locations) {
      allFoundLocationNames.push(location.title || location.name);
      try {
        await upsertLocationAccount({
          tenantId: state.tenantId!,
          userId: state.userId!,
          accountName: account.name, // "accounts/{id}"
          locationName: location.name, // "accounts/{id}/locations/{locId}"
          locationTitle: location.title,
          category: location.category,
          placeId: location.placeId,
          mapsUri: location.mapsUri,
          address: location.address,
          phone: location.phone,
          website: location.website,
          accessToken,
          refreshToken,
          tokenExpiry,
          scopes,
        });
        createdAccounts.push({
          accountName: account.name,
          locationName: location.title || location.name,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[oauth/googlebusiness/callback] Failed to upsert SocialAccount for ${location.name}:`,
          msg,
        );
        if (!firstError) firstError = msg;
      }
    }
  }

  if (createdAccounts.length === 0) {
    if (firstError) {
      // Locations were found but couldn't be saved (DB error, etc.)
      return renderErrorPage(
        `We found your Google Business Profile but couldn't save the connection.\n\n` +
        `Error: ${firstError}\n\n` +
        `Click "Try again" below. If the problem persists, contact support.`,
        retryUrl,
        backUrl,
      );
    }
    // The user owns GBP accounts but none have locations yet.
    const foundAccountsList = accounts
      .map((a) => `  • ${a.accountName || a.name}`)
      .join('\n');
    return renderErrorPage(
      `Your Google account owns Google Business Profile account(s):\n${foundAccountsList}\n\n` +
      `But none of them have any locations yet. A "location" is the actual business listing ` +
      `(e.g. "Joe's Plumbing — Downtown").\n\n` +
      `To fix this:\n` +
      `1. Go to https://business.google.com\n` +
      `2. Open your Business Profile\n` +
      `3. Add a location (your business name + address)\n` +
      `4. Come back here and click "Try again" to connect it.`,
      retryUrl,
      backUrl,
    );
  }

  // ── 7. Clear the CSRF cookie + redirect to dashboard ───────────────────
  // Redirect back to the originating host (e.g. https://bgos.fieseros.com)
  // so the user stays on their specific product workspace (BGOS, BOS, etc.)
  const claimContext = state.context === 'CLAIM_BUSINESS' && state.claimTenantId
    ? `&claimTenantId=${state.claimTenantId}`
    : '';

  const redirectUrl = new URL(
    `/?view=${viewParam}&google=connected${productParam}${claimContext}`,
    originBase,
  );
  // CRITICAL: Return an HTML page with a JavaScript redirect instead of a
  // NextResponse.redirect(). A 307 redirect is intercepted by the Service
  // Worker (which treats it as a navigation request). The SW's fetch handler
  // runs the callback (consuming the Google auth code), receives the 307,
  // then FAILS to follow the redirect (returning an "offline" error).
  // The user then refreshes → the code is already consumed → "Bad Request".
  //
  // An HTML page with window.location.replace() does a REPLACE navigation
  // that the SW can't intercept (it replaces the current document, not
  // triggering a new fetch event). This breaks the SW interception cycle.
  const safeUrl = redirectUrl.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
  const successHeadline = quotaPendingApproval
    ? '✓ Google connected — pending Google API approval'
    : '✓ Google Business Profile connected!';
  const successDetail = quotaPendingApproval
    ? 'Google granted access, but listing your locations is queued behind Google\'s API access approval (0 QPM quota). Publishing/reviews stay paused until approval — you\'ll see honest empty states until then.'
    : 'Redirecting';
  const res = new NextResponse(
    `<!html>
<html><head><title>Redirecting...</title>
<meta http-equiv="refresh" content="0; url=${safeUrl}">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:${quotaPendingApproval ? '#fffbeb' : '#f0fdf4'}}</style>
</head>
<body>
<div style="text-align:center;max-width:520px;padding:24px">
<p style="color:${quotaPendingApproval ? '#b45309' : '#16a34a'};font-size:18px;font-weight:600">${successHeadline}</p>
<p style="color:#6b7280;font-size:13px">${successDetail}</p>
</div>
<script>window.location.replace("${(() => {
      if (!quotaPendingApproval) return redirectUrl.toString();
      const u = new URL(redirectUrl.toString());
      u.searchParams.set('gbpPending', '1');
      return u.toString();
    })()}");</script>
</body></html>`,
    {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
  res.cookies.delete('gbp_oauth_csrf');
  return res;
  } catch (topErr) {
    // Top-level catch — any unhandled error in the callback.
    // This prevents HTTP 500 (which consumes the auth code silently).
    console.error('[oauth/googlebusiness/callback] FATAL unhandled error:', topErr);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      getAppUrlFromRequest(request);
    let catchBackUrl: string | null = null;
    let catchRetryUrl = `${appUrl}/api/oauth/googlebusiness/connect`;
    try {
      const sp = request.nextUrl.searchParams.get('state');
      if (sp) {
        const parsed = JSON.parse(Buffer.from(sp, 'base64url').toString());
        if (parsed.originHost && isAllowedOriginHost(parsed.originHost)) {
          const origin = parsed.originHost.replace(/\/+$/, '');
          const view = parsed.returnView || (origin.includes('bgos.') ? 'socialMedia' : 'verification');
          const prod = parsed.returnProduct ? `&product=${encodeURIComponent(parsed.returnProduct)}` : '';
          catchBackUrl = `${origin}/?view=${view}${prod}`;
          catchRetryUrl = `${appUrl}/api/oauth/googlebusiness/connect?originHost=${encodeURIComponent(origin)}&returnView=${view}${prod}`;
        }
      }
    } catch {}
    return renderErrorPage(
      `An unexpected error occurred during the Google Business Profile connection.\n\n` +
      `Error: ${topErr instanceof Error ? topErr.message : String(topErr)}\n\n` +
      `Click "Try again" to start a fresh connection.`,
      catchRetryUrl,
      catchBackUrl,
    );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * List the GBP accounts the user has access to.
 *
 *   GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts
 *
 * Returns an array of { name: "accounts/123", accountName: "...", ... }.
 * The `name` field is the account's resource name — used as the parent
 * path for listing locations.
 *
 * Includes retry with exponential backoff for 429 (rate limit) errors.
 * The Google Business Profile API has a strict per-minute quota — if the
 * user tried multiple OAuth attempts, the quota may be exhausted.
 */
async function listGbpAccounts(
  accessToken: string,
): Promise<Array<{ name: string; accountName: string }>> {
  return fetchWithRetry(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    accessToken,
    'List GBP accounts',
  ).then(async (res) => {
    const body = (await res.json()) as {
      accounts?: Array<{ name: string; accountName: string }>;
    };
    return Array.isArray(body.accounts) ? body.accounts : [];
  });
}

/**
 * List the locations under a GBP account.
 *
 *   GET https://mybusinessbusinessinformation.googleapis.com/v1/
 *       {accountName}/locations?readMask=name,title
 *
 * `readMask` is REQUIRED by the Business Information API — without it
 * the API returns a 400. We only need `name` (resource path) + `title`
 * (human-readable name).
 *
 * Includes retry with exponential backoff for 429 (rate limit) errors.
 */
async function listGbpLocations(
  accessToken: string,
  accountName: string,
): Promise<
  Array<{
    name: string;
    title: string;
    category?: string;
    placeId?: string;
    mapsUri?: string;
    address?: string;
    phone?: string;
    website?: string;
  }>
> {
  const url = new URL(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
  );
  url.searchParams.set(
    'readMask',
    'name,title,storefrontAddress,categories,metadata,websiteUri,phoneNumbers',
  );
  return fetchWithRetry(
    url.toString(),
    accessToken,
    `List GBP locations for ${accountName}`,
  ).then(async (res) => {
    const body = (await res.json()) as {
      locations?: Array<{
        name?: string;
        title?: string;
        categories?: { primaryCategory?: { displayName?: string } };
        metadata?: { placeId?: string; mapsUri?: string };
        storefrontAddress?: {
          addressLines?: string[];
          locality?: string;
          administrativeArea?: string;
          postalCode?: string;
          country?: string;
        };
        websiteUri?: string;
        phoneNumbers?: Array<{ phoneNumber?: string }>;
      }>;
    };
    return (body.locations || []).map((l) => {
      const parts: string[] = [];
      if (l.storefrontAddress?.addressLines) parts.push(...l.storefrontAddress.addressLines);
      if (l.storefrontAddress?.locality) parts.push(l.storefrontAddress.locality);
      if (l.storefrontAddress?.administrativeArea) parts.push(l.storefrontAddress.administrativeArea);
      if (l.storefrontAddress?.postalCode) parts.push(l.storefrontAddress.postalCode);
      if (l.storefrontAddress?.country) parts.push(l.storefrontAddress.country);

      return {
        name: l.name || '',
        title: l.title || '',
        category: l.categories?.primaryCategory?.displayName,
        placeId: l.metadata?.placeId,
        mapsUri: l.metadata?.mapsUri,
        address: parts.length > 0 ? parts.join(', ') : undefined,
        phone: l.phoneNumbers?.[0]?.phoneNumber,
        website: l.websiteUri,
      };
    });
  });
}

/**
 * Fetch helper with retry + exponential backoff for 429 (rate limit) errors.
 *
 * Google's Business Profile API has a strict per-minute quota. If the user
 * tried multiple OAuth attempts, the quota may be exhausted. This helper:
 *   1. Makes the fetch request
 *   2. If 429: waits 2s, then 4s, then 8s (3 retries max)
 *   3. If still 429 after 3 retries: throws a user-friendly error
 *   4. If any other non-ok status: throws immediately (no retry)
 *   5. If ok: returns the response
 */
async function fetchWithRetry(
  url: string,
  accessToken: string,
  label: string,
  maxRetries = 3,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      return res;
    }

    // If 429 (rate limit):
    if (res.status === 429) {
      const text = await res.text().catch(() => '');
      const isHardZeroQuota =
        text.includes("limit 'Requests per minute'") ||
        text.includes('Quota exceeded');

      if (isHardZeroQuota || attempt >= maxRetries) {
        throw new Error(
          `Google's Business Profile API rate limit exceeded. Please wait 1 minute and try again. ` +
            `(Last response: ${text.slice(0, 200)})`,
        );
      }

      const backoffMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
      console.warn(
        `[oauth/googlebusiness/callback] ${label} got 429 (attempt ${attempt + 1}/${maxRetries}). ` +
          `Waiting ${backoffMs}ms before retry...`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }

    // Non-429 error → throw immediately
    const text = await res.text().catch(() => '');
    throw new Error(`${label} failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  throw lastError || new Error(`${label} failed after ${maxRetries} retries`);
}

/**
 * List the admins (managers/owners) for a GBP account.
 *
 *   GET https://mybusinessaccountmanagement.googleapis.com/v1/{accountName}/admins
 *
 * Returns an array of { name, adminName, role, pendingAdmin }.
 * `role` is one of: "PRIMARY_OWNER", "OWNER", "CO_OWNER", "MANAGER", "SITE_MANAGER".
 * `adminName` is the email of the admin.
 *
 * Phase 3: We use this to capture the user's access role for each GBP account.
 * The role is stored in the SocialAccount metadata + used by the verification
 * service to determine verification strength (OWNER/CO_OWNER = strong, MANAGER = medium).
 */
async function listGbpAdmins(
  accessToken: string,
  accountName: string,
): Promise<Array<{ adminName: string; role: string }>> {
  try {
    const res = await fetch(
      `https://mybusinessaccountmanagement.googleapis.com/v1/${accountName}/admins`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );
    if (!res.ok) {
      // Non-fatal — we can't always fetch admins (depends on permissions).
      // The match will proceed without the role; the verification service
      // treats a missing role as "unknown" (doesn't block verification).
      console.warn(`[oauth/googlebusiness/callback] Could not list admins for ${accountName} (HTTP ${res.status})`);
      return [];
    }
    const body = (await res.json()) as {
      admins?: Array<{ adminName: string; role: string }>;
    };
    return Array.isArray(body.admins) ? body.admins : [];
  } catch (err) {
    console.warn(`[oauth/googlebusiness/callback] listGbpAdmins failed for ${accountName}:`, err);
    return [];
  }
}

/**
 * Extract the locationId (last path segment) from the location's full
 * resource name.
 *
 *   "accounts/123/locations/456" → "456"
 */
function extractLocationId(locationName: string): string {
  const parts = locationName.split('/');
  return parts[parts.length - 1] || locationName;
}

/**
 * Upsert a SocialAccount row for a GBP location.
 *
 * - If a row already exists for (tenantId, platform='googlebusiness',
 *   accountId=locationId), update its tokens + re-activate it.
 * - Otherwise, create a new row.
 *
 * IMPORTANT: when refreshing an existing connection, Google typically
 * does NOT return a new refresh_token. In that case we keep the existing
 * refresh_token in the DB (don't overwrite with null).
 */
async function upsertLocationAccount(args: {
  tenantId: string;
  userId: string;
  accountName: string; // GBP account resource name "accounts/123"
  locationName: string; // GBP location resource name "accounts/123/locations/456"
  locationTitle: string; // human-readable location title
  category?: string;
  placeId?: string;
  mapsUri?: string;
  address?: string;
  phone?: string;
  website?: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  scopes: string;
  // Phase 3: admin list for this account (to capture the user's access role)
  admins?: Array<{ adminName: string; role: string }>;
  // Truthfulness flag: when Google's GBP API has 0 QPM (pending Google approval),
  // the stored location is a placeholder until Google approves API access.
  pendingApiApproval?: boolean;
}): Promise<void> {
  const locationId = extractLocationId(args.locationName);

  // Phase 3: Determine the user's access role from the admin list.
  const adminRoles = (args.admins || []).map((a) => a.role);
  let accessRole = 'UNKNOWN';
  if (adminRoles.includes('PRIMARY_OWNER')) accessRole = 'PRIMARY_OWNER';
  else if (adminRoles.includes('OWNER')) accessRole = 'OWNER';
  else if (adminRoles.includes('CO_OWNER')) accessRole = 'CO_OWNER';
  else if (adminRoles.includes('MANAGER')) accessRole = 'MANAGER';
  else if (adminRoles.includes('SITE_MANAGER')) accessRole = 'SITE_MANAGER';

  const metadata = JSON.stringify({
    accountName: args.accountName,
    locationId,
    locationName: args.locationName,
    locationTitle: args.locationTitle,
    category: args.category,
    placeId: args.placeId,
    mapsUri:
      args.mapsUri ||
      (args.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${args.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(args.locationTitle)}`),
    address: args.address,
    phone: args.phone,
    website: args.website,
    // Phase 3: store the access role + admin list for later verification
    accessRole,
    admins: args.admins || [],
    // Honesty: pending connections have a placeholder location until Google approves
    // the Business Profile API access request for this OAuth client.
    pendingApiApproval: Boolean(args.pendingApiApproval),
    pendingApiApprovalAt: args.pendingApiApproval ? new Date().toISOString() : undefined,
  });
  const encryptedAccess = encryptToken(args.accessToken);
  // If Google returned a new refresh_token (prompt=consent forced it),
  // use it. Otherwise fall back to the existing one in the DB (read it
  // first, then keep it).
  let encryptedRefresh: string | null = null;
  if (args.refreshToken) {
    encryptedRefresh = encryptToken(args.refreshToken);
  } else {
    const existing = await db.socialAccount.findFirst({
      where: {
        tenantId: args.tenantId,
        platform: 'googlebusiness',
        accountId: locationId,
      },
      select: { refreshToken: true },
    });
    encryptedRefresh = existing?.refreshToken || null;
  }

  const accountNameDisplay = args.locationTitle || args.locationName;

  const account = await db.socialAccount.upsert({
    where: {
      tenantId_platform_accountId: {
        tenantId: args.tenantId,
        platform: 'googlebusiness',
        accountId: locationId,
      },
    },
    create: {
      tenantId: args.tenantId,
      platform: 'googlebusiness',
      accountId: locationId,
      accountName: accountNameDisplay,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry: args.tokenExpiry,
      scopes: args.scopes,
      metadata,
      connectedById: args.userId,
      isActive: true,
    },
    update: {
      accountName: accountNameDisplay,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry: args.tokenExpiry,
      scopes: args.scopes,
      metadata,
      connectedById: args.userId,
      isActive: true,
    },
    select: { id: true, accountName: true },
  });

  // Audit log (best-effort, never throws).
  await logActivity({
    tenantId: args.tenantId,
    actorId: args.userId,
    actorType: 'user',
    action: 'create',
    entityType: 'social_account',
    entityId: account.id,
    entityName: `googlebusiness:${account.accountName}`,
    description: `Connected Google Business Profile location "${account.accountName}".`,
    severity: 'info',
  }).catch(() => {});
}

/**
 * Derive the app URL from the incoming request headers (used when
 * NEXT_PUBLIC_APP_URL is unset).
 */
function getAppUrlFromRequest(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  if (host) {
    const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

/**
 * Validate that an originHost is on an allowed domain (*.fieseros.com,
 * canonical app URL, or localhost).
 */
function isAllowedOriginHost(uriOrHost: string): boolean {
  try {
    const url = uriOrHost.startsWith('http://') || uriOrHost.startsWith('https://')
      ? new URL(uriOrHost)
      : new URL(`https://${uriOrHost}`);
    const canonicalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
    const canonicalHost = new URL(canonicalUrl).host;
    if (url.host === canonicalHost) return true;
    if (url.host === 'fieseros.com' || url.host.endsWith('.fieseros.com')) return true;
    if (url.host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(url.host)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Render a self-contained HTML error page. We use HTML (not JSON) because
 * the OAuth callback is loaded in a top-level browser navigation — the
 * user needs to see a human-readable message, not a JSON payload.
 *
 * The page attempts to postMessage the opener window (if the OAuth flow
 * was launched in a popup) so the SPA can show a toast, then offers a
 * link back to the dashboard AND a "Try again" button that restarts the
 * OAuth flow (new code, new state, new CSRF token).
 *
 * @param message — the human-readable error message (will be HTML-escaped)
 * @param retryUrl — optional URL to restart the OAuth flow. If provided, a
 *   "Try again" button is shown. If null, only the "Back to Dashboard" link.
 * @param backUrl — optional URL for "Back to Dashboard" button (preserves bgos.fieseros.com).
 */
function renderErrorPage(
  message: string,
  retryUrl: string | null = null,
  backUrl: string | null = null,
): NextResponse {
  const safe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const retryButton = retryUrl
    ? `<a href="${retryUrl}" style="background: #4f46e5; margin-right: 0.75rem;">Try again</a>`
    : '';
  const returnLink = backUrl || '/?view=verification';
  return new NextResponse(
    `<!html>
<html><head><title>Connection Failed</title><style>
body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fef2f2; }
.card { text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 540px; }
.icon { width: 64px; height: 64px; margin: 0 auto 1rem; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; }
h1 { color: #991b1b; margin: 0 0 0.5rem; font-size: 1.5rem; }
p { color: #4b5563; margin: 0 0 1.5rem; line-height: 1.5; text-align: left; }
a, button { background: #dc2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
.hint { margin-top: 1.5rem; padding: 0.75rem; background: #f3f4f6; border-radius: 6px; font-size: 0.85rem; color: #6b7280; text-align: left; }
</style></head>
<body>
<div class="card">
  <div class="icon">✗</div>
  <h1>Google Business Profile Connection Failed</h1>
  <p>${safe}</p>
  <div style="margin-top: 1.5rem;">
    ${retryButton}
    <a href="${returnLink}">Back to Dashboard</a>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth_error', provider: 'googlebusiness', error: ${JSON.stringify(message)} }, '*');
      setTimeout(() => window.close(), 3000);
    }
  </script>
</body></html>`,
    {
      headers: {
        'Content-Type': 'text/html',
        // no-store prevents browsers/CDNs from caching this error page —
        // important because the URL contains the (now-used) auth code.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
