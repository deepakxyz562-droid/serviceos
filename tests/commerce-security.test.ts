import {afterEach,describe,expect,it,vi} from 'vitest';
import {orderAccessToken,verifyOrderAccess} from '@/lib/commerce/order-access';
import {priceOrder} from '@/lib/commerce/pricing';
import {moneyMinor,RequestTracker} from '../shared/money';
afterEach(()=>vi.unstubAllEnvs());
describe('guest order access',()=>{
 it('requires an unexpired signature for the exact order',()=>{
  vi.stubEnv('PUBLIC_ORDER_TOKEN_SECRET','test-secret-with-at-least-thirty-two-characters');
  const token=orderAccessToken('order-a','business-a',1000);
  expect(verifyOrderAccess(token,'order-a',2000)).toEqual({businessId:'business-a'});
  expect(verifyOrderAccess(token,'order-b',2000)).toBeNull();
  expect(verifyOrderAccess(token+'tampered','order-a',2000)).toBeNull();
  expect(verifyOrderAccess(token,'order-a',1000+31*86400000)).toBeNull();
 });
 it('fails closed without a strong signing secret',()=>{
  vi.stubEnv('PUBLIC_ORDER_TOKEN_SECRET','short');vi.stubEnv('JWT_SECRET','short');
  expect(()=>orderAccessToken('order','business')).toThrow('COMMERCE_UNAVAILABLE');
 });
});
describe('server checkout pricing',()=>{
 const config={catalogJson:JSON.stringify([{id:'rice',name:'Rice',price:99.95},{id:'hidden',name:'Hidden',price:1,isActive:false}]),fieldsJson:JSON.stringify({billing:{taxRate:5,serviceChargeRate:2}})};
 it('uses configured prices and rounds taxes in minor units',()=>{
  const quote=priceOrder(config,[{productId:'rice',qty:2,price:0.01,amount:0.02}],true);
  expect(quote).toMatchObject({subtotalMinor:19990,taxMinor:1000,serviceMinor:400,totalMinor:21390});
 });
 it('rejects unknown products, public name-only items and fractional quantities',()=>{
  expect(()=>priceOrder(config,[{productId:'hidden',qty:1}],true)).toThrow('PRODUCT_UNAVAILABLE');
  expect(()=>priceOrder(config,[{name:'Rice',qty:1}],true)).toThrow('PRODUCT_UNAVAILABLE');
  expect(()=>priceOrder(config,[{productId:'rice',qty:0.5}],true)).toThrow('INVALID_QUANTITY');
 });
 it('includes service charge with inclusive tax and caps the discount',()=>{
  const quote=priceOrder({...config,fieldsJson:JSON.stringify({billing:{taxRate:5,taxType:'inclusive',serviceChargeRate:2}})},[{productId:'rice',qty:2}],true,{id:'offer',type:'percentage',value:10,minSpend:0,maxDiscount:5});
  expect(quote).toMatchObject({discountMinor:500,taxMinor:0,serviceMinor:390,totalMinor:19880});
 });
 it('rejects fractional paise and preserves the request key across retries',()=>{
  expect(()=>moneyMinor(12.345)).toThrow('INVALID_AMOUNT');
  const tracker=new RequestTracker();const key=tracker.for({amount:12});
  expect(tracker.for({amount:12})).toBe(key);
  expect(tracker.for({amount:13})).not.toBe(key);
 });
});
