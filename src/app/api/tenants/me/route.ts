/**
 * GET /api/tenants/me
 * --------------------
 * Returns the current authenticated user's tenant record, including the
 * Google Business Profile fields (URL + verified flag).
 *
 * PATCH /api/tenants/me
 * ---------------------
 * Updates the current user's tenant. Used by the Google Business Profile
 * settings section to save the user-pasted GBP URL.
 *
 * Allowed fields (whitelist):
 *   - googleBusinessProfileUrl (string)
 *   - googleBusinessVerified is NOT user-editable here — only the claim
 *     flow or an admin can set it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  slug: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  country: true,
  industry: true,
  tagline: true,
  description: true,
  coverImage: true,
  googleBusinessProfileUrl: true,
  googleBusinessVerified: true,
  claimed: true,
  claimedAt: true,
  listingTier: true,
  marketplaceOptIn: true,
  publicProfileEnabled: true,
  plan: true,
  planStatus: true,
  rating: true,
  reviewCount: true,
  identityVerified: true,
  businessVerified: true,
  insuranceVerified: true,
  stripeConnected: true,
};

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: PUBLIC_FIELDS,
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (err) {
    logger.error({ component: 'tenants-me', err }, 'GET failed');
    return NextResponse.json({ error: 'Failed to load tenant' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Whitelist allowed fields (only GBP URL for now — other tenant fields
    // are edited via /api/tenants/[id] which has its own validation)
    const updateData: Record<string, unknown> = {};
    if (typeof body.googleBusinessProfileUrl === 'string') {
      updateData.googleBusinessProfileUrl = body.googleBusinessProfileUrl;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const updated = await db.tenant.update({
      where: { id: user.tenantId },
      data: updateData,
      select: PUBLIC_FIELDS,
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ component: 'tenants-me', err }, 'PATCH failed');
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}
