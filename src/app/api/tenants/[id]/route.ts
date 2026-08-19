import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import { applyHubDefaultsToTenant, revalidatePublicBusiness } from '@/lib/public-business';
import { computeProfileCompletion } from '@/lib/marketplace-eligibility';
import { seedTenantDefaults } from '@/lib/seed-tenant-defaults';

// GET /api/tenants/[id] - Get tenant details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the authenticated user belongs to this tenant
    if (authUser.tenantId !== id) {
      return NextResponse.json(
        { error: 'You do not have access to this tenant' },
        { status: 403 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        workspaces: {
          select: {
            id: true,
            name: true,
            slug: true,
            industry: true,
            plan: true,
          },
        },
        _count: {
          select: {
            users: true,
            leads: true,
            invoices: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        industry: tenant.industry,
        logo: tenant.logo,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        country: tenant.country,
        currency: tenant.currency,
        whatsappPhone: tenant.whatsappPhone,
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        trialEndsAt: tenant.trialEndsAt,
        planStartedAt: tenant.planStartedAt,
        planEndsAt: tenant.planEndsAt,
        settingsJson: tenant.settingsJson,
        onboardingCompleted: tenant.onboardingCompleted,
        onboardingStep: tenant.onboardingStep,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        currentSubscription: tenant.subscriptions?.[0] || null,
        workspaces: tenant.workspaces ?? [],
        stats: {
          totalUsers: tenant._count?.users ?? 0,
          totalLeads: tenant._count?.leads ?? 0,
          totalInvoices: tenant._count?.invoices ?? 0,
        },
        // ── Public Business Hub fields ────────────────────────────────────
        publicProfileEnabled: tenant.publicProfileEnabled,
        // Marketplace browse-grid opt-in (controls visibility at /marketplace
        // — independent from publicProfileEnabled which controls the public
        // hub page). Surfaced in Settings → Public Hub so the user can toggle.
        marketplaceOptIn: tenant.marketplaceOptIn,
        marketplaceTermsAcceptedAt: tenant.marketplaceTermsAcceptedAt,
        publicSlug: tenant.publicSlug,
        city: tenant.city,
        state: tenant.state,
        postalCode: tenant.postalCode,
        tagline: tenant.tagline,
        description: tenant.description,
        coverImage: tenant.coverImage,
        galleryJson: tenant.galleryJson,
        businessHoursJson: tenant.businessHoursJson,
        serviceAreasJson: tenant.serviceAreasJson,
        socialLinksJson: tenant.socialLinksJson,
        faqsJson: tenant.faqsJson,
        rating: tenant.rating,
        reviewCount: tenant.reviewCount,
        seoTitle: tenant.seoTitle,
        seoDescription: tenant.seoDescription,
        // Provider service radius in km — powers marketplace "near me" search.
        // 0 / null = "will travel anywhere". Default 25 (see schema).
        serviceRadiusKm: tenant.serviceRadiusKm,
        // White-label config (JSON string). Parsed by loadTenantEmailBranding()
        // and the BrandingSettings UI toggle. Shape: { hideFieserosBranding: boolean }
        whiteLabelJson: tenant.whiteLabelJson,
        // Computed canonical public URL (for the "Preview" button)
        publicUrl: tenant.publicProfileEnabled
          ? `/${mapIndustryToUrlSlug(tenant.industry)}/${slugifyCity(tenant.city)}/${tenant.publicSlug || tenant.slug}`
          : null,
      },
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant details' },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/[id] - Update tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the authenticated user belongs to this tenant
    if (authUser.tenantId !== id) {
      return NextResponse.json(
        { error: 'You do not have access to this tenant' },
        { status: 403 }
      );
    }

    // Only owner or admin can update tenant
    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update tenant settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      industry,
      phone,
      email,
      address,
      country,
      currency,
      logo,
      whatsappPhone,
      website,
      settingsJson,
      onboardingCompleted,
      onboardingStep,
      // ── Public Business Hub fields ────────────────────────────────────
      publicProfileEnabled,
      publicSlug,
      city,
      state,
      postalCode,
      pincode, // legacy alias for postalCode (older onboarding sends this)
      latitude,
      longitude,
      tagline,
      description,
      coverImage,
      galleryJson,
      businessHoursJson,
      serviceAreasJson,
      socialLinksJson,
      faqsJson,
      seoTitle,
      seoDescription,
      // Provider service radius (km) — powers marketplace "near me" search.
      // 0 / null = "will travel anywhere". Default 25 (see schema).
      serviceRadiusKm,
      // ── White-label config ────────────────────────────────────────────
      // JSON string stored on Tenant.whiteLabelJson. Shape:
      //   { hideFieserosBranding: boolean }
      // Controls whether "Powered by Fieseros" footer appears in customer-
      // facing emails + portal. Plan-gated by the `white_label` feature
      // (enterprise tier only). The PUT handler validates the plan before
      // persisting the toggle — see updateData below.
      whiteLabelJson,
    } = body;

    // ── Detect onboarding completion transition ─────────────────────────
    // When `onboardingCompleted` flips to `true` (or is set true while the
    // tenant's Hub isn't enabled yet), auto-populate the Hub defaults so
    // the public page is ready immediately. The user can still edit/disable
    // everything from the Public Hub settings tab afterward.
    let shouldAutoPopulateHub = false;
    if (onboardingCompleted === true) {
      const existing = await db.tenant.findUnique({
        where: { id },
        select: { onboardingCompleted: true, publicProfileEnabled: true },
      });
      if (existing && (!existing.onboardingCompleted || !existing.publicProfileEnabled)) {
        shouldAutoPopulateHub = true;
      }
    }

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (industry !== undefined) updateData.industry = industry;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (country !== undefined) updateData.country = country;
    if (currency !== undefined) updateData.currency = currency;
    if (logo !== undefined) updateData.logo = logo?.trim() || null;
    if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (settingsJson !== undefined) updateData.settingsJson = settingsJson;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;
    if (onboardingStep !== undefined) updateData.onboardingStep = onboardingStep;

    // Public Business Hub fields (all optional — only written when provided)
    if (publicProfileEnabled !== undefined) updateData.publicProfileEnabled = publicProfileEnabled;
    if (publicSlug !== undefined) {
      // Empty string → null (so the UNIQUE constraint allows it)
      updateData.publicSlug = publicSlug?.trim() || null;
    }
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    // Accept either postalCode (canonical) or pincode (legacy onboarding alias).
    const postal = postalCode !== undefined ? postalCode : (pincode !== undefined ? pincode : undefined);
    if (postal !== undefined) updateData.postalCode = postal?.trim() || null;
    // Geo-coordinates from OSM Nominatim autocomplete (powers marketplace
    // proximity search + map views). Null is allowed to clear stale values.
    if (latitude !== undefined) {
      const n = Number(latitude);
      updateData.latitude = !isNaN(n) ? n : null;
    }
    if (longitude !== undefined) {
      const n = Number(longitude);
      updateData.longitude = !isNaN(n) ? n : null;
    }
    if (tagline !== undefined) updateData.tagline = tagline?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (coverImage !== undefined) updateData.coverImage = coverImage?.trim() || null;
    if (galleryJson !== undefined) updateData.galleryJson = typeof galleryJson === 'string' ? galleryJson : JSON.stringify(galleryJson || []);
    if (businessHoursJson !== undefined) updateData.businessHoursJson = typeof businessHoursJson === 'string' ? businessHoursJson : JSON.stringify(businessHoursJson || {});
    if (serviceAreasJson !== undefined) updateData.serviceAreasJson = typeof serviceAreasJson === 'string' ? serviceAreasJson : JSON.stringify(serviceAreasJson || []);
    if (socialLinksJson !== undefined) updateData.socialLinksJson = typeof socialLinksJson === 'string' ? socialLinksJson : JSON.stringify(socialLinksJson || {});
    if (faqsJson !== undefined) updateData.faqsJson = typeof faqsJson === 'string' ? faqsJson : JSON.stringify(faqsJson || []);
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle?.trim() || null;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription?.trim() || null;
    // Provider service radius (km). 0 = "will travel anywhere" (stored as 0 —
    // marketplace-ranking treats 0/null identically). Clamp to [0, 500].
    if (serviceRadiusKm !== undefined) {
      const n = Number(serviceRadiusKm);
      if (!isNaN(n)) {
        updateData.serviceRadiusKm = Math.min(500, Math.max(0, n));
      }
    }

    // White-label config JSON. Accept either a JSON string or an object.
    // Plan-gating is enforced server-side by loadTenantEmailBranding()
    // (which checks isFeatureEnabledForPlan('white_label', planTier)) so even
    // if a non-enterprise tenant sets hideFieserosBranding=true, the resolver
    // still returns false. Defense in depth.
    if (whiteLabelJson !== undefined) {
      updateData.whiteLabelJson = typeof whiteLabelJson === 'string'
        ? whiteLabelJson
        : JSON.stringify(whiteLabelJson || {});
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    // ── Auto-populate Hub defaults on onboarding completion ──────────────
    // Runs AFTER the main update so it can read the freshly-saved name,
    // industry, address, phone to derive tagline / description / FAQs / etc.
    // Only fills empty fields — never overwrites user edits.
    if (shouldAutoPopulateHub) {
      try {
        await applyHubDefaultsToTenant(id);
      } catch (err) {
        console.error('[tenants PUT] auto-populate Hub defaults failed:', err);
        // Non-fatal — onboarding still completes; user can populate Hub manually.
      }

      // ── Seed starter workflows + forms ─────────────────────────────────
      // New tenants should not land in an empty workspace. Seed 6 workflow
      // automations + 4 forms so the user sees real value on first login.
      // Idempotent (skips by name) — safe even if Hub-defaults ran before.
      // Non-blocking — a seeding failure never blocks onboarding completion.
      try {
        const result = await seedTenantDefaults(
          id,
          authUser.workspaceId ?? null,
          authUser.id
        );
        if (result.workflowsCreated > 0 || result.formsCreated > 0) {
          console.log(
            `[tenants PUT] seeded tenant defaults: ${result.workflowsCreated} workflows, ${result.formsCreated} forms`
          );
        }
      } catch (err) {
        console.error('[tenants PUT] seedTenantDefaults failed:', err);
        // Non-fatal — onboarding still completes; user can create workflows/forms manually.
      }
    }

    // Re-validate uniqueness of publicSlug on save (Prisma will throw if duplicate)
    // Fetch the (possibly auto-populated) tenant for the response
    const finalTenant = shouldAutoPopulateHub
      ? await db.tenant.findUnique({ where: { id } })
      : tenant;

    // Revalidate the public Business Hub page so ISR picks up the changes
    // immediately (the page exports `revalidate = 60` but we force a refresh
    // on save so the owner sees their edits instantly).
    try {
      const industrySeg = mapIndustryToUrlSlug(finalTenant?.industry ?? tenant.industry);
      const citySeg = slugifyCity(finalTenant?.city ?? tenant.city);
      const slugSeg = finalTenant?.publicSlug || tenant.publicSlug || tenant.slug;
      if (industrySeg && citySeg && slugSeg) {
        revalidatePath(`/${industrySeg}/${citySeg}/${slugSeg}`);
      }
      // Also revalidate the sitemap (business may have toggled visibility)
      revalidatePath('/sitemap.xml');
    } catch {
      // revalidatePath can throw in some edge runtime contexts — non-fatal
    }

    // Bust the unstable_cache-tagged public-business data layer (Task ID 10):
    // tenant profile, services, reviews, certifications. Without this, the
    // page would serve stale data for up to 120s (the unstable_cache TTL).
    try {
      revalidatePublicBusiness(id);
    } catch {
      // revalidateTag can throw in some edge runtime contexts — non-fatal
    }

    return NextResponse.json({
      tenant: {
        id: finalTenant?.id ?? tenant.id,
        name: finalTenant?.name ?? tenant.name,
        slug: finalTenant?.slug ?? tenant.slug,
        industry: finalTenant?.industry ?? tenant.industry,
        logo: finalTenant?.logo ?? tenant.logo,
        phone: finalTenant?.phone ?? tenant.phone,
        email: finalTenant?.email ?? tenant.email,
        address: finalTenant?.address ?? tenant.address,
        country: finalTenant?.country ?? tenant.country,
        currency: finalTenant?.currency ?? tenant.currency,
        whatsappPhone: finalTenant?.whatsappPhone ?? tenant.whatsappPhone,
        website: finalTenant?.website ?? tenant.website,
        plan: finalTenant?.plan ?? tenant.plan,
        planStatus: finalTenant?.planStatus ?? tenant.planStatus,
        trialEndsAt: finalTenant?.trialEndsAt ?? tenant.trialEndsAt,
        settingsJson: finalTenant?.settingsJson ?? tenant.settingsJson,
        onboardingCompleted: finalTenant?.onboardingCompleted ?? tenant.onboardingCompleted,
        onboardingStep: finalTenant?.onboardingStep ?? tenant.onboardingStep,
        // ── Public Business Hub fields (echo back) ──────────────────────
        publicProfileEnabled: finalTenant?.publicProfileEnabled ?? tenant.publicProfileEnabled,
        publicSlug: finalTenant?.publicSlug ?? tenant.publicSlug,
        city: finalTenant?.city ?? tenant.city,
        state: finalTenant?.state ?? tenant.state,
        postalCode: finalTenant?.postalCode ?? tenant.postalCode,
        tagline: finalTenant?.tagline ?? tenant.tagline,
        description: finalTenant?.description ?? tenant.description,
        coverImage: finalTenant?.coverImage ?? tenant.coverImage,
        galleryJson: finalTenant?.galleryJson ?? tenant.galleryJson,
        businessHoursJson: finalTenant?.businessHoursJson ?? tenant.businessHoursJson,
        serviceAreasJson: finalTenant?.serviceAreasJson ?? tenant.serviceAreasJson,
        socialLinksJson: finalTenant?.socialLinksJson ?? tenant.socialLinksJson,
        faqsJson: finalTenant?.faqsJson ?? tenant.faqsJson,
        rating: finalTenant?.rating ?? tenant.rating,
        reviewCount: finalTenant?.reviewCount ?? tenant.reviewCount,
        seoTitle: finalTenant?.seoTitle ?? tenant.seoTitle,
        seoDescription: finalTenant?.seoDescription ?? tenant.seoDescription,
        serviceRadiusKm: finalTenant?.serviceRadiusKm ?? tenant.serviceRadiusKm,
        publicUrl: (finalTenant?.publicProfileEnabled ?? tenant.publicProfileEnabled)
          ? `/${mapIndustryToUrlSlug(finalTenant?.industry ?? tenant.industry)}/${slugifyCity(finalTenant?.city ?? tenant.city)}/${finalTenant?.publicSlug || tenant.publicSlug || tenant.slug}`
          : null,
        updatedAt: finalTenant?.updatedAt ?? tenant.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

// PATCH /api/tenants/[id] - Update tenant (rich business profile fields)
//
// This handler is the dedicated endpoint for the phase-3 onboarding "Business
// Profile" step. It accepts the full marketplace-eligibility field set:
//   - Pricing: pricingType, callOutFee, travelFeePerKm, emergencySurchargePct,
//              weekendSurchargePct, emergencyServiceAvailable
//   - Credentials: vatNumber, licenceNumber
//   - Insurance: insuranceProvider, insurancePolicyNumber, insuranceExpiryDate,
//                insuranceVerified (boolean flag set when provider+policy are present)
//   - Operations: employeesCount, languagesJson, businessCategoriesJson,
//                 businessHoursJson, serviceAreasJson
//   - Marketplace: marketplaceOptIn, marketplaceTermsAcceptedAt
//   - Stripe: stripeConnected (synced by /api/billing/stripe/connect)
//   - Misc: identityVerified, businessVerified
//
// After persisting, it live-recomputes `profileCompletionPct` via
// `computeProfileCompletion` and stores it back so subsequent list views
// don't have to recompute per row.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the authenticated user belongs to this tenant
    if (authUser.tenantId !== id) {
      return NextResponse.json(
        { error: 'You do not have access to this tenant' },
        { status: 403 }
      );
    }

    // Only owner or admin can update tenant
    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update tenant settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      // Pricing
      pricingType,
      callOutFee,
      travelFeePerKm,
      emergencySurchargePct,
      weekendSurchargePct,
      emergencyServiceAvailable,
      // Credentials
      vatNumber,
      licenceNumber,
      // Insurance
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpiryDate,
      insuranceVerified,
      // Operations
      employeesCount,
      languagesJson,
      businessCategoriesJson,
      businessHoursJson,
      serviceAreasJson,
      // Marketplace
      marketplaceOptIn,
      marketplaceTermsAcceptedAt,
      // Verification flags
      identityVerified,
      businessVerified,
      stripeConnected,
      // Misc — allow onboarding step + completion sync too
      onboardingStep,
      onboardingCompleted,
      // Geo-coordinates (set by the OSM Nominatim address autocomplete in step 1)
      latitude,
      longitude,
      // Provider service radius (km) — powers marketplace "near me" search.
      // 0 / null = "will travel anywhere". Default 25 (see schema).
      serviceRadiusKm,
      // Canonical industry (single-select derived from businessCategories[0])
      industry,
      // Free-form JSON settings object. The client is expected to send a
      // merged object (existing settings + new keys) — we persist it as-is.
      settingsJson,
    } = body;

    // Build update data — only include provided fields. We intentionally use
    // explicit field-by-field whitelisting rather than a spread of `body`
    // because the Tenant model has many fields the onboarding form should
    // never write to (slug, plan, planStatus, mrr, etc.).
    const updateData: Record<string, unknown> = {};

    // Pricing
    if (pricingType !== undefined) {
      const valid = ['fixed', 'hourly', 'starting_from', 'custom_quote', 'mixed'];
      updateData.pricingType = valid.includes(pricingType) ? pricingType : null;
    }
    if (callOutFee !== undefined) updateData.callOutFee = Number(callOutFee) || 0;
    if (travelFeePerKm !== undefined) updateData.travelFeePerKm = Number(travelFeePerKm) || 0;
    if (emergencySurchargePct !== undefined) updateData.emergencySurchargePct = Number(emergencySurchargePct) || 0;
    if (weekendSurchargePct !== undefined) updateData.weekendSurchargePct = Number(weekendSurchargePct) || 0;
    if (emergencyServiceAvailable !== undefined) updateData.emergencyServiceAvailable = !!emergencyServiceAvailable;

    // Credentials
    if (vatNumber !== undefined) updateData.vatNumber = vatNumber?.trim() || null;
    if (licenceNumber !== undefined) updateData.licenceNumber = licenceNumber?.trim() || null;

    // Insurance — provider/policy/expiry are nullable strings/dates.
    if (insuranceProvider !== undefined) updateData.insuranceProvider = insuranceProvider?.trim() || null;
    if (insurancePolicyNumber !== undefined) updateData.insurancePolicyNumber = insurancePolicyNumber?.trim() || null;
    if (insuranceExpiryDate !== undefined) {
      // Accept ISO string or null. Invalid strings → null.
      if (insuranceExpiryDate === null || insuranceExpiryDate === '') {
        updateData.insuranceExpiryDate = null;
      } else {
        const parsed = new Date(insuranceExpiryDate);
        updateData.insuranceExpiryDate = isNaN(parsed.getTime()) ? null : parsed;
      }
    }
    if (insuranceVerified !== undefined) updateData.insuranceVerified = !!insuranceVerified;

    // Operations
    if (employeesCount !== undefined) {
      const n = Number(employeesCount);
      updateData.employeesCount = isNaN(n) || n < 0 ? 0 : Math.floor(n);
    }
    if (languagesJson !== undefined) {
      updateData.languagesJson = typeof languagesJson === 'string'
        ? languagesJson
        : JSON.stringify(Array.isArray(languagesJson) ? languagesJson : []);
    }
    if (businessCategoriesJson !== undefined) {
      updateData.businessCategoriesJson = typeof businessCategoriesJson === 'string'
        ? businessCategoriesJson
        : JSON.stringify(Array.isArray(businessCategoriesJson) ? businessCategoriesJson : []);
    }
    if (businessHoursJson !== undefined) {
      updateData.businessHoursJson = typeof businessHoursJson === 'string'
        ? businessHoursJson
        : JSON.stringify(businessHoursJson || {});
    }
    if (serviceAreasJson !== undefined) {
      updateData.serviceAreasJson = typeof serviceAreasJson === 'string'
        ? serviceAreasJson
        : JSON.stringify(Array.isArray(serviceAreasJson) ? serviceAreasJson : []);
    }

    // Marketplace opt-in + terms
    if (marketplaceOptIn !== undefined) {
      updateData.marketplaceOptIn = !!marketplaceOptIn;
      // When a tenant turns ON marketplace opt-in via Settings, stamp the
      // terms-accepted timestamp if it's not already set (so the backfill
      // endpoint knows the user made an explicit choice and won't re-opt
      // them in later). Turning OFF does NOT clear the timestamp — once a
      // user has accepted terms, we keep that record.
      if (marketplaceOptIn && marketplaceTermsAcceptedAt === undefined) {
        updateData.marketplaceTermsAcceptedAt = new Date();
      }
    }
    if (marketplaceTermsAcceptedAt !== undefined) {
      // Setting to true → timestamp now; setting to false/null → clear it.
      if (marketplaceTermsAcceptedAt === true) {
        updateData.marketplaceTermsAcceptedAt = new Date();
      } else if (marketplaceTermsAcceptedAt === false || marketplaceTermsAcceptedAt === null) {
        updateData.marketplaceTermsAcceptedAt = null;
      } else {
        const parsed = new Date(marketplaceTermsAcceptedAt);
        updateData.marketplaceTermsAcceptedAt = isNaN(parsed.getTime()) ? new Date() : parsed;
      }
    }

    // Verification flags
    if (identityVerified !== undefined) updateData.identityVerified = !!identityVerified;
    if (businessVerified !== undefined) updateData.businessVerified = !!businessVerified;
    if (stripeConnected !== undefined) updateData.stripeConnected = !!stripeConnected;

    // Onboarding meta
    if (onboardingStep !== undefined) updateData.onboardingStep = Number(onboardingStep) || 1;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = !!onboardingCompleted;

    // Geo-coordinates from OSM Nominatim autocomplete (set in step 1).
    // Null is allowed to clear stale values.
    if (latitude !== undefined) {
      const n = Number(latitude);
      updateData.latitude = !isNaN(n) ? n : null;
    }
    if (longitude !== undefined) {
      const n = Number(longitude);
      updateData.longitude = !isNaN(n) ? n : null;
    }

    // Canonical industry — derived on the client from businessCategories[0].
    // Preserves the legacy single-select `industry` field for SEO routing.
    if (industry !== undefined) {
      updateData.industry = industry?.trim() || null;
    }

    // Free-form settings object (merge is the client's responsibility).
    if (settingsJson !== undefined) {
      updateData.settingsJson = typeof settingsJson === 'string'
        ? settingsJson
        : JSON.stringify(settingsJson || {});
    }

    // Provider service radius (km). 0 = "will travel anywhere" (stored as 0 —
    // marketplace-ranking treats 0/null identically). Clamp to [0, 500].
    if (serviceRadiusKm !== undefined) {
      const n = Number(serviceRadiusKm);
      if (!isNaN(n)) {
        updateData.serviceRadiusKm = Math.min(500, Math.max(0, n));
      }
    }

    // ── Persist ────────────────────────────────────────────────────────────
    const tenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    // ── Live-recompute profile completion % and persist back ────────────────
    // The computeProfileCompletion() function reads from DB so it sees the
    // fields we just wrote. Best-effort — non-fatal if it fails.
    let profileCompletionPct = tenant.profileCompletionPct ?? 0;
    try {
      profileCompletionPct = await computeProfileCompletion(id);
      await db.tenant.update({
        where: { id },
        data: { profileCompletionPct },
      });
    } catch (err) {
      console.error('[tenants PATCH] computeProfileCompletion failed:', err);
    }

    // Revalidate the public Business Hub page (description/business hours may
    // have changed — ISR should pick up the update immediately).
    try {
      const industrySeg = mapIndustryToUrlSlug(tenant.industry);
      const citySeg = slugifyCity(tenant.city);
      const slugSeg = tenant.publicSlug || tenant.slug;
      if (industrySeg && citySeg && slugSeg) {
        revalidatePath(`/${industrySeg}/${citySeg}/${slugSeg}`);
      }
    } catch {
      // revalidatePath can throw in some edge runtime contexts — non-fatal
    }

    // Bust the unstable_cache-tagged public-business data layer (Task ID 10)
    // so the next visitor sees the updated profile immediately.
    try {
      revalidatePublicBusiness(id);
    } catch {
      // revalidateTag can throw in some edge runtime contexts — non-fatal
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        // Echo back the marketplace-eligibility fields the onboarding form
        // cares about (so the client can update its local state).
        pricingType: tenant.pricingType,
        callOutFee: tenant.callOutFee,
        travelFeePerKm: tenant.travelFeePerKm,
        emergencySurchargePct: tenant.emergencySurchargePct,
        weekendSurchargePct: tenant.weekendSurchargePct,
        emergencyServiceAvailable: tenant.emergencyServiceAvailable,
        vatNumber: tenant.vatNumber,
        licenceNumber: tenant.licenceNumber,
        insuranceProvider: tenant.insuranceProvider,
        insurancePolicyNumber: tenant.insurancePolicyNumber,
        insuranceExpiryDate: tenant.insuranceExpiryDate,
        insuranceVerified: tenant.insuranceVerified,
        employeesCount: tenant.employeesCount,
        languagesJson: tenant.languagesJson,
        businessCategoriesJson: tenant.businessCategoriesJson,
        businessHoursJson: tenant.businessHoursJson,
        serviceAreasJson: tenant.serviceAreasJson,
        marketplaceOptIn: tenant.marketplaceOptIn,
        marketplaceTermsAcceptedAt: tenant.marketplaceTermsAcceptedAt,
        identityVerified: tenant.identityVerified,
        businessVerified: tenant.businessVerified,
        stripeConnected: tenant.stripeConnected,
        profileCompletionPct,
        onboardingStep: tenant.onboardingStep,
        onboardingCompleted: tenant.onboardingCompleted,
        serviceRadiusKm: tenant.serviceRadiusKm,
        updatedAt: tenant.updatedAt,
      },
    });
  } catch (error) {
    console.error('PATCH tenant error:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

