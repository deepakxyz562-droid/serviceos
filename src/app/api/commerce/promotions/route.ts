import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export const runtime = 'nodejs';

/**
 * CouponItem — the response shape consumed by the mobile promotions screen
 * (`gptform-mobile-app/app/promotions.tsx`) and re-exported for the validate
 * route. This shape is intentionally kept stable across the JSON-blob →
 * Prisma `Promotion` migration so the mobile app does not need a release.
 *
 * NOTE: fields map to/from `Promotion` as follows:
 *   - code          ← Promotion.code
 *   - discountType  ← Promotion.type ('fixed' → 'FLAT', 'percentage' → 'PERCENT')
 *   - discountValue ← Promotion.value
 *   - minOrderValue ← Promotion.minSpend
 *   - maxDiscount   ← Promotion.maxDiscount
 *   - expiresAt     ← Promotion.endDate
 *   - isActive      ← Promotion.isActive
 */
export interface CouponItem {
  id: string;
  code: string;
  discountType: 'FLAT' | 'PERCENT';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  description: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

/**
 * Map a Prisma `Promotion` row → the mobile-friendly `CouponItem` shape.
 * Inverse mapping lives in `promotionToCreateData` below (POST handler).
 */
function promotionToCouponItem(p: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: string;        // 'percentage' | 'fixed' | 'free_service'
  value: number;
  minSpend: number;
  maxDiscount: number | null;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
}): CouponItem {
  const isPercent = p.type === 'percentage';
  return {
    id: p.id,
    code: (p.code || p.name).toUpperCase(),
    discountType: isPercent ? 'PERCENT' : 'FLAT',
    discountValue: p.value,
    minOrderValue: p.minSpend,
    maxDiscount: p.maxDiscount ?? undefined,
    description: p.description || `${isPercent ? `${p.value}%` : `₹${p.value}`} OFF`,
    isActive: p.isActive,
    expiresAt: p.endDate ? p.endDate.toISOString() : undefined,
    createdAt: p.createdAt.toISOString(),
  };
}

