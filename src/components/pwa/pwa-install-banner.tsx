'use client';

/**
 * Legacy PWA install banner.
 *
 * This file is preserved for backwards-compatibility with existing dynamic
 * imports in `src/app/page.tsx`, but the components are now no-ops. The
 * canonical install banner lives in
 * `src/components/pwa/install-prompt.tsx` and is mounted globally via the
 * `PwaProvider` in the root layout. Rendering two install banners at once
 * would be confusing UX, so the old components deliberately render nothing.
 *
 * If you previously relied on the offline indicator that lived in the old
 * banner, use the `usePWA()` hook (`isOffline`) instead.
 */

export function PWAInstallBanner() {
  return null;
}

export function IOSInstallBanner() {
  return null;
}

export default PWAInstallBanner;
