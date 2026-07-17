'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Lazy load all major components with error handling
const LandingPage = dynamic(
  () => import('@/components/landing/landing-page').then(m => ({ default: m.LandingPage })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const AuthPage = dynamic(
  () => import('@/components/auth/auth-page').then(m => ({ default: m.AuthPage })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const GoogleOnboarding = dynamic(
  () => import('@/components/auth/google-onboarding').then(m => ({ default: m.GoogleOnboarding })),
  { ssr: false, loading: () => <ViewLoader /> }
);
const SaaSOnboarding = dynamic(
  () => import('@/components/onboarding/saas-onboarding').then(m => ({ default: m.SaaSOnboarding })),
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

type UnauthView = 'landing' | 'auth';

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
  const [googleOnboarding, setGoogleOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Google OAuth callback URL parameters
  const [googleOnboardingData, setGoogleOnboardingData] = useState<{ email: string; name: string; avatar: string }>({ email: '', name: '', avatar: '' });

  const handleOAuthCallback = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const googleLogin = params.get('google_login');
      const googleOnboardingParam = params.get('google_onboarding');
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

      if (googleOnboardingParam === 'true') {
        const email = params.get('email') || '';
        const name = params.get('name') || '';
        const avatar = params.get('avatar') || '';
        setGoogleOnboardingData({ email, name, avatar });
        setGoogleOnboarding(true);
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
      const response = await fetch('/api/auth/me?XTransformPort=3000', { signal: controller.signal });
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
          } else if (data.user.isSuperAdmin || (data.user.role === 'admin' && !data.user.tenantId)) {
            useAppStore.getState().setCurrentView('superadmin');
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
      }
    } catch {
      // API failed or timed out, fall back to localStorage
    }

    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('serviceos_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.isAuthenticated && parsed.user) {
            setAuth({
              isAuthenticated: true,
              user: parsed.user,
              tenant: parsed.tenant || null,
            });
            // Auto-redirect based on role (for admin/superadmin in AppLayout)
            if (parsed.user.role === 'customer' || parsed.isCustomer) {
              // Customer portal layout handled by page.tsx based on role
            } else if (parsed.user.isSuperAdmin || (parsed.user.role === 'admin' && !parsed.user.tenantId)) {
              useAppStore.getState().setCurrentView('superadmin');
            }
            return;
          }
        }
      }
    } catch {
      // localStorage read failed
    }
  }, [setAuth]);

  useEffect(() => {
    const init = async () => {
      try {
        handleOAuthCallback();
        await checkSession();
      } catch (err) {
        console.error('Init error:', err);
      }
      setIsLoading(false);
    };
    init();
  }, [handleOAuthCallback, checkSession]);

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
        toast.success('Welcome to your customer portal!');
      } else if (user?.role === 'employee') {
        // Employee logged in — layout is handled by page.tsx
        toast.success('Welcome to your portal!');
      } else if (user?.isSuperAdmin || (user?.role === 'admin' && !user?.tenantId)) {
        // SuperAdmin user — redirect to superadmin dashboard
        useAppStore.getState().setCurrentView('superadmin');
        toast.success('Welcome, Super Admin!');
      } else if (!tenant || !tenant.onboardingCompleted) {
        // New user without a tenant — OR an existing tenant that hasn't
        // finished onboarding yet. The PATCH /api/tenants/[id] endpoint
        // detects the `onboardingCompleted: true` transition and auto-
        // populates the public Business Hub defaults at that moment.
        setShowOnboarding(true);
        toast.success('Welcome to ServiceOS! Let\'s set up your workspace.');
      } else {
        toast.success('Welcome to ServiceOS!');
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

  if (googleOnboarding && !auth.tenant) {
    return (
      <>
        <GoogleOnboarding
          email={googleOnboardingData.email || auth.user?.email || ''}
          name={googleOnboardingData.name || auth.user?.name || ''}
          avatar={googleOnboardingData.avatar || auth.user?.avatar || ''}
          onOnboardingComplete={(user: any, tenant?: any) => {
            setGoogleOnboarding(false);
            handleAuthSuccess(user, tenant);
          }}
          onBackToLanding={() => {
            setGoogleOnboarding(false);
          }}
        />
        <PWAInstallBanner />
        <IOSInstallBanner />
      </>
    );
  }

  if (showOnboarding && auth.isAuthenticated) {
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
