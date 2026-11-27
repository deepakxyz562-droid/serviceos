import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, issueAuthTokens, getRefreshSessionMetadata, setAuthCookies } from '@/lib/auth';
import { sealHandoffTicket, verifyHandoffTicket } from '@/lib/bgos-mobile-auth';

/**
 * POST /api/bgos/mobile-auth/handoff
 * Generates a short-lived (60s) single-use handoff ticket so the mobile app can
 * safely open OAuth connect, print, or checkout flows in the system browser without
 * leaking long-lived bearer tokens in URLs or server logs.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !user.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const ticket = sealHandoffTicket({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });
    return NextResponse.json({ ticket, expiresAt: Date.now() + 60000 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to issue handoff ticket' }, { status: 500 });
  }
}

/**
 * PUT /api/bgos/mobile-auth/handoff
 * Exchanges a short-lived handoff ticket inside the browser context for an
 * HTTP-only session cookie so browser checkout pages need zero JWTs in URLs.
 */
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ticket = typeof body?.ticket === 'string' ? body.ticket : '';
  const verified = ticket ? verifyHandoffTicket(ticket) : null;
  if (!verified) {
    return NextResponse.json({ error: 'Expired or invalid handoff ticket' }, { status: 401 });
  }

  const tokens = await issueAuthTokens(
    {
      id: verified.userId,
      email: verified.email,
      name: null,
      role: verified.role as any,
      tenantId: verified.tenantId,
      workspaceId: null,
      avatar: null,
    },
    getRefreshSessionMetadata(request),
  );
  const res = NextResponse.json({ ok: true });
  setAuthCookies(res.cookies, tokens);
  return res;
}
