import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, verifyToken, type AuthUser } from '@/lib/auth';
import { verifyHandoffTicket } from '@/lib/bgos-mobile-auth';
import { resolveOAuthOrigin } from '@/lib/social/oauth-page';

export interface OAuthRequestAuthResult {
  authUser: AuthUser;
  tenantId: string;
  originHost: string;
  response?: undefined;
}

export interface OAuthRequestAuthFailure {
  authUser?: undefined;
  tenantId?: undefined;
  originHost: string;
  response: NextResponse;
}

/**
 * Shared OAuth initiation authentication resolver across social connect routes.
 * Supports session cookies, Bearer headers, short-lived mobile ?ticket= handoff
 * tokens, and legacy ?auth= / ?token= query parameters uniformly.
 */
export async function resolveOAuthRequestAuth(
  request: NextRequest,
): Promise<OAuthRequestAuthResult | OAuthRequestAuthFailure> {
  const { searchParams } = request.nextUrl;
  const originHost = resolveOAuthOrigin(request, searchParams.get('originHost'));

  let authUser = await getAuthUser(request);

  const ticketFromQuery = searchParams.get('ticket');
  if (!authUser && ticketFromQuery) {
    const verified = verifyHandoffTicket(ticketFromQuery);
    if (verified) {
      authUser = {
        id: verified.userId,
        email: verified.email,
        name: null,
        role: verified.role as AuthUser['role'],
        tenantId: verified.tenantId,
        workspaceId: null,
        avatar: null,
      };
    }
  }

  const tokenFromQuery = searchParams.get('auth') || searchParams.get('token');
  if (!authUser && tokenFromQuery) {
    authUser = verifyToken(tokenFromQuery);
  }

  if (!authUser) {
    const accept = request.headers.get('accept') || '';
    const isBrowserNav = accept.includes('text/html') || !accept.includes('application/json');
    if (isBrowserNav && originHost) {
      const loginUrl = new URL('/', originHost);
      loginUrl.searchParams.set('login', 'required');
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
      return { originHost, response: NextResponse.redirect(loginUrl.toString()) };
    }
    return {
      originHost,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  if (!authUser.tenantId) {
    return {
      originHost,
      response: NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 }),
    };
  }

  return {
    authUser,
    tenantId: authUser.tenantId,
    originHost,
  };
}
