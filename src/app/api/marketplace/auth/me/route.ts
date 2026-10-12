import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/auth/me
 *
 * Returns the current marketplace customer from the session cookie or JWT session.
 * Used by the customer dashboard (web & mobile) to check if the user is logged in.
 *
 * Returns: { customer: { id, name, phone, email, avatarUrl } } or { customer: null }
 */
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('mc_session')?.value;

    if (sessionId) {
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

      if (customer && customer.otpVerified) {
        return NextResponse.json({ customer });
      }
    }

    // Fallback: check standard JWT session (Google OAuth / Customer OTP / Mobile Bearer token)
    const authUser = await getAuthUser();
    if (authUser && authUser.email) {
      const normalizedEmail = authUser.email.toLowerCase().trim();
      let mpCustomer = await db.marketplaceCustomer.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          otpVerified: true,
          avatarUrl: true,
        },
      });

      if (!mpCustomer && normalizedEmail.includes('@')) {
        mpCustomer = await db.marketplaceCustomer.create({
          data: {
            email: normalizedEmail,
            phone: `user-${authUser.id}`,
            name: authUser.name || normalizedEmail.split('@')[0],
            otpVerified: true,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            otpVerified: true,
            avatarUrl: true,
          },
        });
      }

      if (mpCustomer) {
        return NextResponse.json({ customer: mpCustomer });
      }
    }

    return NextResponse.json({ customer: null });
  } catch (error: any) {
    console.error('[marketplace/auth/me]', error);
    return NextResponse.json({ customer: null });
  }
}
