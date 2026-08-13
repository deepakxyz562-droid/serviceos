import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  encodeOAuthState,
  getPublicAppUrl,
} from '@/lib/social/oauth-page';
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
  // 1. Auth check.
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'Could not resolve tenant.' },
      { status: 400 },
    );
  }

  // 2. Look up superadmin-configured OAuth app credentials.
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'pinterest', status: 'active' },
    select: { clientId: true, clientSecret: true, scopes: true },
  });
  if (!cred) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'Pinterest OAuth app is not configured yet. Please contact support.',
      },
      { status: 503 },
    );
  }

  // 3. Build state (CSRF token — tenantId + userId + provider + ts).
  const state = encodeOAuthState({
    tenantId: authUser.tenantId,
    userId: authUser.id,
    provider: 'pinterest',
    ts: Date.now(),
  });

  // 4. Build the authorization URL.
  const meta = OAUTH_PROVIDERS.pinterest;
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/pinterest/callback`;

  const authUrl = new URL(meta.authUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', cred.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  // Pinterest scopes are COMMA-separated in the URL.
  authUrl.searchParams.set('scope', meta.scopes);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
