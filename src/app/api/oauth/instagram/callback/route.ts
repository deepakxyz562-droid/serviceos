import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';
import { logActivity } from '@/lib/activity-log';

/**
 * GET /api/oauth/instagram/callback
 *
 * OAuth callback for Instagram Business publishing.
 *
 * Meta redirects here with `?code={authCode}&state={state}` after the
 * user consents. We:
 *   1. Validate state (CSRF cookie match + not expired + flow='publishing'
 *      + platform='instagram').
 *   2. Exchange the auth code for a user access token at Meta's token
 *      endpoint (same as the FB flow — IG uses the same Meta token
 *      endpoint).
 *   3. List the user's FB Pages:
 *        GET /me/accounts?access_token={userToken}
 *      IG Business Accounts are linked to FB Pages, so we need to
 *      enumerate Pages first.
 *   4. For each Page, look up its linked IG Business Account:
 *        GET /{pageId}?fields=instagram_business_account&access_token={pageToken}
 *      If the Page has no IG Business Account linked, we skip it (only
 *      Pages with a linked IG Business can publish via the Content
 *      Publishing API).
 *   5. For each IG Business Account, look up its username + profile pic:
 *        GET /{igBusinessId}?fields=username,profile_picture_url&access_token={pageToken}
 *   6. Store each IG Business Account as a SocialAccount row:
 *        - platform: 'instagram'
 *        - accountId: igBusinessId
 *        - accountName: igUsername (or igBusinessId if username missing)
 *        - accessToken: encrypted PAGE token (IG publishing uses the FB
 *          Page token, NOT a separate IG token — the Content Publishing
 *          API accepts the Page token as long as the IG Business Account
 *          is linked to that Page)
 *        - metadata: { igBusinessId, pageId }
 *   7. Redirect back to /dashboard?view=social-accounts&connected=instagram.
 *
 * AUTH MODEL: Same as the FB callback — no getAuthUser() call. The state
 * blob is the source of truth for tenantId + userId; the csrf-cookie
 * check proves it was minted by our connect route.
 *
 * KNOWN INTERACTION WITH LEGACY IG DM OAUTH:
 *   This file (static) shadows the dynamic `/api/oauth/[provider]/callback`
 *   route for the `instagram` provider. If a user clicks "Connect
 *   Instagram" in the omnichannel channels-view (messaging), the connect
 *   step still hits the dynamic `[provider]/connect` route (messaging
 *   scopes), but the callback would now arrive HERE. We detect this via
 *   `state.flow !== 'publishing'` and return a clear error message
 *   directing the user to the appropriate UI — graceful degradation
 *   rather than silently storing messaging tokens in the publishing
 *   SocialAccount table.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // ── 1. Handle Meta-side error (user denied consent, etc.) ──────────────
  if (errorParam) {
    return renderErrorPage(`Meta denied authorization: ${errorParam}`);
  }
  if (!code || !stateParam) {
    return renderErrorPage('Missing authorization code or state parameter.');
  }

  // ── 2. Validate state ──────────────────────────────────────────────────
  let state: {
    tenantId?: string;
    userId?: string;
    csrf?: string;
    expires?: number;
    flow?: string;
    platform?: string;
    // Legacy DM connect route uses { provider, ts } instead of { flow, expires }.
    provider?: string;
    ts?: number;
    returnUrl?: string;
    redirectUri?: string;
  };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return renderErrorPage('Invalid state parameter — could not decode.');
  }

  // Detect legacy Instagram DM connect state shape ({ provider, ts })
  // and refuse with a clear message — see "KNOWN INTERACTION" comment
  // above. This prevents silently storing messaging-scope tokens in the
  // publishing SocialAccount table.
  if (state.flow !== 'publishing' || state.platform !== 'instagram') {
    return renderErrorPage(
      'This OAuth callback is for Instagram publishing only. ' +
        'If you were trying to connect Instagram Direct Messages, please use the Omnichannel → Channels page.',
    );
  }

  if (!state.tenantId || !state.userId || !state.csrf || !state.expires) {
    return renderErrorPage('Invalid state — missing required fields.');
  }
  if (Date.now() > state.expires) {
    return renderErrorPage(
      'Authorization timed out — please reconnect from the dashboard.',
    );
  }
  // CSRF: the cookie set on /connect MUST match the csrf in the state.
  const cookieCsrf = request.cookies.get('ig_oauth_csrf')?.value;
  if (!cookieCsrf || cookieCsrf !== state.csrf) {
    return renderErrorPage('CSRF validation failed — please reconnect.');
  }

  // ── 3. Look up Meta OAuth app credentials ──────────────────────────────
  // Same Meta App as FB. Prefer 'instagram' entry, fall back to 'facebook'.
  const cred = await db.integrationCredential.findFirst({
    where: {
      provider: { in: ['instagram', 'facebook'] },
      status: 'active',
    },
    select: {
      clientId: true,
      clientSecret: true,
      redirectUri: true,
      scopes: true,
      provider: true,
    },
    orderBy: { provider: 'desc' }, // 'instagram' before 'facebook' alphabetically reversed
  });

  const clientId = (
    cred?.clientId ||
    process.env.INSTAGRAM_CLIENT_ID ||
    process.env.INSTAGRAM_APP_ID ||
    process.env.META_CLIENT_ID ||
    process.env.META_APP_ID ||
    process.env['META_APP_ID '] ||
    process.env.FACEBOOK_APP_ID ||
    process.env.FACEBOOK_CLIENT_ID
  )?.trim();

  const clientSecret = (
    cred?.clientSecret ||
    process.env.INSTAGRAM_CLIENT_SECRET ||
    process.env.INSTAGRAM_APP_SECRET ||
    process.env.META_CLIENT_SECRET ||
    process.env.META_APP_SECRET ||
    process.env['META_APP_SECRET '] ||
    process.env.FACEBOOK_APP_SECRET ||
    process.env.FACEBOOK_CLIENT_SECRET
  )?.trim();

  if (!clientId || !clientSecret) {
    return renderErrorPage(
      'Platform credentials for Instagram are not configured. Ask a platform admin to register the Meta App credentials in SuperAdmin Integration Credentials or server environment.',
    );
  }

  // ── 4. Resolve redirect URI (must match the one used in /connect) ──────
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    getAppUrlFromRequest(request);
  const redirectUri = state.redirectUri || (cred?.redirectUri
    ? cred.redirectUri
    : `${appUrl}/api/oauth/instagram/callback`);

  // ── 5. Exchange auth code for a user access token ──────────────────────
  //
  // GET https://graph.facebook.com/v18.0/oauth/access_token
  //   ?client_id={appId}&client_secret={appSecret}
  //   &redirect_uri={callbackUrl}&code={authCode}
  let userAccessToken: string;
  try {
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenReq = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!tokenReq.ok) {
      const errText = await tokenReq.text().catch(() => '');
      console.error(
        '[oauth/instagram/callback] Token exchange failed:',
        tokenReq.status,
        errText,
      );
      return renderErrorPage(
        `Meta rejected the authorization code (HTTP ${tokenReq.status}). ` +
          'This usually means the code expired or was already used — please reconnect.',
      );
    }
    const tokenBody = (await tokenReq.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      return renderErrorPage('Meta did not return an access token.');
    }
    userAccessToken = tokenBody.access_token;
  } catch (err) {
    console.error('[oauth/instagram/callback] Token exchange error:', err);
    return renderErrorPage('Network error while exchanging the authorization code.');
  }

  // ── 6. List the user's FB Pages (IG Business Accounts are linked to Pages)
  let pages: Array<{
    id: string;
    name: string;
    access_token: string;
  }>;
  try {
    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', userAccessToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token');
    const pagesReq = await fetch(pagesUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!pagesReq.ok) {
      const errText = await pagesReq.text().catch(() => '');
      console.error(
        '[oauth/instagram/callback] /me/accounts failed:',
        pagesReq.status,
        errText,
      );
      return renderErrorPage(
        `Failed to list your Facebook Pages (HTTP ${pagesReq.status}). ` +
          'Instagram publishing requires a Facebook Page with a linked Instagram Business Account.',
      );
    }
    const pagesBody = (await pagesReq.json()) as {
      data?: Array<{ id: string; name: string; access_token: string }>;
    };
    pages = Array.isArray(pagesBody.data) ? pagesBody.data : [];
  } catch (err) {
    console.error('[oauth/instagram/callback] /me/accounts error:', err);
    return renderErrorPage('Network error while listing your Facebook Pages.');
  }

  if (pages.length === 0) {
    return renderErrorPage(
      'Your Facebook account does not manage any Pages. Instagram publishing requires a Facebook Page with a linked Instagram Business Account — see https://www.facebook.com/business/help/502981923230522.',
    );
  }

  // ── 7. For each Page, look up its linked IG Business Account ───────────
  //
  // GET /{pageId}?fields=instagram_business_account{id,username,name,profile_picture_url},connected_instagram_account{id,username,name}&access_token={pageToken}
  //
  // Returns: { instagram_business_account: { id: "1789...", ... } } if the Page
  // has a linked IG Business Account, or { } (empty) if it doesn't.
  //
  // Diagnostic tracking for clearer user troubleshooting:
  const pageDiagnostics: Array<{
    pageId: string;
    pageName: string;
    hasPersonalIg: boolean;
    personalIgUsername?: string;
  }> = [];

  const igAccountLookups = await Promise.allSettled(
    pages.map(async (page) => {
      const lookupUrl = new URL(`https://graph.facebook.com/v18.0/${page.id}`);
      lookupUrl.searchParams.set(
        'fields',
        'instagram_business_account{id,username,name,profile_picture_url},connected_instagram_account{id,username,name}',
      );
      lookupUrl.searchParams.set('access_token', page.access_token);
      const res = await fetch(lookupUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Lookup IG for Page ${page.id} failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const body = (await res.json()) as {
        instagram_business_account?: {
          id: string;
          username?: string;
          name?: string;
          profile_picture_url?: string;
        };
        connected_instagram_account?: {
          id: string;
          username?: string;
          name?: string;
        };
      };

      const hasBusiness = !!body.instagram_business_account?.id;
      const hasPersonal = !!body.connected_instagram_account?.id && !hasBusiness;

      pageDiagnostics.push({
        pageId: page.id,
        pageName: page.name,
        hasPersonalIg: hasPersonal,
        personalIgUsername: body.connected_instagram_account?.username || body.connected_instagram_account?.name,
      });

      if (!hasBusiness) {
        // Page has no IG Business Account linked — skip silently.
        return null;
      }
      return {
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        igBusinessId: body.instagram_business_account!.id,
        username: body.instagram_business_account!.username || body.instagram_business_account!.name || null,
        profilePictureUrl: body.instagram_business_account!.profile_picture_url || null,
      };
    }),
  );

  const igAccounts = igAccountLookups
    .map((r, idx) => {
      if (r.status === 'fulfilled') return r.value;
      console.warn(
        `[oauth/instagram/callback] IG lookup failed for Page ${pages[idx]?.id}:`,
        r.reason?.message || r.reason,
      );
      return null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (igAccounts.length === 0) {
    const personalAccountPage = pageDiagnostics.find((p) => p.hasPersonalIg);
    const firstPage = pages[0];
    const settingsUrl = firstPage
      ? `https://www.facebook.com/${firstPage.id}/settings/?tab=linked_instagram`
      : 'https://business.facebook.com/latest/settings/instagram_accounts';

    if (personalAccountPage) {
      const igHandle = personalAccountPage.personalIgUsername
        ? `@${personalAccountPage.personalIgUsername}`
        : 'your Instagram account';
      return renderErrorPage(
        `Your Facebook Page <strong>"${personalAccountPage.pageName}"</strong> is connected to ${igHandle}, but it is currently a <strong>Personal profile</strong>.<br/><br/>` +
        `Meta requires a <strong>Professional Account</strong> (Business or Creator) for third-party publishing.<br/><br/>` +
        `<strong>How to fix in 30 seconds:</strong><br/>` +
        `1. Open the Instagram app on your phone.<br/>` +
        `2. Go to your <strong>Profile → Edit Profile → Switch to Professional Account</strong> (choose Business or Creator).<br/>` +
        `3. Return to BGOS and click <strong>Connect Instagram</strong> again.`,
        state.returnUrl,
        {
          label: 'Open Facebook Page Settings',
          url: settingsUrl,
        },
      );
    }

    const pageNames = pages.map((p) => `"${p.name}"`).join(', ');
    return renderErrorPage(
      `Your Facebook account manages the Page ${pageNames}, but no Instagram Business Account is linked to it yet.<br/><br/>` +
      `<strong>How to link in 60 seconds:</strong><br/>` +
      `1. Open Facebook Page Settings → <strong>Linked Accounts → Instagram</strong>.<br/>` +
      `2. Click <strong>Connect Account</strong> and log in to your Instagram account.<br/>` +
      `3. Confirm that the account is set as a free <strong>Professional (Business or Creator)</strong> profile.<br/>` +
      `4. Return to BGOS and click <strong>Connect Instagram</strong> again.`,
      state.returnUrl,
      {
        label: `Link Instagram to ${pages[0]?.name || 'Page'} on Facebook`,
        url: settingsUrl,
      },
    );
  }

  // ── 8. For each IG Business Account, ensure username & profile picture are loaded
  const igProfileLookups = await Promise.allSettled(
    igAccounts.map(async (acc) => {
      if (acc.username) {
        return acc;
      }
      const profileUrl = new URL(
        `https://graph.facebook.com/v18.0/${acc.igBusinessId}`,
      );
      profileUrl.searchParams.set('fields', 'username,name,profile_picture_url');
      profileUrl.searchParams.set('access_token', acc.pageAccessToken);
      const res = await fetch(profileUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return { ...acc, username: null as string | null };
      }
      const body = (await res.json()) as {
        username?: string;
        name?: string;
        profile_picture_url?: string;
      };
      return {
        ...acc,
        username: body.username || body.name || null,
        profilePictureUrl: body.profile_picture_url || null,
      };
    }),
  );

  const igProfiles = igProfileLookups.map((r, idx) => {
    if (r.status === 'fulfilled') return r.value;
    // Fallback to the lookup result without the profile fetch
    return { ...igAccounts[idx], username: null, profilePictureUrl: null };
  });

  // ── 9. Store each IG Business Account as a SocialAccount ───────────────
  const createdAccounts: Array<{ igBusinessId: string; username: string | null }> = [];
  let firstError: string | null = null;

  for (const ig of igProfiles) {
    try {
      await upsertIgAccount({
        tenantId: state.tenantId!,
        userId: state.userId!,
        igBusinessId: ig.igBusinessId,
        username: ig.username,
        pageId: ig.pageId,
        pageAccessToken: ig.pageAccessToken,
        scopes: cred.scopes || '',
      });
      createdAccounts.push({
        igBusinessId: ig.igBusinessId,
        username: ig.username,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[oauth/instagram/callback] Failed to upsert SocialAccount for IG ${ig.igBusinessId}:`,
        msg,
      );
      if (!firstError) firstError = msg;
    }
  }

  if (createdAccounts.length === 0) {
    return renderErrorPage(
      firstError
        ? `No Instagram accounts were saved. First error: ${firstError}`
        : 'Failed to save any Instagram accounts — please try again.',
    );
  }

  // ── 10. Clear the CSRF cookie + redirect to dashboard ──────────────────
  if (state.returnUrl && state.returnUrl.startsWith('bgos://')) {
    const mobileRedirect = new URL(state.returnUrl);
    mobileRedirect.searchParams.set('connected', 'instagram');
    mobileRedirect.searchParams.set('status', 'success');
    const res = NextResponse.redirect(mobileRedirect.toString());
    res.cookies.delete('ig_oauth_csrf');
    return res;
  }

  const returnHost = state.redirectUri ? new URL(state.redirectUri).origin : appUrl;
  const redirectUrl = new URL(
    '/app?product=bgos&view=socialMedia&connected=instagram',
    returnHost,
  );
  const res = NextResponse.redirect(redirectUrl.toString());
  res.cookies.delete('ig_oauth_csrf');
  return res;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Upsert a SocialAccount row for an Instagram Business Account.
 *
 * - If a row already exists for (tenantId, platform='instagram',
 *   accountId=igBusinessId), update its tokens + re-activate it.
 * - Otherwise, create a new row.
 *
 * IMPORTANT: The accessToken stored is the FB PAGE token, NOT a separate
 * IG token. The IG Content Publishing API accepts the FB Page token as
 * long as the IG Business Account is linked to that Page. This is why
 * the metadata stores BOTH the igBusinessId and the pageId — the
 * adapter needs the igBusinessId for API calls, but the token is the
 * Page token.
 */
