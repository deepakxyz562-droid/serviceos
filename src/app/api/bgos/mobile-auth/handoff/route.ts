import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { sealHandoffTicket } from '@/lib/bgos-mobile-auth';

/**
 * POST /api/bgos/mobile-auth/handoff
 * Generates a short-lived (60s) single-use handoff ticket so the mobile app can
 * safely open OAuth connect flows in the system browser without leaking long-lived
 * bearer tokens in the URL or server logs.
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
