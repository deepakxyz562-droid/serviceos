// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAuthUser: m.auth }));
vi.mock('@/lib/db', () => ({
  db: {
    designGenerationJob: {
      findFirst: m.findFirst,
      create: m.create,
      updateMany: m.updateMany,
    },
  },
}));
vi.mock('@/lib/designs/jobs', () => ({ runDesignJob: vi.fn() }));

import { GET } from '@/app/api/social/designs/image/route';

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-123' });
});

it('finds job when client queries with raw requestId without tenant prefix', async () => {
  m.findFirst.mockImplementation(async (query: any) => {
    const ids = query.where?.id?.in || [];
    if (ids.includes('tenant-123:web-req-789')) {
      return {
        id: 'tenant-123:web-req-789',
        tenantId: 'tenant-123',
        status: 'completed',
        resultJson: JSON.stringify({ url: 'https://cdn.example.com/poster.png' }),
      };
    }
    return null;
  });

  const req = new NextRequest('http://localhost/api/social/designs/image?id=web-req-789');
  const res = await GET(req);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.status).toBe('completed');
  expect(json.result.url).toBe('https://cdn.example.com/poster.png');

  // Verify that the query included both raw and tenant-prefixed candidate IDs
  const whereCall = m.findFirst.mock.calls[0][0].where;
  expect(whereCall.id.in).toContain('web-req-789');
  expect(whereCall.id.in).toContain('tenant-123:web-req-789');
});

it('finds job when client queries with full composite jobId', async () => {
  m.findFirst.mockResolvedValue({
    id: 'tenant-123:web-req-789',
    tenantId: 'tenant-123',
    status: 'failed',
    error: 'Gemini rate limit exceeded',
  });

  const req = new NextRequest('http://localhost/api/social/designs/image?id=tenant-123:web-req-789');
  const res = await GET(req);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.status).toBe('failed');
  expect(json.error).toBe('Gemini rate limit exceeded');
});

it('returns 404 when job does not exist', async () => {
  m.findFirst.mockResolvedValue(null);
  const req = new NextRequest('http://localhost/api/social/designs/image?id=nonexistent');
  const res = await GET(req);
  expect(res.status).toBe(404);
});
