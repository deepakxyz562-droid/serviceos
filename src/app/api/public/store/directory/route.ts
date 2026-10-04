import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export interface ListedStore {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  bannerUrl: string;
  address: string;
  rating: number;
  deliveryTime: string;
  isOpen: boolean;
  itemCount: number;
  featuredItems: string[];
}

/**
 * GET /api/public/store/directory
 * Local store directory / marketplace listing.
 *
 * Returns ONLY real tenants from the DB (no mocked / sample stores).
 * Ratings are computed from the `Review` model when present (otherwise 0),
 * delivery time / item count are pulled from real config / catalog data,
 * and tenants without a logo fall back to an empty string (no Unsplash
 * hot-linking) so the UI can render its own neutral placeholder.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get('category');
    const query = (searchParams.get('q') || '').toLowerCase().trim();

    // 1. Fetch businesses / tenants with commerce configs
    const tenants = await db.tenant.findMany({
      where: {
        ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        address: true,
        city: true,
        logo: true,
      },
      take: 20,
    });

    const configs = await db.gptformCommerceConfig.findMany({
      where: {
        isActive: true,
      },
      take: 20,
    });

    const configMap = new Map(configs.map((c) => [c.businessId, c]));

    // 2. Compute average rating per tenant from the `Review` model.
    //    Review model: rating Int, tenantId String?, status String @default("published")
    //    Only count published reviews (filter out pending/hidden).
    const tenantIds = tenants.map((t) => t.id);
    const reviewAgg: Array<{ tenantId: string; _avg: { rating: number | null }; _count: number }> = [];
    if (tenantIds.length > 0) {
      try {
        const grouped = await db.review.groupBy({
          by: ['tenantId'],
          where: {
            tenantId: { in: tenantIds },
            status: 'published',
          },
          _avg: { rating: true },
          _count: { _all: true },
        });
        // groupBy returns tenantId as string | null; cast to the typed shape above.
        for (const g of grouped as any[]) {
          reviewAgg.push({
            tenantId: String(g.tenantId),
            _avg: { rating: g._avg?.rating ?? null },
            _count: g._count?._all ?? 0,
          });
        }
      } catch (revErr) {
        // If the Review model is unavailable / query fails, fall back to rating: 0.
        console.warn('store/directory: Review aggregation failed, defaulting rating to 0:', revErr);
      }
    }
    const ratingMap = new Map<string, number>();
    for (const r of reviewAgg) {
      ratingMap.set(r.tenantId, r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : 0);
    }

    // 3. Build the real DB-backed store list (no fake samples merged in).
    const dbStores: ListedStore[] = tenants.map((t) => {
      const cfg = configMap.get(t.id);
      let cat = 'General';
      const ind = (t.industry || '').toLowerCase();
      if (ind.includes('food') || ind.includes('restaurant')) cat = 'Restaurant';
      else if (ind.includes('salon') || ind.includes('beauty')) cat = 'Salon';
      else if (ind.includes('grocery') || ind.includes('kirana')) cat = 'Kirana';

      let items: any[] = [];
      let fields: any = {};
      if (cfg?.catalogJson) {
        try {
          items = JSON.parse(cfg.catalogJson);
        } catch {}
      }
      if (cfg?.fieldsJson) {
        try {
          const parsed = JSON.parse(cfg.fieldsJson);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            fields = parsed;
          } else if (Array.isArray(parsed)) {
            // Some configs store fields as an array of {id,label,...}; check each entry.
            for (const f of parsed) {
              if (f && typeof f === 'object' && typeof f.deliveryTime === 'string') {
                fields.deliveryTime = f.deliveryTime;
                break;
              }
            }
          }
        } catch {}
      }

      const deliveryTime =
        typeof fields.deliveryTime === 'string' && fields.deliveryTime.trim()
          ? fields.deliveryTime.trim()
          : 'Varies';

      return {
        id: t.id,
        name: t.name,
        slug: t.slug || t.id,
        category: cat,
        description: `${cat} store with instant WhatsApp ordering and live tracking`,
        // Neutral placeholder: empty string when the tenant has no real logo.
        // (Do NOT hot-link Unsplash images — UI renders its own fallback.)
        bannerUrl: t.logo || '',
        address: [t.address, t.city].filter(Boolean).join(', ') || 'Local Store',
        rating: ratingMap.get(t.id) ?? 0,
        deliveryTime,
        isOpen: cfg ? cfg.isActive : true,
        // Real catalog count only — no fabricated fallback.
        itemCount: Array.isArray(items) ? items.length : 0,
        featuredItems: Array.isArray(items) ? items.slice(0, 3).map((i) => i.name).filter(Boolean) : [],
      };
    });

    // No sampleStores are merged in — `allStores` is the real DB list only.
    const allStores = dbStores;

    const filtered = allStores.filter((s) => {
      const matchesCategory =
        !categoryParam ||
        categoryParam === 'ALL' ||
        s.category.toLowerCase() === categoryParam.toLowerCase();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    return NextResponse.json({
      stores: filtered,
      categories: ['ALL', 'Kirana', 'Restaurant', 'Salon', 'Fashion', 'Bakery'],
    });
  } catch (err: any) {
    console.error('Failed to fetch store directory:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch directory' }, { status: 500 });
  }
}
