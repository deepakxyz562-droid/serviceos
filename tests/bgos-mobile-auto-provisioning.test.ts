import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  productWorkspace: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  productMembership: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  productSubscription: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  socialAccount: {
    count: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({
  generateSlug: (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  issueAuthTokens: vi.fn().mockResolvedValue({ accessToken: 'access-123', refreshToken: 'refresh-123' }),
  getRefreshSessionMetadata: vi.fn().mockReturnValue({}),
}));

import { ensureBgosTenantAndWorkspace, resolveBgosMobileAccount } from '@/lib/bgos-mobile-account';

describe('BGOS Mobile 1-Tap Auto-Provisioning & Account Resolution', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('PRODUCT_WORKSPACES_ENABLED', 'false');
    mockDb.socialAccount.count.mockResolvedValue(0);
  });

  it('seamlessly auto-provisions Tenant, Workspace, and Trial for a brand-new user with no workspace', async () => {
    const rawUser = {
      id: 'usr_new_123',
      email: 'newuser@gmail.com',
      name: 'New Business Owner',
      role: 'owner',
      tenantId: null,
      workspaceId: null,
      tenant: null,
      workspace: null,
      isActive: true,
      emailVerified: true,
    };

    const createdTenant = {
      id: 'ten_auto_123',
      name: "New Business Owner's Business",
      slug: 'new-business-owner-s-business',
      plan: 'starter',
      planStatus: 'trial',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      onboardingCompleted: false,
    };

    const createdWorkspace = {
      id: 'ws_auto_123',
      name: "New Business Owner's Business Workspace",
      slug: 'new-business-owner-s-business-workspace',
      productType: 'bgos',
      tenantId: createdTenant.id,
      ownerId: rawUser.id,
    };

    // First call: user without tenant/ws. Subsequent call: user with provisioned tenant/ws
    mockDb.user.findUnique
      .mockResolvedValueOnce(rawUser)
      .mockResolvedValueOnce({
        ...rawUser,
        tenantId: createdTenant.id,
        workspaceId: createdWorkspace.id,
        tenant: createdTenant,
        workspace: createdWorkspace,
      });

    mockDb.tenant.findUnique.mockResolvedValue(null);
    mockDb.tenant.create.mockResolvedValue(createdTenant);
    mockDb.subscription.create.mockResolvedValue({ id: 'sub_auto_123' });
    mockDb.workspace.findUnique.mockResolvedValue(null);
    mockDb.workspace.findFirst.mockResolvedValue(null);
    mockDb.workspace.create.mockResolvedValue(createdWorkspace);
    mockDb.user.update.mockResolvedValue({ ...rawUser, tenantId: createdTenant.id, workspaceId: createdWorkspace.id });
    mockDb.productWorkspace.findUnique.mockResolvedValue(null);
    mockDb.productWorkspace.create.mockResolvedValue({});
    mockDb.productMembership.findFirst.mockResolvedValue(null);
    mockDb.productMembership.create.mockResolvedValue({});
    mockDb.productSubscription.findUnique.mockResolvedValue(null);
    mockDb.productSubscription.create.mockResolvedValue({});

    const provisioned = await ensureBgosTenantAndWorkspace(rawUser.id);
    expect(provisioned.tenant.name).toBe("New Business Owner's Business");
    expect(provisioned.workspace.productType).toBe('bgos');

    // Verify tenant creation with 7-day trial
    expect(mockDb.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'starter',
          planStatus: 'trial',
          email: 'newuser@gmail.com',
        }),
      })
    );

    // Verify workspace creation with productType: 'bgos'
    expect(mockDb.workspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productType: 'bgos',
          tenantId: createdTenant.id,
          ownerId: rawUser.id,
        }),
      })
    );
  });

  it('recognizes existing BOS business accounts without throwing BGOS_REQUIRED', async () => {
    const existingBosUser = {
      id: 'usr_bos_123',
      email: 'existing.bos@gmail.com',
      name: 'Existing BOS Owner',
      role: 'owner',
      tenantId: 'ten_bos_123',
      workspaceId: 'ws_bos_123',
      isActive: true,
      emailVerified: true,
      tenant: {
        id: 'ten_bos_123',
        name: 'Existing BOS Business',
        plan: 'professional',
        planStatus: 'active',
        onboardingCompleted: true,
      },
      workspace: {
        id: 'ws_bos_123',
        name: 'Existing BOS Business Workspace',
        productType: 'bos',
        tenantId: 'ten_bos_123',
      },
    };

    mockDb.user.findUnique.mockResolvedValue(existingBosUser);

    const account = await resolveBgosMobileAccount(existingBosUser.id);
    expect(account.workspace.productType).toBe('bos');
    expect(account.user.tenantId).toBe('ten_bos_123');
    expect(account.user.workspaceId).toBe('ws_bos_123');
  });

  it('recognizes existing CRM business accounts without throwing BGOS_REQUIRED', async () => {
    const existingCrmUser = {
      id: 'usr_crm_123',
      email: 'existing.crm@gmail.com',
      name: 'Existing CRM Owner',
      role: 'owner',
      tenantId: 'ten_crm_123',
      workspaceId: 'ws_crm_123',
      isActive: true,
      emailVerified: true,
      tenant: {
        id: 'ten_crm_123',
        name: 'Field Service CRM',
        plan: 'starter',
        planStatus: 'active',
        onboardingCompleted: true,
      },
      workspace: {
        id: 'ws_crm_123',
        name: 'Field Service CRM Workspace',
        productType: 'crm',
        tenantId: 'ten_crm_123',
      },
    };

    mockDb.user.findUnique.mockResolvedValue(existingCrmUser);

    const account = await resolveBgosMobileAccount(existingCrmUser.id);
    expect(account.workspace.productType).toBe('crm');
    expect(account.user.tenantId).toBe('ten_crm_123');
  });
});
