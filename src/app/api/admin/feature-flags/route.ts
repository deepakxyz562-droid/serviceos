import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// GET /api/admin/feature-flags - List feature flags for all tenants (or specific tenant)
export async function GET(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '';

    const where: Record<string, unknown> = {};
    if (tenantId) {
      where.id = tenantId;
    }

    const tenants = await db.tenant.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        planStatus: true,
        featureFlagsJson: true,
      },
    });

    const featureFlags = tenants.map((tenant) => {
      let parsedFlags: Record<string, unknown> = {};
      try {
        parsedFlags = JSON.parse(tenant.featureFlagsJson || '{}');
      } catch {
        parsedFlags = {};
      }

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        plan: tenant.plan,
        planStatus: tenant.planStatus,
        featureFlags: {
          enableAI: (parsedFlags.enableAI as boolean) ?? false,
          enableWhatsApp: (parsedFlags.enableWhatsApp as boolean) ?? false,
          enableBooking: (parsedFlags.enableBooking as boolean) ?? false,
          enableDispatch: (parsedFlags.enableDispatch as boolean) ?? false,
          ...parsedFlags,
        },
      };
    });

    return NextResponse.json({ featureFlags, total: featureFlags.length });
  } catch (error) {
    console.error('Admin feature-flags GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 });
  }
}

// PUT /api/admin/feature-flags - Update feature flags for a tenant
export async function PUT(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, featureFlags } = body;

    if (!tenantId || !featureFlags || typeof featureFlags !== 'object') {
      return NextResponse.json(
        { error: 'Tenant ID and feature flags object are required' },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Parse existing flags and merge with new ones
    let existingFlags: Record<string, unknown> = {};
    try {
      existingFlags = JSON.parse(tenant.featureFlagsJson || '{}');
    } catch {
      existingFlags = {};
    }

    // Only allow known feature flag keys
    const allowedKeys = ['enableAI', 'enableWhatsApp', 'enableBooking', 'enableDispatch'];
    const sanitizedFlags: Record<string, unknown> = { ...existingFlags };
    for (const key of allowedKeys) {
      if (key in featureFlags) {
        sanitizedFlags[key] = Boolean(featureFlags[key]);
      }
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: { featureFlagsJson: JSON.stringify(sanitizedFlags) },
    });

    return NextResponse.json({
      message: 'Feature flags updated successfully',
      tenantId,
      featureFlags: sanitizedFlags,
    });
  } catch (error) {
    console.error('Admin feature-flags PUT error:', error);
    return NextResponse.json({ error: 'Failed to update feature flags' }, { status: 500 });
  }
}
