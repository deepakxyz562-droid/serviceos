import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

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
  // ── 1. Auth check ──────────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
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
  if (!cred || !cred.clientId) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'A platform admin must register Facebook/Meta OAuth credentials ' +
          '(IntegrationCredential, provider=facebook or provider=instagram) ' +
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
  const callbackUrl = cred.redirectUri
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
  const scopes = cred.scopes && cred.scopes.trim().length > 0 ? cred.scopes : FB_SCOPES;

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', cred.clientId);
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
