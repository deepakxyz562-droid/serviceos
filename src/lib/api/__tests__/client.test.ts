import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, apiFetch } from '@/lib/api/client';

describe('ApiError', () => {
  it('stores status and data correctly', () => {
    const err = new ApiError('Not found', 404, { detail: 'missing' });
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.data).toEqual({ detail: 'missing' });
    expect(err.name).toBe('ApiError');
  });
});

describe('apiFetch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('resolves JSON on 2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1', name: 'test' }),
    });
    globalThis.fetch = mockFetch as any;

    const result = await apiFetch<{ id: string; name: string }>('/api/test');
    expect(result).toEqual({ id: '1', name: 'test' });
  });

  it('throws ApiError on non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });
    globalThis.fetch = mockFetch as any;

    await expect(apiFetch('/api/protected')).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    });
  });

  it('returns empty object on 204 No Content', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve(null),
    });
    globalThis.fetch = mockFetch as any;

    const result = await apiFetch('/api/delete');
    expect(result).toEqual({});
  });
});
