import { create } from 'zustand';
import type { SubscriberUser, SubscriberTenant } from '@/types';
import { getToken, setTokens, clearTokens, getStoredUserData, setStoredUserData } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { API_PATHS, API_BASE_URL } from '@/lib/constants';
import { clearPushToken } from '@/lib/notifications';
import * as WebBrowser from 'expo-web-browser';

/**
 * Decode a JWT payload (without verification — the backend verifies the
 * signature on every API call; here we only need the `exp` / `originalIat`
 * claims to decide whether to proactively refresh).
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // React Native has no atob() for base64url — manually decode.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(b64)
        : (function () {
            // Minimal base64 decoder for React Native environments without atob.
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            let str = b64;
            let output = '';
            for (let bc = 0, bs: any, buffer: any, i = 0;
              (buffer = str.charAt(i++)) &&
              ~bs && (bc = bc % 4 ? bc * 64 + bs : bs);
              buffer && (bs = chars.indexOf(buffer))
            ) {
              if (bc % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
            }
            return output;
          })();
    // Handle UTF-8 characters in the payload.
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(json, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Proactively refresh the session token if it's expired (or close to it).
 * The backend `/api/auth/refresh` accepts tokens expired within a 7-day
 * grace window (signature always validated). Returns true if the session
 * is valid (either the token was still good, or a refresh succeeded).
 */
async function ensureValidSession(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined;

  // If the token is still valid (not expired) AND not within 1 hour of
  // expiry, no refresh needed.
  if (exp !== undefined && exp - nowSec > 3600) {
    return true;
  }

  // Token is expired OR expiring within 1 hour → proactive refresh.
  // Check the absolute session max (originalIat) before bothering the server.
  const originalIat = typeof payload.originalIat === 'number' ? payload.originalIat : undefined;
  if (originalIat !== undefined) {
    const sessionAgeDays = (nowSec - originalIat) / 86400;
    if (sessionAgeDays > 90) {
      // Beyond 90-day absolute max — can't refresh, must re-authenticate.
      await clearTokens();
      return false;
    }
  }

  try {
    const refreshToken = await (await import('@/lib/auth')).getRefreshToken();
    if (!refreshToken) return false;
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      return false;
    }
    const data = await res.json();
    if (data?.token) {
      await setTokens(data.token, data.refreshToken || data.token);
      // Refresh stored user/tenant in case the backend returned updated profile.
      if (data?.user) {
        await setStoredUserData({
          user: data.user,
          tenant: data.tenant || (await getStoredUserData())?.tenant || null,
        });
      }
      return true;
    }
    await clearTokens();
    return false;
  } catch {
    await clearTokens();
    return false;
  }
}

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
        // Decode the JWT `exp` claim and proactively refresh if the token
        // is expired (or within 1 hour of expiry). The backend accepts
        // tokens expired within a 7-day grace window (signature validated).
        // This fixes the "session expires every time" bug: a returning user
        // with an expired-but-grace-eligible token gets silently refreshed
        // instead of being kicked to the login screen on the first API call.
        const sessionValid = await ensureValidSession();
        if (sessionValid) {
          const refreshedToken = await getToken();
          set({
            user: stored.user,
            tenant: stored.tenant || null,
            token: refreshedToken || token,
            isAuthenticated: true,
            isBooted: true,
          });
        } else {
          // Refresh failed (token forged / beyond 90-day absolute max).
          set({
            user: null,
            tenant: null,
            token: null,
            isAuthenticated: false,
            isBooted: true,
          });
        }
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
