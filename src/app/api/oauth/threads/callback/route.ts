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

/**
 * GET /api/oauth/threads/callback
 *
 * Meta Threads redirects here with `?code=...&state=...` after the user grants
 * consent. We:
 *
 *   1. Verify state (CSRF + 10-min expiry + provider='threads').
 *   2. Look up the superadmin Threads OAuth app credentials.
 *   3. Exchange the code for a short-lived access_token at `https://graph.threads.net/oauth/access_token`.
 *   4. Exchange the short-lived token for a 60-day long-lived token at `https://graph.threads.net/access_token`.
 *   5. Fetch the user's Threads profile (`https://graph.threads.net/v1.0/me`).
 *   6. Upsert a SocialAccount row with:
 *        platform:      'threads'
 *        accountId:     profile.id
 *        accountName:   `@${profile.username}`
 *        accessToken:   encrypted
 *        tokenExpiry:   now + expires_in (60 days default)
 *        scopes:        'threads_basic,threads_content_publish'
 *        metadata:      { username, name, profilePictureUrl }
 *   7. Render a success page that posts to window.opener and auto-closes.
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
      provider: 'threads',
      message: `Threads denied authorization: ${errorDescription || errorParam}`,
    });
  }

  if (!code || !stateParam) {
    return renderOAuthErrorPage({
      provider: 'threads',
      message: 'Missing authorization code or state parameter.',
    });
  }

  // 2. Verify state.
  const state = decodeOAuthState(stateParam, 'threads');
  if (!state) {
    return renderOAuthErrorPage({
      provider: 'threads',
      message: 'Invalid or expired state parameter — please retry.',
    });
  }

  // 3. Look up superadmin OAuth app credentials.
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'threads', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });

  const clientId =
    cred?.clientId ||
    process.env.THREADS_APP_ID ||
    process.env.THREADS_CLIENT_ID ||
    process.env.FACEBOOK_APP_ID ||
    process.env.META_APP_ID;

  const clientSecret =
    cred?.clientSecret ||
    process.env.THREADS_APP_SECRET ||
    process.env.THREADS_CLIENT_SECRET ||
    process.env.FACEBOOK_APP_SECRET ||
    process.env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    return renderOAuthErrorPage({
      provider: 'threads',
      message:
        'Threads OAuth credentials are not configured. Please configure them in SuperAdmin Integration Credentials or server environment.',
    });
  }

  // 4. Resolve redirect URI.
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/threads/callback`;

  // 5. Exchange code for short-lived access token.
  let shortLivedToken = '';
  let userId = '';
  try {
    const tokenParams = new URLSearchParams();
    tokenParams.set('client_id', clientId);
    tokenParams.set('client_secret', clientSecret);
    tokenParams.set('grant_type', 'authorization_code');
    tokenParams.set('redirect_uri', redirectUri);
    tokenParams.set('code', code);

    const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[oauth/threads/callback] Token exchange error:', errBody);
      return renderOAuthErrorPage({
        provider: 'threads',
        message: `Failed to exchange authorization code: ${errBody}`,
      });
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string; user_id?: string | number };
    shortLivedToken = tokenData.access_token || '';
    userId = String(tokenData.user_id || '');
  } catch (err) {
    console.error('[oauth/threads/callback] Fetch token error:', err);
    return renderOAuthErrorPage({
      provider: 'threads',
      message: 'Network error while exchanging Threads authorization code.',
    });
  }

  if (!shortLivedToken) {
    return renderOAuthErrorPage({
      provider: 'threads',
      message: 'Threads did not return an access token.',
    });
  }

  // 6. Exchange short-lived token for 60-day long-lived token.
  let longLivedToken = shortLivedToken;
  let expiresIn = 60 * 24 * 60 * 60; // 60 days in seconds

  try {
    const exchangeUrl = new URL('https://graph.threads.net/access_token');
    exchangeUrl.searchParams.set('grant_type', 'th_exchange_token');
    exchangeUrl.searchParams.set('client_secret', clientSecret);
    exchangeUrl.searchParams.set('access_token', shortLivedToken);

    const exchangeRes = await fetch(exchangeUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (exchangeRes.ok) {
      const exchangeData = (await exchangeRes.json()) as { access_token?: string; expires_in?: number };
      if (exchangeData.access_token) {
        longLivedToken = exchangeData.access_token;
        if (typeof exchangeData.expires_in === 'number') {
          expiresIn = exchangeData.expires_in;
        }
      }
    }
  } catch (exchangeErr) {
    console.warn('[oauth/threads/callback] Long-lived exchange error (fallback to short token):', exchangeErr);
  }

  // 7. Fetch user profile.
  let profile = { id: userId, username: 'threads_user', name: '' };
  try {
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${encodeURIComponent(
        longLivedToken,
      )}`,
      { headers: { Accept: 'application/json' } },
    );
    if (profileRes.ok) {
      const data = (await profileRes.json()) as {
        id?: string;
        username?: string;
        name?: string;
        threads_profile_picture_url?: string;
      };
      profile = {
        id: data.id || userId,
        username: data.username || 'threads_user',
        name: data.name || '',
      };
    }
  } catch (profErr) {
    console.warn('[oauth/threads/callback] Fetch profile warning:', profErr);
  }

  // 8. Upsert SocialAccount row.
  const tenantId = state.tenantId;
  const connectedById = state.userId;
  const accountName = profile.username ? `@${profile.username}` : `Threads ${profile.id}`;
  const encryptedAccess = encryptToken(longLivedToken);
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

  const metadata = {
    threadsUserId: profile.id,
    username: profile.username,
    name: profile.name,
  };

  try {
    await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId,
          platform: 'threads',
          accountId: String(profile.id),
        },
      },
      create: {
        tenantId,
        platform: 'threads',
        accountId: String(profile.id),
        accountName,
        accessToken: encryptedAccess,
        refreshToken: null,
        tokenExpiry,
        scopes: 'threads_basic,threads_content_publish',
        metadata: JSON.stringify(metadata),
        connectedById,
        isActive: true,
      },
      update: {
        accountName,
        accessToken: encryptedAccess,
        tokenExpiry,
        scopes: 'threads_basic,threads_content_publish',
        metadata: JSON.stringify(metadata),
        connectedById,
        isActive: true,
      },
    });

    await logActivity({
      tenantId,
      userId: connectedById,
      action: 'social_account.connected',
      entityType: 'SocialAccount',
      details: { platform: 'threads', accountName, accountId: String(profile.id) },
    }).catch(() => {});
  } catch (dbErr) {
    console.error('[oauth/threads/callback] Failed to upsert SocialAccount:', dbErr);
    return renderOAuthErrorPage({
      provider: 'threads',
      message: 'Failed to save connected Threads account to database.',
    });
  }

  // 9. Render success page.
  return renderOAuthSuccessPage({
    provider: 'threads',
    accountLabel: accountName,
    note: 'Your Meta Threads account is now connected and ready for publishing.',
  });
}
