import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveTenantBlueprint, getCountryPack } from '@/lib/blueprint';
import type { TenantBlueprint, BusinessType, CountryCode, BusinessCapabilities } from '@/lib/blueprint';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: {
        id: true,
        name: true,
        settingsJson: true,
        region: true,
        onboardingCompleted: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const blueprint = resolveTenantBlueprint(tenant);
    const countryPack = getCountryPack(blueprint.country);

    return NextResponse.json({
      blueprint,
      countryPack,
      onboardingCompleted: tenant.onboardingCompleted,
    });
  } catch (error) {
    console.error('Error fetching tenant blueprint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessType, businessName, country, capabilities } = body as {
      businessType?: BusinessType;
      businessName?: string;
      country?: CountryCode;
      capabilities?: Partial<BusinessCapabilities>;
    };

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let settings: Record<string, any> = {};
    try {
      settings = typeof tenant.settingsJson === 'string'
        ? JSON.parse(tenant.settingsJson)
        : (tenant.settingsJson || {});
    } catch {
      settings = {};
    }

    const currentBlueprint = resolveTenantBlueprint(tenant);

    const updatedBlueprint: TenantBlueprint = {
      businessType: businessType || currentBlueprint.businessType,
      businessName: businessName || currentBlueprint.businessName || tenant.name,
      country: country || currentBlueprint.country,
      capabilities: {
        ...currentBlueprint.capabilities,
        ...(capabilities || {}),
      },
      configuredAt: new Date().toISOString(),
      version: (currentBlueprint.version || 1) + 1,
    };

    settings.blueprint = updatedBlueprint;

    // Persist into Tenant
    const updatedTenant = await db.tenant.update({
      where: { id: tenant.id },
      data: {
        settingsJson: JSON.stringify(settings),
        onboardingCompleted: true,
        ...(businessName ? { name: businessName } : {}),
      },
    });

    // Also synchronize currency in GptformCommerceConfig if it exists
    const countryPack = getCountryPack(updatedBlueprint.country);
    try {
      const commerceConfig = await db.gptformCommerceConfig.findFirst({
        where: { businessId: tenant.id },
      });
      if (commerceConfig) {
        await db.gptformCommerceConfig.update({
          where: { id: commerceConfig.id },
          data: {
            currency: countryPack.currency.code,
            currencySymbol: countryPack.currency.symbol,
          },
        });
      }
    } catch (e) {
      // Non-fatal if commerce config does not exist yet
      console.warn('Could not sync commerce config currency:', e);
    }

    return NextResponse.json({
      success: true,
      blueprint: updatedBlueprint,
      countryPack,
    });
  } catch (error) {
    console.error('Error updating tenant blueprint:', error);
    return NextResponse.json({ error: 'Failed to update blueprint' }, { status: 500 });
  }
}
