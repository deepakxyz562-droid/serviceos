import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  encodeOAuthState,
  getPublicAppUrl,
} from '@/lib/social/oauth-page';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

/**
 * GET /api/oauth/linkedin
 *
 * Initiates LinkedIn OAuth 2.0. Redirects the user to LinkedIn's consent
 * screen with the configured scopes. After consent, LinkedIn redirects
 * to /api/oauth/linkedin/callback which exchanges the code for tokens
 * and stores them as SocialAccount rows (one per profile/org the user
 * admins).
 *
 * Required IntegrationCredential row (superadmin-configured):
 *   provider: 'linkedin', clientId, clientSecret
 *
 * Scopes:
 *   - w_member_social        — post on member's behalf
 *   - rw_organization        — post on company pages user admins
 *   - r_organization_social  — read company-page analytics
 *   - r_member_social        — read member post analytics
 *
 * The UI's HEAD probe to /api/oauth/linkedin/connect lands here via the
 * generic [provider]/connect route's 302-redirect. The HEAD probe sees
 * a non-404 response and the browser proceeds to redirect.
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
    where: { provider: 'linkedin', status: 'active' },
    select: { clientId: true, clientSecret: true, scopes: true },
  });
  if (!cred) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'LinkedIn OAuth app is not configured yet. Please contact support.',
      },
      { status: 503 },
    );
  }

  // 3. Build state (CSRF token — tenantId + userId + provider + ts).
  const state = encodeOAuthState({
    tenantId: authUser.tenantId,
    userId: authUser.id,
    provider: 'linkedin',
    ts: Date.now(),
  });

  // 4. Build the authorization URL.
  const meta = OAUTH_PROVIDERS.linkedin;
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/linkedin/callback`;

  const authUrl = new URL(meta.authUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', cred.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  // LinkedIn scopes are space-separated in the URL.
  authUrl.searchParams.set('scope', meta.scopes);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
