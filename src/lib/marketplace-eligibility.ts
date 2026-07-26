/**
 * Marketplace eligibility checker.
 *
 * A tenant must satisfy ALL of the following gates to receive marketplace
 * leads (bookings sourced from the public marketplace / business hub):
 *
 *   1. hasActiveSubscription   — has a paid, non-trial subscription
 *   2. identityVerified        — KYC identity check passed
 *   3. businessVerified        — business registration verified
 *   4. insuranceVerified       — proof of liability insurance uploaded
 *   5. stripeConnected         — Stripe Connect account linked & capable
 *   6. profileComplete         — profileCompletionPct ≥ 80
 *   7. marketplaceOptIn        — tenant has explicitly opted in
 *   8. termsAccepted           — marketplace T&Cs accepted (timestamp set)
 *
 * Plus a 9th derived check — planSupportsMarketplace — which verifies the
 * tenant's plan grants marketplace booking access (receive_bookings | priority).
 *
 * Used by:
 *   - /api/marketplace/eligibility  (this tenant's status)
 *   - Marketplace lead dispatcher   (decides whether to route a lead here)
 *   - Onboarding checklist UI       (shows remaining gates)
 */
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface EligibilityResult {
  eligible: boolean;
  missingRequirements: string[];
  profileCompletionPct: number;
  plan: string;
  marketplaceAccess: string;
  checks: {
    hasActiveSubscription: boolean;
    identityVerified: boolean;
    businessVerified: boolean;
    insuranceVerified: boolean;
    stripeConnected: boolean;
    profileComplete: boolean; // profileCompletionPct >= 80
    marketplaceOptIn: boolean;
    termsAccepted: boolean;
    planSupportsMarketplace: boolean; // plan grants receive_bookings | priority
  };
}

/** Minimum profile completion % required to be marketplace-eligible. */
const PROFILE_COMPLETION_THRESHOLD = 80;

/** Plan.marketplaceAccess values that grant marketplace booking access. */
const MARKETPLACE_ACCESS_OK = new Set(['receive_bookings', 'priority']);

/**
 * Compute the tenant's profile completion percentage (0-100).
 *
 * Weighted checklist (totals 100%):
 *   business name         5%
 *   industry set          5%
 *   description ≥ 100ch  10%
 *   ≥ 3 services         15%
 *   ≥ 1 image            10%
 *   business hours set   10%
 *   service areas set    10%
 *   pricing type set      5%
 *   call-out fee set      5%
 *   insurance info set   10%
 *   VAT number set        5%
 *   licence number set    5%
 *   Stripe connected      5%
 *
 * Returns 0 if the tenant cannot be found.
 */
export async function computeProfileCompletion(tenantId: string): Promise<number> {
  if (!tenantId) return 0;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        industry: true,
        description: true,
        coverImage: true,
        galleryJson: true,
        businessHoursJson: true,
        serviceAreasJson: true,
        pricingType: true,
        callOutFee: true,
        insuranceProvider: true,
        insurancePolicyNumber: true,
        vatNumber: true,
        licenceNumber: true,
        stripeConnected: true,
      },
    });

    if (!tenant) return 0;

    let pct = 0;

    // business name (5%)
    if (tenant.name && tenant.name.trim().length > 0) pct += 5;

    // industry set (5%)
    if (tenant.industry && tenant.industry.trim().length > 0) pct += 5;

    // description ≥ 100 chars (10%)
    if (tenant.description && tenant.description.trim().length >= 100) pct += 10;

    // ≥ 3 services (15%) — count active+inactive services owned by tenant
    try {
      const serviceCount = await db.service.count({ where: { tenantId } });
      if (serviceCount >= 3) pct += 15;
    } catch {
      // service table unavailable — skip this weight
    }

    // ≥ 1 image (10%) — cover image OR any gallery entry
    let hasImage = false;
    if (tenant.coverImage && tenant.coverImage.trim().length > 0) {
      hasImage = true;
    } else {
      try {
        const gallery = JSON.parse(tenant.galleryJson || '[]');
        if (Array.isArray(gallery) && gallery.length > 0) hasImage = true;
      } catch {
        // ignore malformed JSON
      }
    }
    if (hasImage) pct += 10;

    // business hours set (10%) — non-empty JSON object
    if (tenant.businessHoursJson && tenant.businessHoursJson.trim() !== '{}' && tenant.businessHoursJson.trim() !== '') {
      pct += 10;
    }

    // service areas set (10%) — non-empty JSON array
    if (tenant.serviceAreasJson && tenant.serviceAreasJson.trim() !== '[]' && tenant.serviceAreasJson.trim() !== '') {
      pct += 10;
    }

    // pricing type set (5%)
    if (tenant.pricingType && tenant.pricingType.trim().length > 0) pct += 5;

    // call-out fee set (5%) — explicitly set to a positive value
    if (typeof tenant.callOutFee === 'number' && tenant.callOutFee > 0) pct += 5;

    // insurance info set (10%) — provider OR policy number present
    if (
      (tenant.insuranceProvider && tenant.insuranceProvider.trim().length > 0) ||
      (tenant.insurancePolicyNumber && tenant.insurancePolicyNumber.trim().length > 0)
    ) {
      pct += 10;
    }

    // VAT number set (5%)
    if (tenant.vatNumber && tenant.vatNumber.trim().length > 0) pct += 5;

    // licence number set (5%)
    if (tenant.licenceNumber && tenant.licenceNumber.trim().length > 0) pct += 5;

    // Stripe connected (5%)
    if (tenant.stripeConnected) pct += 5;

    // Clamp to [0, 100] (defensive — should never exceed)
    return Math.max(0, Math.min(100, pct));
  } catch (error) {
    logger.error({ error, tenantId }, 'computeProfileCompletion: failed');
    return 0;
  }
}

