import {beforeEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({items:vi.fn(),config:vi.fn(),business:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{inventoryItem:{findMany:mocks.items},gptformCommerceConfig:{findFirst:mocks.config}}}));
vi.mock('@/lib/quote-flow-session',()=>({requireQuoteFlowBusiness:mocks.business}));
vi.mock('@/lib/commerce/access',()=>({ownerBusiness:vi.fn()}));
vi.mock('@/lib/commerce/atomic',()=>({atomicCommerce:vi.fn(),commerceError:vi.fn()}));
import {GET} from '@/app/api/commerce/inventory/route';
describe('Products inventory quantities',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.business.mockResolvedValue({business:{id:'business',tenantId:'tenant'}});mocks.config.mockResolvedValue({catalogJson:JSON.stringify([{id:'rice',name:'Rice',price:100,sku:'RICE-1'},{id:'oil',name:'Oil',price:150}])});});
 it('keeps untracked products visible beside tracked products without inventing zero stock',async()=>{
  mocks.items.mockResolvedValue([{id:'inventory-rice',sku:'RICE-1',name:'Rice',salePrice:100,totalStock:12,availableStock:9,reorderLevel:10,isActive:true}]);
  const response=await GET(new NextRequest('https://example.test/api/commerce/inventory'));
  const data=await response.json();
  expect(data.items).toHaveLength(2);
  expect(data.items[0]).toMatchObject({id:'inventory-rice',productId:'rice',stock:9,totalStock:12,isLowStock:true});
  expect(data.items[1]).toMatchObject({productId:'oil',stock:null,totalStock:null,isLowStock:false});
  expect(data.lowStockCount).toBe(1);
  expect(mocks.items).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'tenant'}}));
 });
 it('keeps an empty inventory distinct from zero counted stock',async()=>{
  mocks.items.mockResolvedValue([]);
  const data=await (await GET(new NextRequest('https://example.test/api/commerce/inventory'))).json();
  expect(data.isFallback).toBe(true);expect(data.items.every((i:any)=>i.stock===null)).toBe(true);expect(data.lowStockCount).toBe(0);
 });
});
