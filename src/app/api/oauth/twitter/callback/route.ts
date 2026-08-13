import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';
import {
  decodeOAuthState,
  getPublicAppUrl,
  renderOAuthErrorPage,
  renderOAuthSuccessPage,
} from '@/lib/social/oauth-page';
import { logActivity } from '@/lib/activity-log';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

/**
 * GET /api/oauth/twitter/callback
 *
 * X redirects here with `?code=...&state=...` after the user grants consent.
 * We:
 *
 *   1. Verify state (CSRF + 10-min expiry + provider='twitter').
 *   2. Extract the PKCE `code_verifier` from the state payload (it was
 *      embedded there during /api/oauth/twitter so we don't need a
 *      server-side session store).
 *   3. Look up the superadmin X OAuth app credentials.
 *   4. Exchange code + code_verifier for access_token + refresh_token.
 *      POST /2/oauth2/token with `Content-Type: application/x-www-form-urlencoded`.
 *      If clientSecret is configured (confidential client), use HTTP Basic
 *      auth; otherwise send client_id in the form body (public client).
 *   5. Fetch the user profile (`/2/users/me`).
 *   6. Upsert a SocialAccount row with:
 *        platform:      'twitter'
 *        accountId:     userId
 *        accountName:   username
 *        accessToken:   encrypted
 *        refreshToken:  encrypted (X issues refresh tokens when offline.access scope granted)
 *        tokenExpiry:   now + 7200 seconds (X access tokens expire in 2 hours)
 *        scopes:        the granted scopes
 *        metadata:      { handle, accountType: 'twitter' }
 *   7. Render a success page that posts to window.opener and auto-closes.
 *
 * NOTE: The 2-hour access-token expiry means the publisher's
 * `refreshExpiredToken` helper will silently refresh tokens on every
 * publish — users never need to reconnect X (until they revoke access
 * or the refresh token expires in ~18 months).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // 1. Provider-side error.
  if (errorParam) {
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: `X denied authorization: ${errorDescription || errorParam}`,
    });
  }

  if (!code || !stateParam) {
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: 'Missing authorization code or state parameter.',
    });
  }

  // 2. Verify state + extract PKCE code_verifier.
  const state = decodeOAuthState(stateParam, 'twitter');
  if (!state) {
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: 'Invalid or expired state parameter — please retry.',
    });
  }
  const codeVerifier = state.v?.codeVerifier;
  if (typeof codeVerifier !== 'string' || !codeVerifier) {
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: 'Missing PKCE code_verifier in state — please retry.',
    });
  }

  // 3. Look up the superadmin OAuth app credentials.
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'twitter', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred) {
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: 'X (Twitter) OAuth app credentials are no longer configured.',
    });
  }

  const meta = OAUTH_PROVIDERS.twitter;
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/twitter/callback`;

  // 4. Exchange code + code_verifier for tokens.
  let tokenResponse: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
  try {
    const formBody = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: cred.clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    // Confidential client: send Basic auth (client_id:client_secret base64)
    // instead of client_id in the form body. X supports both patterns.
    if (cred.clientSecret) {
      const basic = Buffer.from(
        `${cred.clientId}:${cred.clientSecret}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
      // When Basic auth is used, client_id should NOT also be in the body.
      formBody.delete('client_id');
    }

    const res = await fetch(meta.tokenUrl, {
      method: 'POST',
      headers,
      body: formBody,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>');
      console.error(
        '[oauth/twitter/callback] Token exchange failed:',
        res.status,
        errText,
      );
      return renderOAuthErrorPage({
        provider: 'twitter',
        message: `X token exchange failed (${res.status}).`,
      });
    }
    tokenResponse = await res.json();
    if (!tokenResponse.access_token) {
      return renderOAuthErrorPage({
        provider: 'twitter',
        message: 'X did not return an access token.',
      });
    }
  } catch (err) {
    console.error('[oauth/twitter/callback] Token exchange error:', err);
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: 'Network error during X token exchange.',
    });
  }

  const accessToken = tokenResponse.access_token;
  const refreshToken = tokenResponse.refresh_token || null;
  // X access tokens expire in 2 hours (7200 seconds).
  const tokenExpiry = new Date(
    Date.now() + (tokenResponse.expires_in || 7200) * 1000,
  );
  const scopes = tokenResponse.scope || meta.scopes;

  // 5. Fetch the user profile.
  interface TwitterUserResponse {
    data?: {
      id: string;
      name: string;
      username: string;
    };
  }
  let profile: TwitterUserResponse['data'];
  try {
    const res = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>');
      console.error(
        '[oauth/twitter/callback] /2/users/me failed:',
        res.status,
        errText,
      );
      return renderOAuthErrorPage({
        provider: 'twitter',
        message: `Failed to fetch X profile (${res.status}).`,
      });
    }
    const data = (await res.json()) as TwitterUserResponse;
    profile = data?.data;
    if (!profile?.id) {
      return renderOAuthErrorPage({
        provider: 'twitter',
        message: 'X profile response missing user id.',
      });
    }
  } catch (err) {
    console.error('[oauth/twitter/callback] /2/users/me error:', err);
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: 'Network error fetching X profile.',
    });
  }

  // 6. Upsert SocialAccount row.
  const tenantId = state.tenantId;
  const connectedById = state.userId;

  const accountName = profile.name || profile.username || `X user ${profile.id}`;
  const handle = profile.username ? `@${profile.username}` : null;

  const encryptedAccess = encryptToken(accessToken);
  const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : null;

  const metadata = {
    handle,
    username: profile.username || null,
    accountType: 'twitter',
    // pkceVerifier: null — do NOT store; the verifier is per-session only.
  };

  let accountRecord: { id: string };
  try {
    accountRecord = await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId,
          platform: 'twitter',
          accountId: profile.id,
        },
      },
      create: {
        tenantId,
        platform: 'twitter',
        accountId: profile.id,
        accountName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        scopes,
        metadata: JSON.stringify(metadata),
        connectedById,
        isActive: true,
      },
      update: {
        accountName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        scopes,
        metadata: JSON.stringify(metadata),
        connectedById,
        isActive: true,
      },
      select: { id: true },
    });
  } catch (err) {
    console.error('[oauth/twitter/callback] Failed to upsert account:', err);
    return renderOAuthErrorPage({
      provider: 'twitter',
      message: 'Failed to store X account. Please retry.',
    });
  }

  await logActivity({
    tenantId,
    actorId: connectedById,
    actorType: 'user',
    action: 'create',
    entityType: 'social_account',
    entityId: accountRecord.id,
    entityName: `twitter:${accountName}`,
    description: `Connected X (Twitter) account "${accountName}"${handle ? ` (${handle})` : ''}.`,
    severity: 'info',
  }).catch(() => {});

  // 7. Render success page.
  return renderOAuthSuccessPage({
    provider: 'twitter',
    accountLabel: handle ? `${handle} (${accountName})` : accountName,
  });
}
