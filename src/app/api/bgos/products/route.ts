import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  publishProductShowcaseToGoogle,
  resolveTenantPublicUrls,
  syncGooglePlaceActionsForTenant,
} from '@/lib/gbp/place-actions-sync';
import {
  normalizeBgosProductInput,
  normalizeSocialUrl,
  parseBgosProducts,
  parseBgosStoreSettings,
  parseSocialProfiles,
  persistStoreCatalogAndSync,
} from '@/lib/bgos-store-catalog';
import type {
  BgosProduct,
  BgosSocialProfiles,
  BgosStoreSettings,
} from '../../../../../shared/bgos-contracts';

function parseJsonObj(raw: string | null | undefined): Record<string, any> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function loadTenantStoreContext(tenantId: string, request: NextRequest) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      publicSlug: true,
      currency: true,
      country: true,
      settingsJson: true,
      socialLinksJson: true,
    },
  });
  if (!tenant) return null;

  const settings = parseJsonObj(tenant.settingsJson);
  const products = parseBgosProducts(settings);
  const storeSettings = parseBgosStoreSettings(settings);
  const socialProfiles = parseSocialProfiles(tenant.socialLinksJson, settings);
  const urls = resolveTenantPublicUrls(tenant, settings);

  return {
    tenant,
    settings,
    products,
    storeSettings,
    socialProfiles,
    currency: tenant.currency || (tenant.country === 'IN' ? 'INR' : 'USD'),
    canonicalUrl: urls.profileUrl,
    productsFeedUrl: urls.productsFeedUrl,
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') {
    return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  }

  try {
    const ctx = await loadTenantStoreContext(user.tenantId, request);
    if (!ctx) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    return NextResponse.json({
      products: ctx.products,
      storeSettings: ctx.storeSettings,
      socialProfiles: ctx.socialProfiles,
      currency: ctx.currency,
      canonicalUrl: ctx.canonicalUrl,
      productsFeedUrl: ctx.productsFeedUrl,
    });
  } catch (err) {
    console.error('[bgos/products] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load products catalog' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') {
    return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const ctx = await loadTenantStoreContext(user.tenantId, request);
    if (!ctx) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const item = normalizeBgosProductInput(body);
    if (!item) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const nextProducts = [item, ...ctx.products];
    await persistStoreCatalogAndSync({
      tenantId: ctx.tenant.id,
      settings: ctx.settings,
      products: nextProducts,
      storeSettings: ctx.storeSettings,
      socialProfiles: ctx.socialProfiles,
    });

    const gbpSync =
      body?.syncToGoogle !== false
        ? await syncGooglePlaceActionsForTenant({
            tenantId: ctx.tenant.id,
            storeSettings: ctx.storeSettings,
            includeAppointment: false,
            includeOrdering: true,
          })
        : null;

    const googlePost =
      body?.publishToGooglePost === true
        ? await publishProductShowcaseToGoogle({
            tenantId: ctx.tenant.id,
            product: item,
            currency: ctx.currency,
            profileUrl: ctx.canonicalUrl,
          })
        : null;

    return NextResponse.json({
      ok: true,
      product: item,
      products: nextProducts,
      gbpSync,
      googlePost,
    }, { status: 201 });
  } catch (err) {
    console.error('[bgos/products] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') {
    return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    const ctx = await loadTenantStoreContext(user.tenantId, request);
    if (!ctx) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const idx = ctx.products.findIndex((p) => p.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const merged = normalizeBgosProductInput(
      { ...ctx.products[idx], ...body, id, updatedAt: new Date().toISOString() },
      id,
    );
    if (!merged) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const nextProducts = [...ctx.products];
    nextProducts[idx] = merged;

    await persistStoreCatalogAndSync({
      tenantId: ctx.tenant.id,
      settings: ctx.settings,
      products: nextProducts,
      storeSettings: ctx.storeSettings,
      socialProfiles: ctx.socialProfiles,
    });

    const gbpSync =
      body?.syncToGoogle !== false
        ? await syncGooglePlaceActionsForTenant({
            tenantId: ctx.tenant.id,
            storeSettings: ctx.storeSettings,
            includeAppointment: false,
            includeOrdering: true,
          })
        : null;

    const googlePost =
      body?.publishToGooglePost === true
        ? await publishProductShowcaseToGoogle({
            tenantId: ctx.tenant.id,
            product: merged,
            currency: ctx.currency,
            profileUrl: ctx.canonicalUrl,
          })
        : null;

    return NextResponse.json({
      ok: true,
      product: merged,
      products: nextProducts,
      gbpSync,
      googlePost,
    });
  } catch (err) {
    console.error('[bgos/products] PUT failed:', err);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') {
    return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  }

  try {
    const urlId = new URL(request.url).searchParams.get('id')?.trim() || '';
    const body = await request.json().catch(() => ({}));
    const id = urlId || (typeof body?.id === 'string' ? body.id.trim() : '');
    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    const ctx = await loadTenantStoreContext(user.tenantId, request);
    if (!ctx) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const nextProducts = ctx.products.filter((p) => p.id !== id);
    if (nextProducts.length === ctx.products.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await persistStoreCatalogAndSync({
      tenantId: ctx.tenant.id,
      settings: ctx.settings,
      products: nextProducts,
      storeSettings: ctx.storeSettings,
      socialProfiles: ctx.socialProfiles,
    });

    return NextResponse.json({ ok: true, products: nextProducts });
  } catch (err) {
    console.error('[bgos/products] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') {
    return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const ctx = await loadTenantStoreContext(user.tenantId, request);
    if (!ctx) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const incomingStore = body?.storeSettings && typeof body.storeSettings === 'object'
      ? body.storeSettings
      : {};
    const nextStoreSettings: BgosStoreSettings = {
      pickupEnabled:
        typeof incomingStore.pickupEnabled === 'boolean'
          ? incomingStore.pickupEnabled
          : ctx.storeSettings.pickupEnabled,
      deliveryEnabled:
        typeof incomingStore.deliveryEnabled === 'boolean'
          ? incomingStore.deliveryEnabled
          : ctx.storeSettings.deliveryEnabled,
      foodOrderingEnabled:
        typeof incomingStore.foodOrderingEnabled === 'boolean'
          ? incomingStore.foodOrderingEnabled
          : ctx.storeSettings.foodOrderingEnabled,
      inStoreShoppingEnabled:
        typeof incomingStore.inStoreShoppingEnabled === 'boolean'
          ? incomingStore.inStoreShoppingEnabled
          : ctx.storeSettings.inStoreShoppingEnabled,
      orderActionUrl:
        typeof incomingStore.orderActionUrl === 'string'
          ? incomingStore.orderActionUrl.trim()
          : ctx.storeSettings.orderActionUrl || '',
      deliveryRadius:
        typeof incomingStore.deliveryRadius === 'string'
          ? incomingStore.deliveryRadius.trim()
          : ctx.storeSettings.deliveryRadius || '',
      minOrderAmount:
        incomingStore.minOrderAmount === null
          ? null
          : incomingStore.minOrderAmount !== undefined && incomingStore.minOrderAmount !== ''
            ? Math.max(0, Number(incomingStore.minOrderAmount) || 0)
            : ctx.storeSettings.minOrderAmount ?? null,
    };

    const incomingSocial = body?.socialProfiles && typeof body.socialProfiles === 'object'
      ? body.socialProfiles
      : null;
    const nextSocialProfiles: BgosSocialProfiles = incomingSocial
      ? {
          facebook: normalizeSocialUrl(incomingSocial.facebook) || undefined,
          instagram: normalizeSocialUrl(incomingSocial.instagram) || undefined,
          linkedin: normalizeSocialUrl(incomingSocial.linkedin) || undefined,
          twitter: normalizeSocialUrl(incomingSocial.twitter) || undefined,
          youtube: normalizeSocialUrl(incomingSocial.youtube) || undefined,
        }
      : ctx.socialProfiles;

    const nextProducts: BgosProduct[] = Array.isArray(body?.products)
      ? body.products
          .map((p: unknown, idx: number) => normalizeBgosProductInput(p, `prod_${idx + 1}`))
          .filter((p: BgosProduct | null): p is BgosProduct => Boolean(p))
      : ctx.products;

    await persistStoreCatalogAndSync({
      tenantId: ctx.tenant.id,
      settings: ctx.settings,
      products: nextProducts,
      storeSettings: nextStoreSettings,
      socialProfiles: nextSocialProfiles,
    });

    const gbpSync =
      body?.syncToGoogle === true
        ? await syncGooglePlaceActionsForTenant({
            tenantId: user.tenantId,
            storeSettings: nextStoreSettings,
            includeAppointment: true,
            includeOrdering: Boolean(
              nextStoreSettings.foodOrderingEnabled ||
                nextStoreSettings.pickupEnabled ||
                nextStoreSettings.deliveryEnabled,
            ),
          })
        : {
            attempted: false,
            syncedActions: [] as string[],
            warnings: [] as string[],
          };

    return NextResponse.json({
      ok: true,
      products: nextProducts,
      storeSettings: nextStoreSettings,
      socialProfiles: nextSocialProfiles,
      gbpSync,
    });
  } catch (err) {
    console.error('[bgos/products] PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to update store settings' }, { status: 500 });
  }
}
