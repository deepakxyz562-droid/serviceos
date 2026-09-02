import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  verifyOtpCode,
  isOtpExpired,
  isMaxAttemptsReached,
} from '@/lib/verification/otp-service';
import { recordEvidence, recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';

/**
 * POST /api/marketplace/claim/verify-otp
 * ---------------------------------------
 * Verify an OTP code entered by the claimant.
 *
 * Phase 7-8: Checks the code against the most recent PENDING VerificationEvidence
 * row for this tenant + channel. On success:
 *   - Marks the evidence row as VERIFIED
 *   - Creates a new VERIFIED evidence row (clean, no OTP hash)
 *   - Returns success
 *
 * Does NOT mark the tenant claimed — that happens at claim completion.
 *
 * Body: { tenantId, code }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, code } = body as { tenantId: string; code: string };

    if (!tenantId || !code) {
      return NextResponse.json(
        { error: 'tenantId and code are required' },
        { status: 400 },
      );
    }

    // Find the most recent PENDING OTP evidence for this tenant + THIS user.
    // Gate 1.4 fix: MUST filter by verifiedById — otherwise User A requests
    // an OTP and User B can verify it (cross-user OTP hijack). The evidence
    // row is created by send-otp with verifiedById = the requesting user.
    const evidence = await db.verificationEvidence.findFirst({
      where: {
        tenantId,
        status: 'PENDING',
        type: { in: ['PHONE', 'EMAIL'] },
        verifiedById: authUser.id, // ← only the user who requested the OTP can verify it
        expiresAt: { gt: new Date() }, // not expired
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: 'No active verification code found. Please request a new one.' },
        { status: 404 },
      );
    }

    // Parse metadata for the OTP hash + attempt count
    const metadata = JSON.parse(evidence.metadata || '{}') as {
      otpHash?: string;
      attempts?: number;
    };

    // Check max attempts
    const attempts = metadata.attempts ?? 0;
    if (isMaxAttemptsReached(attempts)) {
      // Mark as expired (no more attempts)
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

    // Code is correct — mark this evidence as VERIFIED
    await db.verificationEvidence.update({
      where: { id: evidence.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        metadata: JSON.stringify({
          channel: evidence.type,
          verifiedById: authUser.id,
        }),
      },
    });

    // Gate H: Recompute cached marketplace eligibility after verification change
    await recomputeMarketplaceEligibility(tenantId);

    logger.info(
      { component: 'claim-otp', tenantId, evidenceType: evidence.type },
      'OTP verified for claim',
    );

    return NextResponse.json({
      success: true,
      message: `${evidence.type === 'PHONE' ? 'Phone' : 'Email'} verified successfully.`,
      verifiedType: evidence.type,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify OTP';
    logger.error({ component: 'claim-otp', err: error }, 'Verify OTP failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
