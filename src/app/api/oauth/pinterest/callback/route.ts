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
 * GET /api/oauth/pinterest/callback
 *
 * Pinterest redirects here with `?code=...&state=...` after the user grants
 * consent. We:
 *
 *   1. Verify state (CSRF + 10-min expiry + provider='pinterest').
 *   2. Look up the superadmin Pinterest OAuth app credentials.
 *   3. Exchange the code for an access_token + refresh_token using HTTP
 *      Basic auth (client_id:client_secret base64).
 *   4. Fetch the user account profile (`/v5/user_account`).
 *   5. Fetch the user's boards (`/v5/boards?page_size=50`) so we can store
 *      a default board ID + the full board list in metadata.
 *   6. Upsert a SocialAccount row with:
 *        platform:      'pinterest'
 *        accountId:     userId
 *        accountName:   username
 *        accessToken:   encrypted
 *        refreshToken:  encrypted
 *        tokenExpiry:   now + expires_in (1 year default)
 *        scopes:        the granted scopes
 *        metadata:      { defaultBoardId, boards: [{id, name}] }
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
      provider: 'pinterest',
      message: `Pinterest denied authorization: ${errorDescription || errorParam}`,
    });
  }

  if (!code || !stateParam) {
    return renderOAuthErrorPage({
      provider: 'pinterest',
      message: 'Missing authorization code or state parameter.',
    });
  }

  // 2. Verify state.
  const state = decodeOAuthState(stateParam, 'pinterest');
  if (!state) {
    return renderOAuthErrorPage({
      provider: 'pinterest',
      message: 'Invalid or expired state parameter — please retry.',
    });
  }

  // 3. Look up the superadmin OAuth app credentials.
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'pinterest', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred) {
    return renderOAuthErrorPage({
      provider: 'pinterest',
      message: 'Pinterest OAuth app credentials are no longer configured.',
    });
  }

  const meta = OAUTH_PROVIDERS.pinterest;
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/pinterest/callback`;

  // 4. Exchange code for tokens (Pinterest v5 requires Basic auth).
  let tokenResponse: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
  try {
    const basic = Buffer.from(
      `${cred.clientId}:${cred.clientSecret}`,
    ).toString('base64');
    const res = await fetch(meta.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>');
      console.error(
        '[oauth/pinterest/callback] Token exchange failed:',
        res.status,
        errText,
      );
      return renderOAuthErrorPage({
        provider: 'pinterest',
        message: `Pinterest token exchange failed (${res.status}).`,
      });
    }
    tokenResponse = await res.json();
    if (!tokenResponse.access_token) {
      return renderOAuthErrorPage({
        provider: 'pinterest',
        message: 'Pinterest did not return an access token.',
      });
    }
  } catch (err) {
    console.error('[oauth/pinterest/callback] Token exchange error:', err);
    return renderOAuthErrorPage({
      provider: 'pinterest',
      message: 'Network error during Pinterest token exchange.',
    });
  }

  const accessToken = tokenResponse.access_token;
  const refreshToken = tokenResponse.refresh_token || null;
  // Pinterest v5 access tokens typically expire in ~1 year (31536000 s).
  const tokenExpiry = new Date(
    Date.now() + (tokenResponse.expires_in || 31536000) * 1000,
  );
  const scopes = tokenResponse.scope || meta.scopes;

  // 5. Fetch the user account profile.
  interface PinterestUserAccount {
    account_id?: string;
    username?: string;
    business_name?: string;
    account_type?: string;
  }
  let profile: PinterestUserAccount;
  try {
    const res = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>');
      console.error(
        '[oauth/pinterest/callback] /v5/user_account failed:',
        res.status,
        errText,
      );
      return renderOAuthErrorPage({
        provider: 'pinterest',
        message: `Failed to fetch Pinterest profile (${res.status}).`,
      });
    }
    profile = await res.json() as PinterestUserAccount;
    if (!profile?.account_id) {
      return renderOAuthErrorPage({
        provider: 'pinterest',
        message: 'Pinterest profile response missing account_id.',
      });
    }
  } catch (err) {
    console.error('[oauth/pinterest/callback] /v5/user_account error:', err);
    return renderOAuthErrorPage({
      provider: 'pinterest',
      message: 'Network error fetching Pinterest profile.',
    });
  }

  // 6. Fetch the user's boards (best-effort — failure doesn't block).
  interface PinterestBoardsResponse {
    items?: Array<{
      id: string;
      name: string;
      privacy?: string;
    }>;
  }
  let boards: Array<{ id: string; name: string }> = [];
  try {
    const res = await fetch(
      'https://api.pinterest.com/v5/boards?page_size=50',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.ok) {
      const data = (await res.json()) as PinterestBoardsResponse;
      if (Array.isArray(data?.items)) {
        boards = data.items
          .filter((b) => b?.id && b?.name)
          .map((b) => ({ id: String(b.id), name: String(b.name) }));
      }
    }
    // Non-OK is non-fatal — user might not have created any boards yet.
  } catch (err) {
    console.warn(
      '[oauth/pinterest/callback] /v5/boards error (non-fatal):',
      err,
    );
  }

  // 7. Upsert SocialAccount row.
  const tenantId = state.tenantId;
  const connectedById = state.userId;

  const accountName =
    profile.username ||
    profile.business_name ||
    `Pinterest user ${profile.account_id}`;

  const encryptedAccess = encryptToken(accessToken);
  const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : null;

  const defaultBoardId = boards[0]?.id || null;
  const metadata = {
    defaultBoardId,
    boards: boards.map((b) => ({ id: b.id, name: b.name })),
    accountType: profile.account_type || 'PINNER',
    businessName: profile.business_name || null,
    handle: profile.username || null,
  };

  let accountRecord: { id: string };
  try {
    accountRecord = await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId,
          platform: 'pinterest',
          accountId: String(profile.account_id),
        },
      },
      create: {
        tenantId,
        platform: 'pinterest',
        accountId: String(profile.account_id),
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
    console.error(
      '[oauth/pinterest/callback] Failed to upsert account:',
      err,
    );
    return renderOAuthErrorPage({
      provider: 'pinterest',
      message: 'Failed to store Pinterest account. Please retry.',
    });
  }

  await logActivity({
    tenantId,
    actorId: connectedById,
    actorType: 'user',
    action: 'create',
    entityType: 'social_account',
    entityId: accountRecord.id,
    entityName: `pinterest:${accountName}`,
    description: `Connected Pinterest account "${accountName}".`,
    severity: 'info',
  }).catch(() => {});

  // 8. Render success page.
  const note =
    boards.length === 0
      ? 'No boards found — create a board on Pinterest before publishing pins.'
      : `${boards.length} board${boards.length === 1 ? '' : 's'} available`;

  return renderOAuthSuccessPage({
    provider: 'pinterest',
    accountLabel: accountName,
    note,
  });
}
