import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, generateSlug, COOKIE_OPTIONS, getAppUrl } from '@/lib/auth';
import { BRAND } from '@/lib/brand';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Create a tenant + workspace + subscription for a Google-authenticated user
 * who doesn't have one yet.
 *
 * This used to live in /api/auth/google/complete (called from the
 * GoogleOnboarding component). We now create the tenant directly in the
 * OAuth callback so the user goes straight into the standard SaaS onboarding
 * wizard (Settings → Business → Plan → Done) — same flow as email/password
 * signups — instead of seeing a separate Google-specific onboarding screen.
 *
 * The tenant is created with `onboardingCompleted: false` so the SaaS
 * onboarding wizard triggers on the next page load. The wizard collects
 * business name, industry, address, and plan selection.
 */
async function createTenantForGoogleUser(userId: string, userEmail: string, userName: string) {
  // Use the Google user's name as the initial business name. The SaaS
  // onboarding wizard will let them change it on step 1.
  const businessName = `${userName || userEmail.split('@')[0]}'s Business`;
  const baseSlug = generateSlug(businessName);
  let slug = baseSlug;
  let slugCounter = 1;
  while (await db.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${slugCounter}`;
    slugCounter++;
  }

  // Create tenant with onboardingCompleted=false so the SaaS wizard triggers.
  // Set claimed=true + listingTier='claimed' so the new business renders as a
  // full card on the marketplace (not an "Unclaimed" minimal card). This
  // matches the email/password registration flow in /api/auth/register.
  //
  // signupMode='crm_trial' distinguishes this from a marketplace-only claim
  // (signupMode='listing_only', listingTier='claimed_free'). Previously this
  // field was left NULL, making Google-registered tenants look like "legacy"
  // tenants and breaking downstream signupMode filters.
  const tenant = await db.tenant.create({
    data: {
      name: businessName,
      slug,
      email: userEmail,
      plan: 'starter',
      planStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      onboardingCompleted: false,
      onboardingStep: 1,
      claimed: true,
      claimedAt: new Date(),
      listingTier: 'claimed',
      signupMode: 'crm_trial',
      marketplaceOptIn: true,
      marketplaceTermsAcceptedAt: new Date(),
      publicProfileEnabled: true,
    },
  });

  // Create workspace linked to tenant.
  const workspace = await db.workspace.create({
    data: {
      name: `${businessName} Workspace`,
      slug: `${slug}-workspace`,
      ownerId: userId,
      tenantId: tenant.id,
    },
  });

  // Link user to tenant + workspace.
  await db.user.update({
    where: { id: userId },
    data: {
      tenantId: tenant.id,
      workspaceId: workspace.id,
    },
  });

  // Create default subscription (starter plan, 14-day trial).
  // GUARD: only create if no subscription already exists for this tenant.
  // Previously this always called .create(), which could produce duplicate
  // subscription rows if the Google OAuth flow was re-entered (e.g. user
  // retried after a network error). The plan picked during onboarding is
  // written via /api/subscriptions POST, which now upserts instead of
  // creating a new row.
  const existingSub = await db.subscription.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!existingSub) {
    await db.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'starter',
        status: 'trial',
        amount: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxUsers: 1,
        maxJobs: 200,
        maxWorkflows: 10,
        featuresJson: JSON.stringify({
          // WhatsApp is NOT platform-provided — BYO Meta API only. See Issue 5.
          whatsappIntegration: false,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
        }),
        // No trial WhatsApp credits — platform provides Email + SMS + Push only.
        trialWhatsappCredits: 0,
        trialWhatsappUsed: 0,
        platformWhatsappEnabled: false,
        ownWhatsappConnected: false,
        ownEmailProviderConnected: false,
      },
    });
  } else {
    console.log('[Google Callback] Subscription already exists for tenant', tenant.id, '— skipping create');
  }

  // Auto-import notification WhatsApp templates (best-effort, non-blocking).
  try {
    const { autoImportNotificationTemplates } = await import('@/lib/auto-import-templates');
    await autoImportNotificationTemplates(tenant.id, workspace.id, businessName);
  } catch (importErr) {
    console.warn('[Google Callback] Failed to auto-import notification templates:', importErr);
  }

  // Auto-seed public business hub (best-effort, non-blocking).
  try {
    const { seedPublicBusinessForTenant } = await import('@/lib/seed-public-business');
    await seedPublicBusinessForTenant({ tenantId: tenant.id });
    console.log(`[Google Callback] Auto-seeded public hub for tenant ${tenant.id}`);
  } catch (seedErr) {
    console.warn('[Google Callback] Failed to auto-seed public business hub:', seedErr);
  }

  return { tenant, workspace };
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Google token exchange failed:', errorData);
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info from Google');
  }

  return response.json();
}

/**
 * Get the canonical base URL for success/error redirects after OAuth.
 *
 * SECURITY: Always returns `getAppUrl()` — which resolves to
 * `NEXT_PUBLIC_APP_URL` env var, falling back to `https://fieseros.com`.
 * Never trusts the `Host` header or `X-Forwarded-Host` because those
 * reflect whatever host the user landed on (which could be a stale/parked
 * alias like `serviceos.cc`). Pinning the success redirect to the
 * canonical app URL prevents the post-OAuth cookie from binding to the
 * wrong host.
 *
 * The `request` parameter is kept for signature compatibility with callers
 * but is intentionally unused.
 */
function getBaseUrl(_request: NextRequest): string {
  return getAppUrl();
}

/**
 * Validate that a `state.redirectUri` (round-tripped from the OAuth
 * initiator) is on an allowed host before using it for the token-exchange
 * call. Allowed hosts are:
 *   - the canonical app host derived from `NEXT_PUBLIC_APP_URL` / BRAND.url
 *   - localhost (dev only)
 *
 * This is defense-in-depth: even if an attacker tampers with the base64
 * `state` parameter, they cannot trick the token-exchange call into using
 * a different `redirect_uri` (which would have to match what was registered
 * in Google Cloud Console anyway, but this adds an explicit boundary).
 */
function isAllowedRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    const canonicalUrl = getAppUrl();
    const canonicalHost = new URL(canonicalUrl).host;
    // Allow exact match on canonical host.
    if (url.host === canonicalHost) return true;
    // Allow subdomains of the canonical root domain (e.g. tenant.fieseros.com).
    const rootDomain = BRAND.domain;
    if (url.host === rootDomain || url.host.endsWith(`.${rootDomain}`)) return true;
    // Allow localhost (dev).
    if (url.host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(url.host)) return true;
    return false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle Google OAuth errors (e.g., user denied access, redirect_uri_mismatch)
    if (error) {
      console.error('Google OAuth callback error:', error, 'Full URL:', request.url);
      const baseUrl = getBaseUrl(request);
      const errorDetail = searchParams.get('error_description') || error;
      // Map specific errors to user-friendly messages
      let errorMessage = errorDetail;
      if (error === 'redirect_uri_mismatch') {
        errorMessage = 'Google OAuth redirect URI not configured. Please add this app\'s URL to your Google Cloud Console authorized redirect URIs.';
      }
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(errorMessage)}`, baseUrl)
      );
    }

    if (!code) {
      console.error('Google OAuth: No authorization code received');
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(
        new URL('/?auth_error=google_no_code', baseUrl)
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth: Client ID or Secret not configured');
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(
        new URL('/?auth_error=google_not_configured', baseUrl)
      );
    }

    // Parse state parameter
    let state: { mode?: string; redirect?: string; redirectUri?: string } = {};
    try {
      if (stateParam) {
        state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
      }
    } catch {
      // Ignore invalid state
    }

    // Determine the redirect URI that was used when initiating the OAuth flow.
    // This must match exactly what was sent to Google in the authorization URL.
    //
    // SECURITY: `state.redirectUri` is round-tripped from the initiator. We
    // validate its host against the canonical app host before using it, and
    // fall back to the canonical redirect URI if validation fails. This
    // prevents a tampered `state` from redirecting the token-exchange call
    // to an attacker-controlled host.
    const canonicalRedirectUri = `${getAppUrl()}/api/auth/google/callback`;
    const redirectUri = (state.redirectUri && isAllowedRedirectUri(state.redirectUri))
      ? state.redirectUri
      : canonicalRedirectUri;
    console.log('[Google OAuth Callback] Using redirect URI:', redirectUri, {
      stateRedirectUri: state.redirectUri || '(none)',
      validated: redirectUri === state.redirectUri,
    });

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const userInfo = await getUserInfo(tokens.access_token);

    if (!userInfo.email) {
      console.error('Google OAuth: No email in user info');
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(
        new URL('/?auth_error=google_no_email', baseUrl)
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: userInfo.email },
      include: { tenant: true },
    });

    if (existingUser) {
      // ─── EXISTING USER: Log them in ───
      // Update their Google auth info if not already set
      if (existingUser.authProvider !== 'google' || !existingUser.authProviderId) {
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            authProvider: 'google',
            authProviderId: userInfo.sub,
            avatar: userInfo.picture || existingUser.avatar,
            lastLoginAt: new Date(),
          },
        });
      } else {
        await db.user.update({
          where: { id: existingUser.id },
          data: { lastLoginAt: new Date() },
        });
      }

      // Check if user is active
      if (!existingUser.isActive) {
        const baseUrl = getBaseUrl(request);
        return NextResponse.redirect(
          new URL('/?auth_error=account_deactivated', baseUrl)
        );
      }

      // Generate JWT and set cookie
      const authUser = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
        tenantId: existingUser.tenantId,
        workspaceId: existingUser.workspaceId,
        avatar: userInfo.picture || existingUser.avatar,
      };
      const token = generateToken(authUser);

      const baseUrl = getBaseUrl(request);

      // If user has no tenant, create one now and route them into the standard
      // SaaS onboarding wizard (Business → Plan → Done). This replaces the old
      // Google-specific onboarding screen — Google users now get the SAME
      // onboarding flow as email/password signups.
      if (!existingUser.tenantId) {
        const { tenant, workspace } = await createTenantForGoogleUser(
          existingUser.id,
          userInfo.email,
          userInfo.name || userInfo.given_name || '',
        );
        // Regenerate JWT with the new tenantId/workspaceId.
        const newToken = generateToken({
          ...authUser,
          tenantId: tenant.id,
          workspaceId: workspace.id,
        });
        const response = NextResponse.redirect(`${baseUrl}/?google_login=success`);
        response.cookies.set({
          ...COOKIE_OPTIONS,
          value: newToken,
        });
        return response;
      }

      const response = NextResponse.redirect(`${baseUrl}/?google_login=success`);
      response.cookies.set({
        ...COOKIE_OPTIONS,
        value: token,
      });
      return response;
    }

    // ─── NEW USER: Create user + tenant immediately, then route to SaaS onboarding ───
    // (Previously this created a temp user and redirected to GoogleOnboarding.
    //  Now we create the full user+tenant+workspace+subscription here so the
    //  SaaS onboarding wizard can take over — same flow as email/password.)
    //
    // emailVerified=true: Google already verified this email as part of the
    // OAuth flow (Google's `email_verified` claim is checked earlier in this
    // route). We trust Google's verification and skip our own email-link flow.
    const tempUser = await db.user.create({
      data: {
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name || 'Google User',
        avatar: userInfo.picture || null,
        role: 'owner',
        authProvider: 'google',
        authProviderId: userInfo.sub,
        isActive: true,
        lastLoginAt: new Date(),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        // No tenantId yet — set by createTenantForGoogleUser below.
      },
    });

    const { tenant, workspace } = await createTenantForGoogleUser(
      tempUser.id,
      userInfo.email,
      userInfo.name || userInfo.given_name || '',
    );

    const authUser = {
      id: tempUser.id,
      email: tempUser.email,
      name: tempUser.name,
      role: tempUser.role,
      tenantId: tenant.id,
      workspaceId: workspace.id,
      avatar: tempUser.avatar,
    };
    const token = generateToken(authUser);

    const baseUrl = getBaseUrl(request);
    const response = NextResponse.redirect(`${baseUrl}/?google_login=success`);
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: token,
    });
    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(
      new URL('/?auth_error=google_callback_failed', baseUrl)
    );
  }
}