/**
 * Check all marketplace eligibility gates for a tenant.
 *
 * Returns a structured result. If the tenant cannot be loaded, returns a
 * fully-failed result with eligible=false (graceful null handling).
 *
 * NOTE: This function does NOT persist the computed profileCompletionPct —
 * callers that want to cache the value should write it back to the Tenant
 * row themselves. The check uses the live computed value.
 */
export async function checkMarketplaceEligibility(tenantId: string): Promise<EligibilityResult> {
  const empty: EligibilityResult = {
    eligible: false,
    missingRequirements: [
      'Tenant not found',
    ],
    profileCompletionPct: 0,
    plan: 'starter',
    marketplaceAccess: 'none',
    checks: {
      hasActiveSubscription: false,
      identityVerified: false,
      businessVerified: false,
      insuranceVerified: false,
      stripeConnected: false,
      profileComplete: false,
      marketplaceOptIn: false,
      termsAccepted: false,
      planSupportsMarketplace: false,
    },
  };

  if (!tenantId) return empty;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        plan: true,
        planStatus: true,
        identityVerified: true,
        businessVerified: true,
        insuranceVerified: true,
        stripeConnected: true,
        profileCompletionPct: true,
        marketplaceOptIn: true,
        marketplaceTermsAcceptedAt: true,
      },
    });

    if (!tenant) return empty;

    // Look up the plan's marketplaceAccess from the Plan catalog.
    let marketplaceAccess = 'none';
    try {
      const plan = await db.plan.findUnique({
        where: { code: tenant.plan },
        select: { marketplaceAccess: true },
      });
      if (plan?.marketplaceAccess) marketplaceAccess = plan.marketplaceAccess;
    } catch (error) {
      // Plan table may not be seeded yet — fall through with 'none'
      logger.warn({ error, tenantId, plan: tenant.plan }, 'checkMarketplaceEligibility: plan lookup failed');
    }

    // hasActiveSubscription: an active Subscription row OR planStatus === 'active'
    let hasActiveSubscription = tenant.planStatus === 'active';
    if (!hasActiveSubscription) {
      try {
        const activeSub = await db.subscription.findFirst({
          where: {
            tenantId,
            status: 'active',
          },
          select: { id: true },
        });
        if (activeSub) hasActiveSubscription = true;
      } catch (error) {
        // Subscription table missing — fall back to planStatus only
        logger.warn({ error, tenantId }, 'checkMarketplaceEligibility: subscription lookup failed');
      }
    }

    // Live-compute the profile completion % (don't trust the stale cached column).
    const profileCompletionPct = await computeProfileCompletion(tenantId);

    const checks = {
      hasActiveSubscription,
      identityVerified: !!tenant.identityVerified,
      businessVerified: !!tenant.businessVerified,
      insuranceVerified: !!tenant.insuranceVerified,
      stripeConnected: !!tenant.stripeConnected,
      profileComplete: profileCompletionPct >= PROFILE_COMPLETION_THRESHOLD,
      marketplaceOptIn: !!tenant.marketplaceOptIn,
      termsAccepted: !!tenant.marketplaceTermsAcceptedAt,
      planSupportsMarketplace: MARKETPLACE_ACCESS_OK.has(marketplaceAccess),
    };

    const missingRequirements: string[] = [];
    if (!checks.hasActiveSubscription) missingRequirements.push('Active paid subscription required');
    if (!checks.identityVerified) missingRequirements.push('Identity verification (KYC) pending');
    if (!checks.businessVerified) missingRequirements.push('Business verification pending');
    if (!checks.insuranceVerified) missingRequirements.push('Proof of insurance required');
    if (!checks.stripeConnected) missingRequirements.push('Stripe Connect account must be linked');
    if (!checks.profileComplete) missingRequirements.push(`Profile completion ≥ ${PROFILE_COMPLETION_THRESHOLD}% (currently ${profileCompletionPct}%)`);
    if (!checks.marketplaceOptIn) missingRequirements.push('Marketplace opt-in not enabled');
    if (!checks.termsAccepted) missingRequirements.push('Marketplace terms & conditions not accepted');
    if (!checks.planSupportsMarketplace) missingRequirements.push(`Plan "${tenant.plan}" does not grant marketplace booking access`);

    const eligible =
      checks.hasActiveSubscription &&
      checks.identityVerified &&
      checks.businessVerified &&
      checks.insuranceVerified &&
      checks.stripeConnected &&
      checks.profileComplete &&
      checks.marketplaceOptIn &&
      checks.termsAccepted &&
      checks.planSupportsMarketplace;

    return {
      eligible,
      missingRequirements,
      profileCompletionPct,
      plan: tenant.plan,
      marketplaceAccess,
      checks,
    };
  } catch (error) {
    logger.error({ error, tenantId }, 'checkMarketplaceEligibility: failed');
    return {
      ...empty,
      missingRequirements: ['Eligibility check failed — internal error'],
    };
  }
}
