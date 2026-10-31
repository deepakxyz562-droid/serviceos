import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser, verifyToken } from '@/lib/auth';

/**
 * GET /api/oauth/facebook
 *
 * Initiates the Facebook (Meta) OAuth flow for SOCIAL PUBLISHING.
 *
 * This route is intentionally separate from the generic
 * `/api/oauth/[provider]/connect` route used by the omnichannel inbox
 * (messaging channels). The generic route stores tokens in
 * CommunicationProvider + ChannelConfig for messaging. Facebook
 * PUBLISHING needs:
 *   - Different scopes (pages_manage_posts, pages_read_engagement, etc.)
 *   - Different storage (SocialAccount rows — one per FB Page the user
 *     manages, with the page token encrypted at rest)
 *   - A page-enumeration step in the callback (one SocialAccount per page)
 *
 * Flow:
 *   1. Authenticate user + resolve tenant.
 *   2. Look up the FB OAuth app credentials from IntegrationCredential
 *      (superadmin registers these). FB and IG share the same Meta App,
 *      so we accept credentials registered under `provider: 'facebook'`
 *      OR `provider: 'instagram'` (whichever the superadmin configured).
 *   3. Build a state blob = base64url(JSON({ tenantId, userId, csrf, expires,
 *      flow: 'publishing' })). The `csrf` is a random 32-byte token mirrored
 *      in an HTTP-only cookie set on the response — the callback verifies
 *      they match (CSRF defense). `expires` is 10 min from now.
 *   4. Redirect to Facebook's OAuth consent dialog at v18.0 with the
 *      publishing scopes.
 *
 * Scopes (per task spec):
 *   - pages_manage_posts        — create Page posts
 *   - pages_read_engagement     — read likes/comments/shares for metrics
 *   - pages_show_list           — enumerate the user's Pages
 *   - pages_read_user_content   — read Page posts (for metrics)
 *   - instagram_content_publish — ALSO requested here so a single OAuth
 *      round-trip can later enable IG publishing if the user connects IG
 *      from the same Meta App (the IG connect route requests the same
 *      scope, but FB users get it for free this way).
 *
 * Facebook redirects back to /api/oauth/facebook/callback?code=... which
 * exchanges the code for a user token, lists the user's Pages, and stores
 * each Page as a separate SocialAccount.
 */
