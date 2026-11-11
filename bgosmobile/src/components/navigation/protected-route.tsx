import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../stores/auth-store';
import { PaywallGate } from '../billing/paywall-gate';

/**
 * Enforces authenticated + onboarded session state and subscription entitlement
 * around both TabLayout and promoted Root Stack screens.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, onboardingRequired } = useAuthStore();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }
  if (!isLoading && isAuthenticated && onboardingRequired) {
    return <Redirect href="/setup" />;
  }

  return <PaywallGate>{children}</PaywallGate>;
}

/**
 * Wraps a Root Stack route component so cold-start deep links and push
 * notifications enforce auth, onboarding, and paywall rules before mounting.
 */
export function withProtectedRoute<P extends object>(Component: React.ComponentType<P>) {
  function ProtectedScreen(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  }

  ProtectedScreen.displayName = `withProtectedRoute(${Component.displayName || Component.name || 'Screen'})`;
  return ProtectedScreen;
}
