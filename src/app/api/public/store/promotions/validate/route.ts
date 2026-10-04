import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/public/store/promotions/validate
 * Public coupon validation at checkout.
 *
 * Phase 2 migration: reads from the real `Promotion` Prisma model (no more
 * `fieldsJson.promotions[]` JSON blob, no more hardcoded WELCOME50/FESTIVE15
 * fallback). Atomically increments `usedCount` on successful validation.
 * Optionally records a `Coupon` row to track per-customer redemption (only
 * when `customerId` is provided in the request body — typically for logged-in
 * customers).
 *
 * Response shape is unchanged for mobile compatibility:
 *   { valid, code, discountAmount, description, finalTotal, message }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessSlug, code, cartTotal = 0, customerId } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Please enter a coupon code' }, { status: 400 });
    }

    const cleanCode = String(code).toUpperCase().replace(/\s+/g, '');
    const amount = Number(cartTotal) || 0;

    // Resolve business. AiBusiness has no `slug` field — the storefront
    // passes either the Tenant.slug (resolved via Tenant lookup) or the raw
    // businessId. We try both paths so the public validate endpoint keeps
    // working for both URL formats.
    let business = await db.aiBusiness.findFirst({
      where: { id: businessSlug },
    });
    if (!business && businessSlug) {
      const tenant = await db.tenant.findUnique({
        where: { slug: businessSlug },
        select: { id: true },
      });
      if (tenant) {
        business = await db.aiBusiness.findFirst({
          where: { tenantId: tenant.id },
        });
      }
    }

    if (!business) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const tenantId = business.tenantId || business.id;

    // Real DB lookup — no JSON blob, no hardcoded fallback.
    const found = await db.promotion.findFirst({
      where: { code: cleanCode, isActive: true },
    });

    if (!found) {
      return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 });
    }

    // Cross-tenant guard: a coupon is owned by a tenant; only allow it to be
    // redeemed against stores owned by the same tenant (or unscoped coupons).
    if (found.tenantId && found.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 });
    }

    // Expiry check
    if (found.endDate && new Date(found.endDate) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    // Minimum spend check
    if (found.minSpend && amount < found.minSpend) {
      return NextResponse.json(
        {
          error: `Minimum order amount of ₹${found.minSpend} required for this coupon (Cart: ₹${amount.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Usage limit check (null = unlimited)
    if (found.usageLimit !== null && found.usageLimit !== undefined && found.usedCount >= found.usageLimit) {
      return NextResponse.json(
        { error: 'This coupon has reached its usage limit' },
        { status: 400 }
      );
    }

    // Per-customer limit (only when customerId provided)
    if (found.perCustomerLimit > 0 && customerId) {
      const usedByCustomer = await db.coupon.count({
        where: {
          promotionId: found.id,
          customerId: String(customerId),
          status: 'used',
        },
      });
      if (usedByCustomer >= found.perCustomerLimit) {
        return NextResponse.json(
          {
            error: `Coupon usage limit (${found.perCustomerLimit} per customer) reached`,
          },
          { status: 400 }
        );
      }
    }

    // Compute discount
    const isPercent = found.type === 'percentage';
    let discountAmount = 0;
    if (isPercent) {
      discountAmount = (amount * found.value) / 100;
      if (found.maxDiscount && discountAmount > found.maxDiscount) {
        discountAmount = found.maxDiscount;
      }
    } else {
      // 'fixed' (and 'free_service' — treat as fixed monetary discount)
      discountAmount = Math.min(amount, found.value);
    }
    discountAmount = Number(discountAmount.toFixed(2));
    const finalTotal = Math.max(0, Number((amount - discountAmount).toFixed(2)));

    // Atomic increment of usedCount. Wrap in try/catch — if it fails (e.g.
    // a concurrent redemption just bumped us over usageLimit), we still
    // return the discount because the coupon was valid at validation time.
    // The order placement flow re-checks limits atomically before finalising.
    try {
      await db.promotion.update({
        where: { id: found.id },
        data: { usedCount: { increment: 1 } },
      });
    } catch (incErr) {
      console.warn('Coupon usedCount increment failed (non-fatal):', incErr);
    }

    // Optional per-customer redemption record. Only created when the caller
    // supplies a customerId (the storefront checkout doesn't always have
    // one — anonymous guest checkout is supported).
    if (customerId) {
      try {
        await db.coupon.create({
          data: {
            tenantId,
            customerId: String(customerId),
            promotionId: found.id,
            code: found.code || cleanCode,
            discountType: isPercent ? 'percentage' : 'fixed',
            discountValue: discountAmount,
            status: 'used',
            usedAt: new Date(),
          },
        });
      } catch (couponErr) {
        // Don't fail validation if the audit row can't be written.
        console.warn('Coupon redemption row creation failed (non-fatal):', couponErr);
      }
    }

    return NextResponse.json({
      valid: true,
      code: found.code || cleanCode,
      discountAmount,
      description: found.description || `${isPercent ? `${found.value}%` : `₹${found.value}`} OFF`,
      finalTotal,
      message: `Coupon ${found.code} applied! You saved ₹${discountAmount}.`,
    });
  } catch (e: any) {
    console.error('Coupon validation error:', e);
    return NextResponse.json({ error: e.message || 'Failed to validate coupon' }, { status: 500 });
  }
}
