import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

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
 * GET /api/commerce/promotions
 * List coupons and active storefront banner for merchant
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
        ],
      },
    });

    let promotions: CouponItem[] = [];
    let bannerText = '';

    if (config?.fieldsJson) {
      try {
        const parsed = JSON.parse(config.fieldsJson);
        if (Array.isArray(parsed.promotions)) promotions = parsed.promotions;
        if (typeof parsed.bannerText === 'string') bannerText = parsed.bannerText;
      } catch {
        // Fallback default sample if empty
      }
    }

    // Default starter promotions if merchant has none
    if (promotions.length === 0) {
      promotions = [
        {
          id: 'promo-welcome',
          code: 'WELCOME50',
          discountType: 'FLAT',
          discountValue: 50,
          minOrderValue: 299,
          description: 'Flat ₹50 OFF on first order above ₹299',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'promo-festive',
          code: 'FESTIVE15',
          discountType: 'PERCENT',
          discountValue: 15,
          minOrderValue: 499,
          maxDiscount: 150,
          description: '15% OFF up to ₹150 on orders above ₹499',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];
      bannerText = '🎉 Festive Special: Get ₹50 OFF on orders above ₹299! Use code WELCOME50 at checkout.';
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
 * Create/update coupon or storefront banner
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { action, coupon, bannerText } = body;

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

    let promotions: CouponItem[] = Array.isArray(currentConfigData.promotions)
      ? currentConfigData.promotions
      : [];

    if (action === 'SET_BANNER') {
      currentConfigData.bannerText = bannerText || '';
    } else if (action === 'DELETE_COUPON') {
      const { couponId } = body;
      promotions = promotions.filter((p) => p.id !== couponId && p.code !== couponId);
      currentConfigData.promotions = promotions;
    } else {
      // Add or update coupon
      if (!coupon || !coupon.code) {
        return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
      }

      const formattedCode = coupon.code.toUpperCase().replace(/\s+/g, '');
      const newCoupon: CouponItem = {
        id: coupon.id || `coupon-${Date.now()}`,
        code: formattedCode,
        discountType: coupon.discountType || 'FLAT',
        discountValue: Number(coupon.discountValue) || 0,
        minOrderValue: Number(coupon.minOrderValue) || 0,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : undefined,
        description: coupon.description || `${coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} OFF`,
        isActive: coupon.isActive !== undefined ? coupon.isActive : true,
        expiresAt: coupon.expiresAt || undefined,
        createdAt: new Date().toISOString(),
      };

      // Upsert
      const existingIdx = promotions.findIndex((p) => p.code === formattedCode);
      if (existingIdx !== -1) {
        promotions[existingIdx] = newCoupon;
      } else {
        promotions.unshift(newCoupon);
      }
      currentConfigData.promotions = promotions;
    }

    const updatedJson = JSON.stringify(currentConfigData);

    if (config) {
      await db.gptformCommerceConfig.update({
        where: { id: config.id },
        data: { fieldsJson: updatedJson },
      });
    } else {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          fieldsJson: updatedJson,
        },
      });
    }

    return NextResponse.json({
      success: true,
      promotions,
      bannerText: currentConfigData.bannerText || '',
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to save promotion:', e);
    return NextResponse.json({ error: e.message || 'Failed to save promotion' }, { status: 500 });
  }
}
