import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ request: vi.fn(), setTokens: vi.fn(), clear: vi.fn(), unregister: vi.fn(), google: vi.fn() }));
vi.mock('../bgosmobile/src/lib/auth', () => ({ getToken: async () => 'access', getRefreshToken: async () => 'refresh', setTokens: m.setTokens, clearTokens: m.clear, onSessionEnded: vi.fn(), sessionRevision: () => 1 }));
vi.mock('../bgosmobile/src/lib/api', () => ({ apiRequest: m.request, ApiError: class extends Error { constructor(message: string, public statusCode: number) { super(message); } } }));
vi.mock('../bgosmobile/src/lib/push', () => ({ unregisterPush: m.unregister }));
vi.mock('../bgosmobile/src/lib/google-auth', () => ({ googleSignIn: m.google }));
import { useAuthStore } from '../bgosmobile/src/stores/auth-store';
beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: { id: 'u', email: 'u@example.com' }, isAuthenticated: true, isLoading: false, error: null });
});
it('clears local session even when push deregistration and server logout fail', async () => {
  m.unregister.mockRejectedValue(new Error('offline')); m.request.mockRejectedValue(new Error('offline'));
  await useAuthStore.getState().logout();
  expect(m.clear).toHaveBeenCalledOnce();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});
it('does not report successful login when secure storage fails', async () => {
  useAuthStore.setState({ isAuthenticated: false });
  m.request.mockResolvedValue({ token: 'a', refreshToken: 'r', user: { id: 'u', tenantId: 't' }, workspace: { productType: 'bgos' } });
  m.setTokens.mockRejectedValue(new Error('device storage unavailable'));
  expect(await useAuthStore.getState().login('u@example.com', 'password')).toBe(false);
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(useAuthStore.getState().error).toBe('device storage unavailable');
});
it('rejects a wrong-product session without saving it', async () => {
  m.request.mockResolvedValue({ token: 'a', refreshToken: 'r', user: { id: 'u', tenantId: 't' }, workspace: { productType: 'bos' } });
  expect(await useAuthStore.getState().login('u@example.com', 'password')).toBe(false);
  expect(m.setTokens).not.toHaveBeenCalled();
});
