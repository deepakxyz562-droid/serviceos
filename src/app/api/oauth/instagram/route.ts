import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

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
  if (!cred || !cred.clientId) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'A platform admin must register Meta OAuth credentials ' +
          '(IntegrationCredential, provider=instagram or provider=facebook) ' +
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
  const callbackUrl = cred.redirectUri
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
  authUrl.searchParams.set('client_id', cred.clientId);
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
