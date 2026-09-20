import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/data-retention
 * Returns all data retention policies for the authenticated tenant.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let policies;
    try {
      policies = await db.dataRetentionPolicy.findMany({
        where: user.tenantId ? { tenantId: user.tenantId } : {},
        orderBy: { resourceType: 'asc' },
      });
    } catch {
      policies = [];
    }

    return NextResponse.json({
      success: true,
      policies: policies.map((p) => ({
        id: p.id,
        resourceType: p.resourceType,
        retentionDays: p.retentionDays,
        autoDelete: p.autoDelete,
        archiveFirst: p.archiveFirst,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch retention policies' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/data-retention
 * Updates retention policies for the authenticated tenant.
 * Body: { policies: [{ resourceType, retentionDays, autoDelete, archiveFirst }] }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { policies } = body;

    if (!Array.isArray(policies)) {
      return NextResponse.json(
        { error: 'policies array is required' },
        { status: 400 },
      );
    }

    const tenantId = user.tenantId || null;
    const results: Array<{ resourceType: string; success: boolean }> = [];

    for (const policy of policies) {
      try {
        await db.dataRetentionPolicy.upsert({
          where: {
            resourceType_tenantId: {
              resourceType: policy.resourceType,
              tenantId: tenantId || '',
            },
          },
          create: {
            resourceType: policy.resourceType,
            retentionDays: policy.retentionDays || 365,
            autoDelete: policy.autoDelete || false,
            archiveFirst: policy.archiveFirst ?? true,
            tenantId: tenantId || undefined,
          },
          update: {
            retentionDays: policy.retentionDays || 365,
            autoDelete: policy.autoDelete || false,
            archiveFirst: policy.archiveFirst ?? true,
          },
        });
        results.push({ resourceType: policy.resourceType, success: true });
      } catch {
        results.push({ resourceType: policy.resourceType, success: false });
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.filter((r) => r.success).length,
      total: results.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update retention policies' },
      { status: 500 },
    );
  }
}
