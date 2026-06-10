'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Wrench } from 'lucide-react';
import { toast } from 'sonner';

// Lazy load all major components to reduce memory
const LandingPage = dynamic(() => import('@/components/landing/landing-page').then(m => ({ default: m.LandingPage })), { ssr: false });
const AuthPage = dynamic(() => import('@/components/auth/auth-page').then(m => ({ default: m.AuthPage })), { ssr: false });
const GoogleOnboarding = dynamic(() => import('@/components/auth/google-onboarding').then(m => ({ default: m.GoogleOnboarding })), { ssr: false });
const AcceptInvitation = dynamic(() => import('@/components/auth/accept-invitation').then(m => ({ default: m.AcceptInvitation })), { ssr: false });
const SaaSOnboarding = dynamic(() => import('@/components/onboarding/saas-onboarding').then(m => ({ default: m.SaaSOnboarding })), { ssr: false });
const AppLayout = dynamic(() => import('@/components/layout/app-layout').then(m => ({ default: m.AppLayout })), { ssr: false });
const SuperAdminPortal = dynamic(() => import('@/components/superadmin/super-admin-portal').then(m => ({ default: m.SuperAdminPortal })), { ssr: false });

import { useAppStore } from '@/store/app-store';
import { setToken, removeToken, getToken } from '@/lib/client-auth';

type UnauthView = 'landing' | 'auth';

export default function HomePage() {
  const {
    auth,
    setAuth,
    clearAuth,
    showOnboarding,
    setShowOnboarding,
    darkMode,
    toggleDarkMode,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [unauthView, setUnauthView] = useState<UnauthView>('landing');
  const [googleOnboarding, setGoogleOnboarding] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize dark mode on mount
  useEffect(() => {
    setMounted(true);
    // Apply dark mode class based on stored preference or system preference
    const stored = localStorage.getItem('serviceos_dark_mode');
    const prefersDark = stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (prefersDark && !darkMode) {
      toggleDarkMode();
    }
  }, []);

  // Handle Google OAuth callback URL parameters and invite tokens
  const handleOAuthCallback = useCallback(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const googleLogin = params.get('google_login');
    const googleOnboardingParam = params.get('google_onboarding');
    const authError = params.get('auth_error');
    const inviteParam = params.get('invite');

    // Check for invitation token
    if (inviteParam) {
      setInviteToken(inviteParam);
      return;
    }

    if (authError) {
      const decodedError = decodeURIComponent(authError);
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
      const { authFetch } = await import('@/lib/client-auth');
      const response = await authFetch('/api/auth/me?XTransformPort=3000');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          const tenantData = data.tenant || null;
          setAuth({
            isAuthenticated: true,
            user: data.user,
            tenant: tenantData,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'serviceos_auth',
              JSON.stringify({
                isAuthenticated: true,
                user: data.user,
                tenant: tenantData,
              })
            );
          }
          // Show onboarding if tenant has not completed it
          if (tenantData && tenantData.onboardingCompleted === false) {
            setShowOnboarding(true);
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
            const tenantData = parsed.tenant || null;
            setAuth({
              isAuthenticated: true,
              user: parsed.user,
              tenant: tenantData,
            });
            if (tenantData && tenantData.onboardingCompleted === false) {
              setShowOnboarding(true);
            }
            return;
          }
        }
      }
    } catch {
      // localStorage read failed
    }
  }, [setAuth, setShowOnboarding]);

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
      localStorage.removeItem('serviceos_auth');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      localStorage.removeItem('serviceos_user');
      localStorage.removeItem('serviceos_tenant');
      removeToken();
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
    (user: any, tenant?: any, token?: string) => {
      const tenantData = tenant || null;
      const authData = {
        isAuthenticated: true,
        user,
        tenant: tenantData,
      };
      setAuth(authData);

      if (typeof window !== 'undefined') {
        localStorage.setItem('serviceos_auth', JSON.stringify(authData));
        if (token) {
          setToken(token);
        }
      }

      // Show onboarding if tenant has not completed it
      if (tenantData && tenantData.onboardingCompleted === false) {
        setShowOnboarding(true);
        return;
      }

      if (user?.role === 'employee' || user?.role === 'technician') {
        useAppStore.getState().setCurrentView('employeePortal');
        toast.success('Welcome to your portal!');
      } else if (user?.isSuperAdmin === true) {
        useAppStore.getState().setCurrentView('superAdmin');
        toast.success('Welcome, Platform Admin!');
      } else {
        toast.success('Welcome to ServiceOS!');
      }
    },
    [setAuth, setShowOnboarding]
  );

  // Don't render anything until client-side mounted
  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/25">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            <span className="text-lg font-semibold text-foreground">
              Loading ServiceOS...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show Google onboarding when the user authenticated via Google but has no tenant yet
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

  // Show invitation acceptance page if invite token is present
  if (inviteToken) {
    return (
      <AcceptInvitation
        token={inviteToken}
        onAuthSuccess={(user: any, tenant?: any) => {
          setInviteToken(null);
          window.history.replaceState({}, '', window.location.pathname);
          handleAuthSuccess(user, tenant);
        }}
        onBackToLanding={() => {
          setInviteToken(null);
          window.history.replaceState({}, '', window.location.pathname);
          setUnauthView('landing');
        }}
      />
    );
  }

  // Show SuperAdmin portal for super admin users (full-page, no AppLayout wrapper)
  if (auth.isAuthenticated && auth.user?.isSuperAdmin === true) {
    return <SuperAdminPortal onLogout={handleLogout} />;
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
