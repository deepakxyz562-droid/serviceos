/**
 * Verification Engine — evaluates VerificationEvidence rows to derive trust levels.
 *
 * Phase 2: The source of truth for business verification is the VerificationEvidence
 * table, NOT the booleans on Tenant. This engine reads evidence rows and returns
 * a trust level + the list of satisfied verification methods.
 *
 * Trust levels:
 *   0 — UNVERIFIED       (no meaningful evidence)
 *   1 — CONTACT_VERIFIED (phone + email + representative declaration)
 *   2 — BUSINESS_VERIFIED (strong business evidence: Google/website/document + contact)
 *   3 — TRUSTED_BUSINESS  (business verified + operational history — future)
 *
 * Key principle: a single boolean (businessVerified) is NEVER the entire truth.
 * We store the evidence that caused verification and evaluate it against rules.
 */
import { db } from '@/lib/db';

export type VerificationType =
  | 'PHONE'
  | 'EMAIL'
  | 'GOOGLE_BUSINESS'
  | 'WEBSITE'
  | 'DOCUMENT'
  | 'REPRESENTATIVE';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export type TrustLevel = 0 | 1 | 2 | 3;

export interface VerificationSummary {
  level: TrustLevel;
  levelLabel: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  googleBusinessVerified: boolean;
  websiteVerified: boolean;
  documentVerified: boolean;
  representativeDeclared: boolean;
  strongMethods: string[]; // which strong methods are verified
  supportingMethods: string[]; // which supporting methods are verified
  /** Gate C: what's needed to reach the next trust level */
  nextSteps: string[];
}

/**
 * Evaluate a tenant's verification evidence and return their trust level.
 *
 * Reads VerificationEvidence rows (status='VERIFIED', not expired) + the
 * Tenant's representativeDeclaration field. Does NOT trust the old booleans
 * (businessVerified, identityVerified) — those are derived from this engine.
 */
export async function evaluateVerification(tenantId: string): Promise<VerificationSummary> {
  // Fetch all verified evidence rows (not expired)
  const evidence = await db.verificationEvidence.findMany({
    where: {
      tenantId,
      status: 'VERIFIED',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: { type: true, target: true, verifiedAt: true },
  });

  // Also check the tenant's representative declaration (stored on Tenant, not Evidence)
  // NOTE: googleBusinessVerified is NO LONGER read from Tenant — it's derived
  // from VerificationEvidence rows only. This prevents competing sources of truth.
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { representativeDeclaration: true },
  });

  const types = new Set(evidence.map((e) => e.type));
  const phoneVerified = types.has('PHONE');
  const emailVerified = types.has('EMAIL');
  const googleBusinessVerified = types.has('GOOGLE_BUSINESS'); // ← evidence only, NOT Tenant boolean
  const websiteVerified = types.has('WEBSITE');
  const documentVerified = types.has('DOCUMENT');
  const representativeDeclared = !!tenant?.representativeDeclaration;

  // Classify methods
  const strongMethods: string[] = [];
  if (googleBusinessVerified) strongMethods.push('Google Business Profile');
  if (websiteVerified) strongMethods.push('Website');
  if (documentVerified) strongMethods.push('Document');

  const supportingMethods: string[] = [];
  if (phoneVerified) supportingMethods.push('Phone');
  if (emailVerified) supportingMethods.push('Email');
  if (representativeDeclared) supportingMethods.push('Representative');

  // Determine trust level
  let level: TrustLevel = 0;
  let levelLabel = 'Unverified';

  // Level 2: Business Verified — strong business evidence
  // Requires at least ONE strong method + contact evidence (phone or email)
  if (strongMethods.length >= 1 && (phoneVerified || emailVerified)) {
    level = 2;
    levelLabel = 'Business Verified';
  }
  // Level 1: Contact Verified — phone + email + declaration
  // (supporting signals only, no strong business evidence)
  else if (phoneVerified && emailVerified && representativeDeclared) {
    level = 1;
    levelLabel = 'Contact Verified';
  }
  // Level 1 also if phone + email (without declaration) — partial contact
  else if (phoneVerified && emailVerified) {
    level = 1;
    levelLabel = 'Contact Verified';
  }

  // ── Gate C: Compute what's needed to reach the next level ──────────
  const nextSteps: string[] = [];
  if (level === 0) {
    if (!phoneVerified) nextSteps.push('Verify your phone number');
    if (!emailVerified) nextSteps.push('Verify your email address');
  }
  if (level === 1) {
    if (!representativeDeclared) nextSteps.push('Complete the representative declaration');
    if (strongMethods.length === 0) {
      nextSteps.push('Connect Google Business Profile OR upload a business document OR verify your website');
    }
  }
  if (level === 2) {
    // Level 3 requires operational history (future)
    nextSteps.push('Complete jobs + receive positive reviews to reach Trusted Business');
  }

  return {
    level,
    levelLabel,
    phoneVerified,
    emailVerified,
    googleBusinessVerified,
    websiteVerified,
    documentVerified,
    representativeDeclared,
    strongMethods,
    supportingMethods,
    nextSteps,
  };
}

