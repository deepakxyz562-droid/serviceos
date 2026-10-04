import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * POST /api/commerce/orders/match-payment
 * Auto-matches incoming UPI payment notification with an order
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { orderId, amount, utr, appSource, autoConfirm = false } = body;

    const parsedAmount = Number(amount);
    if (!orderId && (!parsedAmount || isNaN(parsedAmount))) {
      return NextResponse.json(
        { error: 'orderId or a valid payment amount is required' },
        { status: 400 }
      );
    }

    let targetOrder: any = null;

    if (orderId) {
      targetOrder = await db.gptformCommerceOrder.findFirst({
        where: {
          id: orderId,
          businessId: business.id,
        },
      });
    }

    // If orderId was not provided, look for the most recent matching unpaid/detection-pending order
    if (!targetOrder && parsedAmount) {
      const fifteenMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const candidates = await db.gptformCommerceOrder.findMany({
        where: {
          businessId: business.id,
          paymentStatus: { in: ['UNPAID', 'DETECTION_PENDING'] },
          createdAt: { gte: fifteenMinutesAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Find candidate matching amount within 0.50
      targetOrder = candidates.find(
        (o) => Math.abs(o.total - parsedAmount) <= 0.5
      ) || null;
    }

    if (!targetOrder) {
      return NextResponse.json(
        {
          matched: false,
          message: 'No open order matching the amount or ID found within the last 30 minutes',
        },
        { status: 404 }
      );
    }

    const cleanUtr = utr ? String(utr).trim() : targetOrder.paymentRef || null;
    const cleanAppSource = appSource ? String(appSource).trim() : 'UPI';
    const nextPaymentStatus = autoConfirm ? 'PAID' : 'MATCHED';

    let updatedNotes = targetOrder.notes || '';
    const matchTag = `[Auto-Matched via ${cleanAppSource}: ₹${parsedAmount || targetOrder.total}${cleanUtr ? ` Ref:${cleanUtr}` : ''}]`;
    if (!updatedNotes.includes(matchTag)) {
      updatedNotes = updatedNotes ? `${updatedNotes} • ${matchTag}` : matchTag;
    }

    const updated = await db.gptformCommerceOrder.update({
      where: { id: targetOrder.id },
      data: {
        paymentStatus: nextPaymentStatus,
        paymentMethod: `UPI (${cleanAppSource})`,
        paymentRef: cleanUtr,
        notes: updatedNotes,
        // If confirmed, and status is PENDING, advance status to CONFIRMED
        ...(autoConfirm && targetOrder.status === 'PENDING' ? { status: 'CONFIRMED' } : {}),
      },
    });

    return NextResponse.json({
      matched: true,
      autoConfirmed: autoConfirm,
      order: {
        id: updated.id,
        orderNumber: updated.id.slice(-6).toUpperCase(),
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        paymentMethod: updated.paymentMethod,
        paymentRef: updated.paymentRef,
        total: updated.total,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to match UPI payment:', e);
    return NextResponse.json({ error: e.message || 'Payment match failed' }, { status: 500 });
  }
}
