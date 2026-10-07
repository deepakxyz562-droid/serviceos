import { NextRequest,NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { db } from '@/lib/db';
import { atomicCommerce } from '@/lib/commerce/atomic';
import { orderAccessToken } from '@/lib/commerce/order-access';
import { dispatchTransactionalWhatsApp,formatCustomerOrderConfirmation,formatVendorNewOrderAlert,type TransactionalOrderPayload } from '@/lib/whatsapp-transactional';

export async function POST(req: NextRequest){
  if(!process.env.CRON_SECRET)return NextResponse.json({error:'Cron authentication must be configured'},{status:503});
  const auth=verifyCronAuth(req);if(!auth.ok)return auth.response;
  const jobs=await atomicCommerce<Array<{id:string;orderId:string;audience:'customer'|'vendor';leaseToken:string}>>('claim',[20]);
  let delivered=0;let failed=0;
  for(const job of jobs){
    try{
      const order=await db.gptformCommerceOrder.findUnique({where:{id:job.orderId}});
      if(!order)throw new Error('Order unavailable');
      if(order.status==='CANCELLED')continue;
      const business=await db.aiBusiness.findUnique({where:{id:order.businessId}});
      if(!business)throw new Error('Business unavailable');
      const tenant=business.tenantId?await db.tenant.findUnique({where:{id:business.tenantId},select:{slug:true,phone:true}}):null;
      const slug=tenant?.slug||business.id;const base=(process.env.NEXT_PUBLIC_APP_URL||'https://fieseros.com').replace(/\/$/,'');
      const payload:TransactionalOrderPayload={orderId:order.id,orderNumber:order.id.slice(-6).toUpperCase(),businessName:business.name,businessPhone:tenant?.phone||business.phone||'',customerName:order.customerName||'Guest',customerPhone:order.customerPhone,total:order.total,items:JSON.parse(order.itemsJson),paymentStatus:order.paymentStatus,status:order.status,storeSlug:slug,currency:business.currency,trackingUrl:`${base}/store/${slug}/order/${order.id}?token=${orderAccessToken(order.id,business.id)}`};
      const formatted=job.audience==='customer'?formatCustomerOrderConfirmation(payload):formatVendorNewOrderAlert(payload);
      const result=await dispatchTransactionalWhatsApp(job.audience==='customer'?order.customerPhone:payload.businessPhone||'',formatted.messageText);
      if(!result.success)throw new Error(result.error||'Message not delivered');
      await atomicCommerce('acknowledge',[job.id,'true','',job.leaseToken]);delivered++;
    }catch{
      await atomicCommerce('acknowledge',[job.id,'false','Message delivery failed; check configured gateway and recipient.',job.leaseToken]);failed++;
    }
  }
  return NextResponse.json({delivered,failed});
}
