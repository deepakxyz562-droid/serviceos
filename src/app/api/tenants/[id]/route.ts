import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  sanitizeSubdomain,
  isReservedSubdomain,
  SUBDOMAIN_MIN_LENGTH,
} from '@/lib/subdomain';

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
        city: tenant.city,
        state: tenant.state,
        pincode: tenant.pincode,
        country: tenant.country,
        currency: tenant.currency,
        whatsappPhone: tenant.whatsappPhone,
        whatsappConfigJson: tenant.whatsappConfigJson,
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        trialEndsAt: tenant.trialEndsAt,
        planStartedAt: tenant.planStartedAt,
        planEndsAt: tenant.planEndsAt,
        settingsJson: tenant.settingsJson,
        onboardingCompleted: tenant.onboardingCompleted,
        onboardingStep: tenant.onboardingStep,
        subdomain: tenant.subdomain,
        subdomainVerified: tenant.subdomainVerified,
        customDomain: tenant.customDomain,
        customDomainVerified: tenant.customDomainVerified,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        currentSubscription: tenant.subscriptions[0] || null,
        workspaces: tenant.workspaces,
        stats: {
          totalUsers: tenant._count.users,
          totalLeads: tenant._count.leads,
          totalInvoices: tenant._count.invoices,
        },
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
      city,
      state,
      pincode,
      country,
      currency,
      logo,
      whatsappPhone,
      whatsappConfigJson,
      plan,
      settingsJson,
      onboardingCompleted,
      onboardingStep,
      subdomain,
    } = body;

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (industry !== undefined) updateData.industry = industry;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pincode !== undefined) updateData.pincode = pincode;
    if (country !== undefined) updateData.country = country;
    if (currency !== undefined) updateData.currency = currency;
    if (logo !== undefined) updateData.logo = logo;
    if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone;
    if (whatsappConfigJson !== undefined) updateData.whatsappConfigJson = whatsappConfigJson;
    if (plan !== undefined) updateData.plan = plan;
    if (settingsJson !== undefined) updateData.settingsJson = settingsJson;
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted;
    if (onboardingStep !== undefined) updateData.onboardingStep = onboardingStep;

    // Handle subdomain change with full validation
    if (subdomain !== undefined) {
      const currentTenant = await db.tenant.findUnique({
        where: { id },
        select: { subdomain: true, slug: true },
      });

      const cleanSub = sanitizeSubdomain(subdomain);

      if (!cleanSub) {
        return NextResponse.json(
          { error: `Invalid subdomain. Must be ${SUBDOMAIN_MIN_LENGTH}-63 characters, lowercase letters, numbers, and hyphens only.` },
          { status: 400 }
        );
      }

      if (isReservedSubdomain(cleanSub)) {
        return NextResponse.json(
          { error: 'This subdomain is reserved and cannot be used.' },
          { status: 400 }
        );
      }

      // Check if subdomain is different from current (skip check if same)
      if (cleanSub !== currentTenant?.subdomain && cleanSub !== currentTenant?.slug) {
        const existing = await db.tenant.findFirst({
          where: {
            OR: [{ subdomain: cleanSub }, { slug: cleanSub }],
            id: { not: id },
          },
          select: { id: true },
        });

        if (existing) {
          return NextResponse.json(
            { error: 'This subdomain is already taken by another workspace.' },
            { status: 409 }
          );
        }
      }

      updateData.subdomain = cleanSub;
      updateData.slug = cleanSub; // Keep slug in sync with subdomain
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

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
        city: tenant.city,
        state: tenant.state,
        pincode: tenant.pincode,
        country: tenant.country,
        currency: tenant.currency,
        whatsappPhone: tenant.whatsappPhone,
        whatsappConfigJson: tenant.whatsappConfigJson,
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        trialEndsAt: tenant.trialEndsAt,
        settingsJson: tenant.settingsJson,
        onboardingCompleted: tenant.onboardingCompleted,
        onboardingStep: tenant.onboardingStep,
        subdomain: tenant.subdomain,
        subdomainVerified: tenant.subdomainVerified,
        customDomain: tenant.customDomain,
        customDomainVerified: tenant.customDomainVerified,
        updatedAt: tenant.updatedAt,
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
