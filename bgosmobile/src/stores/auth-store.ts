import { unregisterPush } from '../lib/push';
import { create } from 'zustand';
import { getToken, getRefreshToken, setTokens, clearTokens, onSessionEnded, sessionRevision } from '../lib/auth';
import { apiRequest, ApiError } from '../lib/api';
import { API_PATHS } from '../lib/constants';
import { googleSignIn } from '../lib/google-auth';
import { isBgosIdentity } from '../../../shared/bgos-identity';

export interface User { id: string; email: string; name?: string; role?: string; tenantId?: string; workspaceId?: string }
export interface SessionResponse { token: string; refreshToken: string; user: User; workspace: { id: string; productType: string } | null; onboardingRequired?: boolean }
interface AuthState {
  onboardingRequired: boolean; user: User | null; isAuthenticated: boolean; isLoading: boolean; error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
async function acceptSession(session: SessionResponse, revision: number) {
  if (!session.token || !session.refreshToken || !session.user || !isBgosIdentity(session) || !session.user.tenantId) {
    if (session.refreshToken) await apiRequest('/api/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken }, skipAuth: true }).catch(() => {});
    throw new Error('Use an active BGOS workspace account to sign in.');
  }
  await setTokens(session.token, session.refreshToken, revision);
  return session.user;
}
export const useAuthStore = create<AuthState>((set) => ({
  onboardingRequired: false, user: null, isAuthenticated: false, isLoading: true, error: null,
  login: async (email, password) => {
    const revision = sessionRevision();
    set({ error: null });
    try {
      const session = await apiRequest<SessionResponse>(API_PATHS.login, { method: 'POST', body: { email: email.trim().toLowerCase(), password, product: 'bgos' }, skipAuth: true });
      const user = await acceptSession(session, revision);
      set({ user, onboardingRequired: !!session.onboardingRequired, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Sign-in failed', isLoading: false }); return false; }
  },
  loginGoogle: async () => {
    const revision = sessionRevision();
    set({ error: null });
    try {
      const session = await googleSignIn();
      if (!session) return false;
      const user = await acceptSession(session, revision);
      set({ user, onboardingRequired: !!session.onboardingRequired, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Google sign-in failed', isLoading: false }); return false; }
  },
  logout: async () => {
    // Capture credentials before clearing. Local sign-out never waits on the network.
    const token = await getToken().catch(() => null);
    const refreshToken = await getRefreshToken().catch(() => null);
    const pushCleanup = unregisterPush(token).catch(() => {});
    const revoke = refreshToken ? apiRequest('/api/auth/logout', { method: 'POST', body: { refreshToken }, skipAuth: true }).catch(() => {}) : Promise.resolve();
    try { await clearTokens(); }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Could not clear saved credentials.' }); throw error; }
    finally { set({ user: null, isAuthenticated: false, isLoading: false }); }
    void Promise.allSettled([pushCleanup, revoke]);
  },
  checkAuth: async () => {
    const revision = sessionRevision();
    set({ isLoading: true });
    try {
      if (!await getToken()) { set({ user: null, isAuthenticated: false, isLoading: false }); return; }
      const session = await apiRequest<SessionResponse>(API_PATHS.currentUser);
      if (revision !== sessionRevision()) return;
      if (!isBgosIdentity(session)) throw new ApiError('An active BGOS workspace is required.', 403);
      set({ user: session.user, onboardingRequired: !!session.onboardingRequired, isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      if (revision !== sessionRevision()) return;
      if (error instanceof ApiError && [401, 403].includes(error.statusCode)) await clearTokens().catch(() => {});
      set({ user: null, isAuthenticated: false, isLoading: false, error: error instanceof Error ? error.message : 'Could not check session. Retry when connected.' });
    }
  },
}));
onSessionEnded(() => useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false }));
