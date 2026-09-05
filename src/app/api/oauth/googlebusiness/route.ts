import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

/**
 * GET /api/oauth/googlebusiness
 *
 * Initiates the Google Business Profile OAuth2 flow.
 *
 * Flow:
 *   1. Look up Google OAuth app credentials from IntegrationCredential
 *      (superadmin registers these via the platform admin — tenants never
 *      see the client secret).
 *   2. Build a state blob = base64url(JSON({ tenantId, userId, csrf, expires }))
 *      — `csrf` is a random 32-byte token mirrored in an HTTP-only cookie
 *      set on the response, so the callback can prove the round-trip
 *      originated from this server (CSRF defense).
 *   3. Redirect to Google's consent screen with:
 *        - access_type=offline     → Google returns a refresh_token
 *        - prompt=consent          → forces Google to issue a fresh
 *          refresh_token even if one already exists for the user
 *        - scope=business.manage   → only scope GBP needs
 *
 * Google then redirects back to /api/oauth/googlebusiness/callback?code=...
 * which exchanges the auth code for access + refresh tokens and creates
 * one SocialAccount per GBP location.
 *
 * NOTE: This route is intentionally NOT under the generic
 * `/api/oauth/[provider]/connect` route. The generic route stores the
 * token in CommunicationProvider + ChannelConfig (for the omnichannel
 * inbox — messaging channels). GBP is a *publishing* channel that needs
 * to enumerate locations and store them as SocialAccount rows, so it has
 * its own dedicated connect/callback pair.
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
      { error: 'Could not resolve tenant. Connect your account from the dashboard.' },
      { status: 400 },
    );
  }

  // ── 1.5. Read claim context (if coming from Claim Business) ──────────
  // When the user clicks "Connect Google Business Profile" from the claim
  // modal, the claimTenantId is passed as a query param. We include it in
  // the OAuth state blob so the callback knows to store SocialAccount rows
  // against the CLAIM TARGET tenant (not the user's own tenant).
  // This is critical for the claim flow: the user's own tenant (e.g. a
  // trial account) is different from the marketplace listing they're
  // claiming. The Google connection must be stored against the listing's
  // tenant so the match can compare Google data against the listing's
  // business details.
  const { searchParams } = new URL(request.url);
  const claimTenantId = searchParams.get('claimTenantId');
  // If claimTenantId is provided, use it as the target tenant for the OAuth
  // flow. Otherwise, use the user's own tenantId (settings flow).
  const targetTenantId = claimTenantId || tenantId;

  // ── 2. Look up Google OAuth app credentials ────────────────────────────
  // The IntegrationCredential table (superadmin-managed) holds platform
  // OAuth app credentials. We wrap this in try/catch because:
  //   - The Supabase adapter resolves unknown models by capitalized guess
  //     ("IntegrationCredential"), and if the table is absent or the
  //     PostgREST schema cache doesn't have it, the query throws — we
  //     must NOT crash the whole OAuth connect flow over a missing lookup
  //     table (env-var fallbacks below cover the same need).
  //   - This lookup is purely an optimization: a superadmin who hasn't yet
  //     registered GBP in the DB can still connect if GOOGLE_CLIENT_ID is
  //     set in the environment.
  let cred: { clientId?: string | null; clientSecret?: string | null; redirectUri?: string | null; scopes?: string | null } | null = null;
  try {
    cred = await db.integrationCredential.findFirst({
      where: { provider: 'googlebusiness', status: 'active' },
      select: { id: true, clientId: true, redirectUri: true, scopes: true },
    });
  } catch (err) {
    // Best-effort: log and fall through to env-var resolution below.
    console.warn(
      '[oauth/googlebusiness/connect] IntegrationCredential lookup failed — falling back to env vars:',
      err instanceof Error ? err.message : err,
    );
  }

  const clientId = cred?.clientId || process.env.GOOGLE_BUSINESS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'A platform admin must register Google Business Profile OAuth credentials ' +
          '(IntegrationCredential, provider=googlebusiness or GOOGLE_CLIENT_ID in .env) before tenants can connect.',
      },
      { status: 503 },
    );
  }

  // ── 3. Resolve redirect URI ────────────────────────────────────────────
  // Prefer the configured redirectUri on the credential, otherwise derive
  // from the app URL. The Google Cloud Console MUST have this exact URI
  // registered as an authorized redirect URI.
  //
  // NOTE: `cred?.redirectUri` (optional chaining) — `cred` is null when no
  // IntegrationCredential row exists (the common case where a tenant is
  // relying on env-var GOOGLE_CLIENT_ID). Without `?.` this throws
  // `TypeError: Cannot read properties of null (reading 'redirectUri')`,
  // which previously produced an empty 500 body that Chrome rendered as
  // "this page might be temporarily down" — the visible symptom of the bug.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    getAppUrlFromRequest(request);
  const callbackUrl = cred?.redirectUri
    ? cred.redirectUri
    : `${appUrl}/api/oauth/googlebusiness/callback`;

  // ── 4. Build state (CSRF + tenant/user context) ────────────────────────
  // The csrf token is mirrored in an HTTP-only cookie + the state blob.
  // The callback verifies they match — defends against login-CSRF /
  // OAuth-state-fixation attacks.
  const csrf = randomBytes(32).toString('hex');
  const expires = Date.now() + 30 * 60 * 1000; // 30 min (was 10 min — too short for users who need to sign in + read consent)
  const state = Buffer.from(
    JSON.stringify({
      tenantId: targetTenantId, // the target tenant (user's own OR claim target)
      userId: authUser.id,
      csrf,
      expires,
      // Claim context: if this OAuth flow was started from the claim modal,
      // include the claimTenantId + a flag so the callback knows the context.
      context: claimTenantId ? 'CLAIM_BUSINESS' : 'SETTINGS_VERIFICATION',
      claimTenantId: claimTenantId || null,
      // Also store the user's own tenantId (for the claim flow, the user's
      // own tenant is different from the target listing's tenant).
      userTenantId: tenantId,
    }),
  ).toString('base64url');

  // ── 5. Build Google consent URL ────────────────────────────────────────
  const meta = OAUTH_PROVIDERS.googlebusiness;
  const authUrl = new URL(meta.authUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  // Use the scopes from the credential if set, otherwise the canonical
  // GBP scope from OAUTH_PROVIDERS (business.manage).
  authUrl.searchParams.set('scope', cred?.scopes || meta.scopes);
  authUrl.searchParams.set('access_type', 'offline'); // force refresh_token
  authUrl.searchParams.set('prompt', 'consent'); // force fresh refresh_token
  authUrl.searchParams.set('state', state);
  // `include_granted_scopes` lets us later request additional scopes
  // incrementally without invalidating the existing refresh_token.
  authUrl.searchParams.set('include_granted_scopes', 'true');

  // ── 6. Redirect with the CSRF cookie ───────────────────────────────────
  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('gbp_oauth_csrf', csrf, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60, // 30 min — matches the state expiry
  });
  return res;
}

/**
 * Derive the app URL from the incoming request headers (used when
 * NEXT_PUBLIC_APP_URL is unset). Mirrors `getAppUrl()` in `src/lib/auth.ts`
 * but inlined here to keep this route self-contained.
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
