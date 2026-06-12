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
          if (typeof window !== 'undefined') {
            // Preserve existing token if available, or update with new one
            const existingAuth = localStorage.getItem('serviceos_auth');
            const existingToken = existingAuth ? JSON.parse(existingAuth).token : null;
            localStorage.setItem(
              'serviceos_auth',
              JSON.stringify({
                isAuthenticated: true,
                user: data.user,
                tenant: data.tenant || null,
                token: existingToken,
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
    setUnauthView('landing');
    toast.success('You have been signed out');
  }, [clearAuth]);

  const handleShowAuth = useCallback(() => {
    setUnauthView('auth');
  }, []);

  const handleShowLanding = useCallback(() => {
    setUnauthView('landing');
  }, []);

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
        const existingToken = existingAuth ? JSON.parse(existingAuth).token : null;
        localStorage.setItem('serviceos_auth', JSON.stringify({
          ...authData,
          token: existingToken,
        }));
      }

      if (user?.role === 'employee') {
        useAppStore.getState().setCurrentView('employeePortal');
        toast.success('Welcome to your portal!');
      } else if (!tenant) {
        // New user without a tenant — show onboarding
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
      />
      <PWAInstallBanner />
      <IOSInstallBanner />
    </>
  );
}
