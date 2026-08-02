'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * UpdatePrompt
 * ------------
 * Watches the active service worker registration for `updatefound` events
 * and the SW controller for `controllerchange`. When a new SW is waiting to
 * activate, shows a sonner toast with a "Refresh" button. Clicking it posts
 * `SKIP_WAITING` to the waiting SW and reloads the page.
 *
 * Renders nothing — the toast IS the UI.
 */
export default function UpdatePrompt() {
  const toastId = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    const triggerRefresh = () => {
      // Tell the waiting SW to skip waiting; reload once it takes control.
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Some browsers need a manual reload after controllerchange.
      window.location.reload();
    };

    const handleControllerChange = () => {
      // A new SW has taken control — reload once so the app picks up new assets.
      try {
        window.location.reload();
      } catch {
        /* ignore */
      }
    };

    const checkForWaiting = (reg: ServiceWorkerRegistration) => {
      if (!reg.waiting) return;
      if (toastId.current) return; // already showing
      toastId.current = toast('A new version is available', {
        description: 'Refresh to get the latest Fieseros update.',
        duration: Infinity,
        action: {
          label: (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="size-3.5" />
              Refresh
            </span>
          ),
          onClick: triggerRefresh,
        },
      });
    };

    const isDev = process.env.NODE_ENV !== 'production';
    // Match PwaProvider's dev-aware SW URL so both register the SAME script
    // (/sw.js?dev=1 in dev). Using two different script URLs for the same
    // scope would create two competing registrations; the dev flag also
    // tells the SW to bypass its fetch handler (see sw.js).
    const swUrl = isDev ? '/sw.js?dev=1' : '/sw.js';

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((reg) => {
        registration = reg;
        // Catch the case where a new SW is already waiting on first load.
        checkForWaiting(reg);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            // When the new worker moves into the 'installed' (waiting) state,
            // surface the update toast.
            if (newWorker.state === 'installed') {
              checkForWaiting(reg);
            }
          });
        });
      })
      .catch((err) => {
        // SW registration failures are non-fatal.
        //
        // Dev-only logging: in production, the inline <script> in
        // layout.tsx already owns the authoritative registration and
        // silently swallows its own errors. This duplicate register()
        // call exists only to attach updatefound/controllerchange
        // listeners. Some production monitoring/uptime/screenshot tools
        // (and headless browsers) intercept navigator.serviceWorker and
        // reject calls programmatically — logging that noise in prod
        // would pollute the console with a false "SW failed" alarm even
        // though the real (inline) registration succeeded.
        //
        // In dev we still want to see genuine failures (HTTPS scope,
        // MIME type, syntax errors in sw.js) so they're fixed early.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Fieseros] SW registration failed:', err);
        }
      });

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
      if (toastId.current) {
        toast.dismiss(toastId.current);
        toastId.current = undefined;
      }
    };
  }, []);

  return null;
}
