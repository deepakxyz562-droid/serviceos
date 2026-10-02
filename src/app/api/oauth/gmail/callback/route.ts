import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth';

/**
 * GET /api/oauth/gmail/callback
 * ─────────────────────────────────────────────────────────────────────────
 * OAuth callback for Gmail.
 *
 * Google redirects here with ?code={authCode}&state={state} after the user
 * consents. We:
 *   1. Validate state (CSRF cookie match + not expired).
 *   2. Exchange the auth code for access + refresh tokens at Google's
 *      token endpoint.
 *   3. Fetch the user's Gmail profile (email address).
 *   4. Store as an IntegrationConnection(provider='gmail') row with the
 *      access token + refresh token in credentialsJson.
 *
 * The AI Agent's Gmail channel reads this row to draft replies to inbound
 * emails.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = getAppUrl();

  if (error) {
    return NextResponse.redirect(`${appUrl}/?view=integrations&gmail_error=${encodeURIComponent(error)}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${appUrl}/?view=integrations&gmail_error=missing_code`);
  }

  // 1. Validate state
  let state: { tenantId: string; userId: string; csrf: string; expires: number };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return NextResponse.redirect(`${appUrl}/?view=integrations&gmail_error=invalid_state`);
  }

  if (Date.now() > state.expires) {
    return NextResponse.redirect(`${appUrl}/?view=integrations&gmail_error=state_expired`);
  }

  // CSRF cookie match
  const csrfCookie = request.cookies.get('gmail_oauth_csrf')?.value;
  if (!csrfCookie || csrfCookie !== state.csrf) {
    return NextResponse.redirect(`${appUrl}/?view=integrations&gmail_error=csrf_mismatch`);
  }

  // 2. Look up credentials
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
    /* ignore */
  }

  if (!redirectUri) {
    redirectUri = `${appUrl}/api/oauth/gmail/callback`;
  }

  // 3. Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('[oauth/gmail/callback] Token exchange failed:', errBody);
    return NextResponse.redirect(`${appUrl}/?view=integrations&gmail_error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;

  if (!accessToken) {
    return NextResponse.redirect(`${appUrl}/?view=integrations&gmail_error=no_access_token`);
  }

  // 4. Fetch Gmail profile (email address)
  let gmailAddress = '';
  try {
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      gmailAddress = profile.emailAddress || '';
    }
  } catch {
    /* non-fatal — we can still store without the email */
  }

  // 5. Upsert IntegrationConnection(provider='gmail')
  const credentialsJson = JSON.stringify({
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString(),
    gmailAddress,
    scopes: 'gmail.modify,gmail.compose,gmail.send',
    connectedAt: new Date().toISOString(),
    connectedBy: state.userId,
  });

  const existing = await db.integrationConnection.findFirst({
    where: { tenantId: state.tenantId, provider: 'gmail' },
  });

  if (existing) {
    await db.integrationConnection.update({
      where: { id: existing.id },
      data: {
        status: 'connected',
        accessToken: refreshToken || accessToken, // store refresh token for long-term
        configJson: credentialsJson,
        lastSyncAt: new Date(),
      },
    });
  } else {
    await db.integrationConnection.create({
      data: {
        tenantId: state.tenantId,
        provider: 'gmail',
        name: gmailAddress ? `Gmail (${gmailAddress})` : 'Gmail',
        status: 'connected',
        accessToken: refreshToken || accessToken,
        configJson: credentialsJson,
        lastSyncAt: new Date(),
        scopesJson: 'gmail.modify,gmail.compose,gmail.send',
        syncSettingsJson: JSON.stringify({ autoSync: true }),
      },
    });
  }

  console.log('[oauth/gmail/callback] Gmail connected:', {
    gmailAddress,
    tenantId: state.tenantId,
  });

  // Clear CSRF cookie + redirect to settings
  const res = NextResponse.redirect(`${appUrl}/?view=integrations&gmail_connected=1`);
  res.cookies.delete('gmail_oauth_csrf');
  return res;
}
