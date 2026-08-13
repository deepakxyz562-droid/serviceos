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
 * GET /api/oauth/linkedin/callback
 *
 * LinkedIn redirects here with `?code=...&state=...` after the user grants
 * consent. We:
 *
 *   1. Verify state (CSRF + 10-min expiry + provider='linkedin').
 *   2. Look up the superadmin LinkedIn OAuth app credentials.
 *   3. Exchange the code for an access_token (+ optional refresh_token).
 *   4. Fetch the user's personal profile (`/v2/me`).
 *   5. Fetch the organizations the user admins (`/v2/organizationalRoleAcls`).
 *   6. Upsert a SocialAccount for the personal profile (authorUrn=urn:li:person:{id}).
 *   7. Upsert a SocialAccount for each company page (authorUrn=urn:li:organization:{id}).
 *   8. Render a success page that posts to window.opener and auto-closes.
 *
 * Each SocialAccount gets:
 *   - platform:      'linkedin'
 *   - accountId:     personId | orgId
 *   - accountName:   "Jane Doe" (personal) | "Acme Corp" (org)
 *   - accessToken:   encrypted
 *   - refreshToken:  encrypted (only if LinkedIn returns one)
 *   - tokenExpiry:   now + expires_in seconds (typically 60 days)
 *   - scopes:        the granted scopes
 *   - metadata:      { authorUrn, type: 'personal' | 'organization' }
 *
 * Why we upsert multiple accounts from one OAuth flow:
 *   LinkedIn allows posting as either the member OR a company page they
 *   admin. We store both so the post composer can offer "Post as: [Personal]
 *   [Acme Corp]" without a second OAuth round-trip.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // 1. Provider-side error (user denied, app misconfigured, etc.)
  if (errorParam) {
    return renderOAuthErrorPage({
      provider: 'linkedin',
      message: `LinkedIn denied authorization: ${errorDescription || errorParam}`,
    });
  }

  if (!code || !stateParam) {
    return renderOAuthErrorPage({
      provider: 'linkedin',
      message: 'Missing authorization code or state parameter.',
    });
  }

  // 2. Verify state (CSRF + expiry + provider match).
  const state = decodeOAuthState(stateParam, 'linkedin');
  if (!state) {
    return renderOAuthErrorPage({
      provider: 'linkedin',
      message: 'Invalid or expired state parameter — please retry.',
    });
  }

  // 3. Look up the superadmin OAuth app credentials.
  const cred = await db.integrationCredential.findFirst({
    where: { provider: 'linkedin', status: 'active' },
    select: { clientId: true, clientSecret: true },
  });
  if (!cred) {
    return renderOAuthErrorPage({
      provider: 'linkedin',
      message: 'LinkedIn OAuth app credentials are no longer configured.',
    });
  }

  const meta = OAUTH_PROVIDERS.linkedin;
  const appUrl = getPublicAppUrl(request);
  const redirectUri = `${appUrl}/api/oauth/linkedin/callback`;

  // 4. Exchange code for tokens.
  let tokenResponse: {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };
  try {
    const res = await fetch(meta.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: cred.clientId,
        client_secret: cred.clientSecret,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>');
      console.error(
        '[oauth/linkedin/callback] Token exchange failed:',
        res.status,
        errText,
      );
      return renderOAuthErrorPage({
        provider: 'linkedin',
        message: `LinkedIn token exchange failed (${res.status}).`,
      });
    }
    tokenResponse = await res.json();
    if (!tokenResponse.access_token) {
      return renderOAuthErrorPage({
        provider: 'linkedin',
        message: 'LinkedIn did not return an access token.',
      });
    }
  } catch (err) {
    console.error('[oauth/linkedin/callback] Token exchange error:', err);
    return renderOAuthErrorPage({
      provider: 'linkedin',
      message: 'Network error during LinkedIn token exchange.',
    });
  }

  const accessToken = tokenResponse.access_token;
  const refreshToken = tokenResponse.refresh_token || null;
  const tokenExpiry = new Date(
    Date.now() + (tokenResponse.expires_in || 5184000) * 1000,
  );
  const scopes = tokenResponse.scope || meta.scopes;

  // 5. Fetch the user's personal profile.
  interface LinkedinProfile {
    id: string;
    localizedFirstName?: string;
    localizedLastName?: string;
  }
  let profile: LinkedinProfile;
  try {
    const res = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>');
      console.error(
        '[oauth/linkedin/callback] /v2/me failed:',
        res.status,
        errText,
      );
      return renderOAuthErrorPage({
        provider: 'linkedin',
        message: `Failed to fetch LinkedIn profile (${res.status}).`,
      });
    }
    profile = await res.json() as LinkedinProfile;
    if (!profile?.id) {
      return renderOAuthErrorPage({
        provider: 'linkedin',
        message: 'LinkedIn profile response missing id.',
      });
    }
  } catch (err) {
    console.error('[oauth/linkedin/callback] /v2/me error:', err);
    return renderOAuthErrorPage({
      provider: 'linkedin',
      message: 'Network error fetching LinkedIn profile.',
    });
  }

  // 6. Fetch the organizations the user admins.
  interface LinkedinOrgsResponse {
    elements?: Array<{
      organizationalTarget?: string; // URN like "urn:li:organization:12345"
      'organizationalTarget~'?: {
        id?: string | number;
        localizedName?: string;
      };
    }>;
  }
  let organizations: Array<{ id: string; name: string }> = [];
  try {
    const orgsUrl =
      'https://api.linkedin.com/v2/organizationalRoleAcls' +
      '?q=roleAssignee&role=ADMINISTRATOR' +
      '&projection=*(elements*(organizationalTarget~(id,localizedName)))';
    const res = await fetch(orgsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    if (res.ok) {
      const data = (await res.json()) as LinkedinOrgsResponse;
      if (Array.isArray(data?.elements)) {
        organizations = data.elements
          .map((el) => {
            const org = el['organizationalTarget~'];
            if (!org?.id || !org?.localizedName) return null;
            return { id: String(org.id), name: String(org.localizedName) };
          })
          .filter(
            (o): o is { id: string; name: string } => o !== null,
          );
      }
    }
    // Non-OK response is non-fatal — the user might just not admin any pages.
    // We proceed with the personal profile only.
  } catch (err) {
    console.warn(
      '[oauth/linkedin/callback] /v2/organizationalRoleAcls error (non-fatal):',
      err,
    );
  }

  // 7. Upsert SocialAccount rows for personal profile + each org.
  const tenantId = state.tenantId;
  const connectedById = state.userId;

  const firstName = profile.localizedFirstName || '';
  const lastName = profile.localizedLastName || '';
  const personalName = `${firstName} ${lastName}`.trim() || `LinkedIn user ${profile.id}`;

  const encryptedAccess = encryptToken(accessToken);
  const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : null;

  const accountsConnected: string[] = [];

  // 7a. Personal profile account.
  try {
    const personalAccount = await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId,
          platform: 'linkedin',
          accountId: profile.id,
        },
      },
      create: {
        tenantId,
        platform: 'linkedin',
        accountId: profile.id,
        accountName: personalName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        scopes,
        metadata: JSON.stringify({
          authorUrn: `urn:li:person:${profile.id}`,
          type: 'personal',
        }),
        connectedById,
        isActive: true,
      },
      update: {
        accountName: personalName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        scopes,
        metadata: JSON.stringify({
          authorUrn: `urn:li:person:${profile.id}`,
          type: 'personal',
        }),
        connectedById,
        isActive: true,
      },
      select: { id: true },
    });
    accountsConnected.push(`${personalName} (personal)`);

    await logActivity({
      tenantId,
      actorId: connectedById,
      actorType: 'user',
      action: 'create',
      entityType: 'social_account',
      entityId: personalAccount.id,
      entityName: `linkedin:${personalName}`,
      description: `Connected LinkedIn personal profile "${personalName}".`,
      severity: 'info',
    }).catch(() => {});
  } catch (err) {
    console.error(
      '[oauth/linkedin/callback] Failed to upsert personal account:',
      err,
    );
    return renderOAuthErrorPage({
      provider: 'linkedin',
      message: 'Failed to store LinkedIn personal profile. Please retry.',
    });
  }

  // 7b. Each company page account (best-effort — failures don't block).
  for (const org of organizations) {
    try {
      const orgAccount = await db.socialAccount.upsert({
        where: {
          tenantId_platform_accountId: {
            tenantId,
            platform: 'linkedin',
            accountId: org.id,
          },
        },
        create: {
          tenantId,
          platform: 'linkedin',
          accountId: org.id,
          accountName: org.name,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiry,
          scopes,
          metadata: JSON.stringify({
            authorUrn: `urn:li:organization:${org.id}`,
            type: 'organization',
          }),
          connectedById,
          isActive: true,
        },
        update: {
          accountName: org.name,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiry,
          scopes,
          metadata: JSON.stringify({
            authorUrn: `urn:li:organization:${org.id}`,
            type: 'organization',
          }),
          connectedById,
          isActive: true,
        },
        select: { id: true },
      });
      accountsConnected.push(`${org.name} (page)`);

      await logActivity({
        tenantId,
        actorId: connectedById,
        actorType: 'user',
        action: 'create',
        entityType: 'social_account',
        entityId: orgAccount.id,
        entityName: `linkedin:${org.name}`,
        description: `Connected LinkedIn company page "${org.name}".`,
        severity: 'info',
      }).catch(() => {});
    } catch (err) {
      console.warn(
        `[oauth/linkedin/callback] Failed to upsert org ${org.id} (non-fatal):`,
        err,
      );
    }
  }

  // 8. Render success page.
  const primaryLabel = accountsConnected[0] || personalName;
  const note =
    accountsConnected.length > 1
      ? `${accountsConnected.length} accounts connected: ${accountsConnected.join(', ')}`
      : undefined;

  return renderOAuthSuccessPage({
    provider: 'linkedin',
    accountLabel: primaryLabel,
    note,
  });
}
