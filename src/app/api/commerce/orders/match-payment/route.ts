import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';

/**
 * POST /api/commerce/orders/match-payment
 * Auto-matches incoming UPI payment notification with an order
 */
export async function POST(req: NextRequest) {
  try {
    const business = await ownerBusiness(req);
    const body = await req.json();
    const { orderId, amount, utr, appSource, autoConfirm = false } = body;

    if(autoConfirm) return NextResponse.json({error:'A device notification cannot verify a bank receipt. Confirm the receipt using the order payment action.'},{status:400});
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
        (o) => Math.abs(o.total - parsedAmount) < 0.005
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

    return NextResponse.json({matched:true,autoConfirmed:false,requiresVerification:true,order:{id:targetOrder.id,orderNumber:targetOrder.id.slice(-6).toUpperCase(),status:targetOrder.status,paymentStatus:targetOrder.paymentStatus,total:targetOrder.total}});

  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS' || e.message==='FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: e.message==='FORBIDDEN'?403:401 });
    }
    console.error('Failed to match UPI payment:', e);
    return NextResponse.json({ error: 'Payment match failed' }, { status: 500 });
  }
}
