import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  verifyOtpCode,
  isMaxAttemptsReached,
} from '@/lib/verification/otp-service';
import { recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';

/**
 * POST /api/verification/verify-otp
 * ----------------------------------
 * Phase 9-10 (Gate B): Verify an OTP code for new business phone/email.
 *
 * Works for BOTH:
 *   - New business verification (user-supplied phone/email) — /api/verification/send-otp
 *   - Claim verification (listing's existing phone/email) — /api/marketplace/claim/send-otp
 *
 * Both create PENDING VerificationEvidence rows with the same shape, so this
 * endpoint can verify either.
 *
 * Body: { code: string }
 *
 * Security:
 *   - Filters by verifiedById (only the user who requested the OTP can verify it)
 *   - Max 5 attempts before EXPIRED
 *   - OTP hash cleared after successful verification (one-time use)
 *   - Expired OTPs are rejected
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
    const { code } = body as { code: string };

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    // Find the most recent PENDING OTP evidence for this tenant + THIS user.
    // Gate 1.4 fix: MUST filter by verifiedById — prevents cross-user OTP hijack.
    const evidence = await db.verificationEvidence.findFirst({
      where: {
        tenantId: authUser.tenantId,
        status: 'PENDING',
        type: { in: ['PHONE', 'EMAIL'] },
        verifiedById: authUser.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: 'No active verification code found. Please request a new one.' },
        { status: 404 },
      );
    }

    // Parse metadata
    const metadata = JSON.parse(evidence.metadata || '{}') as {
      otpHash?: string;
      attempts?: number;
    };

    // Check max attempts
    const attempts = metadata.attempts ?? 0;
    if (isMaxAttemptsReached(attempts)) {
      await db.verificationEvidence.update({
        where: { id: evidence.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 429 },
      );
    }

    // Verify the code
    if (!verifyOtpCode(code, metadata.otpHash ?? null)) {
      // Increment attempts
      await db.verificationEvidence.update({
        where: { id: evidence.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            attempts: attempts + 1,
          }),
        },
      });
      const remaining = 5 - (attempts + 1);
      return NextResponse.json(
        { error: `Incorrect code. ${remaining} attempt(s) remaining.` },
        { status: 400 },
      );
    }

    // Code is correct — mark this evidence as VERIFIED.
    // Gate 1.4 fix: clear the OTP hash (one-time use — can't be replayed).
    await db.verificationEvidence.update({
      where: { id: evidence.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        metadata: JSON.stringify({
          channel: evidence.type,
          verifiedById: authUser.id,
          // OTP hash is intentionally NOT stored anymore — one-time use.
        }),
      },
    });

    // Gate H: Recompute cached marketplace eligibility after verification change
    await recomputeMarketplaceEligibility(authUser.tenantId);

    logger.info(
      { component: 'verification', tenantId: authUser.tenantId, evidenceType: evidence.type },
      'OTP verified',
    );

    return NextResponse.json({
      success: true,
      message: `${evidence.type === 'PHONE' ? 'Phone' : 'Email'} verified successfully.`,
      verifiedType: evidence.type,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify OTP';
    logger.error({ component: 'verification', err: error }, 'Verify OTP failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
