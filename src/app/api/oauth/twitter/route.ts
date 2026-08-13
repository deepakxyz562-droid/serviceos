import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  encodeOAuthState,
  getPublicAppUrl,
} from '@/lib/social/oauth-page';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';
import {
  generatePkceVerifier,
  computePkceChallenge,
} from '@/lib/social/pkce';

/**
 * GET /api/oauth/twitter
 *
 * Initiates X (Twitter) OAuth 2.0 with PKCE (Authorization Code with PKCE).
 * Redirects the user to X's consent screen. After consent, X redirects to
 * /api/oauth/twitter/callback which exchanges the code (with the PKCE
 * code_verifier) for tokens and stores them as a SocialAccount row.
 *
 * Required IntegrationCredential row (superadmin-configured):
 *   provider: 'twitter', clientId
 *   (clientSecret optional — only for confidential clients; if set, we use
 *    Basic auth on the token exchange; otherwise we use the public-client
 *    form-body flow.)
 *
 * Scopes (SPACE-separated — X's convention):
 *   - tweet.read      — read tweets
 *   - tweet.write     — post tweets
 *   - users.read      — fetch the user profile
 *   - offline.access  — obtain a refresh_token (so tokens can be refreshed
 *                       silently instead of forcing re-auth every 2 hours)
 *
 * PKCE:
 *   - code_verifier:  96-char cryptographically-random string
 *   - code_challenge: base64url(sha256(code_verifier))
 *   - code_challenge_method: S256
 *
 *   The code_verifier is embedded in the OAuth `state` parameter (encrypted
 *   via base64url JSON) so the callback can verify the challenge without a
 *   server-side session store. State is also CSRF-protected with a 10-min
 *   expiry + provider match check.
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
    where: { provider: 'twitter', status: 'active' },
    select: { clientId: true, clientSecret: true, scopes: true },
  });
  if (!cred) {
    return NextResponse.json(
      {
        error: 'PLATFORM_NOT_CONFIGURED',
        message:
          'X (Twitter) OAuth app is not configured yet. Please contact support.',
      },
      { status: 503 },
    );
  }

  // 3. Generate PKCE pair.
  const codeVerifier = generatePkceVerifier();
  const codeChallenge = computePkceChallenge(codeVerifier);

  // 4. Build state — embed the PKCE verifier so the callback can use it
  //    without a server-side session store.
  const state = encodeOAuthState({
    tenantId: authUser.tenantId,
    userId: authUser.id,
    provider: 'twitter',
    ts: Date.now(),
    v: { codeVerifier },
  });

  // 5. Build the authorization URL.
  const meta = OAUTH_PROVIDERS.twitter;
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/twitter/callback`;

  const authUrl = new URL(meta.authUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', cred.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  // X scopes are SPACE-separated in the URL.
  authUrl.searchParams.set('scope', meta.scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(authUrl.toString());
}
