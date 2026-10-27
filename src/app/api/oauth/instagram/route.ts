import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser, verifyToken } from '@/lib/auth';

/**
 * GET /api/oauth/instagram
 *
 * Initiates the Instagram (Meta) OAuth flow for SOCIAL PUBLISHING.
 *
 * This route is intentionally separate from the generic
 * `/api/oauth/[provider]/connect` route (which handles Instagram DM
 * messaging with scopes `instagram_basic,instagram_manage_messages,
 * pages_show_list`). IG PUBLISHING needs different scopes:
 *   - instagram_basic
 *   - instagram_content_publish   ← the key scope for content publishing
 *   - pages_show_list              ← needed to enumerate FB Pages
 *   - pages_read_engagement        ← needed to read Page insights
 *
 * Same Meta App as Facebook. The IG Content Publishing API requires a
 * Facebook Page with a linked Instagram Business Account — we discover
 * the IG Business ID via the Page in the callback.
 *
 * Flow:
 *   1. Authenticate user + resolve tenant.
 *   2. Look up Meta OAuth app credentials from IntegrationCredential.
 *      FB + IG share the same Meta App — we accept credentials registered
 *      under `provider: 'instagram'` OR `provider: 'facebook'`.
 *   3. Build state blob = base64url(JSON({ tenantId, userId, csrf, expires,
 *      flow: 'publishing', platform: 'instagram' })). CSRF cookie mirrors
 *      the csrf field; expires is 10 min from now.
 *   4. Redirect to Meta's OAuth consent dialog at v18.0 with the IG
 *      publishing scopes.
 *
 * Meta redirects back to /api/oauth/instagram/callback?code=... which
 * exchanges the code, enumerates the user's FB Pages, looks up the IG
 * Business Account for each Page, and stores each as a SocialAccount.
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
  // FB + IG share the same Meta App. Prefer the 'instagram' provider
  // entry (the legacy DM one — same Meta App ID/secret works for both),
  // fall back to 'facebook'.
  const cred = await db.integrationCredential.findFirst({
    where: {
      provider: { in: ['instagram', 'facebook'] },
      status: 'active',
    },
    select: {
      id: true,
      clientId: true,
      redirectUri: true,
      scopes: true,
      provider: true,
    },
    // Prefer 'instagram' first when both exist (so the legacy DM app
    // config takes precedence — operators who already configured IG DM
    // don't need to also configure a 'facebook' entry for IG publishing).
    orderBy: { provider: 'desc' },
  });

  const clientId =
    cred?.clientId ||
    process.env.INSTAGRAM_CLIENT_ID ||
    process.env.INSTAGRAM_APP_ID ||
    process.env.META_CLIENT_ID ||
    process.env.META_APP_ID ||
    process.env.FACEBOOK_APP_ID ||
    process.env.FACEBOOK_CLIENT_ID;

  if (!clientId) {
    const originHost =
      request.nextUrl.searchParams.get('originHost') ||
      request.headers.get('referer') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://bgos.fieseros.com';
    const cleanOrigin = originHost.startsWith('http') ? originHost.split('?')[0].replace(/\/+$/, '') : 'https://bgos.fieseros.com';
    const returnUrl = `${cleanOrigin}/?view=socialMedia`;

    if (request.headers.get('accept')?.includes('text/html')) {
      return new NextResponse(
        `<!html>
<html><head><title>Meta App Configuration Required</title><style>
body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
.card { text-align: center; padding: 2.5rem; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 520px; border: 1px solid #e2e8f0; }
.icon { width: 56px; height: 56px; margin: 0 auto 1rem; background: #fdf2f8; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #db2777; }
h1 { color: #0f172a; margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 700; }
p { color: #64748b; margin: 0 0 1.25rem; line-height: 1.5; font-size: 0.875rem; text-align: left; }
.code-box { background: #f1f5f9; padding: 0.75rem 1rem; border-radius: 8px; font-family: monospace; font-size: 0.8rem; text-align: left; margin-bottom: 1.25rem; color: #334155; }
a, button { background: #009F50; color: white; border: none; padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; font-size: 0.875rem; }
</style></head>
<body>
<div class="card">
  <div class="icon">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
  </div>
  <h1>Instagram / Meta App Required</h1>
  <p>To connect Instagram Business Profiles, a platform admin must register Meta OAuth credentials (in SuperAdmin Integration Credentials or server environment variables):</p>
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
          'A platform admin must register Meta OAuth credentials ' +
          '(in SuperAdmin Integration Credentials or META_APP_ID / INSTAGRAM_CLIENT_ID in server environment) ' +
          'before tenants can connect Instagram for publishing.',
      },
      { status: 503 },
    );
  }

  // ── 3. Resolve redirect URI ────────────────────────────────────────────
  // The Meta App Dashboard MUST have this exact URI registered under
  // "Valid OAuth Redirect URIs". Note: if the superadmin configured a
  // custom redirectUri on the credential (e.g. shared with the FB flow),
  // we respect it — but it must point at THIS callback path.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    getAppUrlFromRequest(request);
  const callbackUrl = cred?.redirectUri
    ? cred.redirectUri
    : `${appUrl}/api/oauth/instagram/callback`;

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
      platform: 'instagram',
    }),
  ).toString('base64url');

  // ── 5. Build Meta consent URL (Graph API v18.0) ────────────────────────
  // IG publishing scopes per task spec.
  const IG_SCOPES =
    'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';
  // We do NOT use the scopes from the credential here — the credential's
  // scopes field may have been set for the legacy DM flow (different
  // scopes). The IG publishing scopes are fixed by the spec.
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', IG_SCOPES);
  authUrl.searchParams.set('state', state);
  // `auth_type=rerequest` re-prompts for any previously-declined scopes.
  authUrl.searchParams.set('auth_type', 'rerequest');

  // ── 6. Redirect with the CSRF cookie ───────────────────────────────────
  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('ig_oauth_csrf', csrf, {
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
