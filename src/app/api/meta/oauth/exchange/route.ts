import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { encryptToken } from '@/lib/social/crypto';

/**
 * POST /api/meta/oauth/exchange
 * ─────────────────────────────────────────────────────────────────────────
 * Exchanges the Meta OAuth code (from the FB.login popup) for a long-lived
 * access token, then stores the connection as a SocialAccount row.
 *
 * Handles two providers:
 *   - 'instagram': fetches the IG business account ID + username, creates
 *     SocialAccount(platform='instagram', isActive=true)
 *   - 'messenger': fetches the FB Page ID + name, creates
 *     SocialAccount(platform='facebook', isActive=true)
 *
 * Both providers use the same /api/meta/webhook receiver for inbound DMs.
 * The webhook looks up SocialAccount by platform + accountId to route DMs
 * to the correct tenant.
 *
 * Auth: any authenticated tenant user.
 */
const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider, code } = await request.json();

    if (!provider || !code) {
      return NextResponse.json({ error: 'provider and code are required' }, { status: 400 });
    }

    if (provider !== 'instagram' && provider !== 'messenger') {
      return NextResponse.json({ error: 'provider must be instagram or messenger' }, { status: 400 });
    }

    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('[meta/oauth/exchange] META_APP_ID or WHATSAPP_APP_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 1. Exchange code for short-lived access token
    const tokenRes = await fetch(`${META_GRAPH_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: '',
        code,
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error('[meta/oauth/exchange] Token exchange failed:', tokenErr);
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 400 });
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    if (!shortLivedToken) {
      return NextResponse.json({ error: 'Failed to obtain access token' }, { status: 400 });
    }

    // 2. Exchange for long-lived token (60 days)
    const longLivedRes = await fetch(`${META_GRAPH_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      }),
    });

    let longLivedToken = shortLivedToken;
    if (longLivedRes.ok) {
      const longLivedData = await longLivedRes.json();
      longLivedToken = longLivedData.access_token || shortLivedToken;
    }

    // 3. Discover the account ID + name based on the provider
    let accountId = '';
    let accountName = '';
    let handle = '';
    let pageAccessToken = longLivedToken;

    if (provider === 'messenger') {
      // List the user's Facebook Pages
      const pagesRes = await fetch(
        `${META_GRAPH_API}/me/accounts?access_token=${longLivedToken}`,
      );
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        if (pagesData.data?.length > 0) {
          // Take the first Page (user can select later)
          const page = pagesData.data[0];
          accountId = page.id;
          accountName = page.name || '';
          // Use the Page access token (stronger than user token for messaging)
          pageAccessToken = page.access_token || longLivedToken;
        }
      }
      if (!accountId) {
        return NextResponse.json(
          { error: 'No Facebook Pages found. Create a Page in Meta Business Suite first.' },
          { status: 400 },
        );
      }
    } else {
      // Instagram: list FB Pages, then look up the IG business account linked to each
      const pagesRes = await fetch(
        `${META_GRAPH_API}/me/accounts?access_token=${longLivedToken}`,
      );
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        if (pagesData.data?.length > 0) {
          // Try each Page until we find one with a linked IG business account
          for (const page of pagesData.data) {
            const igRes = await fetch(
              `${META_GRAPH_API}/${page.id}?fields=instagram_business_account&access_token=${page.access_token || longLivedToken}`,
            );
            if (igRes.ok) {
              const igData = await igRes.json();
              const igBusinessId = igData.instagram_business_account?.id;
              if (igBusinessId) {
                accountId = igBusinessId;
                pageAccessToken = page.access_token || longLivedToken;
                // Fetch the IG username
                const igProfileRes = await fetch(
                  `${META_GRAPH_API}/${igBusinessId}?fields=username,name,profile_picture_url&access_token=${pageAccessToken}`,
                );
                if (igProfileRes.ok) {
                  const igProfile = await igProfileRes.json();
                  accountName = igProfile.name || igProfile.username || '';
                  handle = igProfile.username ? `@${igProfile.username}` : '';
                }
                break;
              }
            }
          }
        }
      }
      if (!accountId) {
        return NextResponse.json(
          { error: 'No Instagram Business Account found. Convert your IG to a Business account and link it to a Facebook Page.' },
          { status: 400 },
        );
      }
    }

    // 4. Subscribe the Page to webhooks (so /api/meta/webhook receives DMs)
    if (provider === 'messenger') {
      try {
        await fetch(`${META_GRAPH_API}/${accountId}/subscribed_apps`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${pageAccessToken}` },
        });
        console.log('[meta/oauth/exchange] Messenger Page subscribed to webhooks');
      } catch (err) {
        console.warn('[meta/oauth/exchange] Failed to subscribe Page:', err);
      }
    }

    // 5. Upsert the SocialAccount row
    const platform = provider === 'instagram' ? 'instagram' : 'facebook';
    const encryptedToken = await encryptToken(pageAccessToken).catch(() => pageAccessToken);

    const metadata = JSON.stringify({
      handle,
      pageId: provider === 'messenger' ? accountId : undefined,
      igBusinessId: provider === 'instagram' ? accountId : undefined,
      source: 'meta_oauth',
      connectedAt: new Date().toISOString(),
      connectedBy: user.id,
    });

    // Check if a SocialAccount already exists for this tenant + platform
    const existing = await db.socialAccount.findFirst({
      where: { tenantId: user.tenantId, platform, isActive: true },
    });

    if (existing) {
      await db.socialAccount.update({
        where: { id: existing.id },
        data: {
          accountId,
          accountName: accountName || existing.accountName,
          accessToken: encryptedToken,
          scopes: provider === 'instagram'
            ? 'instagram_manage_messages,instagram_manage_insights,pages_show_list'
            : 'pages_messaging,pages_manage_metadata,pages_show_list',
          metadata,
          isActive: true,
        },
      });
    } else {
      await db.socialAccount.create({
        data: {
          tenantId: user.tenantId,
          platform,
          accountId,
          accountName: accountName || accountId,
          accessToken: encryptedToken,
          scopes: provider === 'instagram'
            ? 'instagram_manage_messages,instagram_manage_insights,pages_show_list'
            : 'pages_messaging,pages_manage_metadata,pages_show_list',
          metadata,
          connectedById: user.id,
          isActive: true,
        },
      });
    }

    console.log('[meta/oauth/exchange] Connected:', {
      provider,
      accountId,
      accountName,
      handle,
      tenantId: user.tenantId,
    });

    return NextResponse.json({
      success: true,
      provider,
      accountId,
      accountName,
      handle,
    });
  } catch (error) {
    console.error('[POST /api/meta/oauth/exchange] error:', error);
    return NextResponse.json(
      { error: 'Failed to connect. Please try again.' },
      { status: 500 },
    );
  }
}
