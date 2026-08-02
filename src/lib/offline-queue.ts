/**
 * Offline Mutation Queue — Replay Handler
 * =========================================
 *
 * Concern #4 — PWA + offline mode.
 *
 * The service worker (`public/sw.js`) registers a Background Sync tag
 * `serviceos-sync` that fires when connectivity returns. When the SW
 * receives the `sync` event, it postMessages all clients with
 * `{ type: 'SERVICEOS_SYNC', tag: 'serviceos-sync' }`. This module
 * listens for that message and replays all queued mutations from
 * IndexedDB in order.
 *
 * Flow:
 *   1. User submits a form while offline → `useOfflineMutation` hook
 *      catches the network error → queues the mutation in IndexedDB.
 *   2. Connectivity returns → SW fires `sync` event → postMessages clients.
 *   3. This module's listener fires → reads queued mutations → replays
 *      each one via `fetch()` → removes on success / increments attempts
 *      on failure.
 *   4. UI is notified via a custom event so toasts can be shown.
 *
 * Exponential backoff: failed replays are retried with increasing delay
 * (1s, 2s, 4s, 8s, 16s). After MAX_REPLAY_ATTEMPTS (5), the mutation is
 * discarded and a console error is logged.
 */

'use client';

import { useEffect } from 'react';
import {
  getOfflineDB,
  getQueuedMutations,
  removeQueuedMutation,
  incrementMutationAttempts,
  getQueuedMutationCount,
} from './offline-db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReplayResult {
  succeeded: number;
  failed: number;
  skipped: number;
}

// ─── Replay logic ───────────────────────────────────────────────────────────

/**
 * Replay all queued mutations. Called when:
 *   - The SW's `serviceos-sync` Background Sync event fires (via postMessage).
 *   - The app regains connectivity (`online` window event).
 *   - The user manually clicks "Sync now" in the UI.
 *
 * Each mutation is replayed sequentially (not in parallel) to preserve
 * ordering — if mutation #2 depends on #1's server-assigned ID, we need
 * #1 to complete first. This is rare for our use cases (leads, bookings
 * are independent) but safer.
 *
 * Returns a summary of the replay results.
 */
export async function replayQueuedMutations(): Promise<ReplayResult> {
  const mutations = await getQueuedMutations();
  if (mutations.length === 0) {
    return { succeeded: 0, failed: 0, skipped: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const mutation of mutations) {
    if (mutation.id === undefined) {
      skipped++;
      continue;
    }

    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
        credentials: 'same-origin',
      });

      if (response.ok || response.status === 409 /* conflict — already applied */) {
        await removeQueuedMutation(mutation.id);
        succeeded++;
      } else if (response.status >= 400 && response.status < 500) {
        // 4xx (except 409) = client error — retrying won't help.
        // Discard the mutation to avoid an infinite retry loop.
        console.error(
          `[offline-queue] Mutation ${mutation.id} returned ${response.status} (client error), discarding:`,
          mutation,
        );
        await removeQueuedMutation(mutation.id);
        failed++;
      } else {
        // 5xx = server error — retry with backoff.
        await incrementMutationAttempts(mutation.id);
        failed++;
      }
    } catch (err) {
      // Network error (still offline?) — increment attempts, will retry
      // on the next sync event.
      console.warn(`[offline-queue] Mutation ${mutation.id} replay failed:`, err);
      await incrementMutationAttempts(mutation.id);
      failed++;
    }

    // Notify the UI that the queue changed (for the "N pending" badge).
    notifyQueueChanged();
  }

  // Emit a final summary event so toasts can be shown.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('serviceos:replay-complete', {
        detail: { succeeded, failed, skipped, total: mutations.length },
      }),
    );
  }

  return { succeeded, failed, skipped };
}

/**
 * Notify the UI that the mutation queue changed (a mutation was added,
 * removed, or replayed). The UI can listen for this event to update the
 * "N pending syncs" badge.
 */
function notifyQueueChanged(): void {
  if (typeof window === 'undefined') return;
  getQueuedMutationCount().then((count) => {
    window.dispatchEvent(
      new CustomEvent('serviceos:queue-changed', { detail: { count } }),
    );
  });
}

// ─── React hook: useOfflineSync ─────────────────────────────────────────────

/**
 * React hook that sets up listeners for:
 *   1. SW `SERVICEOS_SYNC` postMessage → triggers replay.
 *   2. Window `online` event → triggers replay.
 *   3. Periodic check every 30s when online (safety net in case the
 *      Background Sync event was missed — e.g. the user closed the app
 *      before it fired).
 *
 * Mount this ONCE at the app root (inside PwaProvider or AppLayout).
 * It's a no-op on the server (SSR-safe).
 */
export function useOfflineSync(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isReplaying = false;

    const triggerReplay = async () => {
      if (isReplaying) return; // prevent concurrent replays
      if (!navigator.onLine) return; // don't attempt when offline
      isReplaying = true;
      try {
        await replayQueuedMutations();
      } finally {
        isReplaying = false;
      }
    };

    // 1. SW Background Sync message listener.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SERVICEOS_SYNC') {
        triggerReplay();
      }
    };

    // 2. Window online event — fires when the network reconnects.
    const onOnline = () => {
      triggerReplay();
    };

    // 3. Periodic safety-net check (every 30s when online).
    const interval = setInterval(() => {
      if (navigator.onLine) {
        getQueuedMutationCount().then((count) => {
          if (count > 0) triggerReplay();
        });
      }
    }, 30_000);

    // Register listeners.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onMessage);
    }
    window.addEventListener('online', onOnline);

    // Fire an initial check on mount (in case mutations were queued
    // before this hook mounted — e.g. SSR hydration completed late).
    triggerReplay();

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      }
      window.removeEventListener('online', onOnline);
      clearInterval(interval);
    };
  }, []);
}

// ─── Convenience: queue a mutation from client code ─────────────────────────

/**
 * Queue a mutation for later replay. This is the primary API for
 * client-side mutation hooks (e.g. `useOfflineMutation`).
 *
 * Returns `true` if the mutation was successfully queued, `false` if
 * IndexedDB is unavailable.
 */
export async function queueOfflineMutation(
  method: string,
  url: string,
  body?: unknown,
  tag?: string,
): Promise<boolean> {
  const { queueMutation } = await import('./offline-db');
  const id = await queueMutation({
    method,
    url,
    body,
    tag: tag || 'generic',
  });
  if (id !== undefined) {
    notifyQueueChanged();
    return true;
  }
  return false;
}
