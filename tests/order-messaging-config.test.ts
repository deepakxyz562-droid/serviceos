import {beforeEach,describe,it,expect,vi} from 'vitest';
const findMany=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/db',()=>({db:{communicationProvider:{findMany}}}));
import {resolveOrderMessagingConfig} from '@/lib/commerce/order-messaging-config';
const provider={provider:'meta_cloud_api',status:'active',sendingEnabled:true,configJson:JSON.stringify({accessToken:'db-token',phoneNumberId:'db-phone',orderCustomerTemplate:'order_update'}),credential:null};
beforeEach(()=>vi.clearAllMocks());
describe('order WhatsApp provider selection',()=>{
 it('uses the Superadmin platform provider when the merchant has no private provider',async()=>{
  findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([provider]);
  expect(await resolveOrderMessagingConfig('tenant')).toMatchObject({source:'platform',accessToken:'db-token',customerTemplate:'order_update'});
  expect(findMany.mock.calls[0][0].where).toEqual({type:'whatsapp',tenantId:'tenant',isPlatform:false});
  expect(findMany.mock.calls[1][0].where).toEqual({type:'whatsapp',isPlatform:true,status:'active',sendingEnabled:true});
 });
 it('keeps a merchant private sender instead of taking another tenant credentials',async()=>{
  findMany.mockResolvedValueOnce([provider]);expect((await resolveOrderMessagingConfig('tenant')).source).toBe('tenant');expect(findMany).toHaveBeenCalledTimes(1);
 });
 it('does not fall through to platform or env when a private connection is disabled',async()=>{
  findMany.mockResolvedValueOnce([{...provider,status:'inactive'}]);await expect(resolveOrderMessagingConfig('tenant')).rejects.toThrow('ORDER_WHATSAPP_PROVIDER_UNAVAILABLE');expect(findMany).toHaveBeenCalledTimes(1);
 });
 it('does not silently replace an unsupported selected provider',async()=>{
  findMany.mockResolvedValueOnce([{...provider,provider:'twilio'}]);await expect(resolveOrderMessagingConfig('tenant')).rejects.toThrow('ORDER_WHATSAPP_PROVIDER_UNSUPPORTED');
 });
});
