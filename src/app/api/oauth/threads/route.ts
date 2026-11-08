import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  encodeOAuthState,
  getPublicAppUrl,
} from '@/lib/social/oauth-page';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

/**
 * GET /api/oauth/threads
 *
 * Initiates Meta Threads OAuth. Redirects the user to Threads' consent
 * screen. After consent, Threads redirects to /api/oauth/threads/callback
 * which exchanges the code for tokens and stores them as a SocialAccount row.
 *
 * Required IntegrationCredential row (superadmin-configured) or ENV vars:
 *   provider: 'threads', clientId, clientSecret
 *
 * Scopes (COMMA-separated):
 *   - threads_basic
 *   - threads_content_publish
 */
export async function GET(request: NextRequest) {
  // 1. Auth check.
  const authUser = await getAuthUser(request);
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
    where: { provider: 'threads', status: 'active' },
    select: { clientId: true, clientSecret: true, scopes: true },
  });

  const clientId =
    cred?.clientId ||
    process.env.THREADS_APP_ID ||
    process.env.THREADS_CLIENT_ID ||
    process.env.FACEBOOK_APP_ID ||
    process.env.META_APP_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'Threads OAuth app is not configured yet. Configure it in SuperAdmin Integration Credentials or THREADS_APP_ID in server environment.',
      },
      { status: 503 },
    );
  }

  // 3. Build state (CSRF token — tenantId + userId + provider + ts).
  const state = encodeOAuthState({
    tenantId: authUser.tenantId,
    userId: authUser.id,
    provider: 'threads',
  });

  // 4. Resolve redirect URI.
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/threads/callback`;

  // 5. Scopes.
  const scopes = cred?.scopes || OAUTH_PROVIDERS.threads?.scopes || 'threads_basic,threads_content_publish';

  // 6. Build Threads consent URL.
  const authUrl = new URL(OAUTH_PROVIDERS.threads?.authUrl || 'https://threads.net/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString(), 302);
}
