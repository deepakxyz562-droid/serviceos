import { beforeEach, describe, expect, it, vi } from 'vitest';
const secure = vi.hoisted(() => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }));
vi.mock('expo-secure-store', () => secure);
let auth: typeof import('../bgosmobile/src/lib/auth');
let api: typeof import('../bgosmobile/src/lib/api');
beforeEach(async () => {
  vi.resetModules(); vi.resetAllMocks();
  const values = new Map<string, string>();
  secure.getItemAsync.mockImplementation(async key => values.get(key) || null);
  secure.setItemAsync.mockImplementation(async (key, value) => { values.set(key, value); });
  secure.deleteItemAsync.mockImplementation(async key => { values.delete(key); });
  auth = await import('../bgosmobile/src/lib/auth');
  api = await import('../bgosmobile/src/lib/api');
});
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe('BGOS mobile sessions', () => {
  it('persists both tokens atomically and surfaces storage failure', async () => {
    await auth.setTokens('access', 'refresh');
    expect(await auth.getRefreshToken()).toBe('refresh');
    expect(secure.setItemAsync).toHaveBeenCalledTimes(1);
    secure.setItemAsync.mockRejectedValueOnce(new Error('device locked'));
    await expect(auth.setTokens('next', 'next-refresh')).rejects.toThrow('device locked');
  });
  it('coalesces concurrent unauthorized requests into one refresh', async () => {
    await auth.setTokens('old', 'refresh');
    const fetcher = vi.fn(async (url: string, options: any) => {
      if (url.endsWith('/api/auth/refresh')) return response({ token: 'new', refreshToken: 'rotated' });
      return options.headers.Authorization === 'Bearer old' ? response({ error: 'expired' }, 401) : response({ ok: true });
    });
    vi.stubGlobal('fetch', fetcher);
    expect(await Promise.all([api.apiRequest('/api/leads'), api.apiRequest('/api/bookings')])).toEqual([{ ok: true }, { ok: true }]);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'))).toHaveLength(1);
    expect(await auth.getRefreshToken()).toBe('rotated');
  });
  it('prevents in-flight refresh from restoring a signed-out session', async () => {
    await auth.setTokens('old', 'refresh');
    let finish!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    const refreshing = api.refreshSession();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await auth.clearTokens();
    finish(response({ token: 'new', refreshToken: 'rotated' }));
    await expect(refreshing).rejects.toThrow('Session changed');
    expect(await auth.getToken()).toBeNull();
  });
  it('keeps credentials on network errors but removes rejected refresh sessions', async () => {
    await auth.setTokens('old', 'refresh');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response({ error: 'expired' }, 401)));
    await expect(api.refreshSession()).rejects.toThrow('offline');
    expect(await auth.getRefreshToken()).toBe('refresh');
    await expect(api.refreshSession()).rejects.toThrow('expired');
    expect(await auth.getToken()).toBeNull();
  });
  it('does not send credentials to an external API or accept malformed success', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('<html>offline</html>', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(api.apiRequest('https://attacker.example/api')).rejects.toThrow('Untrusted');
    expect(fetcher).not.toHaveBeenCalled();
    await expect(api.apiRequest('/api/leads')).rejects.toThrow('invalid response');
  });
});
