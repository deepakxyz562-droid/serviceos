import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  generateOtp,
  hashOtp,
  calculateOtpExpiry,
  checkRateLimit,
  maskPhone,
  maskEmail,
} from '@/lib/verification/otp-service';
import { sendSmsMessage } from '@/lib/sms-send';
import { sendEmail } from '@/lib/email-send';

/**
 * POST /api/marketplace/claim/send-otp
 * --------------------------------------
 * Send an OTP to the listing's EXISTING phone or email for claim verification.
 *
 * Phase 7-8: The OTP is sent to the listing's stored contact point, NOT a
 * user-supplied value. This proves the claimant controls the business's
 * actual phone/email — not just a phone/email they typed in.
 *
 * Body: { tenantId, channel: 'phone' | 'email' }
 *
 * Creates a VerificationEvidence row with status='PENDING' and stores the
 * OTP hash + expiry. The verify-otp endpoint checks against this.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, channel } = body as { tenantId: string; channel: 'phone' | 'email' };

    if (!tenantId || !channel) {
      return NextResponse.json(
        { error: 'tenantId and channel (phone|email) are required' },
        { status: 400 },
      );
    }

    // Fetch the listing's anchor data (phone/email)
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, phone: true, email: true, claimed: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (tenant.claimed) {
      return NextResponse.json(
        { error: 'This business has already been claimed' },
        { status: 409 },
      );
    }

    // Determine the target (listing's existing phone/email — NOT user-supplied)
    let target: string;
    let maskedTarget: string;
    if (channel === 'phone') {
      if (!tenant.phone) {
        return NextResponse.json(
          { error: 'This business does not have a phone number on file' },
          { status: 400 },
        );
      }
      target = tenant.phone;
      maskedTarget = maskPhone(target);
    } else {
      if (!tenant.email) {
        return NextResponse.json(
          { error: 'This business does not have an email on file' },
          { status: 400 },
        );
      }
      target = tenant.email;
      maskedTarget = maskEmail(target);
    }

    // Rate limit: max 5 OTP requests per target per hour
    const rateLimitError = checkRateLimit(target);
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    // Generate + hash the OTP
    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = calculateOtpExpiry();

    // Create a PENDING VerificationEvidence row (stores the OTP hash)
    await db.verificationEvidence.create({
      data: {
        tenantId,
        type: channel === 'phone' ? 'PHONE' : 'EMAIL',
        status: 'PENDING',
        target: maskedTarget,
        metadata: JSON.stringify({
          otpHash,
          attempts: 0,
          channel,
        }),
        expiresAt,
        verifiedById: authUser.id,
      },
    });

    // Send the OTP via the appropriate channel
    if (channel === 'phone') {
      const message = `Your Fieseros verification code is: ${otpCode}. This code expires in 5 minutes. Do not share it with anyone.`;
      const result = await sendSmsMessage({
        to: target,
        message,
      });
      if (!result.success) {
        logger.error({ component: 'claim-otp', target: maskedTarget, err: result.error }, 'SMS send failed');
        return NextResponse.json(
          { error: 'Failed to send OTP via SMS. Please try email instead.' },
          { status: 500 },
        );
      }
    } else {
      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="color: #10b981;">Verify your business</h2>
          <p style="font-size: 15px; color: #374151;">Your verification code is:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; padding: 1rem 0;">${otpCode}</p>
          <p style="font-size: 14px; color: #6b7280;">This code expires in 5 minutes.</p>
          <p style="font-size: 13px; color: #9ca3af;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `;
      const text = `Your Fieseros verification code is: ${otpCode}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`;
      await sendEmail({
        to: target,
        subject: 'Your Fieseros verification code',
        html,
        text,
      });
    }

    logger.info(
      { component: 'claim-otp', tenantId, channel, target: maskedTarget },
      'OTP sent for claim verification',
    );

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${maskedTarget}`,
      channel,
      maskedTarget,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send OTP';
    logger.error({ component: 'claim-otp', err: error }, 'Send OTP failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