async function upsertIgAccount(args: {
  tenantId: string;
  userId: string;
  igBusinessId: string;
  username: string | null;
  pageId: string;
  pageAccessToken: string;
  scopes: string;
}): Promise<void> {
  const encryptedAccess = encryptToken(args.pageAccessToken);
  // IG uses Page tokens (long-lived, no refresh token).
  const encryptedRefresh: string | null = null;
  const tokenExpiry: Date | null = null;

  const accountName = args.username || args.igBusinessId;
  const metadata = JSON.stringify({
    igBusinessId: args.igBusinessId,
    pageId: args.pageId,
  });

  const account = await db.socialAccount.upsert({
    where: {
      tenantId_platform_accountId: {
        tenantId: args.tenantId,
        platform: 'instagram',
        accountId: args.igBusinessId,
      },
    },
    create: {
      tenantId: args.tenantId,
      platform: 'instagram',
      accountId: args.igBusinessId,
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry,
      scopes: args.scopes,
      metadata,
      connectedById: args.userId,
      isActive: true,
    },
    update: {
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry,
      scopes: args.scopes,
      metadata,
      connectedById: args.userId,
      isActive: true,
    },
    select: { id: true, accountName: true },
  });

  // Audit log (best-effort, never throws).
  await logActivity({
    tenantId: args.tenantId,
    actorId: args.userId,
    actorType: 'user',
    action: 'create',
    entityType: 'social_account',
    entityId: account.id,
    entityName: `instagram:${account.accountName}`,
    description: `Connected Instagram Business account "${account.accountName}".`,
    severity: 'info',
  }).catch(() => {});
}

