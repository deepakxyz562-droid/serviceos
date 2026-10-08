import { beforeEach, describe, expect, it, vi } from 'vitest';
import { subscriptionAllowsAccess, marketplaceRedirect } from '../shared/products';
const mocks = vi.hoisted(() => ({
 user: { findUnique: vi.fn() }, productMembership: { findMany: vi.fn() },
 productWorkspace: { findUnique: vi.fn() }, tenant: { findUnique: vi.fn() }, productSubscription: { findUnique: vi.fn() },
}));
vi.mock('@/lib/db',()=>({ db:mocks }));
vi.mock('@/lib/supabase-db',()=>({ getAdminClient: vi.fn(),shouldUseSupabaseDB:()=>false }));
import { requireProductAccess, resolveProductAccess } from '@/lib/product-access';
beforeEach(()=>{
 vi.resetAllMocks();
 mocks.user.findUnique.mockResolvedValue({ isActive:true,emailVerified:true });
 mocks.productMembership.findMany.mockResolvedValue([{workspaceId:'w',role:'owner'}]);
 mocks.productWorkspace.findUnique.mockResolvedValue({workspaceId:'w',tenantId:'t',product:'bos',status:'active',onboardingCompleted:true});
 mocks.tenant.findUnique.mockResolvedValue({planStatus:'active',suspendedAt:null});
 mocks.productSubscription.findUnique.mockResolvedValue({status:'active',billingSource:'product'});
});
describe('product access isolation',()=>{
 it('allows an active member',async()=>expect((await requireProductAccess('u','bos')).workspace.workspaceId).toBe('w'));
 it('rejects a different product',async()=>expect(requireProductAccess('u','chatbotly')).rejects.toMatchObject({code:'PRODUCT_MEMBERSHIP_REQUIRED'}));
 it('does not authorize arbitrary workspace selection',async()=>{
 mocks.productMembership.findMany.mockResolvedValue([]);
 await expect(requireProductAccess('u','bos','other')).rejects.toMatchObject({code:'PRODUCT_MEMBERSHIP_REQUIRED'});
 expect(mocks.productMembership.findMany).toHaveBeenCalledWith({where:{userId:'u',status:'active',workspaceId:'other'}});
 });
 it('blocks a suspended tenant',async()=>{
 mocks.tenant.findUnique.mockResolvedValue({suspendedAt:new Date()});
 await expect(requireProductAccess('u','bos')).rejects.toMatchObject({code:'TENANT_UNAVAILABLE'});
 });
 it('requires product-specific onboarding',async()=>{
 mocks.productWorkspace.findUnique.mockResolvedValue({workspaceId:'w',product:'bos',status:'active',onboardingCompleted:false});
 await expect(requireProductAccess('u','bos')).rejects.toMatchObject({code:'PRODUCT_ONBOARDING_REQUIRED'});
 });
 it('checks current legacy billing, not the migration snapshot',async()=>{
 mocks.productSubscription.findUnique.mockResolvedValue({status:'active',billingSource:'legacy'});
 mocks.tenant.findUnique.mockResolvedValue({planStatus:'expired'});
 expect((await resolveProductAccess('u','bos')).allowed).toBe(false);
 await expect(requireProductAccess('u','bos')).rejects.toMatchObject({status:402});
 });
 it('fails closed on database failure',async()=>{
 mocks.productMembership.findMany.mockRejectedValue(new Error('offline'));
 await expect(requireProductAccess('u','bos')).rejects.toThrow('offline');
 });
});
it('enforces trial and paid-period expiry',()=>{
 expect(subscriptionAllowsAccess({status:'trial',trialEndsAt:new Date(100)},100)).toBe(false);
 expect(subscriptionAllowsAccess({status:'trial'},100)).toBe(false);
 expect(subscriptionAllowsAccess({status:'active',currentPeriodEnd:new Date(101)},100)).toBe(true);
 expect(subscriptionAllowsAccess({status:'cancelled'},100)).toBe(false);
});
it('maps provider entry and public paths without losing query parameters',()=>{
 expect(marketplaceRedirect('/login','?redirect=jobs')).toBe('https://fieseros.com/marketplace/dashboard?redirect=jobs');
 expect(marketplaceRedirect('/acme')).toBe('https://fieseros.com/marketplace/acme');
 expect(marketplaceRedirect('/marketplace/acme')).toBe('https://fieseros.com/marketplace/acme');
});
