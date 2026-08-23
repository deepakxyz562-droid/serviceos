/**
 * Fieseros Mobile App — Auth Store (Zustand)
 *
 * Holds the current user, role, tenant/company, and auth state.
 *
 * CUSTOMER PORTAL — 4 auth paths matching the PWA (customer-portal-layout.tsx):
 *   1. OTP            — phone → send-otp → verify-otp (WhatsApp OTP, not email)
 *   2. Password       — identifier (email OR phone) + password → /api/auth/customer/login
 *      • If customer belongs to multiple companies and no tenantId provided →
 *        API returns 409 with { multiCompany: true, companies: [...] }.
 *        The store surfaces this via `multiCompanyConflict` so the UI can show
 *        a company picker; the user picks one and we re-call with tenantId.
 *   3. Magic link     — token → /api/auth/customer/exchange-magic-link
 *                       (deep-linked from email as fieseros://?mgl=TOKEN)
 *   4. Activation     — activation token + new password → /api/auth/customer/activate
 *
 * Before any of the above, the customer can call `discoverCompanies(identifier)`
 * to look up which companies they belong to. This powers the "company picker"
 * pre-login step.
 *
 * EMPLOYEE PORTAL — direct login (no company selection):
 *   - Staff log in with email + password ONLY. No CompanyFinder step.
 *   - POST /api/auth/login { email, password } — the backend resolves
 *     the tenant automatically from User.tenantId.
 *   - The tenant/company is determined server-side from the authenticated
 *     session, NOT supplied by the mobile client (security requirement).
 */

import { create } from 'zustand';
import type {
  User,
  UserRole,
  Tenant,
  Company,
  DiscoverResult,
  MultiCompanyConflict,
} from '@/types';
import {
  getToken,
  setTokens,
  clearTokens,
  getStoredUserData,
  setStoredUserData,
  getActiveRole,
  setActiveRole,
  getLastCompanySlug,
  setLastCompanySlug,
  getLastCompanyData,
  setLastCompanyData,
  clearLastCompany,
} from '@/lib/auth';
import { api } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { emitter } from '@/lib/event-emitter';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  tenant: Tenant | null;
  lastCompany: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isBooted: boolean;
  error: string | null;
  /** Set when /api/auth/customer/login returns 409 multiCompany. */
  multiCompanyConflict: MultiCompanyConflict | null;

  // ── Company / tenant discovery (pre-login) ──────────────────────────
  searchCompanies: (q: string) => Promise<Company[]>;
  resolveCompany: (slug: string) => Promise<Company | null>;
  discoverCustomerCompanies: (identifier: string) => Promise<DiscoverResult>;
  setLastCompany: (company: Company) => void;
  loadLastCompany: () => Promise<Company | null>;
  clearMultiCompanyConflict: () => void;

  // ── Employee ────────────────────────────────────────────────────────
  loginStaff: (email: string, password: string) => Promise<void>;

  // ── Customer — OTP (phone, WhatsApp) ────────────────────────────────
  requestCustomerOtp: (phone: string) => Promise<void>;
  loginCustomerOtp: (phone: string, otp: string) => Promise<void>;

  // ── Customer — password ─────────────────────────────────────────────
  loginCustomerPassword: (
    identifier: string,
    password: string,
    tenantId?: string | null
  ) => Promise<void>;

  // ── Customer — magic link ───────────────────────────────────────────
  exchangeMagicLink: (token: string) => Promise<void>;

  // ── Customer — activation ───────────────────────────────────────────
  activateCustomer: (token: string, password: string) => Promise<void>;

  // ── Shared ──────────────────────────────────────────────────────────
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setRole: (role: UserRole) => void;
  updateUser: (patch: Partial<User>) => void;
  clearError: () => void;
}

function extractToken(res: { token?: string; accessToken?: string }): string | null {
  return res.token || res.accessToken || null;
}

function deriveRole(user: User): UserRole {
  const r = (user.role || '').toUpperCase();
  if (r === 'CUSTOMER') return 'customer';
  return 'employee';
}

/**
 * Convert the API's `tenant` object (returned by login endpoints) into the
 * shape used by the app's Tenant type. Handles both `logo` and `logoUrl`.
 * Captures `currency` so callers (expenses, line items) can format amounts
 * with the tenant-configured currency instead of hardcoding USD.
 */
