import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { DEFAULT_CURRENCY_SETTINGS, type CurrencySettings } from '@/lib/currency';

// GET /api/settings/currency — Get currency settings for the current tenant
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { id: true, currency: true, settingsJson: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Parse currency settings from settingsJson
    let currencySettings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      baseCurrency: tenant.currency || 'USD',
    };

    try {
      const parsed = JSON.parse(tenant.settingsJson || '{}');
      if (parsed.currencySettings) {
        currencySettings = {
          ...currencySettings,
          ...parsed.currencySettings,
          baseCurrency: tenant.currency || parsed.currencySettings.baseCurrency || 'USD',
        };
      }
    } catch {
      // Use defaults
    }

    return NextResponse.json({
      baseCurrency: tenant.currency || 'USD',
      currencySettings,
    });
  } catch (error) {
    console.error('Get currency settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch currency settings' }, { status: 500 });
  }
}

// PUT /api/settings/currency — Update currency settings
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
    const { baseCurrency, currencySettings } = body as {
      baseCurrency?: string;
      currencySettings?: Partial<CurrencySettings>;
    };

    // Get current settings
    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { id: true, settingsJson: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let currentSettings: Record<string, unknown> = {};
    try {
      currentSettings = JSON.parse(tenant.settingsJson || '{}');
    } catch {
      // Ignore parse errors
    }

    // Merge currency settings
    const mergedCurrencySettings: CurrencySettings = {
      ...(DEFAULT_CURRENCY_SETTINGS),
      ...((currentSettings.currencySettings as Partial<CurrencySettings>) || {}),
      ...currencySettings,
      baseCurrency: baseCurrency || currencySettings?.baseCurrency || DEFAULT_CURRENCY_SETTINGS.baseCurrency,
    };

    currentSettings.currencySettings = mergedCurrencySettings;

    // Update tenant
    const updateData: Record<string, unknown> = {
      settingsJson: JSON.stringify(currentSettings),
    };

    if (baseCurrency) {
      updateData.currency = baseCurrency;
    }

    const updated = await db.tenant.update({
      where: { id: authUser.tenantId },
      data: updateData,
    });

    return NextResponse.json({
      baseCurrency: updated.currency,
      currencySettings: mergedCurrencySettings,
      success: true,
    });
  } catch (error) {
    console.error('Update currency settings error:', error);
    return NextResponse.json({ error: 'Failed to update currency settings' }, { status: 500 });
  }
}
