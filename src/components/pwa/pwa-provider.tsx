'use client';

import { useEffect } from 'react';
import InstallPrompt from './install-prompt';
import UpdatePrompt from './update-prompt';

/**
 * PwaProvider
 * -----------
 * Renders the global install + update prompts. Mounted once in the root
 * layout.
 *
 * SERVICE WORKER REGISTRATION:
 *   The SW is now registered by an INLINE <script> in src/app/layout.tsx
 *   that runs synchronously during HTML parsing — BEFORE any JS bundle is
 *   fetched. This is required so PWABuilder / Lighthouse / APK generators
 *   detect the SW on the very first audit pass (they only wait ~3s).
 *
 *   Previously, registration happened here in a useEffect, which runs only
 *   after React hydrates (~5s on a slow connection). That was too late for
 *   PWABuilder, which blocked APK generation with "no service worker
 *   controlling the page".
 *
 *   We keep a no-op listener here only to surface SW registration failures
 *   to the console in development. The actual registration is owned by the
 *   inline script in layout.tsx.
 *
 * Renders nothing of its own besides the two prompt components, which
 * themselves render nothing unless they have something to show.
 */
export function PwaProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Surface registration errors in dev for debugging. The actual
    // registration is done by the inline script in layout.tsx — by this
    // point the SW is already registered (or failed). This is a no-op
    // safety net that also keeps `navigator.serviceWorker.ready` warmed
    // up for any consumer that awaits it (e.g. push subscription).
    navigator.serviceWorker.ready.catch((err) => {
      console.warn('[ServiceOS] SW not ready:', err);
    });
  }, []);

  return (
    <>
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}

export default PwaProvider;
