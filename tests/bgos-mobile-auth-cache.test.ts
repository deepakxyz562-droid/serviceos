import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  request: vi.fn(),
  setTokens: vi.fn(),
  clear: vi.fn(),
  unregister: vi.fn(),
  autoSync: vi.fn(),
  google: vi.fn(),
  apple: vi.fn(),
  getToken: vi.fn(),
  getSavedUser: vi.fn(),
  saveUser: vi.fn(),
  isOnboardingDone: vi.fn(),
  invalidateResourceScope: vi.fn(),
  onSessionEndedCbs: [] as Array<() => void>,
}));

vi.mock('../bgosmobile/src/lib/auth', () => ({
  getToken: m.getToken,
  getRefreshToken: async () => 'refresh',
  setTokens: m.setTokens,
  clearTokens: m.clear,
  onSessionEnded: (cb: () => void) => {
    m.onSessionEndedCbs.push(cb);
    return () => {};
  },
  sessionRevision: () => 1,
  isOnboardingDone: m.isOnboardingDone,
  setOnboardingDone: async () => {},
  saveUser: m.saveUser,
  getSavedUser: m.getSavedUser,
}));

vi.mock('../bgosmobile/src/lib/api', () => ({
  apiRequest: m.request,
  ApiError: class ApiError extends Error {
    constructor(message: string, public statusCode: number) {
      super(message);
    }
  },
}));

vi.mock('../bgosmobile/src/lib/push', () => ({
  unregisterPush: m.unregister,
  autoSyncPushToken: m.autoSync,
}));

vi.mock('../bgosmobile/src/lib/google-auth', () => ({ googleSignIn: m.google }));
vi.mock('../bgosmobile/src/lib/apple-auth', () => ({
  appleSignIn: m.apple,
  isAppleAuthAvailable: vi.fn(async () => true),
}));

vi.mock('../bgosmobile/src/lib/resource-cache', async () => {
  const actual = await vi.importActual<typeof import('../bgosmobile/src/lib/resource-cache')>(
    '../bgosmobile/src/lib/resource-cache',
  );
  return {
    ...actual,
    invalidateResourceScope: (...args: any[]) => {
      m.invalidateResourceScope(...args);
      return actual.invalidateResourceScope();
    },
  };
});

import { ApiError } from '../bgosmobile/src/lib/api';
import { useAuthStore } from '../bgosmobile/src/stores/auth-store';

describe('bgosmobile auth store cache isolation & 401 session eviction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.request.mockResolvedValue({});
    m.getToken.mockResolvedValue('access-token');
    m.getSavedUser.mockResolvedValue(null);
    m.saveUser.mockResolvedValue(undefined);
    m.isOnboardingDone.mockResolvedValue(true);
    m.setTokens.mockResolvedValue(undefined);
    m.clear.mockResolvedValue(undefined);
    m.unregister.mockResolvedValue(undefined);
    m.autoSync.mockResolvedValue(undefined);
    useAuthStore.setState({
      user: { id: 'u1', email: 'old@example.com', tenantId: 't1', workspaceId: 'w1' },
      isAuthenticated: true,
      isLoading: false,
      onboardingRequired: false,
      error: null,
    });
  });

  it('invalidates resource cache partition on loginPhone and logout', async () => {
    m.request.mockResolvedValueOnce({
      token: 'jwt-2',
      refreshToken: 'ref-2',
      user: { id: 'u2', email: 'deepakchandra076@gmail.com', role: 'owner', tenantId: 't2', workspaceId: 'w2' },
      workspace: { id: 'w2', productType: 'bgos' },
      onboardingRequired: false,
    });

    const ok = await useAuthStore.getState().loginPhone('firebase-id-token', '+918505945123');
    expect(ok).toBe(true);
    expect(m.invalidateResourceScope).toHaveBeenCalledTimes(1);

    await useAuthStore.getState().logout();
    expect(m.invalidateResourceScope).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears cached savedUser, tokens, and resource scope when checkAuth gets HTTP 401', async () => {
    const staleUser = { id: 'u_emp', email: 'deepakxyz7890@gmail.com', tenantId: 't_emp', workspaceId: 'w_emp' };
    m.getSavedUser.mockResolvedValue(staleUser);
    m.request.mockRejectedValueOnce(new ApiError('Token expired', 401));

    await useAuthStore.getState().checkAuth();

    expect(m.clear).toHaveBeenCalledOnce();
    expect(m.invalidateResourceScope).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('keeps offline savedUser when checkAuth encounters a transient non-401 error', async () => {
    const cachedUser = { id: 'u_biz', email: 'deepakchandra076@gmail.com', tenantId: 't_biz', workspaceId: 'w_biz' };
    m.getSavedUser.mockResolvedValue(cachedUser);
    m.request.mockRejectedValueOnce(new ApiError('Gateway timeout', 504));

    await useAuthStore.getState().checkAuth();

    expect(m.clear).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('deepakchandra076@gmail.com');
  });
});
