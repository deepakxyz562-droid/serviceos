'use client';

// ─── AppShell — Next.js route group wrapper for the dashboard ───────────────
//
// This is a parallel to <AppLayout> (src/components/layout/app-layout.tsx) but
// for the (app) route group — i.e. real Next.js routes like /recurring-jobs/*.
//
// Difference from <AppLayout>:
//   <AppLayout> renders <ViewCache> (which mounts ALL visited SPA views, hides
//   inactive ones for instant switching) — that's how the Zustand-driven SPA
//   dashboard works.
//
//   <AppShell> renders {children} directly — the route's page.tsx content. This
//   is the standard Next.js App Router model: each route remounts on navigation.
//   We lose the keep-alive cache for these pages, but gain real URLs, deep-linking,
//   and browser back/forward.
//
// Shared chrome (sidebar + header + trial banner + mobile bottom nav + trial
// paywall + push manager) is identical to <AppLayout> — same components, same
// props. The sidebar's nav handler detects /recurring-jobs/* routes via
// usePathname to highlight the active item.
//
// Why a separate component (instead of reusing AppLayout)?
//   AppLayout is tightly coupled to Zustand's `currentView` + <ViewCache>. We
//   can't conditionally swap ViewCache for children without forking its render
//   tree. AppShell is small (~80 lines) and intentionally shares the shell
//   chrome by importing the same child components (AppSidebar, AppHeader, etc.).

import { ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { TrialBanner } from '@/components/layout/trial-banner';
import { UpgradeModal } from '@/components/layout/upgrade-modal';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTrialStatus, TrialPaywallOverlay } from '@/components/billing/trial-paywall';
import { TenantPushManager } from '@/components/pwa/tenant-push-manager';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { darkMode } = useAppStore();
  const isMobile = useIsMobile();
  const trialStatus = useTrialStatus();
  const router = useRouter();

  // Logout: clear session cookie via the API, reset the Zustand store, then
  // redirect to `/` (which renders the landing page for logged-out users).
  // Mirrors HomePageClient.handleLogout so /recurring-jobs/* pages don't need
  // to bounce through `/` to log out.
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — cookie clear happens server-side
    }
    useAppStore.getState().clearAuth();
    router.push('/');
  }, [router]);

  return (
    <div
      className={cn(
        'fixed inset-0 flex overflow-hidden bg-background',
        darkMode && 'dark',
      )}
    >
      <AppSidebar onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader onLogout={handleLogout} />
        <TrialBanner />

        <main
          className={cn(
            'flex-1 overflow-auto animate-fade-in',
            isMobile
              ? 'p-3 sm:p-4 bg-background pb-[calc(4rem+env(safe-area-inset-bottom,0px))]'
              : 'p-4 lg:p-6 bg-background',
          )}
        >
          {children}
        </main>

        <MobileBottomNav />
      </div>

      <TenantPushManager />
      <TrialPaywallOverlay trialStatus={trialStatus} />
      <UpgradeModal />
    </div>
  );
}
