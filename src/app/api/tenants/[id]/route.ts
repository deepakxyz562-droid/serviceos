import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import { applyHubDefaultsToTenant } from '@/lib/public-business';

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
      settingsJson,
      onboardingCompleted,
      onboardingStep,
      // ── Public Business Hub fields ────────────────────────────────────
      publicProfileEnabled,
      publicSlug,
      city,
      state,
      postalCode,
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
    if (logo !== undefined) updateData.logo = logo;
    if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone;
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
    if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || null;
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
    }

    // Re-validate uniqueness of publicSlug on save (Prisma will throw if duplicate)
    // Fetch the (possibly auto-populated) tenant for the response
    const finalTenant = shouldAutoPopulateHub
      ? await db.tenant.findUnique({ where: { id } })
      : tenant;

    // Revalidate the public Business Hub page so ISR picks up the changes
    // immediately (the page exports `revalidate = 3600` but we force a refresh
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
