/**
 * POST /api/marketplace/claim/verify-otp
 * ---------------------------------------
 * Complete a phone-OTP or email-code verification for a pending claim request.
 *
 * Request body:
 *   { requestId: string, code: string }
 *
 * If the code matches and hasn't expired → auto-approve the claim:
 *   - Set tenant.claimed = true, tenant.claimedById = user.id,
 *     tenant.claimedAt = now, tenant.listingTier = 'claimed_free'.
 *   - Set claimRequest.status = 'auto_approved'.
 *
 * If the code is wrong or expired → 400 error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, code } = body as { requestId: string; code: string };

    if (!requestId || !code) {
      return NextResponse.json(
        { error: 'requestId and code are required' },
        { status: 400 },
      );
    }

    const claim = await db.claimRequest.findUnique({
      where: { id: requestId },
    });
    if (!claim) {
      return NextResponse.json({ error: 'Claim request not found' }, { status: 404 });
    }
    if (claim.claimantUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: `Claim is already ${claim.status}` },
        { status: 400 },
      );
    }

    // Parse stored verification data
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(claim.verificationData || '{}');
    } catch {
      data = {};
    }

    // Determine which code field to check based on method
    const expectedCode =
      claim.verificationMethod === 'phone'
        ? String(data.otpHash ?? '')
        : claim.verificationMethod === 'email'
          ? String(data.codeHash ?? '')
          : '';
    const expiresAtStr =
      claim.verificationMethod === 'phone'
        ? String(data.otpExpiresAt ?? '')
        : String(data.codeExpiresAt ?? '');

    if (!expectedCode) {
      return NextResponse.json(
        { error: 'No verification code on file for this request' },
        { status: 400 },
      );
    }

    if (code !== expectedCode) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    const expiresAt = new Date(expiresAtStr);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please start a new claim.' },
        { status: 400 },
      );
    }

    // ── Code is valid → auto-approve the claim ──────────────────────────────
    await db.$transaction([
      db.tenant.update({
        where: { id: claim.tenantId },
        data: {
          claimed: true,
          claimedAt: new Date(),
          claimedById: user.id,
          listingTier: 'claimed_free',
        },
      }),
      db.claimRequest.update({
        where: { id: requestId },
        data: {
          status: 'auto_approved',
          reviewedAt: new Date(),
          verificationData: JSON.stringify({ ...data, verifiedAt: new Date().toISOString() }),
        },
      }),
    ]);

    return NextResponse.json({
      status: 'auto_approved',
      message: 'Verification successful! You now manage this business.',
    });
  } catch (err) {
    logger.error({ component: 'claim-verify', err }, 'OTP verification failed');
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 },
    );
  }
}
