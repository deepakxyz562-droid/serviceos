import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CouponItem } from '@/app/api/commerce/promotions/route';

/**
 * POST /api/public/store/promotions/validate
 * Public API for customers to validate and apply coupons at checkout
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessSlug, code, cartTotal = 0 } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Please enter a coupon code' }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().replace(/\s+/g, '');
    const amount = Number(cartTotal) || 0;

    // Resolve business
    const business = await db.aiBusiness.findFirst({
      where: {
        OR: [
          { slug: businessSlug },
          { id: businessSlug },
        ],
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
        ],
      },
    });

    let promotions: CouponItem[] = [];
    if (config?.fieldsJson) {
      try {
        const parsed = JSON.parse(config.fieldsJson);
        if (Array.isArray(parsed.promotions)) promotions = parsed.promotions;
      } catch {
        promotions = [];
      }
    }

    // Also support default starter promotions if merchant has not overridden them
    if (promotions.length === 0) {
      if (cleanCode === 'WELCOME50') {
        promotions.push({
          id: 'promo-welcome',
          code: 'WELCOME50',
          discountType: 'FLAT',
          discountValue: 50,
          minOrderValue: 299,
          description: 'Flat ₹50 OFF on first order above ₹299',
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      } else if (cleanCode === 'FESTIVE15') {
        promotions.push({
          id: 'promo-festive',
          code: 'FESTIVE15',
          discountType: 'PERCENT',
          discountValue: 15,
          minOrderValue: 499,
          maxDiscount: 150,
          description: '15% OFF up to ₹150 on orders above ₹499',
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const found = promotions.find((p) => p.code === cleanCode && p.isActive);
    if (!found) {
      return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 });
    }

    if (found.minOrderValue && amount < found.minOrderValue) {
      return NextResponse.json(
        {
          error: `Minimum order amount of ₹${found.minOrderValue} required for this coupon (Cart: ₹${amount.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    // Compute discount
    let discountAmount = 0;
    if (found.discountType === 'FLAT') {
      discountAmount = Math.min(amount, found.discountValue);
    } else {
      discountAmount = (amount * found.discountValue) / 100;
      if (found.maxDiscount && discountAmount > found.maxDiscount) {
        discountAmount = found.maxDiscount;
      }
    }

    discountAmount = Number(discountAmount.toFixed(2));

    return NextResponse.json({
      valid: true,
      code: found.code,
      discountAmount,
      description: found.description,
      finalTotal: Math.max(0, Number((amount - discountAmount).toFixed(2))),
      message: `Coupon ${found.code} applied! You saved ₹${discountAmount}.`,
    });
  } catch (e: any) {
    console.error('Coupon validation error:', e);
    return NextResponse.json({ error: e.message || 'Failed to validate coupon' }, { status: 500 });
  }
}
