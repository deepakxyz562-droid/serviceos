import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/settings/currency — Get company currency setting
// Simple: returns the company's single currency code
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { id: true, currency: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      baseCurrency: tenant.currency || 'USD',
      currency: tenant.currency || 'USD',
    });
  } catch (error) {
    console.error('Get currency settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch currency settings' }, { status: 500 });
  }
}

// PUT /api/settings/currency — Update company currency
// Simple: just updates the company's single currency
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can update currency settings' }, { status: 403 });
    }

    const body = await request.json();
    const { baseCurrency, currency } = body as {
      baseCurrency?: string;
      currency?: string;
    };

    const newCurrency = currency || baseCurrency;

    if (!newCurrency) {
      return NextResponse.json({ error: 'Currency code is required' }, { status: 400 });
    }

    const updated = await db.tenant.update({
      where: { id: authUser.tenantId },
      data: { currency: newCurrency },
    });

    return NextResponse.json({
      baseCurrency: updated.currency,
      currency: updated.currency,
      success: true,
    });
  } catch (error) {
    console.error('Update currency settings error:', error);
    return NextResponse.json({ error: 'Failed to update currency settings' }, { status: 500 });
  }
}
