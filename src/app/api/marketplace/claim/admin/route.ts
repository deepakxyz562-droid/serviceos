/**
 * POST /api/marketplace/claim/admin
 * ----------------------------------
 * SuperAdmin-only endpoint to approve or reject a pending claim request.
 *
 * Request body:
 *   { requestId: string, action: 'approve'|'reject', reviewNote?: string }
 *
 * On approve:
 *   - Generate a completionToken (single-use, for the registration link).
 *   - Set tenant.claimed = true, claimedById, claimedAt, listingTier='claimed_free'.
 *   - Set claimRequest.status = 'approved', completionToken, reviewedById, reviewedAt.
 *   - Send CLAIM_APPROVED email to claimantEmail with the registration link.
 *
 * On reject:
 *   - Set claimRequest.status = 'rejected', reviewedById, reviewedAt, reviewNote.
 *   - Tenant stays unclaimed.
 *   - Send CLAIM_REJECTED email to claimantEmail (no registration link).
 *
 * Auth: requires authenticated superadmin (isSuperAdmin === true). The legacy
 * check `user.role !== 'superadmin'` was broken because superadmins in this
 * codebase are identified by the `isSuperAdmin` boolean on the User model,
 * NOT by `role === 'superadmin'`. The role field defaults to 'owner' for
 * superadmin accounts. This blocked legitimate superadmins from accessing
 * the claim review UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  generateClaimToken,
  sendClaimApprovedEmail,
  sendClaimRejectedEmail,
  type ClaimEmailContext,
} from '@/lib/claim-emails';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Canonical superadmin check: isSuperAdmin boolean takes precedence.
    // Also accept role-based fallbacks for legacy/edge cases.
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'SuperAdmin access required' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { requestId, action, reviewNote } = body as {
      requestId: string;
      action: 'approve' | 'reject';
      reviewNote?: string;
    };

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'requestId and action (approve|reject) are required' },
        { status: 400 },
      );
    }

    const claim = await db.claimRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    });
    if (!claim) {
      return NextResponse.json({ error: 'Claim request not found' }, { status: 404 });
    }
    // Defensive: if the Tenant row was deleted (Cascade) but the ClaimRequest
    // remained, claim.tenant will be null/undefined. Reject the action with a
    // clear error rather than crashing on claim.tenant.name below.
    if (!claim.tenant) {
      return NextResponse.json(
        { error: 'The business (Tenant) for this claim no longer exists. Cannot approve/reject a claim for a deleted business.' },
        { status: 404 },
      );
    }
    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: `Claim is already ${claim.status}` },
        { status: 400 },
      );
    }
    if (!claim.claimantEmail) {
      return NextResponse.json(
        { error: 'Claim has no claimant email — cannot notify the user' },
        { status: 400 },
      );
    }

    const appUrl = getAppUrl(request);

    if (action === 'approve') {
      // Generate a single-use completion token for the registration link
      const completionToken = generateClaimToken();

      await db.$transaction([
        db.tenant.update({
          where: { id: claim.tenantId },
          data: {
            claimed: true,
            claimedAt: new Date(),
            claimedById: claim.claimantUserId || undefined,
            listingTier: 'claimed_free',
          },
        }),
        db.claimRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            completionToken,
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          },
        }),
      ]);

      // Send approval email with the registration link
      // (claim.tenant is guaranteed non-null by the guard above)
      const emailCtx: ClaimEmailContext = {
        businessName: claim.tenant!.name,
        claimantEmail: claim.claimantEmail,
        requestId: claim.id,
        completionToken,
        appUrl,
      };
      await sendClaimApprovedEmail(emailCtx);

      logger.info(
        { component: 'claim-admin', requestId, action: 'approve' },
        'Claim approved — email sent to claimant',
      );

      return NextResponse.json({
        status: 'approved',
        message: 'Claim approved. Approval email sent to the claimant.',
      });
    } else {
      // ── Reject ──────────────────────────────────────────────────────────
      await db.claimRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote ?? null,
        },
      });

      // Send rejection email (no registration link)
      // (claim.tenant is guaranteed non-null by the guard above)
      const emailCtx: ClaimEmailContext = {
        businessName: claim.tenant!.name,
        claimantEmail: claim.claimantEmail,
        requestId: claim.id,
        appUrl,
        reviewNote: reviewNote ?? null,
      };
      await sendClaimRejectedEmail(emailCtx);

      logger.info(
        { component: 'claim-admin', requestId, action: 'reject' },
        'Claim rejected — rejection email sent to claimant',
      );

      return NextResponse.json({
        status: 'rejected',
        message: 'Claim rejected. Rejection email sent to the claimant.',
      });
    }
  } catch (err) {
    logger.error({ component: 'claim-admin', err }, 'Admin claim action failed');
    return NextResponse.json(
      { error: 'Failed to process claim action' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/marketplace/claim/admin
 * ---------------------------------
 * SuperAdmin-only: list all claim requests for the review queue.
 *
 * Query params:
 *   ?status=pending|approved|rejected|auto_approved|completed|all
 *   (default: 'pending')
 *
 * Returns the claim with tenant info and parsed verificationData so the
 * admin UI can display the submitted Google URL, document URLs, and notes.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Canonical superadmin check (see POST handler above for rationale).
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'SuperAdmin access required' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status') || 'pending';

    const claims = await db.claimRequest.findMany({
      where: statusFilter === 'all' ? {} : { status: statusFilter },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            // Full address for side-by-side comparison with GBP address.
            address: true,
            city: true,
            state: true,
            country: true,
            // Phone + email for cross-reference with GBP / claimant email.
            phone: true,
            email: true,
            // Website for domain-match signal (Improvement D).
            website: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // ── Claim history per claimant ─────────────────────────────────────────
    // For each claim, count how many other claims this claimant has filed
    // (across all tenants + all statuses). 1 = first-time claimant (green),
    // 2-3 = normal, 4+ = elevated fraud risk (red flag for the admin).
    //
    // We batch this into one grouped query instead of N+1 per-claim queries.
    const claimantIds = [
      ...new Set(
        claims
          .map((c) => c.claimantUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const claimantEmails = [
      ...new Set(
        claims
          .map((c) => c.claimantEmail)
          .filter((e): e is string => Boolean(e)),
      ),
    ];

    // Count claims by claimantUserId OR claimantEmail (a claimant may have
    // filed some claims while logged in and others anonymously via email).
    const historyCounts = new Map<string, number>();
    if (claimantIds.length > 0 || claimantEmails.length > 0) {
      const allClaims = await db.claimRequest.findMany({
        where: {
          OR: [
            ...(claimantIds.length > 0 ? [{ claimantUserId: { in: claimantIds } }] : []),
            ...(claimantEmails.length > 0 ? [{ claimantEmail: { in: claimantEmails } }] : []),
          ],
        },
        select: { claimantUserId: true, claimantEmail: true },
      });
      for (const c of allClaims) {
        // Key by whichever identifier is present (userId preferred).
        const key = c.claimantUserId || c.claimantEmail;
        if (key) historyCounts.set(key, (historyCounts.get(key) ?? 0) + 1);
      }
    }

    // Parse verificationData JSON + attach claim history count for the admin UI.
    const claimsWithParsedData = claims.map((c) => {
      const historyKey = c.claimantUserId || c.claimantEmail;
      return {
        ...c,
        verificationData: JSON.parse(c.verificationData || '{}'),
        // How many total claims this claimant has filed (including this one).
        claimantHistoryCount: historyKey ? (historyCounts.get(historyKey) ?? 1) : 1,
      };
    });

    return NextResponse.json({ claims: claimsWithParsedData, total: claims.length });
  } catch (err) {
    logger.error({ component: 'claim-admin', err }, 'Failed to list claims');
    return NextResponse.json(
      { error: 'Failed to list claims' },
      { status: 500 },
    );
  }
}
