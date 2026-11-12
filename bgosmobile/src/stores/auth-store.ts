import * as pushModule from '../lib/push';
import { create } from 'zustand';
import {
  getToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  onSessionEnded,
  sessionRevision,
  getSavedUser,
  saveUser,
  isOnboardingDone,
  setOnboardingDone,
} from '../lib/auth';
import { apiRequest, ApiError } from '../lib/api';
import { API_PATHS } from '../lib/constants';
import { googleSignIn } from '../lib/google-auth';
import { appleSignIn } from '../lib/apple-auth';
import { isBgosIdentity } from '../lib/bgos-identity';
import { invalidateResourceScope } from '../lib/resource-cache';

function triggerPushSync() {
  try {
    const fn = (pushModule as { autoSyncPushToken?: () => Promise<void> }).autoSyncPushToken;
    if (typeof fn === 'function') {
      void Promise.resolve(fn()).catch(() => {});
    }
  } catch {
    // Optional in partial test mocks
  }
}

export interface User { id: string; email: string; name?: string; role?: string; tenantId?: string; workspaceId?: string }
export interface SessionResponse { token: string; refreshToken: string; user: User; workspace: { id: string; productType: string } | null; onboardingRequired?: boolean }
interface AuthState {
  onboardingRequired: boolean; user: User | null; isAuthenticated: boolean; isLoading: boolean; error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginPhone: (idToken: string, phoneNumber?: string) => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  loginApple: () => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
}
async function acceptSession(session: SessionResponse, revision: number) {
  if (!session.token || !session.refreshToken || !session.user || !isBgosIdentity(session) || !session.user.tenantId) {
    if (session.refreshToken) await apiRequest('/api/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken }, skipAuth: true }).catch(() => {});
    throw new Error('Use an active BGOS workspace account to sign in.');
  }
  await setTokens(session.token, session.refreshToken, revision, session.user);
  invalidateResourceScope();
  return session.user;
}

async function resolveOnboardingRequirement(session: SessionResponse, user: User): Promise<boolean> {
  const accountKey = user.tenantId || user.id;
  const locallyDone = await isOnboardingDone(accountKey);
  if (locallyDone) {
    return false;
  }

  // If session explicitly says onboarding is required
  if (session.onboardingRequired === true) {
    return true;
  }

  // If server says false (or omitted), verify whether the tenant genuinely has a connected Google Business Profile
  try {
    const disc = await apiRequest<{
      count?: number;
      hasConnectedGbp?: boolean;
      profiles?: Array<{ id: string; name?: string }>;
    }>('/api/gbp/accounts/discover');

    // No accounts connected or hasConnectedGbp is explicitly false
    if (!disc || disc.hasConnectedGbp === false || disc.count === 0 || !disc.profiles || disc.profiles.length === 0) {
      return true;
    }

    // Guard against the old server fallback mock where profile id is '0001'
    const firstProfileId = String(disc.profiles[0]?.id || '');
    if (firstProfileId === '0001' || firstProfileId.length <= 4) {
      return true;
    }

    // Genuine GBP account verified
    await setOnboardingDone(accountKey, true);
    return false;
  } catch (err) {
    console.warn('[auth-store] GBP discovery check error:', err);
    return session.onboardingRequired ?? false;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  onboardingRequired: false, user: null, isAuthenticated: false, isLoading: true, error: null,
  setOnboardingCompleted: async (completed: boolean) => {
    const currentUser = get().user;
    if (currentUser) {
      const accountKey = currentUser.tenantId || currentUser.id;
      await setOnboardingDone(accountKey, completed);
    }
    set({ onboardingRequired: !completed });
  },
  login: async (email, password) => {
    const revision = sessionRevision();
    set({ error: null });
    try {
      const session = await apiRequest<SessionResponse>(API_PATHS.login, { method: 'POST', body: { email: email.trim().toLowerCase(), password, product: 'bgos' }, skipAuth: true });
      const user = await acceptSession(session, revision);
      const onboardingRequired = await resolveOnboardingRequirement(session, user);
      set({ user, onboardingRequired, isAuthenticated: true, isLoading: false });
      triggerPushSync();
      return true;
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Sign-in failed', isLoading: false }); return false; }
  },
  loginPhone: async (idToken, phoneNumber) => {
    const revision = sessionRevision();
    set({ error: null });
    try {
      const session = await apiRequest<SessionResponse>(API_PATHS.phoneLogin, {
        method: 'POST',
        body: { idToken, phoneNumber, product: 'bgos' },
        skipAuth: true,
      });
      const user = await acceptSession(session, revision);
      const onboardingRequired = await resolveOnboardingRequirement(session, user);
      set({ user, onboardingRequired, isAuthenticated: true, isLoading: false });
      triggerPushSync();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Mobile sign-in failed', isLoading: false });
      return false;
    }
  },
  loginGoogle: async () => {
    const revision = sessionRevision();
    set({ error: null });
    try {
      const session = await googleSignIn();
      if (!session) return false;
      const user = await acceptSession(session, revision);
      const onboardingRequired = await resolveOnboardingRequirement(session, user);
      set({ user, onboardingRequired, isAuthenticated: true, isLoading: false });
      triggerPushSync();
      return true;
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Google sign-in failed', isLoading: false }); return false; }
  },
  loginApple: async () => {
    const revision = sessionRevision();
    set({ error: null });
    try {
      const session = await appleSignIn();
      if (!session) return false;
      const user = await acceptSession(session, revision);
      const onboardingRequired = await resolveOnboardingRequirement(session, user);
      set({ user, onboardingRequired, isAuthenticated: true, isLoading: false });
      triggerPushSync();
      return true;
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Apple sign-in failed', isLoading: false }); return false; }
  },
  logout: async () => {
    // Capture credentials before clearing. Local sign-out never waits on the network.
    const token = await getToken().catch(() => null);
    const refreshToken = await getRefreshToken().catch(() => null);
    const pushCleanup = Promise.resolve(pushModule.unregisterPush(token)).catch(() => {});
    const revoke = refreshToken ? Promise.resolve(apiRequest('/api/auth/logout', { method: 'POST', body: { refreshToken }, skipAuth: true })).catch(() => {}) : Promise.resolve();
    try { await clearTokens(); }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Could not clear saved credentials.' }); throw error; }
    finally {
      invalidateResourceScope();
      set({ user: null, isAuthenticated: false, isLoading: false, onboardingRequired: false });
    }
    void Promise.allSettled([pushCleanup, revoke]);
  },
  deleteAccount: async () => {
    const token = await getToken().catch(() => null);
    const pushCleanup = Promise.resolve(pushModule.unregisterPush(token)).catch(() => {});
    try {
      await apiRequest('/api/bgos/mobile-auth/account', { method: 'DELETE' });
    } catch (error) {
      console.warn('[auth-store] Remote deleteAccount error:', error);
    }
    try { await clearTokens(); }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Could not clear local credentials.' }); throw error; }
    finally {
      invalidateResourceScope();
      set({ user: null, isAuthenticated: false, isLoading: false, onboardingRequired: false });
    }
    void Promise.allSettled([pushCleanup]);
  },
  checkAuth: async () => {
    const revision = sessionRevision();
    set({ isLoading: true });
    try {
      const token = await getToken();
      if (!token) {
        invalidateResourceScope();
        set({ user: null, isAuthenticated: false, isLoading: false, onboardingRequired: false });
        return;
      }
      // Instant recovery from local secure storage so app remains authenticated immediately
      const savedUser = await getSavedUser().catch(() => null);
      if (savedUser) {
        const isDone = await isOnboardingDone(savedUser.tenantId || savedUser.id);
        set({ user: savedUser, isAuthenticated: true, isLoading: false, onboardingRequired: !isDone, error: null });
      }

      const session = await apiRequest<SessionResponse>(API_PATHS.currentUser);
      if (revision !== sessionRevision()) return;
      if (session?.user) {
        const userChanged =
          !savedUser ||
          savedUser.id !== session.user.id ||
          savedUser.tenantId !== session.user.tenantId;
        await saveUser(session.user).catch(() => {});
        if (userChanged) {
          invalidateResourceScope();
        }
        const onboardingRequired = await resolveOnboardingRequirement(session, session.user);
        set({ user: session.user, onboardingRequired, isAuthenticated: true, isLoading: false, error: null });
        triggerPushSync();
      }
    } catch (error) {
      if (revision !== sessionRevision()) return;
      if (error instanceof ApiError && error.statusCode === 401) {
        await clearTokens().catch(() => {});
        invalidateResourceScope();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          onboardingRequired: false,
          error: error.message || 'Session expired. Please sign in again.',
        });
        return;
      }
      const savedUser = await getSavedUser().catch(() => null);
      if (savedUser) {
        // Retain authenticated session on network failure or transient checks
        const isDone = await isOnboardingDone(savedUser.tenantId || savedUser.id);
        set({ user: savedUser, isAuthenticated: true, isLoading: false, onboardingRequired: !isDone });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, onboardingRequired: false, error: error instanceof Error ? error.message : 'Could not check session. Retry when connected.' });
      }
    }
  },
}));
onSessionEnded(() => {
  invalidateResourceScope();
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, onboardingRequired: false });
});

export async function applyWorkspaceSession(session: SessionResponse): Promise<void> {
  const revision = sessionRevision();
  const user = await acceptSession(session, revision);
  invalidateResourceScope();
  const onboardingRequired = await resolveOnboardingRequirement(session, user);
  useAuthStore.setState({
    user,
    onboardingRequired,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
  triggerPushSync();
}
