'use client';

import { useEffect } from 'react';
import InstallPrompt from './install-prompt';
import UpdatePrompt from './update-prompt';

/**
 * PwaProvider
 * -----------
 * Registers the ServiceOS service worker on mount (production only — Next.js
 * dev mode + service workers don't play well together) and renders the global
 * install + update prompts. Mounted once in the root layout.
 *
 * Renders nothing of its own besides the two prompt components, which
 * themselves render nothing unless they have something to show.
 */
export function PwaProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
