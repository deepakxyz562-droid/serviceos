'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  /** Online status (inverse of isOffline). Convenience alias. */
  isOnline: boolean;
  swRegistered: boolean;
  /** True when installable AND not installed AND not locally dismissed. */
  canInstall: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

const DISMISS_KEY = 'serviceos_install_dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// useSyncExternalStore adapters for browser-only state.
// These avoid the set-state-in-effect lint pattern (the React 18+ idiomatic
// way to subscribe to external systems) and handle SSR via getServerSnapshot.
// ---------------------------------------------------------------------------
function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}
function getServerOnlineSnapshot(): boolean {
  return true; // assume online during SSR
}

function subscribeStandalone(callback: () => void) {
  const mql = window.matchMedia('(display-mode: standalone)');
  const mql2 = window.matchMedia('(display-mode: window-controls-overlay)');
  mql.addEventListener('change', callback);
  mql2.addEventListener('change', callback);
  return () => {
    mql.removeEventListener('change', callback);
    mql2.removeEventListener('change', callback);
  };
}
function getStandaloneSnapshot(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}
function getServerStandaloneSnapshot(): boolean {
  return false;
}

export function usePWA() {
  // Browser-only state via useSyncExternalStore (SSR-safe, no setState-in-effect)
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getServerStandaloneSnapshot
  );

  // Component state
  const [isInstallable, setIsInstallable] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [swRegistered, setSwRegistered] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : isDismissedRecently()
  );

  // Register service worker (production only — dev mode and Next.js SWs
  // don't play well together, so we skip registration in development).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let cancelled = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        if (cancelled) return;
        setSwRegistered(true);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                // New service worker activated — could show update prompt
                console.log('ServiceOS updated to latest version');
              }
            });
          }
        });
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    };

    register();
    return () => {
      cancelled = true;
    };
  }, []);

  // beforeinstallprompt + appinstalled event subscriptions.
  // setState calls live inside the event-handler callbacks (allowed by the
  // set-state-in-effect rule).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
      setInstallPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setInstallPrompt(null);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Derived values (computed inline — no effect needed)
  const isInstalled = isStandalone;
  const isOffline = !isOnline;
  const canInstall = isInstallable && !isInstalled && !dismissed;

  /**
   * Install the PWA. Triggers the deferred `beforeinstallprompt` and waits
   * for the user's choice. Returns true if accepted.
   */
  const installPWA = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
      // User dismissed the native prompt — honor as a 7-day dismissal.
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      setDismissed(true);
      return false;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }, [installPrompt]);

  /** Public install() alias for `installPWA`. */
  const install = useCallback(async () => installPWA(), [installPWA]);

  /** Mark the install banner as dismissed for 7 days. */
  const dismissInstall = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const state: PWAState = {
    isInstallable,
    isInstalled,
    isOffline,
    isOnline,
    swRegistered,
    canInstall,
    installPrompt,
  };

  return {
    ...state,
    installPWA,
    install,
    dismissInstall,
  };
}
