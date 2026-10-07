import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, verifyToken } from '@/lib/auth';
import { resolveTenantBlueprint, getCountryPack, updateTenantBlueprint, BUSINESS_TYPE_PRESETS, SALES_CHANNEL_INFO, BASE_CAPABILITIES, COUNTRY_PACKS } from '@/lib/blueprint';
import type { TenantBlueprint, BusinessType, CountryCode, BusinessCapabilities } from '@/lib/blueprint';

async function resolveUserFromRequest(request: NextRequest) {
  let authUser = await getAuthUser();
  if (!authUser) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      authUser = verifyToken(token);
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
            industry: true,
            currency: true,
            address: true,
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

    if (!authUser.isSuperAdmin && !['owner', 'admin', 'standalone_user', 'superadmin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json({ error: 'Business owner access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid business setup' }, { status: 400 });
    }
    const { businessType, salesChannels, businessName, country, capabilities, language, timezone } = body as {
      businessType?: BusinessType;
      salesChannels?: import('@/lib/blueprint').SalesChannel[];
      businessName?: string;
      country?: CountryCode;
      capabilities?: Partial<BusinessCapabilities>;
      language?: 'en' | 'hi';
      timezone?: string;
    };

    const hasKey = (record: object, key: unknown) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(record, key);
    if ((businessType !== undefined && !hasKey(BUSINESS_TYPE_PRESETS, businessType)) ||
        (country !== undefined && !hasKey(COUNTRY_PACKS, country)) ||
        (language !== undefined && language !== 'en' && language !== 'hi') ||
        (businessName !== undefined && (typeof businessName !== 'string' || !businessName.trim() || businessName.length > 200)) ||
        (salesChannels !== undefined && (!Array.isArray(salesChannels) || !salesChannels.length || !salesChannels.every((c) => hasKey(SALES_CHANNEL_INFO, c)))) ||
        (capabilities !== undefined && (!capabilities || Array.isArray(capabilities) || typeof capabilities !== 'object' || !Object.entries(capabilities).every(([key, value]) => hasKey(BASE_CAPABILITIES, key) && typeof value === 'boolean')))) {
      return NextResponse.json({ error: 'Invalid business setup' }, { status: 400 });
    }
    if (timezone !== undefined) {
      try {
        if (typeof timezone !== 'string' || !timezone) throw new Error();
        new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
      } catch { return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 }); }
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
    const changesSetup = [businessType, salesChannels, businessName, country, capabilities].some((value) => value !== undefined);

    const updatedBlueprint = updateTenantBlueprint(currentBlueprint, {
      ...(businessType !== undefined ? { businessType } : {}),
      ...(salesChannels !== undefined ? { salesChannels } : {}),
      ...(businessName !== undefined ? { businessName: businessName.trim() } : {}),
      ...(country !== undefined ? { country } : {}),
      ...(capabilities !== undefined ? { capabilities } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
    });

    settings.blueprint = updatedBlueprint;

    // 1. Persist into Tenant
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        settingsJson: JSON.stringify(settings),
        ...(changesSetup ? { onboardingCompleted: true } : {}),
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

    if (aiBiz && (country !== undefined || businessName !== undefined)) {
      aiBiz = await db.aiBusiness.update({
        where: { id: aiBiz.id },
        data: {
          ...(country !== undefined ? { currency: countryPack.currency.code, currencySymbol: countryPack.currency.symbol } : {}),
          ...(businessName ? { name: businessName } : {}),
        },
      });
    } else if (!aiBiz && changesSetup) {
      // Explicit business setup is the place to create the owner business;
      // reading Home must not create accounts or silently select another tenant.
      aiBiz = await db.aiBusiness.create({
        data: { ownerId: authUser.id, tenantId: tenant.id, name: updatedBlueprint.businessName || tenant.name, currency: countryPack.currency.code, currencySymbol: countryPack.currency.symbol },
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

      if (commerceConfigs.length > 0 && country !== undefined) {
        for (const cfg of commerceConfigs) {
          await db.gptformCommerceConfig.update({
            where: { id: cfg.id },
            data: {
              currency: countryPack.currency.code,
              currencySymbol: countryPack.currency.symbol,
            },
          });
        }
      } else if (commerceConfigs.length === 0 && aiBiz && changesSetup) {
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
