import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { cache } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, workspaces: true, leads: true, subscriptions: true, conversations: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get latest subscription
    let latestSubscription = null;
    try {
      const subs = await db.subscription.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (subs.length > 0) {
        latestSubscription = subs[0];
      }
    } catch {
      // Subscription query may fail
    }

    return NextResponse.json({
      tenant: {
        ...tenant,
        latestSubscription,
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Tenant GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Verify tenant exists
    const existing = await db.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle suspend/unsuspend
    if (body.status === 'suspended') {
      if (!body.reason?.trim()) {
        return NextResponse.json({ error: 'Reason is required for suspension' }, { status: 400 });
      }
      updateData.planStatus = 'suspended';
      updateData.suspendedAt = new Date().toISOString();
      updateData.suspensionReason = body.reason.trim();
    } else if (body.status === 'active') {
      updateData.planStatus = 'active';
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    }

    // Handle name update
    if (body.name !== undefined && typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    // Handle plan update
    if (body.plan !== undefined && typeof body.plan === 'string') {
      updateData.plan = body.plan;
    }

    // Handle planStatus update (if not using status field)
    if (body.planStatus !== undefined && !body.status) {
      updateData.planStatus = body.planStatus;
      if (body.planStatus === 'suspended' && body.reason) {
        updateData.suspendedAt = new Date().toISOString();
        updateData.suspensionReason = body.reason;
      } else if (body.planStatus === 'active') {
        updateData.suspendedAt = null;
        updateData.suspensionReason = null;
      }
    }

    // Handle other updatable fields
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.onboardingCompleted !== undefined) updateData.onboardingCompleted = body.onboardingCompleted;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    // Invalidate relevant caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('[SuperAdmin Tenant PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Verify tenant exists
    const existing = await db.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Soft-delete: set isActive=false on all users belonging to this tenant
    const result = await db.user.updateMany({
      where: { tenantId: id },
      data: { isActive: false },
    });

    // Also mark tenant as suspended
    await db.tenant.update({
      where: { id },
      data: {
        planStatus: 'suspended',
        suspendedAt: new Date().toISOString(),
        suspensionReason: 'Tenant soft-deleted by SuperAdmin',
      },
    });

    // Invalidate caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({
      success: true,
      message: `Tenant soft-deleted. ${result.count} users deactivated.`,
      deactivatedUsers: result.count,
    });
  } catch (error) {
    console.error('[SuperAdmin Tenant DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
