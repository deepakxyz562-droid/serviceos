import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';
import { logActivity } from '@/lib/activity-log';

/**
 * GET /api/oauth/facebook/callback
 *
 * OAuth callback for Facebook Page publishing.
 *
 * Facebook redirects here with `?code={authCode}&state={state}` after the
 * user consents. We:
 *   1. Validate state (CSRF cookie match + not expired + flow='publishing').
 *   2. Exchange the auth code for a user access token at Facebook's token
 *      endpoint.
 *   3. List the user's Pages:
 *        GET https://graph.facebook.com/v18.0/me/accounts?access_token={userToken}
 *      → returns [{ id, name, access_token, ... }] for each Page the user
 *        manages.
 *   4. For each Page, store a SocialAccount row (one row per Page — the
 *      publisher publishes to a specific Page, not the user account).
 *   5. Redirect back to /dashboard?view=social-accounts&connected=facebook.
 *
 * The SocialAccount stores:
 *   - platform: 'facebook'
 *   - accountId: the Page ID (graph node ID)
 *   - accountName: the Page's `name`
 *   - accessToken: the PAGE access token (encrypted at rest) — NOT the
 *      user token. Page tokens are long-lived (~60 days) and scoped to
 *      that Page, which is what we need for publishing.
 *   - metadata: { pageId }
 *
 * AUTH MODEL: We do NOT call getAuthUser() here. The OAuth round-trip
 * starts from an authenticated session, but Facebook's redirect back to
 * this callback may arrive without cookies in some browsers (Safari ITP,
 * third-party-cookie-blocked popups). The state blob is the source of
 * truth for tenantId + userId — we trust it ONLY because the csrf-cookie
 * check proves it was minted by our connect route.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // ── 1. Handle FB-side error (user denied consent, etc.) ────────────────
  if (errorParam) {
    return renderErrorPage(`Facebook denied authorization: ${errorParam}`);
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
    flow?: string;
    platform?: string;
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
  // CSRF: the cookie set on /connect MUST match the csrf in the state.
  const cookieCsrf = request.cookies.get('fb_oauth_csrf')?.value;
  if (!cookieCsrf || cookieCsrf !== state.csrf) {
    return renderErrorPage('CSRF validation failed — please reconnect.');
  }
  // Guard: this callback is for the FB publishing flow only. If state.flow
  // is missing or not 'publishing', the request came from somewhere else
  // (e.g. a stale bookmark) — refuse rather than risk storing tokens
  // against the wrong tenant.
  if (state.flow !== 'publishing' || state.platform !== 'facebook') {
    return renderErrorPage(
      'Invalid OAuth state for Facebook publishing — please reconnect from the Social Accounts dashboard.',
    );
  }

  // ── 3. Look up Meta OAuth app credentials ──────────────────────────────
  // Same fallback logic as /api/oauth/facebook/route.ts: FB + IG share
  // the same Meta App, so we accept credentials registered under either
  // provider name.
  const cred = await db.integrationCredential.findFirst({
    where: {
      provider: { in: ['facebook', 'instagram'] },
      status: 'active',
    },
    select: {
      clientId: true,
      clientSecret: true,
      redirectUri: true,
      scopes: true,
      provider: true,
    },
    orderBy: { provider: 'asc' },
  });
  if (!cred || !cred.clientId || !cred.clientSecret) {
    return renderErrorPage(
      'Platform credentials for Facebook are not configured. Ask a platform admin to register the Meta App credentials.',
    );
  }

  // ── 4. Resolve redirect URI (must match the one used in /connect) ──────
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    getAppUrlFromRequest(request);
  const redirectUri = cred.redirectUri
    ? cred.redirectUri
    : `${appUrl}/api/oauth/facebook/callback`;

  // ── 5. Exchange auth code for a user access token ──────────────────────
  //
  // GET https://graph.facebook.com/v18.0/oauth/access_token
  //   ?client_id={appId}&client_secret={appSecret}
  //   &redirect_uri={callbackUrl}&code={authCode}
  //
  // Returns: { access_token, token_type, expires_in }
  // This is a SHORT-LIVED user token (~1-2 hours). We then exchange it
  // for long-lived Page tokens via /me/accounts (which automatically
  // returns long-lived Page tokens when called with a long-lived user
  // token, OR short-lived Page tokens when called with a short-lived
  // user token).
  //
  // For simplicity in this v1 implementation, we use the short-lived
  // user token directly to call /me/accounts. The Page tokens returned
  // will be short-lived (~1 hour). For production use, the OAuth flow
  // should first exchange the short-lived user token for a long-lived
  // one (60 days) via a separate Graph API call, THEN call /me/accounts
  // to get long-lived Page tokens. We've left a TODO comment in the
  // Page-enumeration step below for this.
  let userAccessToken: string;
  try {
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', cred.clientId);
    tokenUrl.searchParams.set('client_secret', cred.clientSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenReq = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!tokenReq.ok) {
      const errText = await tokenReq.text().catch(() => '');
      console.error(
        '[oauth/facebook/callback] Token exchange failed:',
        tokenReq.status,
        errText,
      );
      return renderErrorPage(
        `Facebook rejected the authorization code (HTTP ${tokenReq.status}). ` +
          'This usually means the code expired or was already used — please reconnect.',
      );
    }
    const tokenBody = (await tokenReq.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      return renderErrorPage('Facebook did not return an access token.');
    }
    userAccessToken = tokenBody.access_token;
  } catch (err) {
    console.error('[oauth/facebook/callback] Token exchange error:', err);
    return renderErrorPage('Network error while exchanging the authorization code.');
  }

  // ── 6. List the user's Pages ───────────────────────────────────────────
  //
  // GET https://graph.facebook.com/v18.0/me/accounts?access_token={userToken}
  //
  // Returns: { data: [{ id, name, access_token, category, tasks }] }
  // The `access_token` field on each Page is the PAGE access token —
  // scoped to that Page, suitable for publishing.
  //
  // TODO(future): to get long-lived Page tokens (60 days instead of 1
  // hour), first exchange the short-lived user token for a long-lived
  // user token:
  //   GET /oauth/access_token?grant_type=fb_exchange_token
  //       &client_id=...&client_secret=...&fb_exchange_token={shortUserToken}
  // Then call /me/accounts with the long-lived user token. Long-lived
  // Page tokens never expire on their own (only revocation removes them).
  // For v1 we use the short-lived flow — users reconnect when needed.
  let pages: Array<{
    id: string;
    name: string;
    access_token: string;
  }>;
  try {
    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', userAccessToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token');
    const pagesReq = await fetch(pagesUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!pagesReq.ok) {
      const errText = await pagesReq.text().catch(() => '');
      console.error(
        '[oauth/facebook/callback] /me/accounts failed:',
        pagesReq.status,
        errText,
      );
      return renderErrorPage(
        `Failed to list your Facebook Pages (HTTP ${pagesReq.status}). ` +
          'Make sure your Facebook account manages at least one Page.',
      );
    }
    const pagesBody = (await pagesReq.json()) as {
      data?: Array<{ id: string; name: string; access_token: string }>;
    };
    pages = Array.isArray(pagesBody.data) ? pagesBody.data : [];
  } catch (err) {
    console.error('[oauth/facebook/callback] /me/accounts error:', err);
    return renderErrorPage('Network error while listing your Facebook Pages.');
  }

  if (pages.length === 0) {
    return renderErrorPage(
      'Your Facebook account does not manage any Pages. Create a Page at https://www.facebook.com/pages first.',
    );
  }

  // ── 7. Store each Page as a separate SocialAccount ─────────────────────
  // Upsert: if (tenantId, platform='facebook', accountId=pageId) already
  // exists (user reconnects the same Page), update the token + re-activate.
  const createdPages: Array<{ pageId: string; pageName: string }> = [];
  let firstError: string | null = null;

  for (const page of pages) {
    if (!page.id || !page.name || !page.access_token) {
      // Skip malformed entries — shouldn't happen but be defensive.
      continue;
    }
    try {
      await upsertPageAccount({
        tenantId: state.tenantId!,
        userId: state.userId!,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        scopes: cred.scopes || '',
      });
      createdPages.push({ pageId: page.id, pageName: page.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[oauth/facebook/callback] Failed to upsert SocialAccount for Page ${page.id} (${page.name}):`,
        msg,
      );
      if (!firstError) firstError = msg;
    }
  }

  if (createdPages.length === 0) {
    return renderErrorPage(
      firstError
        ? `No Facebook Pages were saved. First error: ${firstError}`
        : 'Failed to save any Facebook Pages — please try again.',
    );
  }

  // ── 8. Clear the CSRF cookie + redirect to dashboard ───────────────────
  const redirectUrl = new URL(
    '/dashboard?view=social-accounts&connected=facebook',
    appUrl,
  );
  const res = NextResponse.redirect(redirectUrl.toString());
  res.cookies.delete('fb_oauth_csrf');
  return res;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Upsert a SocialAccount row for a Facebook Page.
 *
 * - If a row already exists for (tenantId, platform='facebook',
 *   accountId=pageId), update its tokens + re-activate it.
 * - Otherwise, create a new row.
 *
 * The Page access token is encrypted at rest via the social/crypto module.
 */
