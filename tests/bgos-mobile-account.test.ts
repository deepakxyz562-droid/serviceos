import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ findUnique: vi.fn(), resolve: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: m.findUnique } } }));
vi.mock('@/lib/product-access', () => ({ resolveProductAccess: m.resolve, ProductAccessError: class extends Error { constructor(public code: string, public status = 403) { super(code); } } }));
import { resolveBgosMobileAccount } from '@/lib/bgos-mobile-account';
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('PRODUCT_WORKSPACES_ENABLED', 'true');
  m.findUnique.mockResolvedValue({ id: 'u', isActive: true, emailVerified: true, role: 'owner', tenantId: 'bos-tenant', workspaceId: 'bos', workspace: { id: 'bos', productType: 'bos' } });
  m.resolve.mockResolvedValue({ workspace: { workspaceId: 'bgos', tenantId: 'growth-tenant', onboardingCompleted: true }, membership: { role: 'admin' } });
});
it('selects BGOS membership instead of the default BOS workspace', async () => {
  const account = await resolveBgosMobileAccount('u');
  expect(account.user).toMatchObject({ tenantId: 'growth-tenant', workspaceId: 'bgos', role: 'admin' });
  expect(account.workspace.productType).toBe('bgos');
});
it('checks membership for an explicitly selected workspace', async () => {
  await resolveBgosMobileAccount('u', 'selected');
  expect(m.resolve).toHaveBeenCalledWith('u', 'bgos', 'selected');
});
it('does not use legacy fallback when product membership validation fails', async () => {
  m.resolve.mockRejectedValue(new Error('membership suspended'));
  await expect(resolveBgosMobileAccount('u')).rejects.toThrow('membership suspended');
});
it('rejects BOS identity in legacy mode', async () => {
  vi.stubEnv('PRODUCT_WORKSPACES_ENABLED', 'false');
  await expect(resolveBgosMobileAccount('u')).rejects.toMatchObject({ code: 'BGOS_REQUIRED' });
});
