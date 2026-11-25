import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveOAuthRequestAuth } from '@/lib/social/oauth-auth';
import { encodeOAuthState } from '@/lib/social/oauth-page';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

/**
 * GET /api/oauth/pinterest
 *
 * Initiates Pinterest OAuth 2.0. Redirects the user to Pinterest's consent
 * screen. After consent, Pinterest redirects to /api/oauth/pinterest/callback
 * which exchanges the code for tokens and stores them as a SocialAccount row.
 *
 * Required IntegrationCredential row (superadmin-configured):
 *   provider: 'pinterest', clientId, clientSecret
 *
 * Scopes (COMMA-separated in the URL — Pinterest's convention):
 *   - boards:read          — list the user's boards
 *   - pins:read            — read pin analytics
 *   - pins:write           — create new pins
 *   - user_accounts:read   — fetch the user account profile
 *
 * Pinterest's auth URL ends with `/oauth/` (trailing slash) — preserved as-is.
 */
export async function GET(request: NextRequest) {
  // 1. Auth check (cookie, Bearer, mobile handoff ticket, or ?auth= query token).
  const authResult = await resolveOAuthRequestAuth(request);
  if (authResult.response) return authResult.response;
  const { authUser, tenantId, originHost } = authResult;

  // 2. Look up superadmin-configured OAuth app credentials.
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'pinterest', status: 'active' },
    select: { clientId: true, clientSecret: true, scopes: true },
  });

  const clientId =
    cred?.clientId ||
    process.env.PINTEREST_APP_ID ||
    process.env.PINTEREST_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'Pinterest OAuth app is not configured yet. Configure it in SuperAdmin Integration Credentials or PINTEREST_APP_ID in server environment.',
      },
      { status: 503 },
    );
  }

  // 3. Build state (CSRF token — tenantId + userId + provider + ts).
  const returnUrlParam =
    request.nextUrl.searchParams.get('returnUrl') || request.nextUrl.searchParams.get('redirectUri');
  const redirectUri = `${originHost}/api/oauth/pinterest/callback`;
  const state = encodeOAuthState({
    tenantId,
    userId: authUser.id,
    provider: 'pinterest',
    v: {
      redirectUri,
      originHost,
      returnUrl: returnUrlParam || undefined,
    },
    ts: Date.now(),
  });

  // 4. Build the authorization URL.
  const meta = OAUTH_PROVIDERS.pinterest;

  const authUrl = new URL(meta.authUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  // Pinterest scopes are COMMA-separated in the URL.
  authUrl.searchParams.set('scope', meta.scopes);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
