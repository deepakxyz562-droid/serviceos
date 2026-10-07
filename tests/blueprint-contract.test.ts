import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resolveBlueprintCapabilities } from '../shared/blueprint/presets';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), tenant: vi.fn(), save: vi.fn(), business: vi.fn(), createBusiness: vi.fn(), configs: vi.fn(), createConfig: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mocks.auth, verifyToken: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {
  tenant: { findUnique: mocks.tenant, update: mocks.save },
  aiBusiness: { findFirst: mocks.business, create: mocks.createBusiness },
  gptformCommerceConfig: { findMany: mocks.configs, create: mocks.createConfig },
} }));
import { PATCH } from '@/app/api/tenant/blueprint/route';
const request = (body: unknown) => new NextRequest('http://localhost/api/tenant/blueprint', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('business setup persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ id: 'owner-a', tenantId: 'tenant-a', role: 'owner' });
    mocks.tenant.mockResolvedValue({ id: 'tenant-a', name: 'Shop', settingsJson: JSON.stringify({ blueprint: { businessType: 'restaurant', country: 'IN', language: 'hi', capabilities: resolveBlueprintCapabilities('restaurant'), version: 1 } }) });
    mocks.business.mockResolvedValue(null);
    mocks.createBusiness.mockResolvedValue({ id: 'business-a' });
    mocks.configs.mockResolvedValue([]);
    mocks.createConfig.mockResolvedValue({ id: 'config-a' });
  });
  it('prevents staff from changing the owner business profile', async () => {
    mocks.auth.mockResolvedValue({ id: 'staff-a', tenantId: 'tenant-a', role: 'employee' });
    expect((await PATCH(request({ businessType: 'grocery' }))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([{ salesChannels: [] }, { capabilities: { tables: 'true' } }, { timezone: 'invalid/timezone' }, null])('rejects invalid setup %s', async (body) => {
    expect((await PATCH(request(body))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('persists a profile switch without carrying restaurant defaults or losing language', async () => {
    const response = await PATCH(request({ businessType: 'grocery' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.blueprint.capabilities.tables).toBe(false);
    expect(data.blueprint.capabilities.kitchenKot).toBe(false);
    expect(data.blueprint.language).toBe('hi');
    expect(mocks.createBusiness.mock.calls[0][0].data).toMatchObject({ ownerId: 'owner-a', tenantId: 'tenant-a', currency: 'INR' });
  });
  it('does not complete onboarding or create financial records for a language-only change', async () => {
    const response = await PATCH(request({ language: 'en' }));
    expect(response.status).toBe(200);
    expect(mocks.createBusiness).not.toHaveBeenCalled();
    expect(mocks.createConfig).not.toHaveBeenCalled();
    expect(mocks.save.mock.calls[0][0].data).not.toHaveProperty('onboardingCompleted');
  });
});