export async function GET(request: NextRequest) {
  // ── 0. Resolve originHost early ────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const queryOrigin = searchParams.get('originHost');
  const referer = request.headers.get('referer');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = forwardedHost || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const proto = forwardedProto || (hostHeader?.startsWith('localhost') ? 'http' : 'https');

  let originHost = queryOrigin;
  if (!originHost && referer) {
    try {
      originHost = new URL(referer).origin;
    } catch {}
  }
  if (!originHost && hostHeader) {
    originHost = `${proto}://${hostHeader}`;
  }
  if (!originHost) {
    originHost = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://fieseros.com';
  }

  // ── 1. Auth check (Cookie -> Header -> Query Param fallback) ───────────
  let authUser = await getAuthUser(request);
  const tokenFromQuery = searchParams.get('auth') || searchParams.get('token');
  if (!authUser && tokenFromQuery) {
    authUser = verifyToken(tokenFromQuery);
  }

  if (!authUser) {
    const isBrowserNav =
      request.headers.get('accept')?.includes('text/html') ||
      !request.headers.get('accept')?.includes('application/json');
    if (isBrowserNav && originHost) {
      const loginUrl = new URL('/', originHost);
      loginUrl.searchParams.set('login', 'required');
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl.toString());
    }
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const tenantId = authUser.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      {
        error: 'Could not resolve tenant. Connect your account from the dashboard.',
      },
      { status: 400 },
    );
  }

  // ── 2. Look up Meta OAuth app credentials ──────────────────────────────
  // FB + IG share the same Meta App, so we accept credentials registered
  // under either provider name. Try 'facebook' first (preferred for the FB
  // flow), fall back to 'instagram' (covers tenants that only registered
  // the IG side but use the same Meta App ID/secret for FB publishing).
  const cred = await db.integrationCredential.findFirst({
    where: {
      provider: { in: ['facebook', 'instagram'] },
      status: 'active',
    },
    select: {
      id: true,
      clientId: true,
      redirectUri: true,
      scopes: true,
      provider: true,
    },
    // Prefer the 'facebook' entry when both exist.
    orderBy: { provider: 'asc' },
  });

  const clientId = (
    cred?.clientId ||
    process.env.META_CLIENT_ID ||
    process.env.META_APP_ID ||
    process.env['META_APP_ID '] ||
    process.env.FACEBOOK_APP_ID ||
    process.env.FACEBOOK_CLIENT_ID
  )?.trim();

  if (!clientId) {
    const originHost =
      request.nextUrl.searchParams.get('originHost') ||
      request.headers.get('referer') ||
      (hostHeader ? `${proto}://${hostHeader}` : process.env.NEXT_PUBLIC_APP_URL || 'https://bgos.fieseros.com');
    const cleanOrigin = originHost.startsWith('http') ? originHost.split('?')[0].replace(/\/+$/, '') : (hostHeader ? `${proto}://${hostHeader}` : 'https://bgos.fieseros.com');
    const returnUrl = `${cleanOrigin}/?view=socialMedia`;

    if (request.headers.get('accept')?.includes('text/html')) {
      return new NextResponse(
        `<!html>
<html><head><title>Meta App Configuration Required</title><style>
body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
.card { text-align: center; padding: 2.5rem; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 520px; border: 1px solid #e2e8f0; }
.icon { width: 56px; height: 56px; margin: 0 auto 1rem; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #2563eb; }
h1 { color: #0f172a; margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 700; }
p { color: #64748b; margin: 0 0 1.25rem; line-height: 1.5; font-size: 0.875rem; text-align: left; }
.code-box { background: #f1f5f9; padding: 0.75rem 1rem; border-radius: 8px; font-family: monospace; font-size: 0.8rem; text-align: left; margin-bottom: 1.25rem; color: #334155; }
a, button { background: #009F50; color: white; border: none; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; font-size: 0.875rem; }
</style></head>
<body>
<div class="card">
  <div class="icon">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
  </div>
  <h1>Facebook / Meta App Required</h1>
  <p>To connect Facebook Pages and Instagram, a platform admin must register Meta OAuth credentials (in SuperAdmin Integration Credentials or server environment variables):</p>
  <div class="code-box">
    META_APP_ID=your_meta_app_id<br/>
    META_APP_SECRET=your_meta_app_secret
  </div>
  <a href="${returnUrl}">Back to Marketing Studio</a>
</div>
</body></html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'A platform admin must register Facebook/Meta OAuth credentials ' +
          '(in SuperAdmin Integration Credentials or META_APP_ID / META_CLIENT_ID in server environment) ' +
          'before tenants can connect.',
      },
      { status: 503 },
    );
  }

  // ── 3. Resolve redirect URI ────────────────────────────────────────────
  // Prefer the redirectUri configured on the credential, otherwise derive
  // from the app URL. The Meta App Dashboard MUST have this exact URI
  // registered under "Valid OAuth Redirect URIs".
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    getAppUrlFromRequest(request);
  const callbackUrl = cred?.redirectUri
    ? cred.redirectUri
    : `${appUrl}/api/oauth/facebook/callback`;

  // ── 4. Build state (CSRF + tenant/user context) ────────────────────────
  const csrf = randomBytes(32).toString('hex');
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  const state = Buffer.from(
    JSON.stringify({
      tenantId,
      userId: authUser.id,
      csrf,
      expires,
      flow: 'publishing',
      platform: 'facebook',
    }),
  ).toString('base64url');

  // ── 5. Build Facebook consent URL (Graph API v18.0) ────────────────────
  const FB_SCOPES =
    'pages_manage_posts,pages_read_engagement,pages_show_list,pages_read_user_content,instagram_content_publish';
  // Prefer the scopes configured on the credential if set, otherwise the
  // canonical FB publishing scopes above.
  const scopes = cred?.scopes && cred.scopes.trim().length > 0 ? cred.scopes : FB_SCOPES;

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  // `auth_type=rerequest` tells Facebook to re-prompt for permissions if
  // the user previously declined some — without this, FB silently returns
  // a token with the previously-granted subset of scopes, which would
  // later cause publish failures (missing pages_manage_posts, etc.).
  authUrl.searchParams.set('auth_type', 'rerequest');

  // ── 6. Redirect with the CSRF cookie ───────────────────────────────────
  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('fb_oauth_csrf', csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 min — matches the state expiry
  });
  return res;
}

/**
 * Derive the app URL from the incoming request headers (used when
 * NEXT_PUBLIC_APP_URL is unset). Mirrors the helper used by the
 * GBP OAuth route — kept inline for self-containment.
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
