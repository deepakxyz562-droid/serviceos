import { db } from '@/lib/db';
import { isSeededDummyService } from '@/lib/bgos-business-sanitizers';

function deriveServiceSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export interface GoogleDiscoveryKeyword {
  keyword: string;
  count: number;
  isThreshold?: boolean;
}

export interface StructuredSeoService {
  id?: string;
  name: string;
  description: string;
  targetKeyword?: string;
  category?: string;
  syncedToGoogle?: boolean;
}

export interface TenantSeoContext {
  tenantId: string;
  businessName: string;
  category: string;
  city: string;
  serviceAreas: string[];
  searchTerms: GoogleDiscoveryKeyword[];
  trackedKeywords: Array<{
    keyword: string;
    score: number | null;
    mapsRank: number | null;
    organicRank: number | null;
    source: string;
  }>;
  priorityKeywords: string[];
  additionalCategories: string[];
  attributes: Record<string, unknown>;
  competitorReviewThemes?: string[];
  competitorMissingCategories?: string[];
  seoServices: StructuredSeoService[];
}

export function safeParseJsonObject(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function safeParseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

/**
 * Unify structured services saved in `settingsJson.seoServices`, DB `Service` rows,
 * and legacy `settingsJson.services` string pills into one canonical list.
 */
export function mergeStructuredServices(
  settings: Record<string, any>,
  dbServices: Array<{
    id: string;
    slug?: string | null;
    name: string;
    description: string | null;
    longDescription: string | null;
    category: string;
    basePrice?: number | null;
    duration?: number | null;
  }> = [],
): StructuredSeoService[] {
  const byName = new Map<string, StructuredSeoService>();

  const upsert = (
    entry: StructuredSeoService,
    meta?: { slug?: string | null; basePrice?: number | null; duration?: number | null },
  ) => {
    const cleanName = entry.name.trim();
    if (!cleanName) return;
    if (
      isSeededDummyService({
        slug: meta?.slug || deriveServiceSlug(cleanName),
        name: cleanName,
        description: entry.description,
        basePrice: meta?.basePrice,
        duration: meta?.duration,
      })
    ) {
      return;
    }
    const key = cleanName.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...entry, name: cleanName, description: (entry.description || '').trim() });
      return;
    }
    byName.set(key, {
      id: existing.id || entry.id,
      name: existing.name,
      description:
        existing.description.length >= (entry.description || '').trim().length
          ? existing.description
          : (entry.description || '').trim(),
      targetKeyword: existing.targetKeyword || entry.targetKeyword,
      category: existing.category || entry.category,
      syncedToGoogle: existing.syncedToGoogle || entry.syncedToGoogle,
    });
  };

  // 1. Settings structured services first (retains targetKeyword + syncedToGoogle)
  if (Array.isArray(settings?.seoServices)) {
    for (const raw of settings.seoServices) {
      if (raw && typeof raw.name === 'string') {
        upsert({
          id: typeof raw.id === 'string' ? raw.id : undefined,
          name: raw.name,
          description: typeof raw.description === 'string' ? raw.description : '',
          targetKeyword: typeof raw.targetKeyword === 'string' ? raw.targetKeyword : undefined,
          category: typeof raw.category === 'string' ? raw.category : undefined,
          syncedToGoogle: Boolean(raw.syncedToGoogle),
        });
      }
    }
  }

  // 2. Prisma Service rows (canonical web public hub catalog)
  for (const svc of dbServices) {
    upsert(
      {
        id: svc.id,
        name: svc.name,
        description: (svc.longDescription || svc.description || '').trim(),
        category: svc.category,
      },
      {
        slug: svc.slug,
        basePrice: svc.basePrice,
        duration: svc.duration,
      },
    );
  }

  // 3. Legacy string array pills from mobile/settings
  if (Array.isArray(settings?.services)) {
    for (const raw of settings.services) {
      if (typeof raw === 'string' && raw.trim()) {
        upsert({ name: raw.trim(), description: '' });
      }
    }
  }

  return Array.from(byName.values());
}

/**
 * Load unified Search Terms, Tracked Keywords, Structured Services, and Location Context
 * for a tenant so every AI generator, audit, and landing page builder shares one brain.
 */