function toTenant(raw: unknown): Tenant | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  return {
    id: String(t.id ?? ''),
    name: String(t.name ?? ''),
    slug: String(t.slug ?? ''),
    logo: (t.logo as string | null) ?? null,
    logoUrl: (t.logo as string | null) ?? null,
    industry: (t.industry as string | null) ?? null,
    email: (t.email as string | null) ?? null,
    phone: (t.phone as string | null) ?? null,
    country: (t.country as string | null) ?? null,
    city: (t.city as string | null) ?? null,
    address: (t.address as string | null) ?? null,
    currency: (t.currency as string | null) ?? null,
    plan: (t.plan as string | null) ?? null,
    onboardingCompleted:
      typeof t.onboardingCompleted === 'boolean' ? t.onboardingCompleted : null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  tenant: null,
  lastCompany: null,
  isLoading: false,
  isAuthenticated: false,
  isBooted: false,
  error: null,
  multiCompanyConflict: null,

  // ─────────────────────────────────────────────────────────────────────
  // Company / tenant discovery (pre-login)
  // ─────────────────────────────────────────────────────────────────────

  searchCompanies: async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];
    try {
      const res = await api.get<{ companies: Company[] }>(API_PATHS.companiesSearch, {
        q: trimmed,
      });
      return res?.companies ?? [];
    } catch (error) {
      console.error('[auth] searchCompanies failed:', error);
      return [];
    }
  },

  resolveCompany: async (slug) => {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    try {
      const res = await api.get<{ found: boolean; company?: Company }>(
        API_PATHS.companiesResolve,
        { slug: normalized }
      );
      if (res?.found && res.company) {
        const company = res.company;
        await setLastCompanySlug(company.slug);
        await setLastCompanyData(company);
        set({ lastCompany: company });
        return company;
      }
      return null;
    } catch (error) {
      console.error('[auth] resolveCompany failed:', error);
      return null;
    }
  },

  discoverCustomerCompanies: async (identifier) => {
    const res = await api.post<DiscoverResult>(
      API_PATHS.customerDiscover,
      { identifier },
      { skipAuth: true }
    );
    return res;
  },

  setLastCompany: (company) => {
    setLastCompanySlug(company.slug);
    setLastCompanyData(company);
    set({ lastCompany: company });
  },

  loadLastCompany: async () => {
    const existing = get().lastCompany;
    if (existing) return existing;
    const data = (await getLastCompanyData()) as Company | null;
    if (data) {
      set({ lastCompany: data });
      return data;
    }
    const slug = await getLastCompanySlug();
    if (slug) {
      const resolved = await get().resolveCompany(slug);
      return resolved;
    }
    return null;
  },

  clearMultiCompanyConflict: () => set({ multiCompanyConflict: null }),

  // ─────────────────────────────────────────────────────────────────────
  // Employee — company-scoped login
  // ─────────────────────────────────────────────────────────────────────

  loginStaff: async (email, password) => {
    set({ isLoading: true, error: null, multiCompanyConflict: null });
    try {
      // Direct login — no company/slug required. The backend resolves the
      // tenant from User.tenantId automatically. This removes the CompanyFinder
      // step from the employee login flow per the PWA parity directive.
      const response = await api.post<{
        token?: string;
        accessToken?: string;
        user?: User;
        tenant?: unknown;
      }>(
        API_PATHS.directLogin,
        { email: email.trim(), password },
        { skipAuth: true }
      );

      const token = extractToken(response);
      if (!token || !response.user) throw new Error('Invalid response from server');

      await setTokens(token);
      await setStoredUserData(response.user);
      await setActiveRole('employee');

      const tenant = toTenant(response.tenant);
      set({
        user: response.user,
        role: 'employee',
        tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // Customer — OTP (phone, WhatsApp)
  // ─────────────────────────────────────────────────────────────────────

  requestCustomerOtp: async (phone) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(
        API_PATHS.customerSendOtp,
        { phone: phone.trim() },
        { skipAuth: true }
      );
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP',
      });
      throw error;
    }
  },

  loginCustomerOtp: async (phone, otp) => {
    set({ isLoading: true, error: null, multiCompanyConflict: null });
    try {
      const response = await api.post<{
        token?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
        tenant?: unknown;
      }>(
        API_PATHS.customerVerifyOtp,
        { phone: phone.trim(), otpCode: otp },
        { skipAuth: true }
      );

      const token = extractToken(response);
      if (!token || !response.user) throw new Error('Invalid response from server');

      await setTokens(token, response.refreshToken);
      await setStoredUserData(response.user);
      await setActiveRole('customer');

      const tenant = toTenant(response.tenant);
      set({
        user: response.user,
        role: 'customer',
        tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'OTP verification failed',
      });
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // Customer — password (handles 409 multi-company)
  // ─────────────────────────────────────────────────────────────────────

  loginCustomerPassword: async (identifier, password, tenantId) => {
    set({ isLoading: true, error: null, multiCompanyConflict: null });
    try {
      const body: Record<string, unknown> = {
        identifier: identifier.trim(),
        password,
      };
      if (tenantId) body.tenantId = tenantId;

      const response = await api.post<{
        token?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
        tenant?: unknown;
      }>(API_PATHS.customerLogin, body, { skipAuth: true });

      const token = extractToken(response);
      if (!token || !response.user) throw new Error('Invalid response from server');

      await setTokens(token, response.refreshToken);
      await setStoredUserData(response.user);
      await setActiveRole('customer');

      const tenant = toTenant(response.tenant);
      set({
        user: response.user,
        role: 'customer',
        tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // The api client throws ApiRequestError with statusCode + body.
      // For 409 multi-company, body contains { multiCompany: true, companies: [...] }.
      const anyErr = error as { statusCode?: number; body?: unknown };
      if (anyErr?.statusCode === 409 && anyErr?.body) {
        const conflict = anyErr.body as MultiCompanyConflict;
        if (conflict?.multiCompany && Array.isArray(conflict.companies)) {
          set({
            isLoading: false,
            multiCompanyConflict: conflict,
            error: conflict.error || 'Multiple companies found.',
          });
          return;
        }
      }
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // Customer — magic link
  // ─────────────────────────────────────────────────────────────────────

  exchangeMagicLink: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{
        token?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
        tenant?: unknown;
      }>(API_PATHS.customerMagicLink, { token }, { skipAuth: true });

      const accessToken = extractToken(response);
      if (!accessToken || !response.user) throw new Error('Invalid magic link');

      await setTokens(accessToken, response.refreshToken);
      await setStoredUserData(response.user);
      await setActiveRole('customer');

      const tenant = toTenant(response.tenant);
      set({
        user: response.user,
        role: 'customer',
        tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Magic link exchange failed',
      });
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // Customer — activation
  // ─────────────────────────────────────────────────────────────────────

  activateCustomer: async (token, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{
        token?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
        tenant?: unknown;
      }>(API_PATHS.customerActivate, { token, password }, { skipAuth: true });

      const accessToken = extractToken(response);
      if (!accessToken || !response.user) throw new Error('Activation failed');

      await setTokens(accessToken, response.refreshToken);
      await setStoredUserData(response.user);
      await setActiveRole('customer');

      const tenant = toTenant(response.tenant);
      set({
        user: response.user,
        role: 'customer',
        tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Activation failed',
      });
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // Shared
  // ─────────────────────────────────────────────────────────────────────

  logout: async () => {
    try {
      await api.post(API_PATHS.authLogout).catch(() => {});
    } finally {
      await clearTokens();
      await clearLastCompany();
      emitter.emit('auth:logout');
      set({
        user: null,
        role: null,
        tenant: null,
        lastCompany: null,
        isAuthenticated: false,
        error: null,
        multiCompanyConflict: null,
      });
    }
  },

  bootstrap: async () => {
    const token = await getToken();
    if (!token) {
      set({ isAuthenticated: false, isLoading: false, isBooted: true });
      // Fire-and-forget: preload last company so the login screen can show it.
      get().loadLastCompany().catch(() => {});
      return;
    }

    try {
      // `/api/auth/me` returns an ENVELOPE: { user, tenant, authenticated }
      // (see src/app/api/auth/me/route.ts). The previous implementation stored
      // the whole envelope as `state.user`, which made `user.role` undefined
      // and crashed the Profile screen (formatRole → role.toLowerCase()).
      // We unwrap here so `state.user` is the real User object and
      // `state.tenant` carries the tenant (including `currency`).
      const res = await api.get<{
        user?: User;
        tenant?: unknown;
        authenticated?: boolean;
      }>(API_PATHS.authMe);

      // Defensive: support both envelope and bare-user shapes in case the
      // backend ever changes (or an interceptor unwraps).
      const user: User | null =
        (res && res.user) || (res as unknown as User) || null;
      const tenant: Tenant | null =
        res && res.tenant ? toTenant(res.tenant) : null;

      if (!user) {
        throw new Error('No user in /api/auth/me response');
      }

      const stored = (await getStoredUserData()) as User | null;
      const persistedRole = await getActiveRole();
      const role: UserRole =
        user.role === 'CUSTOMER'
          ? 'customer'
          : persistedRole || (stored?.role === 'CUSTOMER' ? 'customer' : 'employee');

      await setStoredUserData(user);
      set({
        user,
        role,
        tenant,
        isAuthenticated: true,
        isLoading: false,
        isBooted: true,
      });
    } catch {
      await clearTokens();
      set({ isAuthenticated: false, isLoading: false, isBooted: true });
    }

    // Preload last company in the background (used by login screen).
    get().loadLastCompany().catch(() => {});
  },

  setRole: (role) => {
    setActiveRole(role);
    set({ role });
  },

  updateUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...patch };
    setStoredUserData(updated);
    set({ user: updated });
  },

  clearError: () => set({ error: null }),
}));
