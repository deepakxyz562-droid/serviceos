import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({auth:vi.fn(),user:vi.fn(),business:vi.fn(),create:vi.fn()}));
vi.mock('@/lib/quote-flow-session',()=>({getQuoteFlowUser:m.auth}));
vi.mock('@/lib/db',()=>({db:{user:{findUnique:m.user},aiBusiness:{findUnique:m.business,create:m.create}}}));
import {POST} from '@/app/api/gptform/bootstrap/route';
const request=()=>new Request('https://example.test/api/gptform/bootstrap',{method:'POST'});
describe('GPTForm merchant provisioning',()=>{
 beforeEach(()=>{vi.resetAllMocks();m.auth.mockResolvedValue({id:'owner',tenantId:'tenant'});m.user.mockResolvedValue({id:'owner',isActive:true,role:'owner',tenantId:'tenant',tenant:{name:'Test shop',country:'India',signupMode:'standalone'},workspace:{productType:'forms'}});m.business.mockResolvedValue(null);m.create.mockResolvedValue({id:'business',tenantId:'tenant'});});
 it('creates the correct currency business for a new merchant',async()=>{expect((await POST(request())).status).toBe(200);expect(m.create.mock.calls[0][0].data).toMatchObject({ownerId:'owner',tenantId:'tenant',currency:'INR',currencySymbol:'₹'});});
 it('does not create or convert a CRM workspace',async()=>{m.user.mockResolvedValue({id:'owner',isActive:true,role:'owner',workspace:{productType:'crm'},tenant:{signupMode:'standalone'}});const response=await POST(request());expect(response.status).toBe(409);expect((await response.json()).code).toBe('PRODUCT_MISMATCH');expect(m.create).not.toHaveBeenCalled();});
 it('does not create duplicate businesses on repeated startup',async()=>{m.business.mockResolvedValue({id:'existing',tenantId:'tenant'});expect((await POST(request())).status).toBe(200);expect(m.create).not.toHaveBeenCalled();});
 it('rejects a mismatched existing business',async()=>{m.business.mockResolvedValue({id:'other',tenantId:'other-tenant'});expect((await POST(request())).status).toBe(409);});
 it('rejects unauthenticated startup before touching business data',async()=>{m.auth.mockResolvedValue(null);expect((await POST(request())).status).toBe(401);expect(m.user).not.toHaveBeenCalled();});
});
