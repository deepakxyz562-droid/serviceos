import { unregisterPush } from '../lib/push';
import { create } from 'zustand';
import { getToken, setTokens, clearTokens } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { API_PATHS } from '../lib/constants';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  tenantId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRequest<{ token: string; user: User }>(API_PATHS.login, {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });

      if (res?.token) {
        await setTokens(res.token);
        set({ user: res.user, isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ error: 'Login failed: no token returned', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err?.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await unregisterPush();
    await clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await getToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      const res = await apiRequest<{ user: User }>(API_PATHS.currentUser);
      if (res?.user) {
        set({ user: res.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
