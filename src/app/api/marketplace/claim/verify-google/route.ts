import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { findBestMatch, GOOGLE_MATCH_THRESHOLD } from '@/lib/marketplace/google-business-matcher';
import { recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';

/**
 * GET /api/marketplace/claim/verify-google?tenantId=xxx
 * --------------------------------------------------------
 * After Google Business Profile OAuth completes (via /api/oauth/googlebusiness),
 * this endpoint checks the stored SocialAccount rows (platform='googlebusiness')
 * and matches them against the target marketplace listing.
 *
 * Phase 12-13: This is the strong verification method. The OAuth uses the
 * `business.manage` scope — Google only grants it to users who MANAGE the
 * Business Profile. So if a location matches the listing, the claimant has
 * proven managerial authority over the business.
 *
 * Flow:
 *   1. User clicks "Verify with Google" → OAuth flow stores SocialAccount rows
 *   2. User returns → this endpoint fetches the stored Google locations
 *   3. Matches each location against the target tenant (name + address)
 *   4. If match ≥ 80% → creates VERIFIED GOOGLE_BUSINESS evidence + sets
 *      googleBusinessVerified=true on the tenant
 *
 * Returns: { verified, matchScore, locationName } or { verified: false, reason }
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Fetch the target tenant
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        website: true,
        claimed: true,
        googleBusinessVerified: true,
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

    // If already verified, return early
    if (tenant.googleBusinessVerified) {
      return NextResponse.json({
        verified: true,
        message: 'Google Business Profile already verified for this listing.',
      });
    }

    // Fetch the Google Business Profile locations stored via OAuth
    // (SocialAccount rows with platform='googlebusiness' for this tenant)
    const socialAccounts = await db.socialAccount.findMany({
      where: {
        tenantId,
        platform: 'googlebusiness',
        isActive: true,
      },
      select: {
        accountId: true,
        accountName: true,
        metadata: true,
      },
    });

    if (socialAccounts.length === 0) {
      return NextResponse.json({
        verified: false,
        reason: 'NO_GOOGLE_CONNECTION',
        message:
          'No Google Business Profile connected. Click "Verify with Google" to start OAuth.',
      }, { status: 400 });
    }

    // Build Google location objects from SocialAccount rows
    const googleLocations = socialAccounts.map((sa) => {
      const meta = JSON.parse(sa.metadata || '{}') as {
        locationName?: string;
        accountName?: string;
      };
      return {
        locationId: sa.accountId,
        title: sa.accountName || meta.locationName || '',
        address: '', // Google's Business Information API doesn't return address
        // in the list call (readMask=name,title). To get address, we'd need
        // a separate GET per location. For now, match on name only.
        phone: undefined,
        website: undefined,
      };
    });

    // Match against the target tenant
    const bestMatch = findBestMatch(googleLocations, {
      name: tenant.name,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      country: tenant.country,
      phone: tenant.phone,
      website: tenant.website,
    });

    if (!bestMatch) {
      return NextResponse.json({
        verified: false,
        reason: 'NO_MATCH',
        message:
          'None of your Google Business Profile locations match this business. ' +
          'Make sure you manage the correct profile.',
      }, { status: 400 });
    }

    if (bestMatch.matchScore < GOOGLE_MATCH_THRESHOLD) {
      return NextResponse.json({
        verified: false,
        reason: 'WEAK_MATCH',
        matchScore: bestMatch.matchScore,
        locationName: bestMatch.title,
        message: `Best match score ${Math.round(bestMatch.matchScore * 100)}% is below the 80% threshold. Please verify via document upload instead.`,
      }, { status: 400 });
    }

    // Gate 1.8 security review: when address is unavailable (Google's list
    // call only returns name+title), the match is name-only. A name-only
    // match ≥80% could be a false positive (two businesses with the same
    // name in different cities). To be safe, require NEAR-EXACT name match
    // (≥90%) when address is unavailable, AND log the match for admin review.
    const hasAddress = !!bestMatch.addressScore || bestMatch.phoneMatch || bestMatch.websiteMatch;
    const effectiveThreshold = hasAddress ? GOOGLE_MATCH_THRESHOLD : 0.9;
    if (bestMatch.matchScore < effectiveThreshold) {
      logger.warn(
        {
          component: 'claim-google',
          tenantId,
          matchScore: bestMatch.matchScore,
          threshold: effectiveThreshold,
          hasAddress,
        },
        'Google match below threshold (name-only match requires ≥90%)',
      );
      return NextResponse.json({
        verified: false,
        reason: 'WEAK_MATCH',
        matchScore: bestMatch.matchScore,
        locationName: bestMatch.title,
        message:
          `Match score ${Math.round(bestMatch.matchScore * 100)}% is below the required ` +
          `${Math.round(effectiveThreshold * 100)}% threshold for name-only matches. ` +
          `Please verify via document upload or contact support.`,
      }, { status: 400 });
    }

    // Gate 1.8 + architectural fix: VerificationEvidence is the SOLE source of
    // truth. We do NOT set Tenant.googleBusinessVerified directly — the
    // verification engine derives it from the evidence row. This prevents
    // two competing sources of truth (Tenant boolean vs VerificationEvidence).
    //
    // If the match has corroboration (address/phone/website) → VERIFIED (auto).
    // If name-only match → PENDING (manual admin review). Name alone is
    // candidate evidence, not ownership proof.
    const hasCorroboration = !!bestMatch.addressScore || bestMatch.phoneMatch || bestMatch.websiteMatch;
    const evidenceStatus = hasCorroboration ? 'VERIFIED' : 'PENDING';

    await db.verificationEvidence.create({
      data: {
        tenantId,
        type: 'GOOGLE_BUSINESS',
        status: evidenceStatus,
        target: bestMatch.title,
        metadata: JSON.stringify({
          googleLocationId: bestMatch.locationId,
          matchScore: bestMatch.matchScore,
          nameScore: bestMatch.nameScore,
          addressScore: bestMatch.addressScore,
          phoneMatch: bestMatch.phoneMatch,
          websiteMatch: bestMatch.websiteMatch,
          hasCorroboration,
          autoApproved: hasCorroboration,
        }),
        verifiedAt: hasCorroboration ? new Date() : null,
        verifiedById: authUser.id,
      },
    });

    // Also store the Google location ID on the tenant for reference (not a
    // verification claim — just the linked location for future API calls).
    // This is NOT googleBusinessVerified=true — that's derived from evidence.
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        googleBusinessLocationId: bestMatch.locationId,
      },
    });

    // Gate H: Recompute cached marketplace eligibility after Google evidence
    await recomputeMarketplaceEligibility(tenantId);

    logger.info(
      {
        component: 'claim-google',
        tenantId,
        locationId: bestMatch.locationId,
        matchScore: bestMatch.matchScore,
        evidenceStatus,
        hasCorroboration,
      },
      hasCorroboration
        ? 'Google Business VERIFIED (corroborated match)'
        : 'Google Business evidence PENDING (name-only match, needs admin review)',
    );

    return NextResponse.json({
      verified: hasCorroboration,
      pendingReview: !hasCorroboration,
      matchScore: bestMatch.matchScore,
      locationName: bestMatch.title,
      evidenceStatus,
      message: hasCorroboration
        ? `Google Business Profile verified — matched "${bestMatch.title}" (${Math.round(bestMatch.matchScore * 100)}% match).`
        : `Google match found ("${bestMatch.title}", ${Math.round(bestMatch.matchScore * 100)}%) but without address/phone corroboration. Sent for admin review.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Google verification failed';
    logger.error({ component: 'claim-google', err: error }, 'Google verification error');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
