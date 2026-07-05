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
        description: 'Refresh to get the latest ServiceOS update.',
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

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
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
        // SW registration failures are non-fatal; just log.
        console.warn('[ServiceOS] SW registration failed:', err);
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
