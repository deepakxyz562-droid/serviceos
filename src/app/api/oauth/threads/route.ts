import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveOAuthRequestAuth } from '@/lib/social/oauth-auth';
import { encodeOAuthState } from '@/lib/social/oauth-page';
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
  // 1. Auth check (cookie, Bearer, mobile handoff ticket, or ?auth= query token).
  const authResult = await resolveOAuthRequestAuth(request);
  if (authResult.response) return authResult.response;
  const { authUser, tenantId, originHost } = authResult;

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
  const returnUrlParam =
    request.nextUrl.searchParams.get('returnUrl') || request.nextUrl.searchParams.get('redirectUri');
  const redirectUri = `${originHost}/api/oauth/threads/callback`;
  const state = encodeOAuthState({
    tenantId,
    userId: authUser.id,
    provider: 'threads',
    v: {
      redirectUri,
      originHost,
      returnUrl: returnUrlParam || undefined,
    },
    ts: Date.now(),
  });

  // 4. Resolve redirect URI.

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
