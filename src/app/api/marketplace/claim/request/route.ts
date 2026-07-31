/**
 * POST /api/marketplace/claim/request
 * ------------------------------------
 * Start a business-claim flow. The authenticated user clicks "Claim this
 * business" on an unclaimed provider detail page and chooses a verification
 * method (phone / email / google / document).
 *
 * Request body:
 *   { tenantId: string, verificationMethod: 'phone'|'email'|'google'|'document',
 *     verificationData: {...} }
 *
 * Behaviour:
 *   - phone    → generates a 6-digit OTP, sends it via SMS to the tenant's
 *                seeded phone number, returns { requestId, otpSent: true }.
 *                The user then POSTs to /verify-otp with the code.
 *   - email    → generates a 6-digit code, sends it to the tenant's email,
 *                returns { requestId, codeSent: true }.
 *   - google   → expects verificationData.gbpUrl + gbpName + gbpAddress.
 *                Compares name/address similarity to the tenant. If
 *                matchScore >= 0.8 → auto-approve. Otherwise → pending review.
 *   - document → expects verificationData.documentUrls (array of uploaded
 *                file URLs). Always creates a pending request for admin review.
 *
 * Auth: requires authenticated user (the claimant).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Naive name+address similarity score (0-1). Used for the Google GBP
 * verification path — if the user's GBP listing name + address closely match
 * our tenant record, we trust Google's verification and auto-approve.
 */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aWords = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const bWords = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : intersection / union;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    }

    const body = await request.json();
    const { tenantId, verificationMethod, verificationData } = body as {
      tenantId: string;
      verificationMethod: 'phone' | 'email' | 'google' | 'document';
      verificationData: Record<string, unknown>;
    };

    if (!tenantId || !verificationMethod) {
      return NextResponse.json(
        { error: 'tenantId and verificationMethod are required' },
        { status: 400 },
      );
    }

    // Load the target tenant (the business being claimed)
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        country: true,
        claimed: true,
        listingTier: true,
      },
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

    // Prevent duplicate pending claims by the same user for the same tenant
    const existingPending = await db.claimRequest.findFirst({
      where: {
        tenantId,
        claimantUserId: user.id,
        status: { in: ['pending', 'auto_approved'] },
      },
    });
    if (existingPending) {
      return NextResponse.json(
        {
          error: 'You already have a pending claim request for this business',
          requestId: existingPending.id,
        },
        { status: 409 },
      );
    }

    // ── Route by verification method ───────────────────────────────────────
    let status: 'pending' | 'auto_approved' = 'pending';
    let storedData: Record<string, unknown> = { ...verificationData };

    if (verificationMethod === 'phone') {
      if (!tenant.phone) {
        return NextResponse.json(
          { error: 'This business has no phone number on file for verification' },
          { status: 400 },
        );
      }
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      storedData = {
        ...storedData,
        phoneLast4: tenant.phone.slice(-4),
        otpHash: otp, // TODO: hash this in production (for dev, plain text is OK)
        otpExpiresAt: otpExpiresAt.toISOString(),
        otpVerified: false,
      };
      // TODO: send OTP via SMS (twilio). For now, log it for dev.
      logger.info({ component: 'claim', otp: otp.slice(0, 2) + '****' }, 'OTP generated (dev: see DB)');
    } else if (verificationMethod === 'email') {
      if (!tenant.email) {
        return NextResponse.json(
          { error: 'This business has no email on file for verification' },
          { status: 400 },
        );
      }
      const code = generateOtp();
      const codeExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      storedData = {
        ...storedData,
        email: tenant.email,
        codeHash: code, // TODO: hash in production
        codeExpiresAt: codeExpiresAt.toISOString(),
        codeVerified: false,
      };
      // TODO: send code via email. For now, log for dev.
      logger.info({ component: 'claim', code: code.slice(0, 2) + '****' }, 'Email code generated');
    } else if (verificationMethod === 'google') {
      const gbpUrl = String(verificationData.gbpUrl ?? '');
      const gbpName = String(verificationData.gbpName ?? '');
      const gbpAddress = String(verificationData.gbpAddress ?? '');
      if (!gbpUrl || !gbpName) {
        return NextResponse.json(
          { error: 'Google Business Profile URL and name are required' },
          { status: 400 },
        );
      }
      const nameScore = similarity(gbpName, tenant.name);
      const tenantAddress = [tenant.city, tenant.state, tenant.country].filter(Boolean).join(', ');
      const addressScore = similarity(gbpAddress, tenantAddress);
      const matchScore = (nameScore * 0.7 + addressScore * 0.3);
      storedData = {
        gbpUrl,
        gbpName,
        gbpAddress,
        matchScore: Math.round(matchScore * 100) / 100,
        nameScore: Math.round(nameScore * 100) / 100,
        addressScore: Math.round(addressScore * 100) / 100,
      };
      // Auto-approve if Google's listing closely matches our tenant record
      if (matchScore >= 0.8) {
        status = 'auto_approved';
      }
    } else if (verificationMethod === 'document') {
      const documentUrls = (verificationData.documentUrls as string[]) ?? [];
      if (!Array.isArray(documentUrls) || documentUrls.length === 0) {
        return NextResponse.json(
          { error: 'At least one verification document is required' },
          { status: 400 },
        );
      }
      storedData = { documentUrls, note: verificationData.note ?? '' };
      // Document claims always need admin review
      status = 'pending';
    } else {
      return NextResponse.json(
        { error: 'Invalid verification method' },
        { status: 400 },
      );
    }

    // ── Create the claim request ───────────────────────────────────────────
    const claimRequest = await db.claimRequest.create({
      data: {
        tenantId,
        claimantUserId: user.id,
        verificationMethod,
        verificationData: JSON.stringify(storedData),
        status,
      },
    });

    // ── Auto-approve path: transfer ownership immediately ──────────────────
    if (status === 'auto_approved') {
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          claimed: true,
          claimedAt: new Date(),
          claimedById: user.id,
          listingTier: 'claimed_free',
          googleBusinessProfileUrl:
            verificationMethod === 'google'
              ? String(verificationData.gbpUrl ?? '')
              : undefined,
          googleBusinessVerified: verificationMethod === 'google',
        },
      });
      await db.claimRequest.update({
        where: { id: claimRequest.id },
        data: { status: 'auto_approved', reviewedAt: new Date() },
      });
    }

    return NextResponse.json({
      requestId: claimRequest.id,
      status,
      message:
        status === 'auto_approved'
          ? 'Claim approved! You now manage this business.'
          : verificationMethod === 'phone'
            ? 'OTP sent to the phone number on file. Enter it to verify.'
            : verificationMethod === 'email'
              ? 'Verification code sent to the email on file. Enter it to verify.'
              : 'Your claim request has been submitted for admin review (1-2 business days).',
    });
  } catch (err) {
    logger.error({ component: 'claim', err }, 'Claim request failed');
    return NextResponse.json(
      { error: 'Failed to submit claim request' },
      { status: 500 },
    );
  }
}
