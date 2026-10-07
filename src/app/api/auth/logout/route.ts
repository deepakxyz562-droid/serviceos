import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from '@/lib/auth';
import { revokeRefreshSession } from '@/lib/auth-refresh-session';

export async function POST(request: NextRequest) {
  try {
    let bodyToken = '';
    try {
      const body = await request.json();
      bodyToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';
    } catch {
      // Browser logout normally relies on the HttpOnly refresh cookie.
    }
    const refreshToken = bodyToken || request.cookies.get(REFRESH_COOKIE_OPTIONS.name)?.value;
    if (refreshToken) await revokeRefreshSession(refreshToken);

    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear the auth cookie by setting maxAge to 0
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: '',
      maxAge: 0,
    });
    response.cookies.set({
      ...REFRESH_COOKIE_OPTIONS,
      value: '',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to log out' },
      { status: 500 }
    );
  }
}
