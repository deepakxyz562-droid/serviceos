import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createCommerceOrder } from '@/lib/commerce/order-service';
import { commerceError } from '@/lib/commerce/atomic';
import { apiLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { orderAccessToken, verifyOrderAccess } from '@/lib/commerce/order-access';

export const runtime = 'nodejs';
export async function POST(req: Request) {
  const limited = applyRateLimit(apiLimiter, req);
  if (limited) return rateLimitResponse(limited.resetAtMs);
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.businessId !== 'string') return NextResponse.json({ error: 'Invalid store order' }, { status: 400 });
    let business = await db.aiBusiness.findUnique({ where: { id: body.businessId } });
    if (!business) {
      const tenant = await db.tenant.findFirst({ where: { OR: [{ id: body.businessId }, { slug: body.businessId }] } });
      if (tenant) business = await db.aiBusiness.findFirst({ where: { tenantId: tenant.id } });
    }
    if (!business) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    // Check signing configuration before committing a guest order.
    orderAccessToken('configuration-check',business.id);
    const result = await createCommerceOrder(business, body, req.headers.get('Idempotency-Key') || body.requestKey || '', true);
    const token=orderAccessToken(result.order.id,business.id);
    const tenant=business.tenantId?await db.tenant.findUnique({where:{id:business.tenantId},select:{slug:true}}):null;
    return NextResponse.json({ ...result, orderId: result.order.id, trackingToken:token, trackingUrl:`/store/${encodeURIComponent(tenant?.slug||business.id)}/order/${result.order.id}?token=${encodeURIComponent(token)}` }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    const failure = commerceError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

export async function GET(req: Request) {
 try {
  const url=new URL(req.url);const id=url.searchParams.get('orderId')||'';
  const access=verifyOrderAccess(url.searchParams.get('token'),id);
  if(!access)return NextResponse.json({error:'Order access denied'},{status:403});
  const order=await db.gptformCommerceOrder.findFirst({where:{id,businessId:access.businessId}});
  if(!order)return NextResponse.json({error:'Order not found'},{status:404});
  const business=await db.aiBusiness.findUnique({where:{id:access.businessId}});
  const queueCount=await db.gptformCommerceOrder.count({where:{businessId:access.businessId,createdAt:{lt:order.createdAt},status:{in:['PENDING','CONFIRMED','PREPARING']}}});
  return NextResponse.json({order:{id:order.id,orderNumber:order.id.slice(-6).toUpperCase(),status:order.status,paymentStatus:order.paymentStatus,paymentMethod:order.paymentMethod,total:order.total,deliveryType:order.deliveryType,deliveryAddress:order.deliveryAddress,createdAt:order.createdAt,items:JSON.parse(order.itemsJson),businessName:business?.name||'',businessPhone:business?.phone||''},queue:{ordersAhead:queueCount,estimatedWaitMinutes:null}}, {headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Could not load the order.'},{status:503});}
}
export async function PATCH(req: Request) {
 try {
 const limited=applyRateLimit(apiLimiter,req);if(limited)return rateLimitResponse(limited.resetAtMs);
  const body=await req.json().catch(()=>null);
  const access=verifyOrderAccess(body?.trackingToken,body?.orderId);
  if(!access)return NextResponse.json({error:'Order access denied'},{status:403});
  if(body.paymentStatus==='PAID'||body.paymentStatus==='REFUNDED')return NextResponse.json({error:'Payments must be verified by the business.'},{status:400});
  if(body.utrNumber && !/^[a-zA-Z0-9-]{6,40}$/.test(body.utrNumber))return NextResponse.json({error:'Invalid payment reference'},{status:400});
  const changed=await db.gptformCommerceOrder.updateMany({where:{id:body.orderId,businessId:access.businessId,paymentStatus:{in:['UNPAID','PARTIAL','DETECTION_PENDING']}},data:{paymentStatus:'DETECTION_PENDING',paymentMethod:'UPI',...(body.utrNumber?{paymentRef:body.utrNumber}:{})}});
  if(!changed.count)return NextResponse.json({error:'This payment cannot be changed.'},{status:409});
  return NextResponse.json({success:true,paymentStatus:'DETECTION_PENDING'});
 }catch{return NextResponse.json({error:'Payment reference was not saved.'},{status:503});}
}