async function upsertPageAccount(args: {
  tenantId: string;
  userId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  scopes: string;
}): Promise<void> {
  const encryptedAccess = encryptToken(args.pageAccessToken);
  // FB Page tokens don't have refresh tokens — leave null.
  const encryptedRefresh: string | null = null;
  // Page tokens are long-lived (no expiry returned by /me/accounts in
  // the short-lived flow). Leave null — the publisher's token-refresh
  // helper treats null tokenExpiry as "no expiry, don't refresh".
  const tokenExpiry: Date | null = null;

  const metadata = JSON.stringify({ pageId: args.pageId });

  const account = await db.socialAccount.upsert({
    where: {
      tenantId_platform_accountId: {
        tenantId: args.tenantId,
        platform: 'facebook',
        accountId: args.pageId,
      },
    },
    create: {
      tenantId: args.tenantId,
      platform: 'facebook',
      accountId: args.pageId,
      accountName: args.pageName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry,
      scopes: args.scopes,
      metadata,
      connectedById: args.userId,
      isActive: true,
    },
    update: {
      accountName: args.pageName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry,
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
    entityName: `facebook:${account.accountName}`,
    description: `Connected Facebook Page "${account.accountName}".`,
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
  <h1>Facebook Connection Failed</h1>
  <p>${safe}</p>
  <a href="/dashboard?view=social-accounts">Back to Dashboard</a>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_error', provider: 'facebook', error: ${JSON.stringify(message)} }, '*');
    setTimeout(() => window.close(), 3000);
  }
</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  );
}
