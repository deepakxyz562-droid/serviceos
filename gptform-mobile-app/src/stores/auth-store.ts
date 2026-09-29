import { create } from 'zustand';
import type { SubscriberUser, SubscriberTenant } from '@/types';
import { getToken, setTokens, clearTokens, getStoredUserData, setStoredUserData } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { clearPushToken } from '@/lib/notifications';

interface AuthState {
  user: SubscriberUser | null;
  tenant: SubscriberTenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBooted: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isBooted: false,
  error: null,

  bootstrap: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ isBooted: true, isAuthenticated: false });
        return;
      }

      const storedUser = await getStoredUserData();
      if (storedUser) {
        set({
          user: storedUser.user,
          tenant: storedUser.tenant,
          token,
          isAuthenticated: true,
          isBooted: true,
        });
      } else {
        set({ token, isAuthenticated: true, isBooted: true });
      }
    } catch {
      set({ isBooted: true, isAuthenticated: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{
        token: string;
        refreshToken?: string;
        user: SubscriberUser;
        tenant: SubscriberTenant;
      }>(API_PATHS.login, {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });

      if (data.token) {
        await setTokens(data.token, data.refreshToken);
        await setStoredUserData({ user: data.user, tenant: data.tenant });

        set({
          token: data.token,
          user: data.user,
          tenant: data.tenant,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }
      throw new Error('Invalid response from server');
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to sign in. Please verify your credentials.',
      });
      return false;
    }
  },

  logout: async () => {
    clearPushToken();
    await clearTokens();
    set({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
