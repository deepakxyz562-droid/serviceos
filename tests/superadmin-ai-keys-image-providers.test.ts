// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  isSuperAdmin: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAuthUser: m.auth }));
vi.mock('@/lib/admin-auth', () => ({ isSuperAdminRequest: m.isSuperAdmin }));
vi.mock('@/lib/ai-client', () => ({ invalidateAiKeyChainCache: vi.fn() }));
vi.mock('@/lib/ai-key-crypto', () => ({
  encryptKey: (plaintext: string) => `enc:${plaintext}`,
  decryptKey: (encrypted: string) => encrypted.replace(/^enc:/, ''),
  maskEncryptedKey: () => '••••key',
}));
vi.mock('@/lib/db', () => ({
  db: {
    aiProviderKey: {
      findMany: m.findMany,
      findUnique: m.findUnique,
      create: m.create,
      update: m.update,
    },
  },
}));

import { POST as createKeyPost } from '@/app/api/superadmin/ai-keys/route';
import { POST as testKeyPost } from '@/app/api/superadmin/ai-keys/[id]/test/route';

describe('Superadmin AI Keys — Image Providers (Cloudflare, SiliconFlow, NVIDIA)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue({ id: 'sa-1', isSuperAdmin: true, role: 'admin', tenantId: null });
    m.isSuperAdmin.mockResolvedValue(true);
    vi.stubGlobal('fetch', m.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows creating cloudflare, siliconflow, and nvidia keys in POST /api/superadmin/ai-keys', async () => {
    for (const provider of ['cloudflare', 'siliconflow', 'nvidia'] as const) {
      m.create.mockResolvedValueOnce({
        id: `key-${provider}`,
        provider,
        label: `${provider} key`,
        encryptedKey: 'enc:secret',
        priority: 0,
        isActive: true,
        lastUsedAt: null,
        lastErrorAt: null,
        lastError: null,
        requestCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new NextRequest('http://localhost/api/superadmin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, label: `${provider} key`, key: 'test-secret' }),
      });
      const res = await createKeyPost(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.key.provider).toBe(provider);
      expect(json.key.maskedKey).toBe('••••key');
    }
  });

  it('validates siliconflow and nvidia keys via /models endpoints in /api/superadmin/ai-keys/[id]/test', async () => {
    m.update.mockResolvedValue({});

    // SiliconFlow test
    m.findUnique.mockResolvedValueOnce({
      id: 'sf-row',
      provider: 'siliconflow',
      encryptedKey: 'enc:sk-sf-test',
    });
    m.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const sfRes = await testKeyPost(new NextRequest('http://localhost/api/superadmin/ai-keys/sf-row/test'), {
      params: Promise.resolve({ id: 'sf-row' }),
    });
    expect(sfRes.status).toBe(200);
    expect(await sfRes.json()).toEqual({ success: true, message: 'Key is valid' });
    expect(m.fetch.mock.calls[0][0]).toBe('https://api.siliconflow.com/v1/models?type=image');
    expect(m.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-sf-test');

    // NVIDIA NIM test
    m.findUnique.mockResolvedValueOnce({
      id: 'nv-row',
      provider: 'nvidia',
      encryptedKey: 'enc:nvapi-test',
    });
    m.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const nvRes = await testKeyPost(new NextRequest('http://localhost/api/superadmin/ai-keys/nv-row/test'), {
      params: Promise.resolve({ id: 'nv-row' }),
    });
    expect(nvRes.status).toBe(200);
    expect(await nvRes.json()).toEqual({ success: true, message: 'Key is valid' });
    expect(m.fetch.mock.calls[1][0]).toBe('https://integrate.api.nvidia.com/v1/models');
    expect(m.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer nvapi-test');
  });
});
