import { create } from 'zustand';
import type { SubscriberUser, SubscriberTenant } from '@/types';
import { getToken, setTokens, clearTokens, getStoredUserData, setStoredUserData } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { API_PATHS, API_BASE_URL } from '@/lib/constants';
import { clearPushToken } from '@/lib/notifications';
import * as WebBrowser from 'expo-web-browser';

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
  register: (name: string, email: string, password: string, companyName?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
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
      const stored = await getStoredUserData();
      if (token && stored?.user) {
        set({
          user: stored.user,
          tenant: stored.tenant || null,
          token,
          isAuthenticated: true,
          isBooted: true,
        });
      } else {
        set({
          user: null,
          tenant: null,
          token: null,
          isAuthenticated: false,
          isBooted: true,
        });
      }
    } catch {
      set({
        user: null,
        tenant: null,
        token: null,
        isAuthenticated: false,
        isBooted: true,
      });
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

  register: async (name: string, email: string, password: string, companyName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<{
        token: string;
        refreshToken?: string;
        user: SubscriberUser;
        tenant: SubscriberTenant;
      }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password, companyName: companyName || `${name}'s Workspace` },
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
      throw new Error('Registration failed. Please try again.');
    } catch (err: any) {
      // Surface the real error to the user. Do NOT fabricate a local account.
      set({
        isLoading: false,
        error: err.message || 'Registration failed. Please check your details and try again.',
      });
      return false;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      // Always go through the backend OAuth flow. The backend handles the real
      // Google token exchange and returns a real session token. We never
      // fabricate a user locally.
      const Linking = require('expo-linking');
      const redirectUrl = Linking.createURL('auth-callback');
      const authUrl = `${API_BASE_URL}/api/auth/google?mode=mobile&redirect=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type !== 'success' || !result.url) {
        // User dismissed the browser or auth was cancelled
        set({ isLoading: false });
        return false;
      }

      const parsed = Linking.parse(result.url);
      const token = parsed.queryParams?.token as string | undefined;
      const refreshToken = parsed.queryParams?.refreshToken as string | undefined;

      if (!token) {
        const errMsg = (parsed.queryParams?.error as string) || 'Google sign-in did not return a session. Please try again.';
        set({ isLoading: false, error: errMsg });
        return false;
      }

      // Fetch the real user/tenant profile using the returned token
      const profile = await apiRequest<{ user: SubscriberUser; tenant: SubscriberTenant }>(
        '/api/auth/me',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          skipAuth: true,
        }
      ).catch(() => null);

      // Fallback: derive minimal profile from query params if /me unavailable
      const user: SubscriberUser = profile?.user || {
        id: (parsed.queryParams?.userId as string) || `usr_${Date.now()}`,
        name: (parsed.queryParams?.name as string) || '',
        email: (parsed.queryParams?.email as string) || '',
        role: 'Owner',
        phone: null,
        avatar: null,
      };
      const tenant: SubscriberTenant = profile?.tenant || {
        id: (parsed.queryParams?.tenantId as string) || `tenant_${Date.now()}`,
        name: (parsed.queryParams?.tenantName as string) || `${user.name}'s Workspace`,
        slug: 'workspace',
        industry: 'Services',
        plan: 'Starter',
      };

      await setTokens(token, refreshToken);
      await setStoredUserData({ user, tenant });

      set({
        token,
        user,
        tenant,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Google sign-in could not be completed. Please try again.',
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
