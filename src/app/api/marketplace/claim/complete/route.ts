/**
 * POST /api/marketplace/claim/complete
 * --------------------------------------
 * Complete a business claim by validating the secure token from the approval
 * email and either:
 *   (a) Creating a new user account (if the claimant is not logged in), OR
 *   (b) Attaching the business to the existing logged-in user's account.
 *
 * This endpoint is called from the ClaimCompletion component, which is shown
 * when a user navigates to `/?claim=complete&token=<token>`.
 *
 * Flow:
 *   1. Validate the token — find the ClaimRequest by `completionToken`.
 *   2. Ensure the claim is in `auto_approved` or `approved` status (not pending/rejected/completed).
 *   3. If user is logged in (session cookie present):
 *      - Attach the tenant to their account (set tenantId, create workspace if needed).
 *      - Mark claim as `completed`.
 *   4. If user is NOT logged in:
 *      - Require `name` + `password` in the body.
 *      - Create a new User (owner role) attached to the tenant.
 *      - Create a Workspace for the tenant.
 *      - Issue JWT, set session cookie.
 *      - Mark claim as `completed`.
 *   5. Update tenant: claimedById, signupMode='listing_only', listingTier='claimed_free'.
 *   6. Return { user, token, tenant } so the frontend can hydrate auth state.
 *
 * Security:
 *   - Token is single-use: cleared after completion (set to null).
 *   - Token expires after 7 days (checked against `createdAt`).
 *   - Email is locked to `claimantEmail` from the claim record (user cannot change it).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getAuthUser,
  hashPassword,
  generateToken,
  COOKIE_OPTIONS,
  generateSlug,
} from '@/lib/auth';
import { logger } from '@/lib/logger';
import { markSitemapDirtyForTenant } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, password } = body as {
      token: string;
      name?: string;
      password?: string;
    };

    if (!token) {
      return NextResponse.json(
        { error: 'Missing claim token' },
        { status: 400 },
      );
    }

    // ── Validate the token ────────────────────────────────────────────────
    const claim = await db.claimRequest.findUnique({
      where: { completionToken: token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            industry: true,
            phone: true,
            email: true,
            city: true,
            state: true,
            country: true,
            plan: true,
            planStatus: true,
            trialEndsAt: true,
            onboardingCompleted: true,
            onboardingStep: true,
            listingTier: true,
            signupMode: true,
            claimed: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Invalid or expired claim token' },
        { status: 404 },
      );
    }

    // Check status — only auto_approved or approved can be completed
    if (claim.status !== 'auto_approved' && claim.status !== 'approved') {
      return NextResponse.json(
        {
          error:
            claim.status === 'completed'
              ? 'This claim has already been completed.'
              : claim.status === 'rejected'
                ? 'This claim was rejected.'
                : 'This claim is still pending review.',
        },
        { status: 400 },
      );
    }

    // Check token expiry (based on claim creation time)
    if (Date.now() - claim.createdAt.getTime() > TOKEN_TTL_MS) {
      return NextResponse.json(
        { error: 'This claim link has expired. Please submit a new claim.' },
        { status: 400 },
      );
    }

    if (!claim.claimantEmail) {
      return NextResponse.json(
        { error: 'Claim record is missing the business email. Please contact support.' },
        { status: 500 },
      );
    }

    // ── Check if user is already logged in ────────────────────────────────
    const existingUser = await getAuthUser();

    if (existingUser) {
      // ── Phase 4.3: Prevent tenant takeover ────────────────────────────
      // If the logged-in user already owns a DIFFERENT tenant, don't silently
      // overwrite their tenantId. They must log out + use the claim link
      // from an incognito session, OR contact support for multi-business.
      if (existingUser.tenantId && existingUser.tenantId !== claim.tenantId) {
        return NextResponse.json(
          {
            error:
              'You are logged into a different business account. Please log out and click the claim link again, or contact support to manage multiple businesses.',
            needsLogout: true,
          },
          { status: 409 },
        );
      }

      // ── Path B: Attach business to existing user (transactional) ──────
      // Phase 4.4 + Gate 1.5 fix: Atomic completion — user update + tenant
      // claim + claim status change all happen in one transaction.
      //
      // Gate 1.5 fix (TOCTOU race): the tenant.update uses a conditional
      // where clause `claimed: false` — if another user already claimed
      // the tenant between our pre-check and this transaction, the update
      // affects 0 rows and Prisma throws P2025 (record not found). We
      // catch that and return a clear error instead of silently failing.
      try {
        await db.$transaction([
          db.user.update({
            where: { id: existingUser.id },
            data: { tenantId: claim.tenantId },
          }),
          db.tenant.update({
            where: { id: claim.tenantId, claimed: false }, // ← conditional: only if NOT already claimed
            data: {
              claimed: true,           // ← NOW set claimed (was deferred from request)
              claimedAt: new Date(),
              claimedById: existingUser.id,
              signupMode: 'listing_only',
              listingTier: 'claimed_free',
            },
          }),
          db.claimRequest.update({
            where: { id: claim.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              completionToken: null, // single-use
              claimantUserId: existingUser.id,
            },
          }),
        ]);
      } catch (txErr) {
        // Prisma P2025 = record not found → the conditional `claimed: false`
        // matched 0 rows, meaning another user claimed it first.
        if (txErr instanceof Error && txErr.message.includes('P2025')) {
          return NextResponse.json(
            { error: 'This business was just claimed by someone else. Please refresh and try another business.' },
            { status: 409 },
          );
        }
        throw txErr;
      }

      logger.info(
        { component: 'claim', claimId: claim.id, userId: existingUser.id },
        'Claim completed (existing user)',
      );

      // Mark sitemap dirty — the tenant's claim status changed, affecting its URL
      await markSitemapDirtyForTenant(claim.tenantId).catch(() => {});

      return NextResponse.json({
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          tenantId: claim.tenantId,
          workspaceId: existingUser.workspaceId,
        },
        tenant: {
          id: claim.tenant.id,
          name: claim.tenant.name,
          slug: claim.tenant.slug,
          industry: claim.tenant.industry,
          listingTier: 'claimed_free',
          signupMode: 'listing_only',
        },
        mode: 'attached',
      });
    }

    // ── Path A: Create a new user account ─────────────────────────────────
    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required to create your account' },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    // Check if a user with this email already exists (edge case: user forgot
    // they had an account). If so, tell them to log in first.
    const emailConflict = await db.user.findUnique({
      where: { email: claim.claimantEmail },
      select: { id: true },
    });
    if (emailConflict) {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists. Please sign in first, then click the claim link again.',
          needsLogin: true,
        },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    // Create a workspace for the tenant (the tenant already exists — it was
    // an unclaimed seed listing). Use the tenant's existing slug.
    const workspace = await db.workspace.create({
      data: {
        name: `${claim.tenant.name} Workspace`,
        slug: `${claim.tenant.slug || generateSlug(claim.tenant.name)}-workspace`,
        industry: claim.tenant.industry || null,
        ownerId: '', // Will update after user creation
        tenantId: claim.tenantId,
      },
    });

    // Create the user (owner role) attached to the tenant
    const newUser = await db.user.create({
      data: {
        name,
        email: claim.claimantEmail,
        passwordHash,
        role: 'owner',
        authProvider: 'email',
        tenantId: claim.tenantId,
        workspaceId: workspace.id,
      },
    });

    // Update workspace ownerId
    await db.workspace.update({
      where: { id: workspace.id },
      data: { ownerId: newUser.id },
    });

    // Mark the tenant as claimed by this new user, set listing-only mode.
    // Gate 1.5 fix: conditional where clause `claimed: false` prevents
    // the TOCTOU race (two users completing the same claim simultaneously).
    try {
      await db.$transaction([
        db.tenant.update({
          where: { id: claim.tenantId, claimed: false }, // ← conditional
          data: {
            claimed: true,
            claimedAt: new Date(),
            claimedById: newUser.id,
            signupMode: 'listing_only',
            listingTier: 'claimed_free',
          },
        }),
        db.claimRequest.update({
          where: { id: claim.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            completionToken: null, // single-use
            claimantUserId: newUser.id,
          },
        }),
      ]);
    } catch (txErr) {
      // Prisma P2025 = record not found → the conditional `claimed: false`
      // matched 0 rows, meaning another user claimed it first.
      if (txErr instanceof Error && txErr.message.includes('P2025')) {
        return NextResponse.json(
          { error: 'This business was just claimed by someone else. Please refresh and try another business.' },
          { status: 409 },
        );
      }
      throw txErr;
    }

    // Mark sitemap dirty — the tenant's claim status changed, affecting its URL
    await markSitemapDirtyForTenant(claim.tenantId).catch(() => {});

    // Issue JWT
    const authUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      tenantId: newUser.tenantId!,
      workspaceId: newUser.workspaceId,
      avatar: newUser.avatar,
    };
    const jwtToken = generateToken(authUser);

    logger.info(
      { component: 'claim', claimId: claim.id, userId: newUser.id },
      'Claim completed (new user)',
    );

    const response = NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          tenantId: newUser.tenantId,
          workspaceId: newUser.workspaceId,
          avatar: newUser.avatar,
        },
        token: jwtToken,
        tenant: {
          id: claim.tenant.id,
          name: claim.tenant.name,
          slug: claim.tenant.slug,
          industry: claim.tenant.industry,
          listingTier: 'claimed_free',
          signupMode: 'listing_only',
        },
        mode: 'created',
      },
      { status: 201 },
    );

    // Set auth cookie
    response.cookies.set({
      ...COOKIE_OPTIONS,
      value: jwtToken,
    });

    return response;
  } catch (err) {
    logger.error({ component: 'claim', err }, 'Claim completion failed');
    return NextResponse.json(
      { error: 'Failed to complete claim. Please try again or contact support.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/marketplace/claim/complete?token=xxx
 * ----------------------------------------------
 * Validate a claim token without completing it. Used by the frontend
 * ClaimCompletion component to check if the token is valid before showing
 * the registration form.
 *
 * Returns: { valid, businessName, email, status, requiresAuth }
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ valid: false, error: 'Missing token' }, { status: 400 });
    }

    const claim = await db.claimRequest.findUnique({
      where: { completionToken: token },
      select: {
        id: true,
        status: true,
        claimantEmail: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
    });

    if (!claim) {
      return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 404 });
    }

    if (claim.status === 'completed') {
      return NextResponse.json({
        valid: false,
        error: 'This claim has already been completed.',
      });
    }
    if (claim.status === 'rejected') {
      return NextResponse.json({
        valid: false,
        error: 'This claim was rejected.',
      });
    }
    if (claim.status === 'pending') {
      return NextResponse.json({
        valid: false,
        error: 'This claim is still pending review.',
      });
    }
    if (Date.now() - claim.createdAt.getTime() > TOKEN_TTL_MS) {
      return NextResponse.json({
        valid: false,
        error: 'This claim link has expired.',
      });
    }

    // Check if user is already logged in
    const existingUser = await getAuthUser();

    return NextResponse.json({
      valid: true,
      businessName: claim.tenant.name,
      email: claim.claimantEmail,
      status: claim.status,
      requiresAuth: !existingUser,
    });
  } catch (err) {
    logger.error({ component: 'claim', err }, 'Claim token validation failed');
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 });
  }
}