export async function getTenantSeoContext(tenantId: string | null | undefined): Promise<TenantSeoContext | null> {
  if (!tenantId) return null;

  try {
    const [tenant, trackedRows, dbServices] = await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          industry: true,
          serviceAreasJson: true,
          settingsJson: true,
          brandProfile: {
            select: {
              businessName: true,
              industry: true,
              location: true,
              serviceArea: true,
            },
          },
        },
      }),
      db.trackedKeyword
        .findMany({
          where: { tenantId },
          orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
          take: 25,
          select: {
            keyword: true,
            score: true,
            mapsRank: true,
            organicRank: true,
            source: true,
          },
        })
        .catch(() => []),
      db.service
        .findMany({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 40,
          select: {
            id: true,
            name: true,
            description: true,
            longDescription: true,
            category: true,
          },
        })
        .catch(() => []),
    ]);

    if (!tenant) return null;

    const settings = safeParseJsonObject(tenant.settingsJson);
    const rawDiscovery = Array.isArray(settings?.googleDiscovery?.keywords)
      ? settings.googleDiscovery.keywords
      : [];

    const searchTerms: GoogleDiscoveryKeyword[] = rawDiscovery
      .filter((k: any) => k && typeof k.keyword === 'string' && k.keyword.trim())
      .map((k: any) => ({
        keyword: String(k.keyword).trim(),
        count: Math.max(0, Number(k.count) || 0),
        isThreshold: Boolean(k.isThreshold),
      }))
      .sort((a: GoogleDiscoveryKeyword, b: GoogleDiscoveryKeyword) => b.count - a.count)
      .slice(0, 30);

    const priorityKeywords: string[] = [];
    const seen = new Set<string>();
    const addKw = (kw: string) => {
      const clean = kw.trim();
      const key = clean.toLowerCase();
      if (!clean || seen.has(key)) return;
      seen.add(key);
      priorityKeywords.push(clean);
    };

    // Real Google Search Terms first, then tracked keywords
    for (const s of searchTerms) addKw(s.keyword);
    for (const t of trackedRows) addKw(t.keyword);

    const city = (
      tenant.city ||
      tenant.brandProfile?.location ||
      (tenant.address ? tenant.address.split(',')[0] : '') ||
      ''
    ).trim();

    const areasFromJson = safeParseJsonArray(tenant.serviceAreasJson);
    const areasFromBrand = tenant.brandProfile?.serviceArea
      ? tenant.brandProfile.serviceArea.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const serviceAreas = Array.from(new Set([...areasFromJson, ...areasFromBrand])).slice(0, 12);

    const additionalCategories = Array.isArray(settings.additionalCategories)
      ? settings.additionalCategories.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
      : [];

    const attributes =
      settings.attributes && typeof settings.attributes === 'object' && !Array.isArray(settings.attributes)
        ? (settings.attributes as Record<string, unknown>)
        : {};

    const spyInsights = settings.competitorSpyCache?.spyInsights;
    const competitorReviewThemes: string[] = Array.isArray(spyInsights?.suggestedKeywordsFromReviews)
      ? spyInsights.suggestedKeywordsFromReviews
          .filter((w: unknown): w is string => typeof w === 'string' && w.trim().length > 0)
          .slice(0, 8)
      : [];
    const competitorMissingCategories: string[] = Array.isArray(spyInsights?.missingCategories)
      ? spyInsights.missingCategories
          .map((c: any) => String(c?.category || '').trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    return {
      tenantId: tenant.id,
      businessName: tenant.brandProfile?.businessName || tenant.name,
      category: tenant.brandProfile?.industry || tenant.industry || '',
      city,
      serviceAreas,
      searchTerms,
      trackedKeywords: trackedRows,
      priorityKeywords: priorityKeywords.slice(0, 20),
      additionalCategories,
      attributes,
      competitorReviewThemes,
      competitorMissingCategories,
      seoServices: mergeStructuredServices(settings, dbServices),
    };
  } catch (err) {
    console.warn('[seo-context] Failed to load tenant SEO context:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Render a concise, prompt-ready instruction block with real customer Search Terms
 * and local SEO signals. Safe to pass directly into any AI generation prompt.
 */
export function formatSeoKeywordsPromptSection(ctx: TenantSeoContext | null | undefined): string {
  if (!ctx) return '';

  const lines: string[] = [];
  if (ctx.searchTerms.length > 0) {
    const formatted = ctx.searchTerms
      .slice(0, 12)
      .map((k) => (k.count > 0 ? `${k.keyword} (${k.count} searches)` : k.keyword))
      .join(', ');
    lines.push(`Real Google Search Terms customers type to find this business: ${formatted}`);
  }

  const nonSearchTracked = ctx.trackedKeywords
    .filter((t) => !ctx.searchTerms.some((s) => s.keyword.toLowerCase() === t.keyword.toLowerCase()))
    .slice(0, 8)
    .map((t) => t.keyword);
  if (nonSearchTracked.length > 0) {
    lines.push(`Target Local SEO Keywords: ${nonSearchTracked.join(', ')}`);
  }

  if (ctx.competitorReviewThemes && ctx.competitorReviewThemes.length > 0) {
    lines.push(
      `High-demand customer review themes in local market: ${ctx.competitorReviewThemes.slice(0, 5).join(', ')}`,
    );
  }

  if (ctx.serviceAreas.length > 0) {
    lines.push(`Service areas / neighborhoods: ${ctx.serviceAreas.join(', ')}`);
  }

  if (lines.length === 0) return '';

  lines.push(
    'SEO Writing Rule: Naturally weave 2-4 relevant customer search terms and city/neighborhood names above into sentences. Never keyword-stuff or repeat locations unnaturally.',
  );
  return lines.join('\n');
}

/**
 * Persist structured SEO services uniformly across `settingsJson.seoServices`,
 * legacy `settingsJson.services` (`string[]`), `BrandProfile.services`, and
 * Prisma `db.service` records (used for Public Hub + Service JSON-LD + GBP Audit).
 */
export async function upsertTenantStructuredServices(
  tenantId: string,
  services: StructuredSeoService[],
  options?: { syncMissingToInactive?: boolean },
): Promise<StructuredSeoService[]> {
  const normalized: StructuredSeoService[] = [];
  const seen = new Set<string>();
  for (const raw of services) {
    const name = String(raw?.name || '').trim().slice(0, 100);
    if (!name) continue;
    const description = String(raw.description || '').trim().slice(0, 500);
    if (
      isSeededDummyService({
        slug: deriveServiceSlug(name),
        name,
        description,
      })
    ) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      id: raw.id,
      name,
      description,
      targetKeyword: raw.targetKeyword ? String(raw.targetKeyword).trim().slice(0, 120) : undefined,
      category: raw.category ? String(raw.category).trim() : undefined,
      syncedToGoogle: Boolean(raw.syncedToGoogle),
    });
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true, industry: true },
  });
  const settings = safeParseJsonObject(tenant?.settingsJson);
  const serviceNames = normalized.map((s) => s.name);

  settings.seoServices = normalized;
  settings.services = serviceNames;
  settings.activeGbpServices = serviceNames;

  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(settings) },
  });

  // Keep BrandProfile.services aligned if BrandProfile exists
  await db.brandProfile
    .updateMany({
      where: { tenantId },
      data: { services: JSON.stringify(serviceNames) },
    })
    .catch(() => {});

  // Sync into db.service so Public Business Hub & GBP Audit reflect rich descriptions
  type DbServiceRow = {
    id: string;
    slug?: string | null;
    name: string;
    description: string | null;
    longDescription: string | null;
    basePrice?: number | null;
    duration?: number | null;
    isActive?: boolean;
  };
  const existingDb: DbServiceRow[] = await db.service
    .findMany({
      where: { tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        longDescription: true,
        basePrice: true,
        duration: true,
        isActive: true,
      },
    })
    .catch((): DbServiceRow[] => []);
  const existingByName = new Map<string, DbServiceRow>(
    existingDb.map((s) => [s.name.trim().toLowerCase(), s] as const),
  );

  for (const item of normalized) {
    const match = existingByName.get(item.name.toLowerCase());
    const shortDesc = item.description ? item.description.slice(0, 220) : null;
    const longDesc = item.description || null;
    if (match) {
      if (
        match.isActive === false ||
        (longDesc && longDesc !== (match.longDescription || '')) ||
        (shortDesc && !match.description)
      ) {
        await db.service
          .update({
            where: { id: match.id },
            data: {
              ...(shortDesc ? { description: shortDesc } : {}),
              ...(longDesc ? { longDescription: longDesc } : {}),
              isActive: true,
              isPublic: true,
            },
          })
          .catch(() => {});
      }
      item.id = match.id;
    } else {
      const slug = item.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);
      const created = await db.service
        .create({
          data: {
            tenantId,
            name: item.name,
            description: shortDesc,
            longDescription: longDesc,
            slug: slug || undefined,
            category: item.category || tenant?.industry || 'general',
            isActive: true,
            isPublic: true,
          },
          select: { id: true },
        })
        .catch(() => null);
      if (created?.id) item.id = created.id;
    }
  }

  // Soft-deactivate removed services and purge leftover untouched dummy rows when explicitly saving full catalog
  const activeLowerSet = new Set(normalized.map((s) => s.name.toLowerCase()));
  const dummyIdsToDelete = existingDb
    .filter((row) =>
      isSeededDummyService({
        slug: row.slug,
        name: row.name,
        description: row.longDescription || row.description,
        basePrice: row.basePrice,
        duration: row.duration,
      }),
    )
    .map((row) => row.id);
  if (dummyIdsToDelete.length > 0 && db.service.deleteMany) {
    await db.service.deleteMany({ where: { tenantId, id: { in: dummyIdsToDelete } } }).catch(() => {});
  }

  if (options?.syncMissingToInactive && db.service.updateMany) {
    const removedIds = existingDb
      .filter(
        (row) =>
          row.isActive !== false &&
          !dummyIdsToDelete.includes(row.id) &&
          !activeLowerSet.has(row.name.trim().toLowerCase()),
      )
      .map((row) => row.id);
    if (removedIds.length > 0) {
      await db.service
        .updateMany({
          where: { tenantId, id: { in: removedIds } },
          data: { isActive: false, isPublic: false },
        })
        .catch(() => {});
    }
  }

  return normalized;
}

