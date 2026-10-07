import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const audit=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/db',()=>({db:{whatsAppMessageAction:{create:audit}}}));
vi.mock('@/lib/whatsapp-config',()=>({WHATSAPP_API_VERSION:'v25.0'}));
import {dispatchTransactionalWhatsApp,formatCustomerOrderConfirmation} from '@/lib/whatsapp-transactional';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('WHATSAPP_API_TOKEN','');vi.stubEnv('WHATSAPP_ACCESS_TOKEN','test-token');vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID','test-number');audit.mockResolvedValue({});});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('WhatsApp order transport',()=>{
 it('uses the configured access token and an approved template without corrupting an international phone',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({messages:[{id:'provider-id'}]})));vi.stubGlobal('fetch',fetch);
  expect((await dispatchTransactionalWhatsApp('+44 7700 900123','Order ready',{name:'approved_order',language:'en',parameters:['123','READY']})).success).toBe(true);
  const [url,request]=fetch.mock.calls[0];expect(url).toContain('/v25.0/');expect(request.headers.Authorization).toBe('Bearer test-token');
  expect(JSON.parse(request.body)).toMatchObject({to:'447700900123',type:'template',template:{name:'approved_order',language:{code:'en'}}});
 });
 it('does not claim success when the provider returns 200 without a message id',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}')));
  expect((await dispatchTransactionalWhatsApp('919999999999','Order ready')).success).toBe(false);
 });
 it('describes an online pending order as received rather than merchant-confirmed',()=>{
  const message=formatCustomerOrderConfirmation({orderId:'o',orderNumber:'1',businessName:'Shop',customerName:'Customer',customerPhone:'919999999999',total:100,items:[],paymentStatus:'PAID',paymentMethod:'CASH',deliveryType:'pickup',status:'PENDING'}).messageText;
  expect(message).toContain('Order Received');expect(message).toContain('CASH');expect(message).not.toContain('Paid via UPI');expect(message).toContain('Pickup');
 });
});
