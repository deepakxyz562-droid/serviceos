import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const m=vi.hoisted(()=>({atomic:vi.fn(),dispatch:vi.fn(),order:vi.fn(),business:vi.fn(),tenant:vi.fn(),upsert:vi.fn(),update:vi.fn(),push:vi.fn(),config:vi.fn()}));
vi.mock('@/lib/commerce/order-messaging-config',()=>({resolveOrderMessagingConfig:m.config}));
vi.mock('@/lib/commerce/atomic',()=>({atomicCommerce:m.atomic}));
vi.mock('@/lib/cron-auth',()=>({verifyCronAuth:()=>({ok:true})}));
vi.mock('@/lib/commerce/order-access',()=>({orderAccessToken:()=> 'signed-test-token'}));
vi.mock('@/lib/web-push-send',()=>({sendWebPushToUser:m.push}));
vi.mock('@/lib/db',()=>({db:{gptformCommerceOrder:{findUnique:m.order},aiBusiness:{findUnique:m.business},tenant:{findUnique:m.tenant},appNotification:{upsert:m.upsert,update:m.update}}}));
vi.mock('@/lib/whatsapp-transactional',()=>({dispatchTransactionalWhatsApp:m.dispatch,formatCustomerOrderConfirmation:()=>({messageText:'received'}),formatCustomerStatusUpdate:(_:unknown,status:string)=>({messageText:status}),formatVendorNewOrderAlert:()=>({messageText:'vendor'})}));
import {POST} from '@/app/api/cron/commerce-outbox/route';
const run=()=>POST(new NextRequest('https://example.test/api/cron/commerce-outbox',{method:'POST'}));
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('CRON_SECRET','test-secret');vi.stubEnv('WHATSAPP_ORDER_CUSTOMER_TEMPLATE','order_update');vi.stubEnv('WHATSAPP_ORDER_VENDOR_TEMPLATE','vendor_order');
 m.config.mockResolvedValue({accessToken:'test',phoneNumberId:'phone',customerTemplate:'order_update',vendorTemplate:'vendor_order',language:'en'});
 m.order.mockResolvedValue({id:'order-123',businessId:'business',status:'DELIVERED',customerName:'Customer',customerPhone:'919999999999',itemsJson:'[]',total:100,paymentStatus:'PAID',paymentMethod:'CASH'});
 m.business.mockResolvedValue({id:'business',ownerId:'owner',tenantId:'tenant',name:'Shop',currency:'INR'});m.tenant.mockResolvedValue({slug:'shop',phone:'918888888888'});
 m.dispatch.mockResolvedValue({success:true});m.push.mockResolvedValue({sent:1,failed:0});m.upsert.mockResolvedValue({pushSent:false});m.update.mockResolvedValue({});m.atomic.mockResolvedValue({updated:1});
});
describe('order notification worker',()=>{
 it('sends the queued status, even when the order has since progressed',async()=>{
  m.atomic.mockResolvedValueOnce([{id:'job',orderId:'order-123',audience:'customer',event:'PREPARING',eventStatus:'PREPARING',leaseToken:'lease'}]);
  expect(await (await run()).json()).toEqual({delivered:1,failed:0});
  expect(m.dispatch).toHaveBeenCalledWith('919999999999','PREPARING',expect.objectContaining({name:'order_update',parameters:expect.arrayContaining(['PREPARING'])}),expect.objectContaining({accessToken:'test'}));
  expect(m.atomic).toHaveBeenLastCalledWith('acknowledge',['job','true','','lease']);
 });
 it('delivers the owner app/push alert when vendor WhatsApp fails',async()=>{
  m.atomic.mockResolvedValueOnce([{id:'wa',orderId:'order-123',audience:'vendor',event:'CREATED',leaseToken:'one'},{id:'app',orderId:'order-123',audience:'owner',event:'CREATED',leaseToken:'two'}]);m.dispatch.mockResolvedValue({success:false});
  expect(await (await run()).json()).toEqual({delivered:1,failed:1});
  expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({where:{id:'order-alert:order-123'}}));
  expect(m.push).toHaveBeenCalledWith('owner','tenant',expect.objectContaining({data:{orderId:'order-123',route:'/(tabs)/orders'}}));
 });
 it('does not discard cancellation events or repeatedly send an earlier notification',async()=>{
  m.order.mockResolvedValue({...await m.order(),status:'CANCELLED'});
  m.atomic.mockResolvedValueOnce([{id:'cancel',orderId:'order-123',audience:'customer',event:'CANCELLED',eventStatus:'CANCELLED',leaseToken:'cancel-lease'}]);
  expect(await (await run()).json()).toEqual({delivered:1,failed:0});expect(m.dispatch).toHaveBeenCalledWith(expect.any(String),'CANCELLED',expect.any(Object),expect.any(Object));
 });
 it('retries a configuration failure rather than reporting delivery',async()=>{
  m.config.mockResolvedValue({customerTemplate:undefined});m.atomic.mockResolvedValueOnce([{id:'job',orderId:'order-123',audience:'customer',event:'CREATED',eventStatus:'PENDING',leaseToken:'lease'}]);
  expect(await (await run()).json()).toEqual({delivered:0,failed:1});expect(m.dispatch).not.toHaveBeenCalled();
  expect(m.atomic).toHaveBeenLastCalledWith('acknowledge',['job','false','Approved order notification template not configured','lease']);
 });
});
