import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  googleBusinessAdapter,
  upsertGooglePlaceActionLink,
} from '@/lib/social/adapters/googlebusiness';
import {
  normalizeSocialUrl,
  parseBgosProducts,
  parseBgosStoreSettings,
} from '@/lib/bgos-store-catalog';
import type { SocialAccountData } from '@/lib/social/types';
import type { BgosProduct, BgosStoreSettings } from '../../../shared/bgos-contracts';

export interface TenantPublicUrls {
  slug: string;
  origin: string;
  profileUrl: string;
  bookingUrl: string;
  productsFeedUrl: string;
  defaultOrderUrl: string;
}

export interface PlaceActionsSyncResult {
  attempted: boolean;
  connected: boolean;
  syncedActions: string[];
  appointmentUri?: string;
  orderUri?: string;
  warnings: string[];
}

function parseJsonObj(raw: string | null | undefined): Record<string, any> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function resolveTenantPublicUrls(
  tenant: { name: string; slug?: string | null; publicSlug?: string | null },
  settings: Record<string, any> = {},
): TenantPublicUrls {
  const rawSlug =
    settings?.bookingPageConfig?.publicSlug ||
    tenant.publicSlug ||
    tenant.slug ||
    tenant.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    'business';
  const slug = String(rawSlug).trim();
  const origin = (
    process.env.BGOS_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://bgos.site'
  ).replace(/\/+$/, '');
  const profileUrl = `https://bgos.site/${encodeURIComponent(slug)}`;
  const customBooking =
    typeof settings?.bookingLink === 'string' && /^https?:\/\//i.test(settings.bookingLink.trim())
      ? settings.bookingLink.trim()
      : '';
  const bookingUrl = customBooking || `https://bgos.site/${encodeURIComponent(slug)}/book`;
  const productsFeedUrl = `${origin}/api/public/business/${encodeURIComponent(slug)}/products-feed`;
  const defaultOrderUrl = `${profileUrl}#products`;
  return { slug, origin, profileUrl, bookingUrl, productsFeedUrl, defaultOrderUrl };
}

/**
 * Sync BGOS booking (`APPOINTMENT`) and catalog ordering (`ONLINE_ORDERING` / `FOOD_ORDERING`)
 * Place Action Links to the connected Google Business Profile location.
 */
export async function syncGooglePlaceActionsForTenant(params: {
  tenantId: string;
  includeAppointment?: boolean;
  includeOrdering?: boolean;
  storeSettings?: BgosStoreSettings | null;
  googleAccount?: SocialAccountData | null;
  persistSettings?: boolean;
}): Promise<PlaceActionsSyncResult> {
  const warnings: string[] = [];
  const syncedActions: string[] = [];

  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      publicSlug: true,
      settingsJson: true,
    },
  });
  if (!tenant) {
    return {
      attempted: true,
      connected: false,
      syncedActions,
      warnings: ['Tenant not found'],
    };
  }

  const settings = parseJsonObj(tenant.settingsJson);
  const urls = resolveTenantPublicUrls(tenant, settings);
  const store = params.storeSettings ?? parseBgosStoreSettings(settings);
  const products = parseBgosProducts(settings);

  const googleAccount =
    params.googleAccount !== undefined
      ? params.googleAccount
      : await prepareGoogleAccount(params.tenantId).catch(() => null);

  if (!googleAccount) {
    return {
      attempted: true,
      connected: false,
      syncedActions,
      appointmentUri: urls.bookingUrl,
      warnings: ['No active Google Business account connected.'],
    };
  }

  let syncedAppointmentUri: string | undefined;
  let syncedOrderUri: string | undefined;

  if (params.includeAppointment !== false) {
    const apptRes = await upsertGooglePlaceActionLink(googleAccount, {
      placeActionType: 'APPOINTMENT',
      uri: urls.bookingUrl,
    });
    if (apptRes.ok) {
      syncedActions.push('APPOINTMENT');
      syncedAppointmentUri = urls.bookingUrl;
    } else if (apptRes.warning) {
      warnings.push(apptRes.warning);
    }
  }

  const shouldSyncOrdering =
    params.includeOrdering === true ||
    (params.includeOrdering !== false &&
      (products.length > 0 ||
        store.foodOrderingEnabled ||
        store.pickupEnabled ||
        store.deliveryEnabled));

  if (shouldSyncOrdering) {
    const orderTargetUrl =
      normalizeSocialUrl(store.orderActionUrl) || urls.defaultOrderUrl;
    const orderType = store.foodOrderingEnabled ? 'FOOD_ORDERING' : 'ONLINE_ORDERING';
    const orderRes = await upsertGooglePlaceActionLink(googleAccount, {
      placeActionType: orderType,
      uri: orderTargetUrl,
    });
    if (orderRes.ok) {
      syncedActions.push(orderType);
      syncedOrderUri = orderTargetUrl;
    } else if (orderRes.warning) {
      warnings.push(orderRes.warning);
    }
  }

  if (params.persistSettings !== false && syncedActions.length > 0) {
    const prevActions =
      settings.googlePlaceActions && typeof settings.googlePlaceActions === 'object'
        ? settings.googlePlaceActions
        : {};
    const nextSettings: Record<string, any> = {
      ...settings,
      ...(syncedAppointmentUri ? { bookingLink: syncedAppointmentUri } : {}),
      googlePlaceActions: {
        ...prevActions,
        ...(syncedAppointmentUri ? { appointmentUri: syncedAppointmentUri } : {}),
        ...(syncedOrderUri ? { orderUri: syncedOrderUri } : {}),
        syncedAt: new Date().toISOString(),
      },
    };
    await db.tenant
      .update({
        where: { id: tenant.id },
        data: { settingsJson: JSON.stringify(nextSettings) },
      })
      .catch(() => {});
  }

  return {
    attempted: true,
    connected: true,
    syncedActions,
    appointmentUri: syncedAppointmentUri,
    orderUri: syncedOrderUri,
    warnings,
  };
}

/**
 * Publish a product showcase Local Post (`ORDER` CTA) on Google Business Profile
 * so newly added or featured products appear on Google Search & Maps immediately.
 */
export async function publishProductShowcaseToGoogle(params: {
  tenantId: string;
  product: BgosProduct;
  currency: string;
  profileUrl: string;
  googleAccount?: SocialAccountData | null;
}): Promise<{ ok: boolean; permalink?: string; warning?: string }> {
  const googleAccount =
    params.googleAccount !== undefined
      ? params.googleAccount
      : await prepareGoogleAccount(params.tenantId).catch(() => null);
  if (!googleAccount) {
    return { ok: false, warning: 'No active Google Business account connected.' };
  }

  const pricePart =
    params.product.price !== null && params.product.price !== undefined
      ? ` — ${params.currency === 'INR' ? '₹' : `${params.currency} `}${params.product.price}`
      : '';
  const descPart = params.product.description ? `\n${params.product.description}` : '';
  const summary = `Now available: ${params.product.name}${pricePart}${descPart}\nOrder or request online directly through our catalog.`;

  try {
    const res = await googleBusinessAdapter.publish(googleAccount, {
      content: summary.slice(0, 1450),
      mediaUrls: params.product.imageUrl ? [params.product.imageUrl] : [],
      linkUrl: `${params.profileUrl}#products`,
      gbpPostType: 'whats_new',
      gbpActionType: 'ORDER',
    });

    return {
      ok: Boolean(res.externalPostId),
      permalink: res.permalink,
    };
  } catch (err) {
    return {
      ok: false,
      warning: err instanceof Error ? err.message : 'Could not publish product announcement to Google.',
    };
  }
}
