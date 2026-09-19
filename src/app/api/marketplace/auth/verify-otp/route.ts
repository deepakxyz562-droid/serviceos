import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/marketplace/auth/verify-otp
 *
 * Verifies the OTP code and marks the MarketplaceCustomer as verified.
 * Sets a cookie with the customer ID for session management.
 *
 * Body: { customerId: string, otpCode: string }
 * Returns: { success: true, customer: { id, name, phone, email } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, otpCode } = body;

    if (!customerId || !otpCode) {
      return NextResponse.json(
        { error: 'customerId and otpCode are required' },
        { status: 400 },
      );
    }

    const customer = await db.marketplaceCustomer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 },
      );
    }

    // Check OTP
    if (!customer.otpCode || customer.otpCode !== otpCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 },
      );
    }

    if (customer.otpExpiresAt && customer.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 },
      );
    }

    // Mark as verified + clear OTP
    const updated = await db.marketplaceCustomer.update({
      where: { id: customerId },
      data: {
        otpVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Set session cookie (7 days)
    const cookieStore = await cookies();
    cookieStore.set('mc_session', customerId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
      },
    });
  } catch (error: any) {
    console.error('[marketplace/auth/verify-otp]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP' },
      { status: 500 },
    );
  }
}
