import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';
import { logActivity } from '@/lib/activity-log';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

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
 *   6. Redirect back to /dashboard?view=social-accounts&connected=googlebusiness.
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
  let state: { tenantId?: string; userId?: string; csrf?: string; expires?: number };
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
  // CSRF: the cookie set on /connect MUST match the csrf in the state.
  // An attacker can't forge this because they can't set HTTP-only cookies
  // on our origin.
  const cookieCsrf = request.cookies.get('gbp_oauth_csrf')?.value;
  if (!cookieCsrf || cookieCsrf !== state.csrf) {
    return renderErrorPage('CSRF validation failed — please reconnect.');
  }

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
  if (!cred || !cred.clientId || !cred.clientSecret) {
    return renderErrorPage(
      'Platform credentials for Google Business Profile are not configured.',
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    getAppUrlFromRequest(request);
  const redirectUri = cred.redirectUri
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
  try {
    const tokenReq = await fetch(meta.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cred.clientId,
        client_secret: cred.clientSecret,
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
      return renderErrorPage(
        `Google rejected the authorization code (HTTP ${tokenReq.status}). ` +
          `This usually means the code expired or was already used — please reconnect.`,
      );
    }
    tokenResponse = (await tokenReq.json()) as typeof tokenResponse;
  } catch (err) {
    console.error('[oauth/googlebusiness/callback] Token exchange error:', err);
    return renderErrorPage('Network error while exchanging the authorization code.');
  }
  if (!tokenResponse.access_token) {
    return renderErrorPage('Google did not return an access token.');
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
  const scopes = tokenResponse.scope || cred.scopes || meta.scopes;

  // ── 5. List GBP accounts ───────────────────────────────────────────────
  // Account Management API returns the GBP "accounts" the user has access
  // to (one per business group / chain / individual business).
  const accounts = await listGbpAccounts(accessToken);
  if (accounts.length === 0) {
    return renderErrorPage(
      'Your Google account has no Google Business Profile accounts. ' +
        'Create a Business Profile at https://business.google.com first.',
    );
  }

  // ── 6. For each account, list its locations ────────────────────────────
  // We then create one SocialAccount row per location. Locations are the
  // actual publish targets — a single GBP account can manage many locations.
  const createdAccounts: Array<{ accountName: string; locationName: string }> = [];
  let firstError: string | null = null;

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

    for (const location of locations) {
      try {
        await upsertLocationAccount({
          tenantId: state.tenantId!,
          userId: state.userId!,
          accountName: account.name, // "accounts/{id}"
          locationName: location.name, // "accounts/{id}/locations/{locId}"
          locationTitle: location.title,
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
    return renderErrorPage(
      firstError
        ? `No GBP locations were saved. First error: ${firstError}`
        : 'Your GBP accounts have no locations yet — create one at https://business.google.com.',
    );
  }

  // ── 7. Clear the CSRF cookie + redirect to dashboard ───────────────────
  const redirectUrl = new URL(
    '/dashboard?view=social-accounts&connected=googlebusiness',
    appUrl,
  );
  const res = NextResponse.redirect(redirectUrl.toString());
  res.cookies.delete('gbp_oauth_csrf');
  return res;
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
 */
async function listGbpAccounts(
  accessToken: string,
): Promise<Array<{ name: string; accountName: string }>> {
  const res = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `List GBP accounts failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
    );
  }
  const body = (await res.json()) as {
    accounts?: Array<{ name: string; accountName: string }>;
  };
  return Array.isArray(body.accounts) ? body.accounts : [];
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
 */
async function listGbpLocations(
  accessToken: string,
  accountName: string,
): Promise<Array<{ name: string; title: string }>> {
  const url = new URL(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
  );
  url.searchParams.set('readMask', 'name,title');
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `List GBP locations for ${accountName} failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
    );
  }
  const body = (await res.json()) as {
    locations?: Array<{ name: string; title: string }>;
  };
  return Array.isArray(body.locations) ? body.locations : [];
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
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  scopes: string;
}): Promise<void> {
  const locationId = extractLocationId(args.locationName);
  const metadata = JSON.stringify({
    accountName: args.accountName,
    locationId,
    locationName: args.locationName,
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
 * Render a self-contained HTML error page. We use HTML (not JSON) because
 * the OAuth callback is loaded in a top-level browser navigation — the
 * user needs to see a human-readable message, not a JSON payload.
 *
 * The page attempts to postMessage the opener window (if the OAuth flow
 * was launched in a popup) so the SPA can show a toast, then offers a
 * link back to the dashboard.
 */
function renderErrorPage(message: string): NextResponse {
  const safe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return new NextResponse(
    `<!html>
<html><head><title>Connection Failed</title><style>
body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fef2f2; }
.card { text-align: center; padding: 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 480px; }
.icon { width: 64px; height: 64px; margin: 0 auto 1rem; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; }
h1 { color: #991b1b; margin: 0 0 0.5rem; font-size: 1.5rem; }
p { color: #4b5563; margin: 0 0 1.5rem; line-height: 1.5; }
a, button { background: #dc2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
</style></head>
<body>
<div class="card">
  <div class="icon">✗</div>
  <h1>Google Business Profile Connection Failed</h1>
  <p>${safe}</p>
  <a href="/dashboard?view=social-accounts">Back to Dashboard</a>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_error', provider: 'googlebusiness', error: ${JSON.stringify(message)} }, '*');
    setTimeout(() => window.close(), 3000);
  }
</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  );
}
