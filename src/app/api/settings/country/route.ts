import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/settings/country — Get company country setting
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!authUser.tenantId) {
      return NextResponse.json({
        country: 'US',
      });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { id: true, country: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      country: tenant.country || 'US',
    });
  } catch (error) {
    console.error('Get country settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch country settings' }, { status: 500 });
  }
}

// PUT /api/settings/country — Update company country
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can update country settings' }, { status: 403 });
    }

    const body = await request.json();
    const { country } = body as { country?: string };

    if (!country) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    const updated = await db.tenant.update({
      where: { id: authUser.tenantId },
      data: { country: country.toUpperCase() },
    });

    return NextResponse.json({
      country: updated.country,
      success: true,
    });
  } catch (error) {
    console.error('Update country settings error:', error);
    return NextResponse.json({ error: 'Failed to update country settings' }, { status: 500 });
  }
}
