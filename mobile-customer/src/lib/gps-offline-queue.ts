/**
 * GPS Offline Queue — durable storage for failed GPS pings.
 *
 * Phase F-5: Previously, when a GPS POST to /api/gps/track failed (network
 * dropout, basement, elevator, rural area), the ping was silently logged +
 * discarded — the dispatcher saw a stale technician marker. This module
 * persists failed pings to AsyncStorage so they can be replayed (with their
 * ORIGINAL capturedAt timestamp) when the network recovers.
 *
 * The backend already supports backdated pings: /api/gps/track accepts a
 * `capturedAt` field + validates it's within 24h (see gps/track/route.ts).
 * So replayed pings land with their true capture time, preserving route
 * history accuracy.
 *
 * Storage: AsyncStorage key `fieseros_gps_queue` — a JSON array of pings.
 * Capped at 500 entries (matches the RouteHistory pathJson cap) so storage
 * never grows unbounded.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'fieseros_gps_queue';
const MAX_QUEUE_SIZE = 500;

export interface QueuedGpsPing {
  /** Stable client-generated id (for dedup + removal after replay). */
  id: string;
  employeeId: string;
  jobId: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  /** Original capture timestamp (ISO string) — preserved across replay. */
  capturedAt: string;
  /** When the ping was enqueued (for diagnostics + age checks). */
  enqueuedAt: string;
}

/** Generate a stable id for a queued ping (used as dedup key + removal key). */
function generatePingId(): string {
  return `gps_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Read all queued pings (oldest first). */
export async function readGpsQueue(): Promise<QueuedGpsPing[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedGpsPing[]) : [];
  } catch {
    return [];
  }
}

/** Append a ping to the queue. Enforces the MAX_QUEUE_SIZE cap (FIFO drop). */
export async function enqueueGpsPing(ping: Omit<QueuedGpsPing, 'id' | 'enqueuedAt'>): Promise<QueuedGpsPing> {
  const item: QueuedGpsPing = {
    ...ping,
    id: generatePingId(),
    enqueuedAt: new Date().toISOString(),
  };
  const queue = await readGpsQueue();
  queue.push(item);
  // Enforce cap — drop the oldest entries if over the limit.
  while (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item;
}

/** Remove a specific ping from the queue (after successful replay). */
export async function removeFromGpsQueue(id: string): Promise<void> {
  const queue = await readGpsQueue();
  const next = queue.filter((p) => p.id !== id);
  if (next.length !== queue.length) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  }
}

/** Count of queued pings (for UI badge / diagnostics). */
export async function getQueuedGpsCount(): Promise<number> {
  const queue = await readGpsQueue();
  return queue.length;
}

/**
 * Drain the queue: POST each ping to /api/gps/track with its original
 * capturedAt. Removes successfully-sent pings; keeps failed ones (they'll be
 * retried on the next drain).
 *
 * Stops draining on the first network error (status 0 or 5xx) — the device
 * is likely still offline, so retrying the rest would just waste battery.
 * 4xx errors (bad request, auth expired) remove the ping from the queue
 * (it'll never succeed on retry).
 *
 * @returns the number of successfully-sent pings.
 */
export async function drainGpsQueue(
  apiBaseUrl: string,
  token: string,
): Promise<number> {
  const queue = await readGpsQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;
  let stopped = false;

  for (const ping of queue) {
    if (stopped) break;
    try {
      const res = await fetch(`${apiBaseUrl}/api/gps/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: ping.employeeId,
          jobId: ping.jobId,
          latitude: ping.latitude,
          longitude: ping.longitude,
          accuracy: ping.accuracy,
          heading: ping.heading,
          speed: ping.speed,
          // Preserve the ORIGINAL capture timestamp — the backend validates
          // it's within 24h and uses it for route history accuracy.
          capturedAt: ping.capturedAt,
        }),
      });

      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // Success (2xx) OR a 4xx (bad request / auth / validation) — the ping
        // will never succeed on retry, so remove it either way.
        await removeFromGpsQueue(ping.id);
        if (res.ok) successCount += 1;
      } else {
        // 5xx or network error — device likely still offline. Stop draining.
        stopped = true;
      }
    } catch {
      // Network failure — device is offline. Stop draining; keep the ping.
      stopped = true;
    }
  }

  return successCount;
}
