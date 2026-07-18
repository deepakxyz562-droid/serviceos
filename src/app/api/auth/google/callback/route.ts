import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, generateSlug, COOKIE_OPTIONS } from '@/lib/auth';

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
      maxJobs: 100,
      maxWorkflows: 10,
      featuresJson: JSON.stringify({
        whatsappIntegration: true,
        customWorkflows: false,
        apiAccess: false,
        prioritySupport: false,
      }),
      trialWhatsappCredits: 10,
      trialWhatsappUsed: 0,
      platformWhatsappEnabled: true,
      ownWhatsappConnected: false,
      ownEmailProviderConnected: false,
    },
  });

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
 * Get the base URL for redirects, respecting reverse proxy headers.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL env variable (most reliable if set)
 * 2. X-Forwarded-Host + X-Forwarded-Proto (set by reverse proxy)
 * 3. Host header + X-Forwarded-Proto (Caddy forwards original Host)
 * 4. Fallback to the request URL's origin
 */
function getBaseUrl(request: NextRequest): string {
  // 1. Check env variable first (most reliable)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  // 2. X-Forwarded-Host (set by reverse proxy)
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost && !forwardedHost.startsWith('localhost')) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // 3. Host header forwarded by Caddy contains the external host
  const hostHeader = request.headers.get('host');
  if (hostHeader && !hostHeader.startsWith('localhost')) {
    return `${forwardedProto}://${hostHeader}`;
  }

  // 4. Fallback to request origin
  return new URL('/', request.url).origin;
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

    // Determine the redirect URI that was used when initiating the OAuth flow
    // This must match exactly what was sent to Google in the authorization URL
    const redirectUri = state.redirectUri || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.cc'}/api/auth/google/callback`;
    console.log('[Google OAuth Callback] Using redirect URI:', redirectUri);

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
