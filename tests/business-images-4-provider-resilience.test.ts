// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({
  find: vi.fn(),
  update: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    aiProviderKey: {
      findFirst: m.find,
      update: m.update,
    },
  },
}));

vi.mock('@/lib/ai-key-crypto', () => ({
  decryptKey: (val: string) => (val.startsWith('{') ? val : 'private-key'),
}));

import { generateDesignImage } from '@/lib/designs/image-provider';

describe('4-Provider Failover Resilience (Cloudflare -> NVIDIA -> Gemini -> KIE)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.find.mockImplementation(async ({ where }: any) => {
      if (where?.provider === 'nvidia') return { id: 'nv-key', encryptedKey: 'nv-secret' };
      if (where?.provider === 'kie') return { id: 'kie-key', encryptedKey: 'kie-secret' };
      if (where?.provider === 'gemini') return { id: 'gem-key', encryptedKey: 'gem-secret' };
      if (where?.provider === 'cloudflare') {
        return {
          id: 'cf-key',
          encryptedKey: JSON.stringify({ accountId: 'acc-123', authKey: 'cf-token' }),
        };
      }
      return null;
    });
    vi.stubGlobal('fetch', m.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('cascades from Cloudflare 429 directly to NVIDIA NIM successfully', async () => {
    // 1. Cloudflare returns 429
    m.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, errors: [{ message: 'daily limit reached' }] }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    );
    // 2. NVIDIA NIM succeeds
    m.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ artifacts: [{ base64: Buffer.from('nvidia-flux-photo').toString('base64') }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const res = await generateDesignImage('Plumber fixing copper pipe', 'cloudflare', new AbortController().signal);
    expect(res.bytes.toString()).toBe('nvidia-flux-photo');
    expect(res.model).toContain('flux.1');
    expect(res.fallbackReason).toContain('Primary provider cloudflare unavailable');
  });

  it('cascades from Cloudflare 429 -> NVIDIA 504 -> KIE successfully', async () => {
    // 1. Cloudflare 429 daily quota exhausted
    m.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, errors: [{ message: 'daily quota exceeded' }] }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    );
    // 2. NVIDIA 504
    m.fetch.mockResolvedValueOnce(
      new Response('Gateway Timeout', { status: 504 }),
    );
    // 3. Gemini 403 (e.g. no Imagen permission)
    m.fetch.mockResolvedValueOnce(
      new Response('Permission denied', { status: 403 }),
    );
    // 4. KIE createTask
    m.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 200, msg: 'success', data: { taskId: 'kie-task-888' } }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    // 5. KIE recordInfo
    m.fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({
        code: 200,
        msg: 'success',
        data: {
          taskId: 'kie-task-888',
          state: 'success',
          response: { resultUrls: ['https://example.com/kie-generated.png'] },
          creditsConsumed: 0.8,
        },
      }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    // 6. Download KIE image
    m.fetch.mockResolvedValueOnce(
      new Response(Buffer.from('kie-z-image-bytes'), {
        headers: { 'content-type': 'image/png' },
      }),
    );

    const res = await generateDesignImage('Plumber fixing copper pipe', 'cloudflare', new AbortController().signal);
    expect(res.bytes.toString()).toBe('kie-z-image-bytes');
    expect(res.model).toContain('kie/');
  });
});
