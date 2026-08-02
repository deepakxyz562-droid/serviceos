/**
 * useOfflineMutation — Offline-aware mutation hook
 * =================================================
 *
 * Concern #4 — PWA + offline mode.
 *
 * A lightweight wrapper around `fetch` that automatically queues the
 * mutation into IndexedDB when the network is unavailable. When
 * connectivity returns, the `useOfflineSync` hook (mounted in PwaProvider)
 * replays the queue.
 *
 * Usage:
 *   const { mutate, isPending, isQueued } = useOfflineMutation({
 *     url: '/api/leads',
 *     method: 'POST',
 *     tag: 'lead',
 *     onSuccess: (data) => toast.success('Lead created'),
 *   });
 *
 *   <button onClick={() => mutate({ name, phone })}>Submit</button>
 *
 * Behavior:
 *   • Online → fetch immediately, call onSuccess/onError.
 *   • Offline → queue in IndexedDB, call onQueued, set isQueued=true.
 *     The mutation will be replayed automatically by useOfflineSync.
 *
 * This is NOT a full TanStack Query mutation replacement — it's a focused
 * utility for the few mutation paths that need offline support (lead
 * capture, booking requests, contact form). TanStack Query's `useMutation`
 * remains the primary mutation hook for everything else.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { queueOfflineMutation } from '@/lib/offline-queue';

interface UseOfflineMutationOptions<TData, TBody> {
  /** The API URL (relative, e.g. '/api/leads'). */
  url: string;
  /** HTTP method: POST | PUT | PATCH | DELETE. */
  method: string;
  /** Optional tag for grouping in the queue (e.g. 'lead', 'booking'). */
  tag?: string;
  /** Called on successful online mutation. */
  onSuccess?: (data: TData) => void;
  /** Called on online mutation error (non-2xx response). */
  onError?: (error: Error) => void;
  /** Called when the mutation is queued for offline replay. */
  onQueued?: () => void;
}

interface UseOfflineMutationResult<TBody> {
  /** Execute the mutation with the given body. */
  mutate: (body?: TBody) => Promise<void>;
  /** True while the online fetch is in flight. */
  isPending: boolean;
  /** True if the last mutation was queued for offline replay. */
  isQueued: boolean;
  /** Error from the last online attempt (cleared on next mutate). */
  error: Error | null;
}

export function useOfflineMutation<TData = unknown, TBody = unknown>(
  options: UseOfflineMutationOptions<TData, TBody>,
): UseOfflineMutationResult<TBody> {
  const { url, method, tag, onSuccess, onError, onQueued } = options;
  const [isPending, setIsPending] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Track the last queued mutation ID so the UI can show "pending sync" state.
  const lastQueuedId = useRef<number | null>(null);

  const mutate = useCallback(
    async (body?: TBody) => {
      setError(null);
      setIsQueued(false);

      // Check if we're online. `navigator.onLine` is reliable enough for
      // the gating decision — false negatives (says offline but actually
      // online) just mean we queue unnecessarily and the replay handler
      // fires immediately. False positives (says online but actually
      // offline) are caught by the fetch() try/catch below.
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        // Offline — queue for later replay.
        const queued = await queueOfflineMutation(
          method,
          url,
          body,
          tag,
        );
        if (queued) {
          setIsQueued(true);
          onQueued?.();
        } else {
          // IndexedDB unavailable — fall through to attempt the fetch
          // anyway (it'll fail and call onError, which is the best we
          // can do without storage).
          const err = new Error('Offline and IndexedDB unavailable — mutation lost.');
          setError(err);
          onError?.(err);
        }
        return;
      }

      // Online — attempt the fetch immediately.
      setIsPending(true);
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'same-origin',
        });

        if (!response.ok) {
          // If the response is a 5xx (server error), the server might be
          // temporarily down — queue for replay. For 4xx (client error),
          // surface the error immediately (retrying won't help).
          if (response.status >= 500) {
            const queued = await queueOfflineMutation(method, url, body, tag);
            if (queued) {
              setIsQueued(true);
              onQueued?.();
              return;
            }
          }
          const err = new Error(`Mutation failed: ${response.status} ${response.statusText}`);
          setError(err);
          onError?.(err);
          return;
        }

        const data = await response.json();
        onSuccess?.(data as TData);
      } catch (err) {
        // Network error mid-fetch — queue for replay.
        const queued = await queueOfflineMutation(method, url, body, tag);
        if (queued) {
          setIsQueued(true);
          onQueued?.();
        } else {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);
        }
      } finally {
        setIsPending(false);
      }
    },
    [url, method, tag, onSuccess, onError, onQueued],
  );

  return { mutate, isPending, isQueued, error };
}
