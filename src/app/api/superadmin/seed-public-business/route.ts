import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { seedPublicBusinessForTenant } from '@/lib/seed-public-business';

/**
 * POST /api/superadmin/seed-public-business
 *
 * Seeds a tenant's public business hub with dummy data. Two modes:
 *
 *   1. Seed an EXISTING tenant:
 *      Body: { tenantId: string, overwrite?: boolean }
 *
 *   2. Create a NEW demo tenant with dummy public hub data:
 *      Body: { businessName?: string, industry?: string, city?: string, state?: string }
 *
 * Returns the seeded tenant's public + short URLs so the SuperAdmin can
 * immediately open the public hub page.
 *
 * Auth: SuperAdmin only.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden - SuperAdmin access required' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { tenantId, overwrite, businessName, industry, city, state } = body as {
      tenantId?: string;
      overwrite?: boolean;
      businessName?: string;
      industry?: string;
      city?: string;
      state?: string;
    };

    const result = await seedPublicBusinessForTenant({
      tenantId,
      overwrite: Boolean(overwrite),
      businessName,
      industry,
      city,
      state,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[/api/superadmin/seed-public-business] Error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to seed public business',
      },
      { status: 500 },
    );
  }
}
