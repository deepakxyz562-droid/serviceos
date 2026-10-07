/**
 * Commerce order detail API — GET + PATCH (update status / mark paid)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { atomicCommerce, commerceError } from '@/lib/commerce/atomic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const business = await ownerBusiness(req);
    const { id } = await params;

    const order = await db.gptformCommerceOrder.findFirst({
      where: { id, businessId: business.id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let conversation: { messages: any; collectedFields: any } | null = null;
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
    if(e.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
    const failure=commerceError(e);
    return NextResponse.json({error:failure.message},{status:failure.status});
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const business = await ownerBusiness(req);
    const { id } = await params;
    const body = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({error:'Invalid order update'},{status:400});
    const clean: Record<string,string|null> = {};
    const limits: Record<string,number> = {status:30,paymentStatus:30,paymentMethod:40,paymentRef:100,customerName:200,deliveryAddress:1000,notes:2000};
    for (const [field,limit] of Object.entries(limits)) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== 'string' && body[field] !== null) return NextResponse.json({error:'Invalid order update'},{status:400});
      if (body[field] === null && ['status','paymentStatus','paymentMethod'].includes(field)) return NextResponse.json({error:'Invalid order update'},{status:400});
      clean[field] = body[field] === null ? null : body[field].slice(0,limit);
    }
    const result = await atomicCommerce('updateOrder',[business.id,id,clean]);
    return NextResponse.json(result);

  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if(e.message==='FORBIDDEN')return NextResponse.json({error:'Forbidden'},{status:403});
    const failure=commerceError(e);
    return NextResponse.json({error:failure.message},{status:failure.status});
  }
}
