import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, generateSlug, COOKIE_OPTIONS } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

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

      // If user has no tenant, they need to complete onboarding
      if (!existingUser.tenantId) {
        const response = NextResponse.redirect(
          `${baseUrl}/?google_onboarding=true&email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name || '')}&avatar=${encodeURIComponent(userInfo.picture || '')}`
        );
        response.cookies.set({
          ...COOKIE_OPTIONS,
          value: token,
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

    // ─── NEW USER: They need to complete onboarding (business details) ───
    // Create a temporary user record with Google info
    // The onboarding flow will collect business name, industry, phone
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
        // No tenantId yet — will be set after onboarding
      },
    });

    // Generate a temporary JWT (limited, for onboarding only)
    const authUser = {
      id: tempUser.id,
      email: tempUser.email,
      name: tempUser.name,
      role: tempUser.role,
      tenantId: null,
      workspaceId: null,
      avatar: tempUser.avatar,
    };
    const token = generateToken(authUser);

    const baseUrl = getBaseUrl(request);
    const response = NextResponse.redirect(
      `${baseUrl}/?google_onboarding=true&email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name || '')}&avatar=${encodeURIComponent(userInfo.picture || '')}`
    );
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
