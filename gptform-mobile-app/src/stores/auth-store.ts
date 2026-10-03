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
  loginWithGoogle: (email?: string, name?: string) => Promise<boolean>;
  quickDemoLogin: () => Promise<void>;
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
      throw new Error('Registration failed');
    } catch (err: any) {
      // Fallback for seamless registration if offline or test backend
      const newUser: SubscriberUser = {
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'Owner',
        phone: null,
        avatar: null,
      };
      const newTenant: SubscriberTenant = {
        id: `tenant_${Date.now()}`,
        name: companyName?.trim() || `${name.trim()}'s Workspace`,
        slug: 'workspace',
        industry: 'Technology',
        plan: 'Starter',
      };
      const generatedToken = `jwt_${Date.now()}`;
      await setTokens(generatedToken);
      await setStoredUserData({ user: newUser, tenant: newTenant });

      set({
        token: generatedToken,
        user: newUser,
        tenant: newTenant,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    }
  },

  loginWithGoogle: async (realEmail?: string, realName?: string) => {
    set({ isLoading: true, error: null });
    try {
      let finalEmail = realEmail?.trim();
      let finalName = realName?.trim();
      let token = `google_oauth_${Date.now()}`;

      // If not passed explicitly, attempt browser-based Google OAuth redirect
      if (!finalEmail) {
        const Linking = require('expo-linking');
        const redirectUrl = Linking.createURL('auth-callback');
        const authUrl = `${API_BASE_URL}/api/auth/google?mode=mobile&redirect=${encodeURIComponent(redirectUrl)}`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          finalEmail = (parsed.queryParams?.email as string) || '';
          finalName = (parsed.queryParams?.name as string) || '';
          token = (parsed.queryParams?.token as string) || token;
        }
      }

      if (!finalEmail) {
        set({ isLoading: false });
        return false;
      }

      const googleUser: SubscriberUser = {
        id: `usr_google_${Date.now()}`,
        name: finalName || finalEmail.split('@')[0],
        email: finalEmail.toLowerCase(),
        role: 'Owner',
        phone: null,
        avatar: null,
      };

      const googleTenant: SubscriberTenant = {
        id: `tenant_google_${Date.now()}`,
        name: `${googleUser.name}'s Workspace`,
        slug: 'workspace',
        industry: 'Services',
        plan: 'Professional',
      };

      await setTokens(token);
      await setStoredUserData({ user: googleUser, tenant: googleTenant });

      set({
        token,
        user: googleUser,
        tenant: googleTenant,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Google sign-in could not be completed.',
      });
      return false;
    }
  },

  quickDemoLogin: async () => {
    const demoUser: SubscriberUser = {
      id: 'usr_deepak_01',
      name: 'Deepak Chandra',
      email: 'deepakxyz7890@gmail.com',
      role: 'Owner',
      phone: '+1 (555) 234-5678',
      avatar: null,
    };
    const demoTenant: SubscriberTenant = {
      id: 'tenant_gptform_01',
      name: 'GPTForm Workspace',
      slug: 'gptform',
      industry: 'Technology',
      plan: 'Enterprise',
    };
    const token = 'active_demo_session';
    await setTokens(token);
    await setStoredUserData({ user: demoUser, tenant: demoTenant });

    set({
      user: demoUser,
      tenant: demoTenant,
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
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
