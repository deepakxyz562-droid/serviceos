'use client';

import { useEffect } from 'react';
import InstallPrompt from './install-prompt';
import UpdatePrompt from './update-prompt';

/**
 * PwaProvider
 * -----------
 * Registers the ServiceOS service worker on mount and renders the global
 * install + update prompts. Mounted once in the root layout.
 *
 * DEV MODE SUPPORT (important):
 *   The SW is now registered in ALL environments, including `next dev`.
 *   This is required for Web Push to work in development — without an active
 *   SW, `navigator.serviceWorker.ready` never resolves, `pushManager.subscribe()`
 *   never runs, and no PushSubscription is ever saved to the DB. The result is
 *   the classic "push works when app is open (in-app polling), missed when
 *   closed, shows on reopen" symptom — because the only thing delivering
 *   notifications is the 60s in-app polling of /api/notifications.
 *
 *   To avoid the SW breaking Next.js HMR / serving stale cached pages in dev,
 *   we register the SW with a `?dev=1` query param. The SW reads its own
 *   `self.location.search` and, when `dev=1` is present, skips the app-shell
 *   precache AND bypasses the fetch handler entirely (passthrough). The push
 *   + notificationclick handlers remain active in dev so real Web Push works.
 *
 * Renders nothing of its own besides the two prompt components, which
 * themselves render nothing unless they have something to show.
 */
export function PwaProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isDev = process.env.NODE_ENV !== 'production';
    // Append ?dev=1 in dev so the SW can disable its fetch handler + precache
    // (see sw.js). Production keeps the plain /sw.js URL with full caching.
    const swUrl = isDev ? '/sw.js?dev=1' : '/sw.js';

    const register = async () => {
      try {
        await navigator.serviceWorker.register(swUrl, { scope: '/' });
      } catch (err) {
        console.warn('[ServiceOS] SW registration failed:', err);
      }
    };

    register();
  }, []);

  return (
    <>
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}

export default PwaProvider;
