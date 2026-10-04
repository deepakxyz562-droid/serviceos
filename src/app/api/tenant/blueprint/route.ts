import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, verifyToken, verifyTokenWithGrace } from '@/lib/auth';
import { resolveTenantBlueprint, getCountryPack } from '@/lib/blueprint';
import type { TenantBlueprint, BusinessType, CountryCode, BusinessCapabilities } from '@/lib/blueprint';

async function resolveUserFromRequest(request: NextRequest) {
  let authUser = await getAuthUser();
  if (!authUser) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      authUser = verifyToken(token) || verifyTokenWithGrace(token);
    }
  }
  return authUser;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await resolveUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let tenantId = authUser.tenantId;
    if (!tenantId) {
      const dbUser = await db.user.findUnique({
        where: { id: authUser.id },
        select: { tenantId: true },
      });
      tenantId = dbUser?.tenantId || null;
    }

    let tenant = tenantId
      ? await db.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            settingsJson: true,
            region: true,
            onboardingCompleted: true,
          },
        })
      : null;

    if (!tenant) {
      // If user has no tenant, resolve or create default tenant for their workspace
      const userWithTenant = await db.user.findUnique({
        where: { id: authUser.id },
        include: { tenant: true },
      });
      if (userWithTenant?.tenant) {
        tenant = userWithTenant.tenant;
      }
    }

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
    const authUser = await resolveUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessType, businessName, country, capabilities } = body as {
      businessType?: BusinessType;
      businessName?: string;
      country?: CountryCode;
      capabilities?: Partial<BusinessCapabilities>;
    };

    let tenantId = authUser.tenantId;
    if (!tenantId) {
      const dbUser = await db.user.findUnique({
        where: { id: authUser.id },
        select: { tenantId: true },
      });
      tenantId = dbUser?.tenantId || null;
    }

    let tenant = tenantId
      ? await db.tenant.findUnique({
          where: { id: tenantId },
        })
      : null;

    if (!tenant) {
      const userWithTenant = await db.user.findUnique({
        where: { id: authUser.id },
        include: { tenant: true },
      });
      if (userWithTenant?.tenant) {
        tenant = userWithTenant.tenant;
      }
    }

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

    // 1. Persist into Tenant
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        settingsJson: JSON.stringify(settings),
        onboardingCompleted: true,
        ...(businessName ? { name: businessName } : {}),
      },
    });

    const countryPack = getCountryPack(updatedBlueprint.country);

    // 2. Synchronize AiBusiness (used by Invoices, Quotes, Daybook, Khata)
    let aiBiz = await db.aiBusiness.findFirst({
      where: {
        OR: [
          { ownerId: authUser.id },
          ...(tenant ? [{ tenantId: tenant.id }] : []),
        ],
      },
    });

    if (aiBiz) {
      aiBiz = await db.aiBusiness.update({
        where: { id: aiBiz.id },
        data: {
          currency: countryPack.currency.code,
          currencySymbol: countryPack.currency.symbol,
          ...(businessName ? { name: businessName } : {}),
        },
      });
    }

    // 3. Synchronize GptformCommerceConfig (used by POS register & Commerce catalog)
    try {
      const commerceConfigs = await db.gptformCommerceConfig.findMany({
        where: {
          OR: [
            ...(aiBiz ? [{ businessId: aiBiz.id }] : []),
            { businessId: tenant.id },
            { businessId: authUser.id },
          ],
        },
      });

      if (commerceConfigs.length > 0) {
        for (const cfg of commerceConfigs) {
          await db.gptformCommerceConfig.update({
            where: { id: cfg.id },
            data: {
              currency: countryPack.currency.code,
              currencySymbol: countryPack.currency.symbol,
            },
          });
        }
      } else if (aiBiz) {
        await db.gptformCommerceConfig.create({
          data: {
            businessId: aiBiz.id,
            catalogJson: '[]',
            fieldsJson: '[]',
            currency: countryPack.currency.code,
            currencySymbol: countryPack.currency.symbol,
          },
        });
      }
    } catch (e) {
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