/**
 * Record a new piece of verification evidence.
 *
 * Used by:
 *   - OTP verification (PHONE, EMAIL)
 *   - Google OAuth verification (GOOGLE_BUSINESS)
 *   - Website/domain verification (WEBSITE)
 *   - Document upload (DOCUMENT)
 *   - Representative declaration (REPRESENTATIVE)
 */
export async function recordEvidence(params: {
  tenantId: string;
  claimId?: string;
  type: VerificationType;
  status?: VerificationStatus;
  target?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  verifiedById?: string;
}): Promise<void> {
  const status = params.status ?? 'VERIFIED';
  await db.verificationEvidence.create({
    data: {
      tenantId: params.tenantId,
      claimId: params.claimId ?? null,
      type: params.type,
      status,
      target: params.target ?? null,
      metadata: JSON.stringify(params.metadata ?? {}),
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      expiresAt: params.expiresAt ?? null,
      verifiedById: params.verifiedById ?? null,
    },
  });

  // Gate H: Recompute the cached marketplaceEligible boolean after any
  // evidence change. This keeps the instant booking hot path fast (one
  // boolean read instead of the full 9-check eligibility function).
  await recomputeMarketplaceEligibility(params.tenantId);
}

/**
 * Gate H: Recompute + cache the marketplaceEligible boolean on the Tenant row.
 *
 * This is the SINGLE function that updates the cached eligibility. It's called
 * after any verification evidence change (create/verify/reject) or after profile
 * completion changes. The instant booking endpoint reads the cached boolean.
 *
 * Separates:
 *   - Lead eligibility (can receive leads): verification + profile + opt-in + plan
 *   - Payout eligibility (can receive money): Stripe connected (tracked separately)
 */
export async function recomputeMarketplaceEligibility(tenantId: string): Promise<boolean> {
  try {
    // Evaluate verification status
    const verification = await evaluateVerification(tenantId);

    // Fetch the remaining eligibility inputs
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        planStatus: true,
        profileCompletionPct: true,
        marketplaceOptIn: true,
        marketplaceTermsAcceptedAt: true,
        stripeConnected: true,
      },
    });

    if (!tenant) return false;

    // Look up the plan's marketplaceAccess
    let marketplaceAccess = 'none';
    try {
      const plan = await db.plan.findUnique({
        where: { code: tenant.plan },
        select: { marketplaceAccess: true },
      });
      marketplaceAccess = plan?.marketplaceAccess ?? 'none';
    } catch {
      // plan table unavailable — assume no marketplace access
    }

    // ── Lead eligibility (can receive marketplace leads) ──────────────
    // Gate H: Separated from payout eligibility. A business can receive
    // leads without Stripe (they just can't receive money yet).
    //
    // Requirements:
    //   1. Verification level ≥ 1 (Contact Verified at minimum)
    //   2. Profile completion ≥ 80%
    //   3. Marketplace opt-in is true
    //   4. Terms accepted
    //   5. Plan supports marketplace (receive_bookings | priority)
    const planSupportsMarketplace = ['receive_bookings', 'priority'].includes(marketplaceAccess);
    const profileComplete = tenant.profileCompletionPct >= 80;
    const termsAccepted = !!tenant.marketplaceTermsAcceptedAt;

    const eligible =
      verification.level >= 1 &&
      profileComplete &&
      tenant.marketplaceOptIn &&
      termsAccepted &&
      planSupportsMarketplace;

    // Cache the result on the Tenant row
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        marketplaceEligible: eligible,
        marketplaceEligibleComputedAt: new Date(),
      },
    });

    return eligible;
  } catch (error) {
    // Non-fatal — if the recompute fails, the cached value stays as-is.
    // The next successful verification will recompute it.
    console.error('[recomputeMarketplaceEligibility] failed:', error);
    return false;
  }
}
