'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Lazy load all major components with error handling
const LandingPage = dynamic(
  () => import('@/components/landing/dual-audience-landing').then(m => ({ default: m.DualAudienceLanding })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const AuthPage = dynamic(
  () => import('@/components/auth/auth-page').then(m => ({ default: m.AuthPage })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const SaaSOnboarding = dynamic(
  () => import('@/components/onboarding/saas-onboarding').then(m => ({ default: m.SaaSOnboarding })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const SignupModeSelector = dynamic(
  () => import('@/components/onboarding/signup-mode-selector').then(m => ({ default: m.SignupModeSelector })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const ListingOnboarding = dynamic(
  () => import('@/components/onboarding/listing-onboarding').then(m => ({ default: m.ListingOnboarding })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const AppLayout = dynamic(
  () => import('@/components/layout/app-layout').then(m => ({ default: m.AppLayout })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const EmployeePortalLayout = dynamic(
  () => import('@/components/portals/employee-portal-layout').then(m => ({ default: m.EmployeePortalLayout })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const CustomerPortalLayout = dynamic(
  () => import('@/components/portals/customer-portal-layout').then(m => ({ default: m.CustomerPortalLayout })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const PWAInstallBanner = dynamic(
  () => import('@/components/pwa/pwa-install-banner').then(m => ({ default: m.PWAInstallBanner })),
  { ssr: false, loading: () => null }
);
const IOSInstallBanner = dynamic(
  () => import('@/components/pwa/pwa-install-banner').then(m => ({ default: m.IOSInstallBanner })),
  { ssr: false, loading: () => null }
);

import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/client-auth';

type UnauthView = 'landing' | 'auth';

/**
 * Quick client-side JWT expiry check (does NOT verify signature — that's the
 * server's job). Decodes the `exp` claim and returns true if it's in the past
 * or within a 30s safety margin. Used by `checkSession` to refuse trusting a
 * stale `isAuthenticated:true` from localStorage when the token itself is
 * expired. Returns false for malformed tokens (let the server reject them).
 */
function isTokenLikelyExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  const parts = token.split('.');
  if (parts.length !== 3) return true;
  try {
    // JWT payload is base64url — convert to base64, pad, then decode.
    let payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payloadB64.length % 4) payloadB64 += '=';
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp !== 'number') return false; // no exp claim — trust server
    // 30s clock-skew safety margin.
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp < nowSec + 30;
  } catch {
    return false; // malformed — let the API call decide
  }
}

/**
 * Detect a platform-level admin (SuperAdmin) — a user who manages the
 * PLATFORM itself, not a single tenant. Such users must NEVER see the
 * tenant onboarding wizard.
 *
 * IMPORTANT: This mirrors the CANONICAL superadmin check in
 * `src/lib/admin-auth.ts` (`isSuperAdminUser`). The backend uses that
 * function across ~15 API routes (support tickets, announcements, etc.),
 * so the frontend MUST agree on who a superadmin is — otherwise a user
 * recognized as superadmin by the backend could still see tenant-only
 * UI like the onboarding wizard.
 *
 * A user is a platform admin when ANY of these is true:
 *  - `isSuperAdmin` flag is explicitly true, OR
 *  - `role` is 'superadmin' or 'super_admin' (role ALONE is enough —
 *    the `isSuperAdmin` boolean flag may not be set for legacy users,
 *    and `tenantId` may be non-null for some superadmin records), OR
 *  - `role` is 'admin' AND `tenantId` is null/empty (legacy fallback
 *    for tenant-less admins created before the 'superadmin' role existed).
 *
 * Customers and employees live in separate tables and are never platform
 * admins, so they are excluded up-front by the caller.
 */
function isPlatformAdmin(user: any): boolean {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  const role = user.role;
  if (role === 'superadmin' || role === 'super_admin') return true;
  if (role === 'admin' && !user.tenantId) return true;
  return false;
}

function ViewLoader() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background">
      <div className="flex items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="text-xl font-semibold text-foreground">
          Loading ServiceOS...
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const {
    auth,
    setAuth,
    clearAuth,
    showOnboarding,
    setShowOnboarding,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [unauthView, setUnauthView] = useState<UnauthView>('landing');
  const [error, setError] = useState<string | null>(null);

  // Capture the `returnUrl` query param (set by the marketplace claim-this-
  // business sign-in gate) so we can redirect back to the provider detail
  // page after the visitor registers / logs in. Stored in a ref because it
  // must survive the URL-stripping replaceState below and be read once in
  // onAuthSuccess — it is NOT reactive state.
  const returnUrlRef = useRef<string | null>(null);

  // Which onboarding screen to show for a tenant whose onboarding isn't
  // complete yet:
  //   null             → not showing any onboarding screen
  //   'mode_selector'  → Step 0 decision screen (signupMode is null)
  //   'saas'           → full 4-step SaaSOnboarding wizard (signupMode='crm_trial')
  //   'listing'        → mini 1-step ListingOnboarding wizard (signupMode='listing_only')
  const [onboardingView, setOnboardingView] = useState<
    null | 'mode_selector' | 'saas' | 'listing'
  >(null);

  // Handle Google OAuth callback URL parameters.
  // NOTE: The old `?google_onboarding=true` param is no longer used — Google
  // users now create their tenant in the OAuth callback route and go straight
  // into the standard SaaS onboarding wizard (same as email/password signups).
  const handleOAuthCallback = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const googleLogin = params.get('google_login');
      const authError = params.get('auth_error');

      if (authError) {
        toast.error('Authentication failed', {
          description: decodeURIComponent(authError),
        });
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (googleLogin === 'success') {
        toast.success('Successfully signed in with Google!');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
    }
  }, []);

  // Check for existing session on mount
  const checkSession = useCallback(async () => {
    // ── Customer magic-link auto-login ────────────────────────────────────
    // Detect ?mgl=TOKEN in the URL on page load, exchange it for a session,
    // auto-authenticate the customer, and stash the redirect target for the
    // customer portal to consume on mount.
    if (typeof window !== 'undefined') {
      try {
        const mglParams = new URLSearchParams(window.location.search);
        const mgl = mglParams.get('mgl');
        const mglRedirect = mglParams.get('redirect') || '/';
        if (mgl) {
          try {
            const exchangeRes = await fetch(
              '/api/auth/customer/exchange-magic-link?XTransformPort=3000',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token: mgl }),
              }
            );
            if (exchangeRes.ok) {
              const data = await exchangeRes.json();
              if (data.user) {
                setAuth({
                  isAuthenticated: true,
                  user: data.user,
                  tenant: data.tenant || null,
                });
                // Save the redirect target for the portal to consume after mount
                try {
                  sessionStorage.setItem('mgl_redirect', mglRedirect);
                } catch {
                  // sessionStorage unavailable — portal will default to dashboard
                }
                // Strip the mgl + redirect params from the URL
                window.history.replaceState({}, '', window.location.pathname);
                // Persist auth to localStorage (mirror the existing shape)
                localStorage.setItem(
                  'serviceos_auth',
                  JSON.stringify({
                    isAuthenticated: true,
                    user: data.user,
                    tenant: data.tenant || null,
                    token: data.token,
                    isCustomer: true,
                  })
                );
                // Session is set — skip the normal /api/auth/me flow
                return;
              }
            } else {
              // 404 = token not found, 410 = expired, etc. — surface the
              // failure to the user, strip the bad params, and fall through
              // to the normal /api/auth/me flow so they see the landing page.
              const errBody = await exchangeRes.json().catch(() => ({}));
              console.error(
                '[magic-link] exchange failed:',
                exchangeRes.status,
                errBody?.error
              );
              toast.error('Magic link invalid or expired', {
                description: 'Please sign in normally to continue.',
              });
              window.history.replaceState({}, '', window.location.pathname);
            }
          } catch (mglErr) {
            console.error('[magic-link] detection error:', mglErr);
            // Fall through to the normal /api/auth/me flow
          }
        }
      } catch {
        // URL parsing failed — fall through to the normal flow
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      // Use authFetch so the Bearer token is sent alongside the cookie.
      // Plain fetch() only sent the cookie — when the cookie expired but the
      // user still had a (also expired) JWT in localStorage, /api/auth/me
      // returned 200 with {user:null}, and the old code then fell through to
      // localStorage and trusted `isAuthenticated:true`, leaving the user in
      // a zombie-auth state where every subsequent API call 401'd. This is the
      // root cause of "Failed to load team timesheet" + plan-features blanks.
      const response = await authFetch('/api/auth/me?XTransformPort=3000', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setAuth({
            isAuthenticated: true,
            user: data.user,
            tenant: data.tenant || null,
          });
          // Auto-redirect based on role (for admin/superadmin in AppLayout)
          if (data.user.role === 'customer') {
            // Customer portal layout handled by page.tsx based on role
          } else if (isPlatformAdmin(data.user)) {
            useAppStore.getState().setCurrentView('superadmin');
          }
          // Trigger onboarding if the tenant hasn't completed it. Decide
          // WHICH screen based on signupMode (Step 0 / SaaS wizard / listing
          // mini wizard). Platform admins / customers / employees skip it.
          if (
            data.tenant &&
            !data.tenant.onboardingCompleted &&
            !isPlatformAdmin(data.user) &&
            data.user.role !== 'customer' &&
            data.user.role !== 'employee'
          ) {
            const sm = (data.tenant as any)?.signupMode as string | null | undefined;
            if (sm === 'listing_only') {
              setOnboardingView('listing');
            } else if (sm === 'crm_trial') {
              setOnboardingView('saas');
            } else {
              setOnboardingView('mode_selector');
            }
            setShowOnboarding(false);
          } else if (isPlatformAdmin(data.user)) {
            setShowOnboarding(false);
            setOnboardingView(null);
          }
          if (typeof window !== 'undefined') {
            // Preserve existing token if available, or update with new one
            const existingAuth = localStorage.getItem('serviceos_auth');
            const existingData = existingAuth ? JSON.parse(existingAuth) : {};
            localStorage.setItem(
              'serviceos_auth',
              JSON.stringify({
                isAuthenticated: true,
                user: data.user,
                tenant: data.tenant || null,
                token: existingData.token,
                portalToken: existingData.portalToken,
                isCustomer: existingData.isCustomer || data.user.role === 'customer',
              })
            );
          }
          return;
        }
        // /api/auth/me returned 200 with {user: null} — the session cookie
        // AND/OR the Bearer token is expired/invalid. The server has
        // authoritatively told us "you are not logged in". Do NOT fall
        // through to localStorage (which may hold a stale `isAuthenticated:
        // true` from a previous session) — that's the zombie-auth bug.
        // Clear any stale auth + token and let the landing page render.
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('serviceos_auth');
            localStorage.removeItem('serviceos_token');
          } catch {
            // localStorage unavailable — nothing to clear
          }
        }
        clearAuth();
        return;
      }
      // Non-200 (e.g. 401) — same treatment: don't trust stale localStorage.
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('serviceos_auth');
          localStorage.removeItem('serviceos_token');
        } catch {
          // ignore
        }
      }
      clearAuth();
      return;
    } catch {
      // API failed or timed out (network error / abort). In this case ONLY,
      // it's reasonable to fall back to localStorage so an offline-first PWA
      // still works. But we must verify the stored token isn't obviously
      // expired before trusting it.
    }

    // Network-failure fallback ONLY (not the "server said no" path).
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('serviceos_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Defensive: verify the JWT is not expired before trusting it.
          // A stale `isAuthenticated:true` with an expired token is the
          // exact bug that caused the timesheet + plan-features failures.
          if (parsed.isAuthenticated && parsed.user && parsed.token) {
            if (!isTokenLikelyExpired(parsed.token)) {
              setAuth({
                isAuthenticated: true,
                user: parsed.user,
                tenant: parsed.tenant || null,
              });
              if (parsed.user.role === 'customer' || parsed.isCustomer) {
                // Customer portal layout handled by page.tsx based on role
              } else if (isPlatformAdmin(parsed.user)) {
                useAppStore.getState().setCurrentView('superadmin');
              }
              if (
                parsed.tenant &&
                !parsed.tenant.onboardingCompleted &&
                !isPlatformAdmin(parsed.user) &&
                parsed.user.role !== 'customer' &&
                parsed.user.role !== 'employee'
              ) {
                const sm = (parsed.tenant as any)?.signupMode as string | null | undefined;
                if (sm === 'listing_only') {
                  setOnboardingView('listing');
                } else if (sm === 'crm_trial') {
                  setOnboardingView('saas');
                } else {
                  setOnboardingView('mode_selector');
                }
                setShowOnboarding(false);
              } else if (isPlatformAdmin(parsed.user)) {
                setShowOnboarding(false);
                setOnboardingView(null);
              }
              return;
            }
            // Token is expired — clear the stale auth so the user sees login.
            try {
              localStorage.removeItem('serviceos_auth');
              localStorage.removeItem('serviceos_token');
            } catch {
              // ignore
            }
            clearAuth();
          }
        }
      }
    } catch {
      // localStorage read failed
    }
  }, [setAuth, setShowOnboarding, clearAuth]);

  useEffect(() => {
    const init = async () => {
      try {
        handleOAuthCallback();

        // Deep-link from marketplace "List your business" CTA, or from the
        // claim-this-business sign-in gate → auto-open auth. The CTA links to
        // /?auth=register (or /?auth=login); we read it here and switch to the
        // auth view so the user lands directly on the form.
        // The optional `returnUrl` param (set by the claim sign-in gate) is
        // captured into a ref so onAuthSuccess can redirect back to the
        // provider detail page after a successful login / registration.
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('auth') === 'register' || params.get('auth') === 'login') {
            const ru = params.get('returnUrl');
            if (ru) returnUrlRef.current = ru;
            setUnauthView('auth');
            // Strip the auth + returnUrl params so a refresh returns to the
            // landing page. returnUrl is already safely in the ref.
            params.delete('auth');
            params.delete('returnUrl');
            const cleanUrl = params.toString()
              ? `${window.location.pathname}?${params.toString()}`
              : window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);
          }
        }

        await checkSession();
      } catch (err) {
        console.error('Init error:', err);
      }
      setIsLoading(false);
    };
    init();
  }, [handleOAuthCallback, checkSession]);

  // ── Deep-link view switching (?view=...) ─────────────────────────────────
  // Notification actionUrls look like "/?view=liveChat" or "/?view=jobs".
  // When an authenticated admin/owner clicks one, we switch to that view
  // and strip the param so a refresh doesn't re-trigger it.
  //
  // This runs AFTER auth is confirmed (auth.isAuthenticated is true) so the
  // AppLayout is mounted and ready to receive setCurrentView. We deliberately
  // skip this for customer / employee / superadmin roles — their layouts
  // either ignore setCurrentView or use a different navigation model, and
  // applying a tenant view to them would be a no-op at best.
  useEffect(() => {
    if (!auth.isAuthenticated || typeof window === 'undefined') return;
    const userRole = auth.user?.role;
    const isPortalUser =
      userRole === 'customer' ||
      (auth.user as any)?.isCustomer ||
      userRole === 'employee';
    const isSuperAdmin =
      (auth.user as any)?.isSuperAdmin ||
      (userRole === 'admin' && !auth.user?.tenantId);
    if (isPortalUser || isSuperAdmin) return;

    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (!view) return;

    // Apply + strip. Use replaceState so we don't create a new history entry
    // (pressing browser-back should leave the app, not re-strip the param).
    useAppStore.getState().setCurrentView(view);
    const paramsCopy = new URLSearchParams(params);
    paramsCopy.delete('view');
    const remaining = paramsCopy.toString();
    const newUrl = remaining
      ? `${window.location.pathname}?${remaining}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [auth.isAuthenticated, auth.user]);

  // Global error handler
  useEffect(() => {
    let chunkRetryCount = 0;
    const MAX_CHUNK_RETRIES = 2;

    const handleError = (event: ErrorEvent) => {
      console.error('Client-side error:', event.error);
      const msg = event.error?.message || '';
      if ((msg.includes('Failed to load chunk') || msg.includes('ChunkLoadError')) && chunkRetryCount < MAX_CHUNK_RETRIES) {
        chunkRetryCount++;
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      if (!msg.includes('Failed to load chunk') && !msg.includes('ChunkLoadError')) {
        setError(msg || 'An unexpected error occurred');
      }
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason);
      const msg = event.reason?.message || '';
      if ((msg.includes('Failed to load chunk') || msg.includes('ChunkLoadError')) && chunkRetryCount < MAX_CHUNK_RETRIES) {
        chunkRetryCount++;
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout?XTransformPort=3000', { method: 'POST' });
    } catch {
      // API logout failed
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('serviceos_auth');
    }

    clearAuth();
    useAppStore.getState().setCurrentView('dashboard'); // Reset view
    setUnauthView('landing');
    toast.success('You have been signed out');
  }, [clearAuth]);

  const handleShowAuth = useCallback(() => {
    setUnauthView('auth');
  }, []);

  const handleShowLanding = useCallback(() => {
    setUnauthView('landing');
  }, []);

  const handleTryDemo = useCallback(async () => {
    try {
      toast.loading('Setting up your live demo...', { id: 'demo-login' });
      const response = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.dismiss('demo-login');
        toast.error(err.error || 'Failed to start demo. Please try again.');
        return;
      }

      const data = await response.json();

      // Set auth state
      const authData = {
        isAuthenticated: true,
        user: data.user,
        tenant: data.tenant || null,
      };
      setAuth(authData);

      // Store in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('serviceos_auth', JSON.stringify({
          ...authData,
          token: data.token,
          isDemo: true,
        }));
      }

      toast.dismiss('demo-login');
      toast.success('Welcome to the ABC Plumbing demo! Explore everything freely.', {
        duration: 5000,
      });
    } catch (err) {
      toast.dismiss('demo-login');
      toast.error('Something went wrong. Please try again.');
      console.error('Demo login error:', err);
    }
  }, [setAuth]);

  const handleAuthSuccess = useCallback(
    (user: any, tenant?: any) => {
      const authData = {
        isAuthenticated: true,
        user,
        tenant: tenant || null,
      };
      setAuth(authData);

      if (typeof window !== 'undefined') {
        // Preserve the token that was already stored by the login/register handler
        const existingAuth = localStorage.getItem('serviceos_auth');
        const existingData = existingAuth ? JSON.parse(existingAuth) : {};
        localStorage.setItem('serviceos_auth', JSON.stringify({
          ...authData,
          token: existingData.token,
          portalToken: existingData.portalToken,
          isCustomer: existingData.isCustomer || user?.role === 'customer',
        }));
      }

      if (user?.role === 'customer') {
        // Customer logged in via WhatsApp OTP — layout is handled by page.tsx
        setShowOnboarding(false);
        setOnboardingView(null);
        toast.success('Welcome to your customer portal!');
      } else if (user?.role === 'employee') {
        // Employee logged in — layout is handled by page.tsx
        setShowOnboarding(false);
        setOnboardingView(null);
        toast.success('Welcome to your portal!');
      } else if (isPlatformAdmin(user)) {
        // SuperAdmin / platform admin — redirect to superadmin dashboard.
        // Explicitly clear any stale onboarding flag so the wizard can never
        // appear for a platform admin (it is a tenant-only flow).
        setShowOnboarding(false);
        setOnboardingView(null);
        useAppStore.getState().setCurrentView('superadmin');
        toast.success('Welcome, Super Admin!');
      } else if (!tenant || !tenant.onboardingCompleted) {
        // New user without a tenant — OR an existing tenant that hasn't
        // finished onboarding yet. Decide WHICH onboarding screen to show
        // based on the tenant's signupMode:
        //   null / undefined → Step 0 decision screen (fresh registration)
        //   'crm_trial'      → full 4-step SaaSOnboarding wizard
        //   'listing_only'   → mini 1-step ListingOnboarding wizard
        const sm = (tenant as any)?.signupMode as string | null | undefined;
        if (sm === 'listing_only') {
          setOnboardingView('listing');
        } else if (sm === 'crm_trial') {
          setOnboardingView('saas');
        } else {
          setOnboardingView('mode_selector');
        }
        setShowOnboarding(false); // we use onboardingView, not showOnboarding
        toast.success('Welcome to ServiceOS! Let\'s set up your workspace.');
      } else {
        setShowOnboarding(false);
        setOnboardingView(null);
        toast.success('Welcome to ServiceOS!');
      }

      // If the user arrived via the claim-this-business sign-in gate, they
      // have a returnUrl pointing back to the provider detail page. Redirect
      // them there now (after auth, before the app layout renders) so they
      // can complete the claim. This runs for authenticated non-customer /
      // non-employee / non-superadmin users whose onboarding is already
      // complete — for those still needing onboarding, the returnUrl is
      // preserved in the ref and consumed after onboarding finishes.
      const ru = returnUrlRef.current;
      if (ru && typeof window !== 'undefined') {
        returnUrlRef.current = null;
        // Use a short timeout so the auth state + toasts settle before nav.
        setTimeout(() => {
          window.location.href = ru;
        }, 600);
      }
    },
    [setAuth, setShowOnboarding]
  );

  // Don't render anything until client-side mounted
  if (isLoading) {
    return <ViewLoader />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Onboarding screens (Step 0 mode selector / SaaS wizard / listing mini
  // wizard) are TENANT-only flows. Platform admins, customers, and employees
  // must never see them. This role check is the final safety net on top of
  // the explicit setOnboardingView(null) calls elsewhere.
  const isPlatformAdminUser = isPlatformAdmin(auth.user);
  const isPortalRoleUser =
    auth.user?.role === 'customer' ||
    (auth.user as any)?.isCustomer ||
    auth.user?.role === 'employee';
  if (
    onboardingView &&
    auth.isAuthenticated &&
    !isPlatformAdminUser &&
    !isPortalRoleUser
  ) {
    // Step 0: signup mode decision screen
    if (onboardingView === 'mode_selector') {
      return (
        <>
          <SignupModeSelector
            tenant={auth.tenant as any}
            user={auth.user as any}
            onChooseCrm={() => setOnboardingView('saas')}
            onChooseListing={() => setOnboardingView('listing')}
          />
          <PWAInstallBanner />
          <IOSInstallBanner />
        </>
      );
    }
    // Full 4-step SaaS onboarding wizard (CRM trial path)
    if (onboardingView === 'saas') {
      return (
        <>
          <SaaSOnboarding
            tenant={auth.tenant}
            user={auth.user}
            onComplete={() => {
              setShowOnboarding(false);
              setOnboardingView(null);
            }}
          />
          <PWAInstallBanner />
          <IOSInstallBanner />
        </>
      );
    }
    // Mini 1-step listing onboarding wizard (listing-only path)
    if (onboardingView === 'listing') {
      return (
        <>
          <ListingOnboarding
            tenant={auth.tenant as any}
            user={auth.user as any}
            onComplete={() => {
              setOnboardingView(null);
              // Land the listing-only provider on their marketplace dashboard
              useAppStore.getState().setCurrentView('marketplaceDashboard');
            }}
          />
          <PWAInstallBanner />
          <IOSInstallBanner />
        </>
      );
    }
  }
  // Legacy safety net: if showOnboarding is somehow still true (stale state
  // from before the onboardingView refactor), fall back to the SaaS wizard.
  if (
    showOnboarding &&
    auth.isAuthenticated &&
    !isPlatformAdminUser &&
    !isPortalRoleUser
  ) {
    return (
      <>
        <SaaSOnboarding
          tenant={auth.tenant}
          user={auth.user}
          onComplete={() => {
            setShowOnboarding(false);
          }}
        />
        <PWAInstallBanner />
        <IOSInstallBanner />
      </>
    );
  }

  if (auth.isAuthenticated) {
    // Role-based layout rendering
    const userRole = auth.user?.role;
    const isCustomer = userRole === 'customer' || (auth.user as any)?.isCustomer;

    if (isCustomer) {
      return (
        <>
          <CustomerPortalLayout onLogout={handleLogout} />
          <PWAInstallBanner />
          <IOSInstallBanner />
        </>
      );
    }

    if (userRole === 'employee') {
      return (
        <>
          <EmployeePortalLayout onLogout={handleLogout} />
          <PWAInstallBanner />
          <IOSInstallBanner />
        </>
      );
    }

    // Default: Admin/Owner/SuperAdmin — use main AppLayout
    return (
      <>
        <AppLayout onLogout={handleLogout} />
        <PWAInstallBanner />
        <IOSInstallBanner />
      </>
    );
  }

  if (unauthView === 'auth') {
    return (
      <>
        <AuthPage
          onAuthSuccess={handleAuthSuccess}
          onBackToLanding={handleShowLanding}
        />
        <PWAInstallBanner />
        <IOSInstallBanner />
      </>
    );
  }

  return (
    <>
      <LandingPage
        onGetStarted={handleShowAuth}
        onSignIn={handleShowAuth}
        onTryDemo={handleTryDemo}
      />
      <PWAInstallBanner />
      <IOSInstallBanner />
    </>
  );
}