/**
 * Derive the app URL from the incoming request headers (used when
 * NEXT_PUBLIC_APP_URL is unset).
 */
function getAppUrlFromRequest(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  if (host) {
    const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

/**
 * Render a self-contained HTML error page. We use HTML (not JSON) because
 * the OAuth callback is loaded in a top-level browser navigation — the
 * user needs to see a human-readable message, not a JSON payload.
 */
function renderErrorPage(
  message: string,
  returnUrl?: string,
  actionLink?: { label: string; url: string },
): NextResponse {
  if (returnUrl && returnUrl.startsWith('bgos://')) {
    const mobileRedirect = new URL(returnUrl);
    const plain = message.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    mobileRedirect.searchParams.set('error', plain);
    return NextResponse.redirect(mobileRedirect.toString());
  }

  const safeReturnUrl =
    returnUrl && !returnUrl.startsWith('bgos://')
      ? returnUrl
      : '/dashboard?view=social-accounts';

  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Instagram Connection Notice</title><style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fafafa; padding: 1.5rem; }
.card { text-align: left; padding: 2.25rem; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); max-width: 520px; border: 1px solid #e5e7eb; box-sizing: border-box; width: 100%; }
.icon { width: 52px; height: 52px; margin: 0 auto 1.25rem; background: #fdf2f8; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #db2777; }
h1 { color: #111827; margin: 0 0 1rem; font-size: 1.35rem; font-weight: 700; text-align: center; }
.content { color: #4b5563; margin: 0 0 1.5rem; line-height: 1.6; font-size: 0.9rem; }
.actions { display: flex; flex-direction: column; gap: 0.75rem; text-align: center; }
.btn-primary { background: #009F50; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; font-size: 0.9rem; transition: opacity 0.15s; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 0.7rem 1.25rem; border-radius: 10px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; font-size: 0.85rem; }
.btn-secondary:hover { background: #e5e7eb; }
</style></head>
<body>
<div class="card">
  <div class="icon">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
  </div>
  <h1>Instagram Connection Setup</h1>
  <div class="content">${message}</div>
  <div class="actions">
    ${
      actionLink
        ? `<a href="${actionLink.url}" target="_blank" rel="noopener noreferrer" class="btn-primary">${actionLink.label} ↗</a>`
        : ''
    }
    <a href="${safeReturnUrl}" class="btn-secondary">Back to BGOS Dashboard</a>
  </div>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'oauth_error', provider: 'instagram', error: ${JSON.stringify(message.replace(/<[^>]*>/g, ' '))} }, '*');
  }
</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  );
}
