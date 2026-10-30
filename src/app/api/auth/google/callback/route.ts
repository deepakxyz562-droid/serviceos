import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  issueAuthTokens,
  getRefreshSessionMetadata,
  setAuthCookies,
  generateSlug,
  getAppUrl,
} from '@/lib/auth';
import { BRAND } from '@/lib/brand';
import { resolveSignupDefaultPlan } from '@/lib/billing-seed';
import { getOrCreateBusinessForUser } from '@/lib/quote-flow-session';
import { MOBILE_COOKIE, MOBILE_RETURN, readMobileState, sealMobileState } from '@/lib/bgos-mobile-auth';

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
async function createTenantForGoogleUser(
  userId: string,
  userEmail: string,
  userName: string,
  requestedPlan?: string,
  requestedSignupMode?: string,
  originHost?: string
) {
  // Use the Google user's name as the initial business name.
  const businessName = `${userName || userEmail.split('@')[0]}'s Workspace`;
  const baseSlug = generateSlug(businessName);
  let slug = baseSlug;
  let slugCounter = 1;
  while (await db.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${slugCounter}`;
    slugCounter++;
  }

  const hostStr = (originHost || '').toLowerCase();
  const isBosHost = hostStr.includes('bos.');
  const isChatbotlyHost = hostStr.includes('chatbotly.');
  const isQuoteFlowHost = hostStr.includes('quoteflow.');

  const isStandalone = isBosHost || requestedPlan === 'standalone_starter' || requestedPlan === 'standalone_business' || requestedSignupMode === 'standalone';
  const isChatbotly = isChatbotlyHost || requestedSignupMode === 'forms_standalone';

  const defaultSignupPlan = await resolveSignupDefaultPlan();
  const validPlans = ['standalone_starter', 'standalone_business', 'starter', 'professional', 'growth', 'launch_special', 'enterprise'];
  const signupPlan = (isStandalone || isChatbotly)
    ? (requestedPlan && (requestedPlan === 'standalone_business' || requestedPlan === 'standalone_starter') ? requestedPlan : 'standalone_starter')
    : (requestedPlan && validPlans.includes(requestedPlan) ? requestedPlan : defaultSignupPlan);

  const isListing = requestedSignupMode === 'listing_only';
  const isExplicitMode = !!requestedSignupMode || !!(requestedPlan && validPlans.includes(requestedPlan)) || isBosHost || isChatbotlyHost || isQuoteFlowHost;

  const signupMode = isStandalone
    ? 'standalone'
    : (isChatbotly
      ? 'forms_standalone'
      : (isListing
        ? 'listing_only'
        : (isExplicitMode ? 'crm_trial' : null)));
  const onboardingCompleted = false;

  const productType = isBosHost ? 'bos' : (isChatbotly ? 'chatbotly' : (isQuoteFlowHost ? 'quoteflow' : (isStandalone ? 'forms' : 'crm')));

  const tenant = await db.tenant.create({
    data: {
      name: businessName,
      slug,
      email: userEmail,
      plan: signupPlan,
      planStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      onboardingCompleted,
      onboardingStep: 1,
      claimed: isStandalone ? false : true,
      listingTier: isStandalone ? 'none' : 'claimed',
      signupMode,
      marketplaceOptIn: false,
      marketplaceTermsAcceptedAt: null,
      publicProfileEnabled: isStandalone ? false : true,
    },
  });

  // Create workspace linked to tenant.
  const workspace = await db.workspace.create({
    data: {
      name: `${businessName} Workspace`,
      slug: `${slug}-workspace`,
      ownerId: userId,
      tenantId: tenant.id,
      productType: productType,
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

  // Create default subscription (starter / standalone plan, 14-day trial).
  const existingSub = await db.subscription.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!existingSub) {
    await db.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: signupPlan,
        status: 'trial',
        amount: signupPlan === 'standalone_business' ? 19 : (signupPlan === 'standalone_starter' ? 10 : 0),
        currency: 'USD',
        billingCycle: 'monthly',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxUsers: signupPlan === 'standalone_business' ? 10 : (signupPlan === 'standalone_starter' ? 3 : 5),
        maxJobs: 200,
        maxWorkflows: 10,
        featuresJson: JSON.stringify({
          whatsappIntegration: false,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
          aiEmployee: true,
          smartForms: true,
        }),
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
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
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
 * Get the base URL for success/error redirects after OAuth.
 *
 * Checks if `stateOriginHost` was provided by the initiator and is on an allowed
 * domain (*.fieseros.com, canonical app URL, or localhost in dev).
 * If valid, returns `stateOriginHost` so users stay on their originating subdomain
 * (e.g. bos.fieseros.com, chatbotly.fieseros.com, quoteflow.fieseros.com).
 * Otherwise falls back to canonical `getAppUrl()`.
 */
function getBaseUrl(_request: NextRequest, stateOriginHost?: string): string {
  if (stateOriginHost && isAllowedOriginHost(stateOriginHost)) {
    return stateOriginHost.replace(/\/+$/, '');
  }
  return getAppUrl();
}

function isAllowedOriginHost(uriOrHost: string): boolean {
  try {
    const url = uriOrHost.startsWith('http://') || uriOrHost.startsWith('https://')
      ? new URL(uriOrHost)
      : new URL(`https://${uriOrHost}`);
    const canonicalUrl = getAppUrl();
    const canonicalHost = new URL(canonicalUrl).host;
    if (url.host === canonicalHost) return true;
    const rootDomain = BRAND.domain;
    if (url.host === rootDomain || url.host.endsWith(`.${rootDomain}`)) return true;
    if (url.host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(url.host)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Validate that a `state.redirectUri` (round-tripped from the OAuth
 * initiator) is on an allowed host before using it for the token-exchange
 * call. Allowed hosts are:
 *   - the canonical app host derived from `NEXT_PUBLIC_APP_URL` / BRAND.url
 *   - localhost (dev only)
 */
function isAllowedRedirectUri(uri: string): boolean {
  return isAllowedOriginHost(uri);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Check if this callback belongs to a BGOS mobile auth PKCE session
    const mobileCookie = request.cookies.get(MOBILE_COOKIE)?.value;
    if (mobileCookie) {
      const mobileState = readMobileState(mobileCookie);
      if (mobileState) {
        const url = new URL(MOBILE_RETURN);
        if (!stateParam || stateParam !== mobileState.nonce) {
          url.searchParams.set('error', 'invalid_state');
        } else if (error || !code) {
          url.searchParams.set('error', 'cancelled');
        } else {
          url.searchParams.set('ticket', sealMobileState({ ...mobileState, code, expires: Date.now() + 60000 }));
        }
        const response = NextResponse.redirect(url);
        response.cookies.set(MOBILE_COOKIE, '', {
          path: '/',
          maxAge: 0,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        response.headers.set('Cache-Control', 'no-store');
        response.headers.set('Referrer-Policy', 'no-referrer');
        return response;
      }
    }

    // Parse state parameter early to extract originHost for error redirects
    let state: {
      mode?: string;
      redirect?: string;
      plan?: string;
      signupMode?: string;
      app?: string;
      redirectUri?: string;
      originHost?: string;
    } = {};
    try {
      if (stateParam) {
        state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
      }
    } catch {
      // Ignore invalid state
    }

    const baseUrl = getBaseUrl(request, state.originHost);
    const originHostLower = (state.originHost || '').toLowerCase();
    const redirectParam = state.redirect || '';

    const isCustomerApp =
      state.app === 'customer' ||
      redirectParam.startsWith('/app') ||
      redirectParam.startsWith('fieseros://') ||
      originHostLower.includes('://app.');

    const isProApp =
      state.app === 'pro' ||
      redirectParam.startsWith('/pro') ||
      redirectParam.startsWith('fieserospro://') ||
      originHostLower.includes('://pro.');

    const isAdminApp =
      state.app === 'admin' ||
      redirectParam.startsWith('/admin') ||
      originHostLower.includes('://admin.');

    const isBosApp =
      state.app === 'bos' ||
      redirectParam.includes('app=true') ||
      redirectParam.startsWith('/bos') ||
      originHostLower.includes('://bos.');

    const isMobileMode =
      state.mode === 'mobile' ||
      redirectParam.includes('auth-callback') ||
      redirectParam.startsWith('quoteflow://') ||
      redirectParam.startsWith('fieseros://') ||
      redirectParam.startsWith('fieserospro://') ||
      redirectParam.startsWith('exp://');

    const fallbackWebPath = isCustomerApp
      ? '/app'
      : isProApp
        ? '/pro'
        : isAdminApp
          ? '/admin'
          : isBosApp
            ? '/bos-login'
            : '/';

    // Handle Google OAuth errors (e.g., user denied access, redirect_uri_mismatch)
    if (error) {
      console.error('Google OAuth callback error:', error, 'Full URL:', request.url);
      const errorDetail = searchParams.get('error_description') || error;
      let errorMessage = errorDetail;
      if (error === 'redirect_uri_mismatch') {
        errorMessage = 'Google OAuth redirect URI not configured. Please add this app\'s URL to your Google Cloud Console authorized redirect URIs.';
      }
      if (isMobileMode && redirectParam) {
        const sep = redirectParam.includes('?') ? '&' : '?';
        return NextResponse.redirect(`${redirectParam}${sep}error=${encodeURIComponent(errorMessage)}`);
      }
      return NextResponse.redirect(
        new URL(`${fallbackWebPath}?auth_error=${encodeURIComponent(errorMessage)}`, baseUrl)
      );
    }

    if (!code) {
      console.error('Google OAuth: No authorization code received');
      if (isMobileMode && redirectParam) {
        const sep = redirectParam.includes('?') ? '&' : '?';
        return NextResponse.redirect(`${redirectParam}${sep}error=google_no_code`);
      }
      return NextResponse.redirect(
        new URL(`${fallbackWebPath}?auth_error=google_no_code`, baseUrl)
      );
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth: Client ID or Secret not configured');
      if (isMobileMode && redirectParam) {
        const sep = redirectParam.includes('?') ? '&' : '?';
        return NextResponse.redirect(`${redirectParam}${sep}error=google_not_configured`);
      }
      return NextResponse.redirect(
        new URL(`${fallbackWebPath}?auth_error=google_not_configured`, baseUrl)
      );
    }

    // Determine the redirect URI that was used when initiating the OAuth flow.
    // This must match exactly what was sent to Google in the authorization URL.
    const canonicalRedirectUri = `${getAppUrl()}/api/auth/google/callback`;
    const redirectUri = (state.redirectUri && isAllowedRedirectUri(state.redirectUri))
      ? state.redirectUri
      : canonicalRedirectUri;
    console.log('[Google OAuth Callback] Using redirect URI:', redirectUri, {
      stateRedirectUri: state.redirectUri || '(none)',
      validated: redirectUri === state.redirectUri,
      app: state.app,
      isCustomerApp,
      isProApp,
      isMobileMode,
    });

    // Helper to build canonical success redirect URL
    const buildSuccessUrl = (baseUrl: string, isStandalone: boolean, needsOnboarding = false) => {
      if (isCustomerApp) {
        const targetPath = state.redirect && state.redirect.startsWith('/') ? state.redirect : '/app';
        const sep = targetPath.includes('?') ? '&' : '?';
        return `${baseUrl}${targetPath}${sep}google_login=success`;
      }
      if (isProApp) {
        const targetPath = state.redirect && state.redirect.startsWith('/') ? state.redirect : '/pro';
        const sep = targetPath.includes('?') ? '&' : '?';
        return `${baseUrl}${targetPath}${sep}google_login=success`;
      }
      if (isAdminApp) {
        const targetPath = state.redirect && state.redirect.startsWith('/') ? state.redirect : '/admin';
        const sep = targetPath.includes('?') ? '&' : '?';
        return `${baseUrl}${targetPath}${sep}google_login=success`;
      }
      if (isBosApp) {
        const targetPath = state.redirect && state.redirect.startsWith('/') ? state.redirect : '/?app=true';
        const sep = targetPath.includes('?') ? '&' : '?';
        return `${baseUrl}${targetPath}${sep}google_login=success`;
      }
      // If the tenant hasn't completed onboarding, always route to root with google_login=success
      // so HomePageClient can render the onboarding wizard or mode selector.
      // Do NOT send un-onboarded tenants to static landing pages like /gptform.
      if (needsOnboarding) {
        if (isStandalone || state.plan === 'standalone_starter' || state.plan === 'standalone_business') {
          return `${baseUrl}/?google_login=success&view=formBuilder`;
        }
        return `${baseUrl}/?google_login=success`;
      }
      if (state.redirect && state.redirect.startsWith('/')) {
        const cleanRedirect = state.redirect.split('?')[0];
        if (cleanRedirect !== '/gptform' && cleanRedirect !== '/login' && cleanRedirect !== '/register' && cleanRedirect !== '/') {
          const sep = state.redirect.includes('?') ? '&' : '?';
          return `${baseUrl}${state.redirect}${sep}google_login=success`;
        }
      }
      if (isStandalone || state.plan === 'standalone_starter' || state.plan === 'standalone_business') {
        return `${baseUrl}/?google_login=success&view=formBuilder`;
      }
      return `${baseUrl}/?google_login=success`;
    };

    const buildMobileSuccessUrl = (
      token: string,
      email: string,
      name: string,
      userId: string | undefined,
      tenantId: string | null | undefined,
      role: string | undefined,
      refreshToken: string,
      tenantName?: string | null
    ) => {
      const defaultScheme = isCustomerApp
        ? 'fieseros://auth-callback'
        : isProApp
          ? 'fieserospro://auth-callback'
          : 'quoteflow://auth-callback';
      const target = state.redirect || defaultScheme;
      const sep = target.includes('?') ? '&' : '?';
      const params = new URLSearchParams();
      params.set('token', token);
      params.set('refreshToken', refreshToken);
      params.set('email', email);
      params.set('name', name || '');
      if (userId) params.set('userId', userId);
      if (tenantId) params.set('tenantId', tenantId);
      if (tenantName) params.set('tenantName', tenantName);
      if (role) params.set('role', role);
      return `${target}${sep}${params.toString()}`;
    };

    // Exchange code for tokens
    const oauthTokens = await exchangeCodeForTokens(code, redirectUri);
    const userInfo = await getUserInfo(oauthTokens.access_token);

    if (!userInfo.email) {
      console.error('Google OAuth: No email in user info');
      const baseUrl = getBaseUrl(request);
      return NextResponse.redirect(
        new URL(`${fallbackWebPath}?auth_error=google_no_email`, baseUrl)
      );
    }

    const normalizedEmail = userInfo.email.toLowerCase().trim();
    const displayName = userInfo.name || userInfo.given_name || normalizedEmail.split('@')[0] || 'Fieseros User';

    // ─── CUSTOMER APP FLOW (app.fieseros.com, /app, or mobile-customer) ───
    // Do NOT create a fake Business OS Tenant/Workspace for a homeowner/customer!
    if (isCustomerApp) {
      let mpCustomer = await db.marketplaceCustomer.findUnique({
        where: { email: normalizedEmail },
      });

      if (!mpCustomer) {
        mpCustomer = await db.marketplaceCustomer.create({
          data: {
            email: normalizedEmail,
            phone: `google-${userInfo.sub || Date.now()}`,
            name: displayName,
            avatarUrl: userInfo.picture || null,
            otpVerified: true,
          },
        });
      } else {
        mpCustomer = await db.marketplaceCustomer.update({
          where: { id: mpCustomer.id },
          data: {
            name: mpCustomer.name || displayName,
            avatarUrl: userInfo.picture || mpCustomer.avatarUrl,
            otpVerified: true,
          },
        });
      }

      // Also ensure a Customer record exists so /api/auth/me works seamlessly for mobile-customer & web
      let crmCustomer = await db.customer.findFirst({
        where: { email: normalizedEmail },
        include: { workspace: { include: { tenant: true } } },
      });

      if (!crmCustomer) {
        const defaultTenant = await db.tenant.findFirst({
          where: { planStatus: { in: ['active', 'trial'] } },
          orderBy: { createdAt: 'asc' },
        });
        const workspace = defaultTenant
          ? await db.workspace.findFirst({ where: { tenantId: defaultTenant.id } })
          : null;

        crmCustomer = await db.customer.create({
          data: {
            name: displayName,
            email: normalizedEmail,
            phone: (mpCustomer.phone || '').startsWith('google-') ? '' : (mpCustomer.phone || ''),
            lastLoginAt: new Date(),
            ...(workspace ? { workspaceId: workspace.id } : {}),
          },
          include: { workspace: { include: { tenant: true } } },
        });
      } else {
        await db.customer.update({
          where: { id: crmCustomer.id },
          data: { lastLoginAt: new Date() },
        });
      }

      const customerAuthPayload = {
        id: crmCustomer.id,
        email: normalizedEmail,
        name: crmCustomer.name || displayName,
        role: 'customer',
        tenantId: crmCustomer.workspace?.tenantId || null,
        workspaceId: crmCustomer.workspaceId || null,
        avatar: userInfo.picture || null,
        isSuperAdmin: false,
      };

      const tokens = await issueAuthTokens(
        customerAuthPayload,
        getRefreshSessionMetadata(request),
        'customer'
      );

      if (isMobileMode) {
        return NextResponse.redirect(
          buildMobileSuccessUrl(
            tokens.accessToken,
            normalizedEmail,
            customerAuthPayload.name,
            crmCustomer.id,
            customerAuthPayload.tenantId,
            'customer',
            tokens.refreshToken,
            crmCustomer.workspace?.tenant?.name || null
          )
        );
      }

      const response = NextResponse.redirect(buildSuccessUrl(baseUrl, false, false));
      setAuthCookies(response.cookies, tokens);
      response.cookies.set('mc_session', mpCustomer.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
      return response;
    }

    // ─── PRO / BUSINESS / ADMIN FLOW ───
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: userInfo.email },
      include: { tenant: true },
    });

    if (existingUser) {
      // ─── EXISTING USER: Log them in ───
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
          new URL(`${fallbackWebPath}?auth_error=account_deactivated`, baseUrl)
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
      // If user has no tenant, create one now
      if (!existingUser.tenantId) {
        const { tenant, workspace } = await createTenantForGoogleUser(
          existingUser.id,
          userInfo.email,
          userInfo.name || userInfo.given_name || '',
          state.plan,
          state.signupMode,
          state.originHost
        );
        const tokens = await issueAuthTokens({
          ...authUser,
          tenantId: tenant.id,
          workspaceId: workspace.id,
        }, getRefreshSessionMetadata(request));
        const newToken = tokens.accessToken;
        await getOrCreateBusinessForUser(existingUser.id, tenant.id, existingUser.name || 'My Business');

        if (isMobileMode) {
          return NextResponse.redirect(
            buildMobileSuccessUrl(
              newToken,
              existingUser.email,
              existingUser.name || '',
              existingUser.id,
              tenant.id,
              existingUser.role,
              tokens.refreshToken,
              tenant.name
            )
          );
        }

        const isStandalone = tenant.signupMode === 'standalone' || tenant.plan === 'standalone_starter' || tenant.plan === 'standalone_business';
        const response = NextResponse.redirect(buildSuccessUrl(baseUrl, isStandalone, true));
        setAuthCookies(response.cookies, tokens);
        return response;
      }

      try {
        await getOrCreateBusinessForUser(existingUser.id, existingUser.tenantId || undefined, existingUser.name || 'My Business');
      } catch (qfErr) {
        console.warn('[Google Callback] Best-effort getOrCreateBusinessForUser skipped:', qfErr);
      }
      const tokens = await issueAuthTokens(authUser, getRefreshSessionMetadata(request));
      const token = tokens.accessToken;

      if (isMobileMode) {
        return NextResponse.redirect(
          buildMobileSuccessUrl(
            token,
            existingUser.email,
            existingUser.name || '',
            existingUser.id,
            existingUser.tenantId,
            existingUser.role,
            tokens.refreshToken,
            existingUser.tenant?.name
          )
        );
      }

      const isStandalone = existingUser.tenant?.signupMode === 'standalone' || existingUser.tenant?.plan === 'standalone_starter' || existingUser.tenant?.plan === 'standalone_business';
      const needsOnboarding = !existingUser.tenant?.onboardingCompleted;
      const response = NextResponse.redirect(buildSuccessUrl(baseUrl, !!isStandalone, needsOnboarding));
      setAuthCookies(response.cookies, tokens);
      return response;
    }

    // ─── NEW USER: Create user + tenant immediately ───
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
      },
    });

    const { tenant, workspace } = await createTenantForGoogleUser(
      tempUser.id,
      userInfo.email,
      userInfo.name || userInfo.given_name || '',
      state.plan,
      state.signupMode,
      state.originHost
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
    const tokens = await issueAuthTokens(authUser, getRefreshSessionMetadata(request));
    const token = tokens.accessToken;

    try {
      await getOrCreateBusinessForUser(tempUser.id, tenant.id, tempUser.name || 'My Business');
    } catch (qfErr) {
      console.warn('[Google Callback] Best-effort getOrCreateBusinessForUser skipped:', qfErr);
    }

    if (isMobileMode) {
      return NextResponse.redirect(
        buildMobileSuccessUrl(
          token,
          tempUser.email,
          tempUser.name || '',
          tempUser.id,
          tenant.id,
          tempUser.role,
          tokens.refreshToken,
          tenant.name
        )
      );
    }

    const isStandalone = tenant.signupMode === 'standalone' || tenant.plan === 'standalone_starter' || tenant.plan === 'standalone_business';
    const response = NextResponse.redirect(buildSuccessUrl(baseUrl, isStandalone, true));
    setAuthCookies(response.cookies, tokens);
    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const baseUrl = getAppUrl();
    return NextResponse.redirect(
      new URL('/?auth_error=google_callback_failed', baseUrl)
    );
  }
}
