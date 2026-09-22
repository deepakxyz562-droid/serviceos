'use client';

import { useEffect } from 'react';

/**
 * Helper to detect if an error or rejection is caused by a missing/stale Webpack/Turbopack chunk
 * after a new production deployment.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    typeof error === 'string'
      ? error
      : (error as Error)?.message || (error as { reason?: unknown })?.reason?.toString?.() || '';

  const name = (error as Error)?.name || '';

  return (
    name === 'ChunkLoadError' ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('Failed to load chunk') ||
    msg.includes('/_next/static/chunks/') ||
    msg.includes('missing chunk')
  );
}

/**
 * Zero-Downtime Chunk Auto-Recovery Component.
 *
 * When a user leaves a browser tab open across production deployments and later navigates,
 * the browser may request an old JavaScript chunk hash that no longer exists on the server (404).
 *
 * This component catches the chunk load error and performs an automatic, seamless hard reload
 * to fetch the latest deployment HTML, chunk manifest, and assets.
 *
 * Protected by a sessionStorage debounce guard to prevent infinite reloads during real offline states.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChunkRecovery = (err: unknown) => {
      if (!isChunkLoadError(err)) return;

      console.warn('[ChunkLoadRecovery] Detected stale deployment chunk error. Triggering auto-recovery reload...', err);

      try {
        const now = Date.now();
        const lastReload = parseInt(sessionStorage.getItem('fieseros_chunk_reload_ts') || '0', 10);

        // Allow at most 1 auto-reload every 20 seconds to prevent loops in offline mode
        if (now - lastReload > 20000) {
          sessionStorage.setItem('fieseros_chunk_reload_ts', String(now));
          window.location.reload();
        }
      } catch {
        // In case sessionStorage is blocked in private browsing
        window.location.reload();
      }
    };

    const onError = (event: ErrorEvent) => {
      handleChunkRecovery(event.error || event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleChunkRecovery(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
