import { db } from '@/lib/db';
import { sanitizePublicImageUrl } from '@/lib/bgos-business-sanitizers';
import type {
  BgosFulfillmentMode,
  BgosProduct,
  BgosSocialProfiles,
  BgosStoreSettings,
} from '../../shared/bgos-contracts';

const VALID_FULFILLMENT_MODES: BgosFulfillmentMode[] = [
  'pickup',
  'delivery',
  'food_order',
  'in_store',
];

function safeObj(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...(raw as Record<string, any>) };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizeSocialUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeBgosProductInput(
  raw: any,
  fallbackId?: string,
): BgosProduct | null {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const id =
    typeof raw?.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : fallbackId || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const description = typeof raw?.description === 'string' ? raw.description.trim() : '';
  const category = typeof raw?.category === 'string' && raw.category.trim() ? raw.category.trim() : 'General';
  const parsedPrice =
    raw?.price === null || raw?.price === undefined || raw?.price === ''
      ? null
      : Number(raw.price);
  const price = parsedPrice !== null && Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null;
  const imageUrl = sanitizePublicImageUrl(raw?.imageUrl) || null;
  const inStock = raw?.inStock !== false;

  const modesRaw = Array.isArray(raw?.fulfillmentModes) ? raw.fulfillmentModes : [];
  const fulfillmentModes = modesRaw.filter(
    (m: unknown): m is BgosFulfillmentMode =>
      typeof m === 'string' && (VALID_FULFILLMENT_MODES as string[]).includes(m),
  );

  return {
    id,
    name,
    description,
    price,
    category,
    imageUrl,
    inStock,
    fulfillmentModes: fulfillmentModes.length > 0 ? fulfillmentModes : ['pickup', 'delivery'],
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function parseBgosProducts(settingsRaw: unknown): BgosProduct[] {
  const settings = safeObj(settingsRaw);
  const arr = Array.isArray(settings.bgosProducts) ? settings.bgosProducts : [];
  const out: BgosProduct[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < arr.length; i += 1) {
    const normalized = normalizeBgosProductInput(arr[i], `prod_${i + 1}`);
    if (!normalized) continue;
    const key = normalized.id || normalized.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export function parseBgosStoreSettings(settingsRaw: unknown): BgosStoreSettings {
  const settings = safeObj(settingsRaw);
  const store = safeObj(settings.bgosStoreSettings);
  const minOrderRaw =
    store.minOrderAmount === null || store.minOrderAmount === undefined || store.minOrderAmount === ''
      ? null
      : Number(store.minOrderAmount);

  return {
    pickupEnabled: store.pickupEnabled !== false,
    deliveryEnabled: Boolean(store.deliveryEnabled),
    foodOrderingEnabled: Boolean(store.foodOrderingEnabled),
    inStoreShoppingEnabled: store.inStoreShoppingEnabled !== false,
    orderActionUrl: typeof store.orderActionUrl === 'string' ? store.orderActionUrl.trim() : '',
    deliveryRadius: typeof store.deliveryRadius === 'string' ? store.deliveryRadius.trim() : '',
    minOrderAmount:
      minOrderRaw !== null && Number.isFinite(minOrderRaw) && minOrderRaw >= 0
        ? minOrderRaw
        : null,
  };
}

export function parseSocialProfiles(
  socialLinksJson: unknown,
  settingsRaw?: unknown,
): BgosSocialProfiles {
  const fromTenant = safeObj(socialLinksJson);
  const settings = safeObj(settingsRaw);
  const fromSettings = safeObj(settings.socialProfiles);

  const pick = (k: keyof BgosSocialProfiles) => {
    const val = fromSettings[k] ?? fromTenant[k] ?? '';
    return typeof val === 'string' && val.trim() ? val.trim() : undefined;
  };

  return {
    facebook: pick('facebook'),
    instagram: pick('instagram'),
    linkedin: pick('linkedin'),
    twitter: pick('twitter'),
    youtube: pick('youtube'),
  };
}

export async function persistStoreCatalogAndSync(params: {
  tenantId: string;
  settings: Record<string, any>;
  products: BgosProduct[];
  storeSettings: BgosStoreSettings;
  socialProfiles: BgosSocialProfiles;
}): Promise<void> {
  const cleanSocial: Record<string, string> = {};
  for (const key of ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube'] as const) {
    const url = normalizeSocialUrl(params.socialProfiles[key]);
    if (url) cleanSocial[key] = url;
  }

  const nextSettings: Record<string, any> = {
    ...params.settings,
    bgosProducts: params.products,
    activeGbpProducts: params.products.filter((p) => p.inStock).map((p) => p.name),
    bgosStoreSettings: params.storeSettings,
    socialProfiles: cleanSocial,
  };

  await db.tenant.update({
    where: { id: params.tenantId },
    data: {
      settingsJson: JSON.stringify(nextSettings),
      socialLinksJson: JSON.stringify(cleanSocial),
    },
  });

  if (typeof (db as any).brandProfile?.updateMany === 'function') {
    await (db as any).brandProfile
      .updateMany({
        where: { tenantId: params.tenantId },
        data: {
          products: JSON.stringify(
            params.products.map((p) => ({
              name: p.name,
              price: p.price,
              category: p.category,
              description: p.description,
              inStock: p.inStock,
            })),
          ),
        },
      })
      .catch(() => {});
  }

  const { ensureAndSyncBusinessChatbot } = await import('@/lib/bgos-business-chatbot');
  await ensureAndSyncBusinessChatbot(params.tenantId, {
    triggerSource: 'store_catalog_update',
  }).catch(() => {});
}
