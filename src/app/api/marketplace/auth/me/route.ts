import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/auth/me
 *
 * Returns the current marketplace customer from the session cookie.
 * Used by the customer dashboard to check if the user is logged in.
 *
 * Returns: { customer: { id, name, phone, email } } or { customer: null }
 */
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('mc_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ customer: null });
    }

    const customer = await db.marketplaceCustomer.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        otpVerified: true,
        avatarUrl: true,
      },
    });

    if (!customer || !customer.otpVerified) {
      return NextResponse.json({ customer: null });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error('[marketplace/auth/me]', error);
    return NextResponse.json({ customer: null });
  }
}