/**
 * GET /api/commerce/promotions
 * List coupons (from real Promotion table) + active storefront banner.
 *
 * Phase 2 change: the hardcoded WELCOME50 / FESTIVE15 default-starter-coupons
 * fallback has been REMOVED. Merchants with no Promotion rows now get an empty
 * list (Phase 3 will add a "load starter coupons" action that seeds real
 * Promotion rows). The banner text continues to live in
 * `GptformCommerceConfig.fieldsJson.bannerText` because it's a single UI
 * string, not relational data — migrating it to its own model adds no value.
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    // Resolve tenantId (Promotion is tenant-scoped). Fall back to business.id
    // for solo merchants that have no tenant.
    const tenantId = business.tenantId || business.id;

    // Active coupons only (active + not soft-deleted). We do NOT filter out
    // expired coupons here — the merchant should see them so they can re-issue
    // or delete. The validate route enforces expiry at checkout.
    const rows = await db.promotion.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const promotions: CouponItem[] = rows.map(promotionToCouponItem);

    // Banner text remains in fieldsJson — single UI string, not relational.
    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
        ],
      },
    });

    let bannerText = '';
    if (config?.fieldsJson) {
      try {
        const parsed = JSON.parse(config.fieldsJson);
        if (typeof parsed.bannerText === 'string') bannerText = parsed.bannerText;
      } catch {
        // ignore — banner stays ''
      }
    }

    return NextResponse.json({
      promotions,
      bannerText,
      activeCouponsCount: promotions.filter((p) => p.isActive).length,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to get promotions:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch promotions' }, { status: 500 });
  }
}

/**
 * POST /api/commerce/promotions
 * Create / update / delete a coupon (real `Promotion` row) or update the
 * storefront banner (stored in `fieldsJson.bannerText`).
 *
 * Actions:
 *   - SET_BANNER   → update `fieldsJson.bannerText` only.
 *   - DELETE_COUPON → `db.promotion.delete` by id (falls back to code).
 *   - default       → `db.promotion.upsert` keyed on `code` (globally @unique).
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { action, coupon, bannerText } = body;

    const tenantId = business.tenantId || business.id;

    // ── Banner path (still JSON — single UI string) ────────────────────────
    if (action === 'SET_BANNER') {
      // Resolve or create the commerce config row (banner lives in fieldsJson).
      let config = await db.gptformCommerceConfig.findFirst({
        where: {
          OR: [
            { businessId: business.id },
            ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
          ],
        },
      });

      let currentConfigData: Record<string, any> = {};
      if (config?.fieldsJson) {
        try {
          currentConfigData = JSON.parse(config.fieldsJson);
        } catch {
          currentConfigData = {};
        }
      }
      currentConfigData.bannerText = bannerText || '';

      const updatedJson = JSON.stringify(currentConfigData);
      if (config) {
        await db.gptformCommerceConfig.update({
          where: { id: config.id },
          data: { fieldsJson: updatedJson },
        });
      } else {
        config = await db.gptformCommerceConfig.create({
          data: { businessId: business.id, fieldsJson: updatedJson },
        });
      }

      // Return the full coupon list too so the client can refresh state.
      const rows = await db.promotion.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      const promotions: CouponItem[] = rows.map(promotionToCouponItem);

      return NextResponse.json({
        success: true,
        promotions,
        bannerText: currentConfigData.bannerText || '',
      });
    }

    // ── LOAD_STARTER_COUPONS path ──────────────────────────────────────────
    // Opt-in seeding of two sample coupons (WELCOME50, FESTIVE15) as real
    // `Promotion` rows owned by this tenant. The merchant explicitly requests
    // this — we never auto-inject coupons into their dashboard.
    if (action === 'LOAD_STARTER_COUPONS') {
      const starters = [
        {
          code: 'WELCOME50',
          name: 'WELCOME50',
          description: 'Flat ₹50 OFF on first order above ₹299',
          type: 'fixed',
          value: 50,
          minSpend: 299,
          maxDiscount: null,
          perCustomerLimit: 1,
        },
        {
          code: 'FESTIVE15',
          name: 'FESTIVE15',
          description: '15% OFF up to ₹150 on orders above ₹499',
          type: 'percentage',
          value: 15,
          minSpend: 499,
          maxDiscount: 150,
          perCustomerLimit: 1,
        },
      ];

      for (const s of starters) {
        // Only create if no row with this code exists yet (global @unique).
        // If a row exists but belongs to a different tenant, skip it — we
        // cannot claim a code another merchant already owns.
        const existing = await db.promotion.findUnique({ where: { code: s.code } });
        if (!existing) {
          await db.promotion.create({
            data: {
              tenantId,
              code: s.code,
              name: s.name,
              description: s.description,
              type: s.type,
              value: s.value,
              currency: 'INR',
              minSpend: s.minSpend,
              maxDiscount: s.maxDiscount,
              perCustomerLimit: s.perCustomerLimit,
              isActive: true,
            },
          });
        } else if (existing.tenantId === tenantId && !existing.isActive) {
          // Reactivate if the merchant previously deactivated their own coupon.
          await db.promotion.update({
            where: { id: existing.id },
            data: { isActive: true },
          });
        }
      }

      const rows = await db.promotion.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      const promotions: CouponItem[] = rows.map(promotionToCouponItem);

      return NextResponse.json({
        success: true,
        promotions,
        bannerText: '🎉 Welcome offer: Use code WELCOME50 to get ₹50 OFF on your first order!',
      });
    }

    // ── DELETE_COUPON path ────────────────────────────────────────────────
    if (action === 'DELETE_COUPON') {
      const { couponId } = body;
      if (!couponId) {
        return NextResponse.json({ error: 'couponId is required' }, { status: 400 });
      }
      // Try by id first, then fall back to code (the mobile app passes the
      // CouponItem.id field, but older callers may pass the code).
      const existing =
        (await db.promotion.findUnique({ where: { id: couponId } })) ||
        (await db.promotion.findFirst({ where: { code: couponId, tenantId } }));

      if (!existing) {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      }
      // Guard against cross-tenant delete (id-based lookup is globally unique,
      // so verify the row actually belongs to this tenant).
      if (existing.tenantId && existing.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      }
      await db.promotion.delete({ where: { id: existing.id } });

      const rows = await db.promotion.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      const promotions: CouponItem[] = rows.map(promotionToCouponItem);

      return NextResponse.json({
        success: true,
        promotions,
        bannerText: '',
      });
    }

    // ── Add / update coupon path (default) ────────────────────────────────
    if (!coupon || !coupon.code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const formattedCode = String(coupon.code).toUpperCase().replace(/\s+/g, '');
    const discountType: 'FLAT' | 'PERCENT' =
      coupon.discountType === 'PERCENT' ? 'PERCENT' : 'FLAT';
    const discountValue = Number(coupon.discountValue) || 0;
    const minOrderValue = Number(coupon.minOrderValue) || 0;
    const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;
    const description =
      coupon.description ||
      `${discountType === 'PERCENT' ? `${discountValue}%` : `₹${discountValue}`} OFF`;
    const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
    const isActive = coupon.isActive !== undefined ? !!coupon.isActive : true;

    // Promotion.type uses 'percentage' | 'fixed' | 'free_service'
    const promoType = discountType === 'PERCENT' ? 'percentage' : 'fixed';

    // `code` is @unique globally — upsert keyed on it. The tenantId is set on
    // create; on update we leave it alone (don't allow code-jacking across
    // tenants).
    const upserted = await db.promotion.upsert({
      where: { code: formattedCode },
      create: {
        tenantId,
        code: formattedCode,
        name: formattedCode,
        description,
        type: promoType,
        value: discountValue,
        currency: 'INR',
        minSpend: minOrderValue,
        maxDiscount,
        endDate: expiresAt,
        isActive,
        perCustomerLimit: 1,
      },
      update: {
        description,
        type: promoType,
        value: discountValue,
        minSpend: minOrderValue,
        maxDiscount,
        endDate: expiresAt,
        isActive,
      },
    });

    const rows = await db.promotion.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const promotions: CouponItem[] = rows.map(promotionToCouponItem);

    return NextResponse.json({
      success: true,
      promotions,
      coupon: promotionToCouponItem(upserted),
      bannerText: '',
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to save promotion:', e);
    return NextResponse.json({ error: e.message || 'Failed to save promotion' }, { status: 500 });
  }
}
