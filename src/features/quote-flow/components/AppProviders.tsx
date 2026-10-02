'use client';
import React, { useEffect } from 'react';
import { useAppStore } from '@/features/quote-flow/store/app';
import { api } from '@/features/quote-flow/lib/api';

function AuthGate({ children }: { children: React.ReactNode }) {
  const setAuthChecked = useAppStore((s) => s.setAuthChecked);
  const setUser = useAppStore((s) => s.setUser);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const openModal = useAppStore((s) => s.openModal);

  useEffect(() => {
    setAuthChecked(true);
    // Fetch business and user directly from /api/quote-flow/business/onboarding
    api<{ business: any }>('/api/quote-flow/business/onboarding')
      .then((r) => {
        if (r.business) {
          setBusiness(r.business);
          setUser({
            id: r.business.ownerId,
            email: r.business.email || 'user@serviceos.com',
            name: r.business.ownerName || r.business.name,
          });
        } else {
          openModal({ type: 'onboarding' });
        }
      })
      .catch((err) => {
        console.warn('[quote-flow] Auth check error:', err);
      });
  }, [setAuthChecked, setBusiness, setUser, openModal]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}

export function useSignOut() {
  const signOutClient = useAppStore((s) => s.signOutClient);
  return async () => {
    signOutClient();
  };
}
