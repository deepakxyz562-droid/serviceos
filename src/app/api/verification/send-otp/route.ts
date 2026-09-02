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
 * POST /api/verification/send-otp
 * ---------------------------------
 * Phase 9-10 (Gate B): Send an OTP to a user-supplied phone or email for
 * NEW BUSINESS verification.
 *
 * This is DIFFERENT from /api/marketplace/claim/send-otp:
 *   - Claim send-otp: OTP goes to the LISTING's existing phone/email
 *     (proves control of the business's contact point)
 *   - This endpoint: OTP goes to a USER-SUPPLIED phone/email
 *     (proves the PERSON controls this phone/email — NOT business ownership)
 *
 * This creates PHONE/EMAIL evidence as a SUPPORTING signal (Level 1 — Contact
 * Verified). Business verification (Level 2) requires a strong method (Google,
 * website, document) in addition.
 *
 * Body: { channel: 'phone' | 'email', target: string }
 *
 * The target is validated + normalized but is USER-SUPPLIED (not from a listing).
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    }

    const body = await request.json();
    const { channel, target } = body as { channel: 'phone' | 'email'; target: string };

    if (!channel || !target) {
      return NextResponse.json(
        { error: 'channel (phone|email) and target are required' },
        { status: 400 },
      );
    }

    // Validate the target
    let normalizedTarget: string;
    let maskedTarget: string;

    if (channel === 'phone') {
      // Basic phone validation: digits only, 7-15 digits
      const digits = target.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        return NextResponse.json(
          { error: 'Invalid phone number. Must be 7-15 digits.' },
          { status: 400 },
        );
      }
      normalizedTarget = target.trim();
      maskedTarget = maskPhone(normalizedTarget);
    } else {
      // Email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 },
        );
      }
      normalizedTarget = target.trim().toLowerCase();
      maskedTarget = maskEmail(normalizedTarget);
    }

    // Rate limit: max 5 OTP requests per target per hour
    const rateLimitError = checkRateLimit(normalizedTarget);
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    // Check if already verified — don't allow re-sending if already verified
    const existingVerified = await db.verificationEvidence.findFirst({
      where: {
        tenantId: authUser.tenantId,
        type: channel === 'phone' ? 'PHONE' : 'EMAIL',
        status: 'VERIFIED',
        target: maskedTarget,
      },
    });
    if (existingVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: `${channel === 'phone' ? 'Phone' : 'Email'} already verified.`,
        maskedTarget,
      });
    }

    // Generate + hash the OTP
    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = calculateOtpExpiry();

    // Create a PENDING VerificationEvidence row
    await db.verificationEvidence.create({
      data: {
        tenantId: authUser.tenantId,
        type: channel === 'phone' ? 'PHONE' : 'EMAIL',
        status: 'PENDING',
        target: maskedTarget,
        metadata: JSON.stringify({
          otpHash,
          attempts: 0,
          channel,
          rawTarget: normalizedTarget, // stored for sending — NOT returned to client
        }),
        expiresAt,
        verifiedById: authUser.id,
      },
    });

    // Send the OTP
    if (channel === 'phone') {
      const message = `Your Fieseros verification code is: ${otpCode}. This code expires in 5 minutes. Do not share it with anyone.`;
      const result = await sendSmsMessage({ to: normalizedTarget, message });
      if (!result.success) {
        logger.error({ component: 'verification', target: maskedTarget, err: result.error }, 'SMS send failed');
        return NextResponse.json(
          { error: 'Failed to send OTP via SMS. Please try email instead.' },
          { status: 500 },
        );
      }
    } else {
      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <h2 style="color: #10b981;">Verify your contact</h2>
          <p style="font-size: 15px; color: #374151;">Your verification code is:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; padding: 1rem 0;">${otpCode}</p>
          <p style="font-size: 14px; color: #6b7280;">This code expires in 5 minutes.</p>
          <p style="font-size: 13px; color: #9ca3af;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `;
      const text = `Your Fieseros verification code is: ${otpCode}\n\nThis code expires in 5 minutes.`;
      await sendEmail({
        to: normalizedTarget,
        subject: 'Your Fieseros verification code',
        html,
        text,
      });
    }

    logger.info(
      { component: 'verification', tenantId: authUser.tenantId, channel, target: maskedTarget },
      'OTP sent for new business verification',
    );

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${maskedTarget}`,
      channel,
      maskedTarget,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send OTP';
    logger.error({ component: 'verification', err: error }, 'Send OTP failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
