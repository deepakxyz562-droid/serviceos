import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import {
  generateToken,
  getRefreshSessionMetadata,
  COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  type AuthUser,
} from '@/lib/auth';
import { revokeRefreshSession, rotateRefreshSession } from '@/lib/auth-refresh-session';
import { applyRateLimit, authLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { withRequestId } from '@/lib/logger';

async function resolveRefreshSubject(
  subject: { type: 'user' | 'customer'; id: string },
): Promise<AuthUser | null> {
  if (subject.type === 'customer') {
    const customer = await db.customer.findUnique({
      where: { id: subject.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        tenantId: true,
        workspaceId: true,
        portalEnabled: true,
      },
    });
    if (!customer?.portalEnabled || !customer.email) return null;
    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      role: 'customer',
      tenantId: customer.tenantId,
      workspaceId: customer.workspaceId,
      avatar: null,
      isSuperAdmin: false,
      employeeId: null,
    };
  }

  const user = await db.user.findUnique({
    where: { id: subject.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      workspaceId: true,
      avatar: true,
      isSuperAdmin: true,
      isActive: true,
      phone: true,
    },
  });
  if (!user?.isActive) return null;

  let employeeId: string | null = null;
  if (user.role === 'employee') {
    const employee = await db.employee.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    employeeId = employee?.id || null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    workspaceId: user.workspaceId,
    avatar: user.avatar,
    isSuperAdmin: user.isSuperAdmin || false,
    employeeId,
    phone: user.phone,
  };
}

export async function POST(request: NextRequest) {
  const log = withRequestId(request);
  const limited = applyRateLimit(authLimiter, request);
  if (limited) return rateLimitResponse(limited.resetAtMs);

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Cookie-based web refresh has no request body.
    }

    const bodyToken = typeof body.refreshToken === 'string' ? body.refreshToken : '';
    const refreshToken = bodyToken || request.cookies.get(REFRESH_COOKIE_OPTIONS.name)?.value || '';
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required', code: 'MISSING_REFRESH_TOKEN' },
        { status: 401 },
      );
    }

    const rotated = await rotateRefreshSession(refreshToken, getRefreshSessionMetadata(request));
    if (rotated.status !== 'rotated') {
      log.warn({ refreshStatus: rotated.status }, 'auth/refresh: refresh rejected');
      const response = NextResponse.json(
        {
          error: rotated.status === 'reused'
            ? 'Session security check failed. Please sign in again.'
            : 'Invalid or expired refresh token',
          code: rotated.status === 'reused' ? 'REFRESH_REUSE_DETECTED' : 'INVALID_REFRESH_TOKEN',
        },
        { status: 401 },
      );
      response.cookies.set({ ...REFRESH_COOKIE_OPTIONS, value: '', maxAge: 0 });
      response.cookies.set({ ...COOKIE_OPTIONS, value: '', maxAge: 0 });
      return response;
    }

    const authUser = await resolveRefreshSubject(rotated.subject);
    if (!authUser) {
      await revokeRefreshSession(rotated.session.token, 'subject_disabled');
      return NextResponse.json(
        { error: 'Account not found or disabled', code: 'SUBJECT_DISABLED' },
        { status: 401 },
      );
    }

    const accessToken = generateToken(authUser);
    const response = NextResponse.json({
      token: accessToken,
      accessToken,
      refreshToken: rotated.session.token,
      user: authUser,
    });
    response.cookies.set({ ...COOKIE_OPTIONS, value: accessToken });
    response.cookies.set({ ...REFRESH_COOKIE_OPTIONS, value: rotated.session.token });
    return response;
  } catch (error) {
    log.error({ err: error }, 'auth/refresh: unexpected error');
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
