import { db } from '@/lib/db';
import { isSeededDummyService } from '@/lib/bgos-business-sanitizers';
import { safeParseJsonObject, type StructuredSeoService } from '@/lib/gbp/seo-context';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { invalidatePlacePayloadCacheForTenant } from '@/lib/social/google-connection-state';
import { updateGoogleBusinessProfile } from '@/lib/social/adapters/googlebusiness';

export interface GoogleServiceSyncResult {
  connected: boolean;
  attempted: boolean;
  synced: boolean;
  warnings: string[];
}

export function deriveServiceSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Synchronize canonical active `Service` rows into `Tenant.settingsJson` (`seoServices`,
 * `services`, `activeGbpServices`), `BrandProfile.services`, AI chatbot knowledge base,
 * and (when requested & connected) Google Business Profile `serviceItems`.
 */
export async function syncServiceCatalogAndGbp(
  tenantId: string,
  options?: {
    syncToGoogle?: boolean;
    locationId?: string;
    triggerSource?: string;
  },
): Promise<{ servicesCount: number; googleSync: GoogleServiceSyncResult }> {
  const defaultGoogleSync: GoogleServiceSyncResult = {
    connected: false,
    attempted: false,
    synced: false,
    warnings: [],
  };

  if (!tenantId || !db.service?.findMany || !db.tenant?.findUnique) {
    return { servicesCount: 0, googleSync: defaultGoogleSync };
  }

  const [rawServices, tenant] = await Promise.all([
    db.service
      .findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
        take: 60,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          longDescription: true,
          category: true,
          basePrice: true,
          duration: true,
        },
      })
      .catch(() => []),
    db.tenant
      .findUnique({
        where: { id: tenantId },
        select: { settingsJson: true },
      })
      .catch(() => null),
  ]);

  const activeServices = (Array.isArray(rawServices) ? rawServices : []).filter(
    (s) =>
      !isSeededDummyService({
        slug: s.slug || deriveServiceSlug(s.name),
        name: s.name,
        description: s.longDescription || s.description,
        basePrice: s.basePrice,
        duration: s.duration,
      }),
  );

  const settings = safeParseJsonObject(tenant?.settingsJson);
  const existingSeoByName = new Map<string, StructuredSeoService>();
  if (Array.isArray(settings.seoServices)) {
    for (const raw of settings.seoServices) {
      if (raw && typeof raw.name === 'string' && raw.name.trim()) {
        existingSeoByName.set(raw.name.trim().toLowerCase(), raw);
      }
    }
  }

  const nextSeoServices: StructuredSeoService[] = activeServices.map((svc) => {
    const prev = existingSeoByName.get(svc.name.trim().toLowerCase());
    const cleanDesc = (svc.longDescription || svc.description || prev?.description || '')
      .trim()
      .slice(0, 500);
    return {
      id: svc.id,
      name: svc.name.trim(),
      description: cleanDesc,
      targetKeyword: prev?.targetKeyword,
      category: svc.category || prev?.category,
      syncedToGoogle: Boolean(prev?.syncedToGoogle),
    };
  });

  const serviceNames = nextSeoServices.map((s) => s.name);

  let googleSync = { ...defaultGoogleSync };
  if (options?.syncToGoogle !== false && nextSeoServices.length > 0) {
    try {
      const googleAccount = await prepareGoogleAccount(tenantId, options?.locationId);
      if (googleAccount?.accessToken) {
        googleSync.connected = true;
        googleSync.attempted = true;
        const pushRes = await updateGoogleBusinessProfile(googleAccount, {
          serviceItems: nextSeoServices.map((s) => ({
            name: s.name,
            description: s.description,
          })),
        });
        googleSync.warnings = pushRes.warnings || [];
        googleSync.synced = pushRes.appliedMasks.includes('serviceItems');
        if (googleSync.synced) {
          for (const item of nextSeoServices) {
            item.syncedToGoogle = true;
          }
        }
      }
    } catch (err: unknown) {
      googleSync.attempted = true;
      googleSync.warnings = [
        err instanceof Error ? err.message : 'Google Business Profile service sync unavailable',
      ];
    }
  }

  settings.seoServices = nextSeoServices;
  settings.services = serviceNames;
  settings.activeGbpServices = serviceNames;

  if (db.tenant?.update) {
    await db.tenant
      .update({
        where: { id: tenantId },
        data: { settingsJson: JSON.stringify(settings) },
      })
      .catch(() => {});
  }

  if (db.brandProfile?.updateMany) {
    await db.brandProfile
      .updateMany({
        where: { tenantId },
        data: { services: JSON.stringify(serviceNames) },
      })
      .catch(() => {});
  }

  invalidatePlacePayloadCacheForTenant(tenantId);

  const { ensureAndSyncBusinessChatbot } = await import('@/lib/bgos-business-chatbot');
  await ensureAndSyncBusinessChatbot(tenantId, {
    triggerSource: options?.triggerSource || 'service_sync',
  }).catch(() => {});

  return { servicesCount: nextSeoServices.length, googleSync };
}
