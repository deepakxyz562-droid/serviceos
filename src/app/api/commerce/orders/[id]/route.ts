/**
 * Commerce order detail API — GET + PATCH (update status / mark paid)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { id } = await params;

    const order = await db.gptformCommerceOrder.findFirst({
      where: { id, businessId: business.id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let conversation = null;
    if (order.conversationId) {
      const conv = await db.gptformConversationState.findUnique({
        where: { id: order.conversationId },
      });
      if (conv) {
        conversation = {
          messages: JSON.parse(conv.messagesJson || '[]'),
          collectedFields: JSON.parse(conv.collectedFields || '{}'),
        };
      }
    }

    return NextResponse.json({
      order: {
        ...order,
        items: JSON.parse(order.itemsJson || '[]'),
      },
      conversation,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { id } = await params;
    const body = await req.json();

    const order = await db.gptformCommerceOrder.findFirst({
      where: { id, businessId: business.id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updated = await db.gptformCommerceOrder.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.paymentStatus ? { paymentStatus: body.paymentStatus } : {}),
        ...(body.paymentRef !== undefined ? { paymentRef: body.paymentRef } : {}),
        ...(body.paymentMethod ? { paymentMethod: body.paymentMethod } : {}),
        ...(body.customerName !== undefined ? { customerName: body.customerName } : {}),
        ...(body.deliveryAddress !== undefined ? { deliveryAddress: body.deliveryAddress } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    return NextResponse.json({ order: updated });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
