import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getAppUrl } from '@/lib/auth';

/**
 * GET /api/oauth/gmail
 * ─────────────────────────────────────────────────────────────────────────
 * Initiates the Gmail OAuth2 flow.
 *
 * Redirects the user to Google's consent screen with the scopes:
 *   - gmail.modify       (read + modify emails, but not permanent deletion)
 *   - gmail.compose      (create + send drafts)
 *   - gmail.send         (send emails)
 *
 * After consent, Google redirects to /api/oauth/gmail/callback?code=...
 * which exchanges the code for access + refresh tokens and creates an
 * IntegrationConnection(provider='gmail') row.
 *
 * Credentials are resolved from:
 *   1. IntegrationCredential table (superadmin-managed)
 *   2. Env vars: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REDIRECT_URI
 *
 * Auth: any authenticated tenant user.
 */
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'openid',
  'email',
];

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const tenantId = authUser.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Could not resolve tenant.' },
      { status: 400 },
    );
  }

  // 1. Look up Google OAuth app credentials from IntegrationCredential
  let clientId = process.env.GOOGLE_CLIENT_ID || '';
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  let redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

  try {
    const cred = await db.integrationCredential.findFirst({
      where: { provider: 'google', isActive: true },
    });
    if (cred) {
      clientId = cred.clientId || clientId;
      clientSecret = cred.clientSecret || clientSecret;
      redirectUri = cred.redirectUri || redirectUri;
    }
  } catch {
    /* Supabase adapter may not have the table — env fallback is fine */
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET or register them via SuperAdmin → Integrations.' },
      { status: 500 },
    );
  }

  // Default redirect URI: {appUrl}/api/oauth/gmail/callback
  if (!redirectUri) {
    const appUrl = getAppUrl();
    redirectUri = `${appUrl}/api/oauth/gmail/callback`;
  }

  // 2. Build CSRF state blob
  const csrf = randomBytes(32).toString('hex');
  const state = Buffer.from(
    JSON.stringify({
      tenantId,
      userId: authUser.id,
      csrf,
      expires: Date.now() + 10 * 60 * 1000, // 10 min
    }),
  ).toString('base64url');

  // 3. Redirect to Google consent
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GMAIL_SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl.toString());
  // Set CSRF cookie (HTTP-only, 10 min)
  res.cookies.set('gmail_oauth_csrf', csrf, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
