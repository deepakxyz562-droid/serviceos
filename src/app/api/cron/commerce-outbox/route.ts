import { NextRequest,NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { db } from '@/lib/db';
import { resolveOrderMessagingConfig } from '@/lib/commerce/order-messaging-config';
import { atomicCommerce } from '@/lib/commerce/atomic';
import { sendWebPushToUser } from '@/lib/web-push-send';
import { orderAccessToken } from '@/lib/commerce/order-access';
import { dispatchTransactionalWhatsApp,formatCustomerOrderConfirmation,formatCustomerStatusUpdate,formatVendorNewOrderAlert,type TransactionalOrderPayload } from '@/lib/whatsapp-transactional';

export async function POST(req: NextRequest){
  if(!process.env.CRON_SECRET)return NextResponse.json({error:'Cron authentication must be configured'},{status:503});
  const auth=verifyCronAuth(req);if(!auth.ok)return auth.response;
  const jobs=await atomicCommerce<Array<{id:string;orderId:string;audience:'customer'|'vendor'|'owner';event:string;eventStatus:string;leaseToken:string}>>('claim',[5]);
  let delivered=0;let failed=0;
  for(const job of jobs){
    try{
      const order=await db.gptformCommerceOrder.findUnique({where:{id:job.orderId}});
      if(!order)throw new Error('Order unavailable');

      const business=await db.aiBusiness.findUnique({where:{id:order.businessId}});
      if(!business)throw new Error('Business unavailable');
      if(job.audience==='owner') {
        const id=`order-alert:${order.id}`;
        const title=`New order #${order.id.slice(-6).toUpperCase()}`;
        const message=`${order.customerName||'Customer'} placed an order at ${business.name}.`;
        const notification=await db.appNotification.upsert({where:{id},update:{},create:{id,tenantId:business.tenantId||business.id,recipientId:business.ownerId,type:'commerce_order',category:'commerce',title,message,actionUrl:'/?view=commerce',priority:'high',metadataJson:JSON.stringify({orderId:order.id,route:'/(tabs)/orders'})}});
        if(!notification.pushSent){
          const push=await sendWebPushToUser(business.ownerId,business.tenantId,{title,body:message,url:'/?view=commerce',tag:id,requireInteraction:true,data:{orderId:order.id,route:'/(tabs)/orders'}});
          if(push.failed>0)throw new Error('Push delivery failed');
          if(push.sent>0)await db.appNotification.update({where:{id},data:{pushSent:true,pushSentAt:new Date()}});
        }
        await atomicCommerce('acknowledge',[job.id,'true','',job.leaseToken]);delivered++;continue;
      }
      const tenant=business.tenantId?await db.tenant.findUnique({where:{id:business.tenantId},select:{slug:true,phone:true}}):null;
      const slug=tenant?.slug||business.id;const base=(process.env.NEXT_PUBLIC_APP_URL||'https://fieseros.com').replace(/\/$/,'');
      const payload:TransactionalOrderPayload={orderId:order.id,orderNumber:order.id.slice(-6).toUpperCase(),businessName:business.name,businessPhone:tenant?.phone||business.phone||'',customerName:order.customerName||'Guest',customerPhone:order.customerPhone,total:order.total,items:JSON.parse(order.itemsJson),paymentStatus:order.paymentStatus,status:job.eventStatus||order.status,deliveryType:order.deliveryType||undefined,deliveryAddress:order.deliveryAddress||undefined,paymentMethod:order.paymentMethod||undefined,storeSlug:slug,currency:business.currency,trackingUrl:`${base}/store/${slug}/order/${order.id}?token=${orderAccessToken(order.id,business.id)}`};
      const formatted=job.audience==='vendor'?formatVendorNewOrderAlert(payload):job.event==='CREATED'?formatCustomerOrderConfirmation(payload):formatCustomerStatusUpdate(payload,job.eventStatus||job.event);
      // Scheduled updates cannot assume an open WhatsApp customer-service window.
      const provider=await resolveOrderMessagingConfig(business.tenantId);
      const templateName=job.audience==='vendor'?provider.vendorTemplate:provider.customerTemplate;
      if(!templateName)throw new Error('Approved order notification template not configured');
      const parameters=job.audience==='vendor'
        ? [payload.businessName,payload.orderNumber,payload.customerName,String(payload.total),payload.currency||'INR',`${base}/?view=commerce`]
        : [payload.customerName,payload.businessName,payload.orderNumber,payload.status,payload.trackingUrl!];
      const result=await dispatchTransactionalWhatsApp(job.audience==='customer'?order.customerPhone:payload.businessPhone||'',formatted.messageText,{name:templateName,language:provider.language,parameters},provider);
      if(!result.success)throw new Error(result.error||'Message not delivered');
      await atomicCommerce('acknowledge',[job.id,'true','',job.leaseToken]);delivered++;
    }catch(error){
      const reason=error instanceof Error && error.message==='Approved order notification template not configured' ? error.message : 'Message delivery failed; check configured gateway and recipient.';
      await atomicCommerce('acknowledge',[job.id,'false',reason,job.leaseToken]);failed++;
    }
  }
  return NextResponse.json({delivered,failed});
}
