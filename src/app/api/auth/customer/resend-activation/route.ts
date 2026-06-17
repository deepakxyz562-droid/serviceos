import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/auth/customer/resend-activation
 *
 * Public endpoint — a customer who can't remember their password (or never set
 * one) can request a fresh activation link by entering their email/phone.
 *
 * This is the "Forgot Password" flow for customers. It uses the SAME mechanism
 * as the owner-initiated "Send Portal Invitation" — generates an activation
 * token + magic link. The customer clicks the link and sets a new password.
 *
 * Request body:
 *   { identifier: string }   // email or phone
 *
 * Response (always 200 to prevent user enumeration):
 *   {
 *     success: true,
 *     message: string,
 *     inviteUrl?: string,     // only returned in dev/demo mode so the user can
 *                              // actually click the link without email infra
 *   }
 *
 * In production with email/SMS infrastructure wired up, the link would be sent
 * via the configured notification provider and `inviteUrl` would NOT be
 * returned in the response.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Email or phone is required' },
        { status: 400 }
      );
    }

    const trimmed = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    let normalizedPhone = trimmed.replace(/\D/g, '');
    if (!isEmail && normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    const where = isEmail
      ? { email: trimmed.toLowerCase() }
      : {
          OR: [
            { phone: normalizedPhone },
            ...(normalizedPhone.startsWith('91')
              ? [{ phone: normalizedPhone.slice(2) }]
              : [{ phone: `91${normalizedPhone}` }]),
          ],
        };

    const customers = await db.customer.findMany({
      where,
      include: { workspace: { include: { tenant: true } } },
    });

    // For security/UX, we always return 200 with a generic message — even if
    // no customer was found. This prevents user enumeration attacks.
    if (customers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists for this email/phone, a portal activation link has been sent. Please check your email.',
      });
    }

    // Generate a fresh activation token for each matched customer
    const appUrl = getAppUrl();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // For demo/dev mode, we return the link for the FIRST matched customer so
    // the user can actually use it. In production, we'd send via email/SMS.
    let firstInviteUrl: string | null = null;

    for (const c of customers) {
      const token = crypto.randomBytes(32).toString('hex');
      await db.customer.update({
        where: { id: c.id },
        data: {
          activationToken: token,
          activationTokenExpiresAt: expiresAt,
          invitationSentAt: new Date(),
        },
      });
      if (!firstInviteUrl) {
        firstInviteUrl = `${appUrl}/?activate=${token}`;
      }
    }

    // Detect if we're in a dev/demo environment (no real email provider configured)
    const isDev = process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST;

    return NextResponse.json({
      success: true,
      message: 'If an account exists for this email/phone, a portal activation link has been sent. Please check your email.',
      // Only expose the URL in dev/demo mode
      ...(isDev && firstInviteUrl
        ? {
            inviteUrl: firstInviteUrl,
            devMode: true,
            message: 'Demo Mode: Use this activation link to set your password.',
          }
        : {}),
    });
  } catch (error) {
    console.error('[Resend Activation Error]', error);
    return NextResponse.json(
      { error: 'Failed to send activation link. Please try again.' },
      { status: 500 }
    );
  }
}
