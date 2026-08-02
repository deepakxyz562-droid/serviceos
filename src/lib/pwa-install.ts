/**
 * Single source of truth for the PWA `beforeinstallprompt` deferred event.
 *
 * Only ONE component (install-prompt.tsx) registers the actual
 * `beforeinstallprompt` window listener and calls `preventDefault()`.
 * Other components (header "Install app" menu, usePWA hook) read state
 * from this module and call `requestInstall()` to trigger the prompt.
 *
 * This eliminates the duplicate-listener problem where 3 separate listeners
 * each called `preventDefault()` — which caused Chrome's console warning:
 *   "Banner not shown: beforeinstallpromptevent.preventDefault() called.
 *    The page must call beforeinstallpromptevent.prompt() to show the banner."
 */

export type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();

/** Store the deferred event (called by the single beforeinstallprompt listener). */
export function setDeferredPrompt(e: BeforeInstallPromptEvent | null): void {
  deferredPrompt = e;
  listeners.forEach((fn) => fn(e));
}

/** Read the current deferred event (may be null). */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

/** Subscribe to deferred-event changes. Returns an unsubscribe function. */
export function subscribeToDeferredPrompt(
  fn: (e: BeforeInstallPromptEvent | null) => void
): () => void {
  listeners.add(fn);
  // Immediately call with current value so subscriber is in sync.
  fn(deferredPrompt);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Trigger the native install prompt. Returns the user's choice, or
 * 'unavailable' if no deferred event is stored.
 */
export async function requestInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  if (!deferredPrompt) return 'unavailable';
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    // prompt() can only be called once per event — clear it.
    setDeferredPrompt(null);
    return choice.outcome;
  } catch {
    setDeferredPrompt(null);
    return 'unavailable';
  }
}
