'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Lazy load all major components to reduce memory
const LandingPage = dynamic(() => import('@/components/landing/landing-page').then(m => ({ default: m.LandingPage })), { ssr: false });
const AuthPage = dynamic(() => import('@/components/auth/auth-page').then(m => ({ default: m.AuthPage })), { ssr: false });
const GoogleOnboarding = dynamic(() => import('@/components/auth/google-onboarding').then(m => ({ default: m.GoogleOnboarding })), { ssr: false });
const SaaSOnboarding = dynamic(() => import('@/components/onboarding/saas-onboarding').then(m => ({ default: m.SaaSOnboarding })), { ssr: false });
const AppLayout = dynamic(() => import('@/components/layout/app-layout').then(m => ({ default: m.AppLayout })), { ssr: false });

import { useAppStore } from '@/store/app-store';

type UnauthView = 'landing' | 'auth';

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
  const [mounted, setMounted] = useState(false);

  // Ensure we only render on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Google OAuth callback URL parameters
  const handleOAuthCallback = useCallback(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const googleLogin = params.get('google_login');
    const googleOnboardingParam = params.get('google_onboarding');
    const authError = params.get('auth_error');

    if (authError) {
      const decodedError = decodeURIComponent(authError);
      // Show longer duration for configuration errors that need user action
      const isConfigError = decodedError.includes('redirect_uri_mismatch') || decodedError.includes('not configured');
      toast.error('Authentication failed', {
        description: decodedError,
        duration: isConfigError ? 15000 : 5000,
      });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (googleLogin === 'success') {
      toast.success('Successfully signed in with Google!');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (googleOnboardingParam === 'true') {
      setGoogleOnboarding(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check for existing session on mount
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me?XTransformPort=3000');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setAuth({
            isAuthenticated: true,
            user: data.user,
            tenant: data.tenant || null,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'serviceos_auth',
              JSON.stringify({
                isAuthenticated: true,
                user: data.user,
                tenant: data.tenant || null,
              })
            );
          }
          return;
        }
      }
    } catch {
      // API failed, fall back to localStorage
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
      handleOAuthCallback();
      await checkSession();
      setIsLoading(false);
    };
    init();
  }, [handleOAuthCallback, checkSession]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout?XTransformPort=3000', { method: 'POST' });
    } catch {
      // API logout failed
    }

    if (typeof window !== 'undefined') {
      // Clear all possible auth-related localStorage keys
      localStorage.removeItem('serviceos_auth');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      localStorage.removeItem('serviceos_user');
      localStorage.removeItem('serviceos_tenant');
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
        localStorage.setItem('serviceos_auth', JSON.stringify(authData));
      }

      if (user?.role === 'employee' || user?.role === 'technician') {
        useAppStore.getState().setCurrentView('employeePortal');
        toast.success('Welcome to your portal!');
      } else if (user?.isSuperAdmin === true) {
        // SuperAdmin — show Platform Admin dashboard
        useAppStore.getState().setCurrentView('superAdmin');
        toast.success('Welcome, Platform Admin!');
      } else {
        toast.success('Welcome to ServiceOS!');
      }
    },
    [setAuth]
  );

  // Don't render anything until client-side mounted
  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xl font-semibold text-foreground">
            Loading ServiceOS...
          </span>
        </div>
      </div>
    );
  }

  // Show Google onboarding when the user authenticated via Google but has no tenant yet
  // NOTE: After Google OAuth callback, the user IS authenticated (JWT cookie is set),
  // so we check for the presence of auth + absence of tenant, NOT !auth.isAuthenticated
  if (googleOnboarding && auth.isAuthenticated && !auth.tenant) {
    return (
      <GoogleOnboarding
        email={auth.user?.email || ''}
        name={auth.user?.name || ''}
        avatar={auth.user?.avatar || ''}
        onOnboardingComplete={(user: any, tenant?: any) => {
          setGoogleOnboarding(false);
          handleAuthSuccess(user, tenant);
        }}
        onBackToLanding={() => {
          setGoogleOnboarding(false);
        }}
      />
    );
  }

  if (showOnboarding && auth.isAuthenticated) {
    return (
      <SaaSOnboarding
        tenant={auth.tenant}
        user={auth.user}
        onComplete={() => {
          setShowOnboarding(false);
        }}
      />
    );
  }

  if (auth.isAuthenticated) {
    return <AppLayout onLogout={handleLogout} />;
  }

  if (unauthView === 'auth') {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onBackToLanding={handleShowLanding}
      />
    );
  }

  return (
    <LandingPage
      onGetStarted={handleShowAuth}
      onSignIn={handleShowAuth}
    />
  );
}
