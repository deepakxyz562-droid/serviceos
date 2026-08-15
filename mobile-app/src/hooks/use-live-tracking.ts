/**
 * Fieseros Mobile App — Continuous Live GPS Tracking (foreground + background)
 *
 * WHY THIS EXISTS
 * ---------------
 * The mobile app previously had ZERO continuous GPS tracking. The only
 * location captures were one-shot (photo/signature uploads, city auto-detect,
 * clock-in). This meant `Employee.lastSeenAt` went stale → the Live Dispatch
 * dashboard showed the technician as "Offline" with "Last: 7h ago" even while
 * they were actively en route. See worklog EXPLORE-LIVE-2 for the full root
 * cause analysis.
 *
 * WHAT THIS HOOK DOES
 * -------------------
 * When `enabled` is true (i.e. the employee's active job is in the
 * `travelling` lifecycle state), this hook:
 *
 *   1. FOREGROUND — starts `Location.watchPositionAsync` with 15s / 10m
 *      thresholds. Each position update POSTs to `/api/gps/track`.
 *
 *   2. BACKGROUND — starts `Location.startLocationUpdatesAsync` (the Expo
 *      background location task) so GPS pings continue when the app is
 *      backgrounded or the screen is locked. The task is defined at module
 *      level (Expo requirement) and reads the active employeeId/jobId/JWT
 *      from storage.
 *
 *   3. HEARTBEAT — POSTs to `/api/employees/heartbeat` every 60s. This keeps
 *      `Employee.lastSeenAt` fresh so the dashboard shows "Live" even if no
 *      GPS ping has landed yet.
 *
 * When `enabled` becomes false (job transitioned to `arrived` / `completed`)
 * or the component unmounts, everything is torn down cleanly.
 *
 * POST PAYLOAD (matches the backend's `/api/gps/track` schema):
 *   { employeeId, jobId?, latitude, longitude, accuracy?, heading?,
 *     speed?, capturedAt? }
 *
 * See:
 *   - Backend: src/app/api/gps/track/route.ts
 *   - Heartbeat: src/app/api/employees/heartbeat/route.ts
 *   - PWA equivalent: src/hooks/use-gps-tracking.tsx
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/lib/constants';
import { getToken } from '@/lib/auth';
import {
  setLiveTrackingContext,
  clearLiveTrackingContext,
} from '@/lib/live-tracking-context';

// ── Constants ────────────────────────────────────────────────────────────

export const LOCATION_TASK_NAME = 'fieseros-live-dispatch-tracking';
export const GPS_INTERVAL_MS = 15_000; // 15s — user's choice
export const GPS_MIN_DISTANCE_M = 10; // 10m minimum movement between pings
export const HEARTBEAT_INTERVAL_MS = 60_000; // 60s

// ── Module-level background task definition ──────────────────────────────
// expo-task-manager requires tasks to be defined at module scope, NOT inside
// a component or hook. The task registry must be populated before any
// component renders, otherwise `startLocationUpdatesAsync` will throw
// "Task not defined".
//
// This task runs even when the app is backgrounded or the screen is locked.
// It reads the active employeeId/jobId from AsyncStorage (written by the hook
// when tracking starts) and the JWT from SecureStore, then POSTs each
// location update to /api/gps/track.
//
// IMPORTANT: This task must NOT use the shared `api` client (which has
// 401-refresh logic that could log the user out if a background ping hits a
// stale token). We use a bare `fetch` instead — on 401 we just skip the ping
// and let the next foreground heartbeat/interaction refresh the token.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[live-tracking] background task error:', error);
    return;
  }

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) {
    return;
  }

  try {
    // Dynamic import avoids a circular dependency at module-eval time
    // (live-tracking-context imports constants, which is fine, but keeping
    // the background task self-contained makes it easier to test).
    const { getLiveTrackingContext } = await import('@/lib/live-tracking-context');
    const [ctx, token] = await Promise.all([getLiveTrackingContext(), getToken()]);

    if (!ctx?.employeeId || !token) {
      // No active tracking context or not authenticated — nothing to report.
      return;
    }

    // Use the LAST location in the batch (most recent). The OS may batch
    // multiple samples if the device was asleep.
    const loc = locations[locations.length - 1];
    const payload = {
      employeeId: ctx.employeeId,
      jobId: ctx.jobId ?? null,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? null,
      heading: loc.coords.heading ?? null,
      speed: loc.coords.speed ?? null,
      capturedAt: new Date(loc.timestamp).toISOString(),
    };

    const res = await fetch(`${API_BASE_URL}/api/gps/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[live-tracking] background POST ${res.status}`);
    }
  } catch (err) {
    console.error('[live-tracking] background POST failed:', err);
  }
});

// ── Hook types ───────────────────────────────────────────────────────────

export interface UseLiveTrackingOptions {
  /** Only track when the active job is in the `travelling` state. */
  enabled: boolean;
  /** The employee's Prisma Employee.id. Required to attribute pings. */
  employeeId: string | null | undefined;
  /** The active job's ID. Null/undefined = track without a job context. */
  jobId: string | null | undefined;
  /**
   * Optional explicit JWT. If omitted, the hook reads it from SecureStore on
   * each ping via `getToken()`. Passing it avoids a SecureStore read on every
   * 15s tick, but means the caller is responsible for keeping it fresh.
   */
  authToken?: string | null;
  /**
   * Backend base URL. Defaults to `API_BASE_URL` from constants (which is
   * env-configurable via `EXPO_PUBLIC_API_BASE_URL`). The background task
   * always uses `API_BASE_URL` directly (it can't read React props).
   */
  apiBaseUrl?: string;
}

export interface LiveTrackingState {
  /** True while foreground watch + background task + heartbeat are all active. */
  isTracking: boolean;
  hasForegroundPermission: boolean;
  hasBackgroundPermission: boolean;
  /** True if the user denied foreground location (tracking can't run). */
  permissionDenied: boolean;
  /** Timestamp of the last successful GPS ping POST. */
  lastPingAt: Date | null;
  /** Timestamp of the last successful heartbeat POST. */
  lastHeartbeatAt: Date | null;
  /** Last error message (null if healthy). */
  lastError: string | null;
  /** Total GPS pings sent since the hook mounted. */
  pingsSent: number;
  /** Total heartbeats sent since the hook mounted. */
  heartbeatsSent: number;
}

const INITIAL_STATE: LiveTrackingState = {
  isTracking: false,
  hasForegroundPermission: false,
  hasBackgroundPermission: false,
  permissionDenied: false,
  lastPingAt: null,
  lastHeartbeatAt: null,
  lastError: null,
  pingsSent: 0,
  heartbeatsSent: 0,
};

// ── Hook implementation ──────────────────────────────────────────────────

export function useLiveTracking(options: UseLiveTrackingOptions): LiveTrackingState {
  const {
    enabled,
    employeeId,
    jobId,
    authToken = null,
    apiBaseUrl = API_BASE_URL,
  } = options;

  const [state, setState] = useState<LiveTrackingState>(INITIAL_STATE);

  // Mutable counters kept in refs so the watch callback doesn't capture
  // stale state (which would cause `pingsSent` to reset on every render).
  const countersRef = useRef({ pingsSent: 0, heartbeatsSent: 0 });
  const lastPingAtRef = useRef<Date | null>(null);
  const lastHeartbeatAtRef = useRef<Date | null>(null);

  // ── Effect 1: Request permissions on mount (once) ─────────────────────
  useEffect(() => {
    let cancelled = false;

    async function requestPermissions() {
      if (Platform.OS === 'web') {
        // Web: no background tasks. Foreground permission is implicit via
        // the Geolocation API (requested when watchPosition is called).
        setState((s) => ({
          ...s,
          hasForegroundPermission: true,
          hasBackgroundPermission: false,
        }));
        return;
      }

      try {
        const fg = await Location.requestForegroundPermissionsAsync();
        let bgStatus: Location.LocationPermissionResponse | null = null;
        try {
          bgStatus = await Location.requestBackgroundPermissionsAsync();
        } catch (bgErr) {
          // Some Android versions / emulators don't support the background
          // permission prompt — foreground tracking still works.
          console.warn('[live-tracking] background permission request failed:', bgErr);
        }

        if (cancelled) return;

        setState((s) => ({
          ...s,
          hasForegroundPermission: fg.status === 'granted',
          hasBackgroundPermission: bgStatus?.status === 'granted',
          permissionDenied: fg.status !== 'granted',
        }));

        if (fg.status !== 'granted') {
          console.warn('[live-tracking] foreground location permission denied — tracking disabled');
        }
      } catch (err) {
        console.warn('[live-tracking] permission request failed:', err);
      }
    }

    requestPermissions();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Effect 2: Start / stop tracking based on `enabled` + identity ─────
  useEffect(() => {
    if (!enabled || !employeeId) {
      // Nothing to start (or we don't know who to track). The previous
      // effect's cleanup (if any) already tore down tracking.
      return;
    }

    // Local const copy so TypeScript narrows the type from
    // `string | null | undefined` → `string` for all the nested closures
    // below (arrow functions + the web fallback function declaration).
    const empId: string = employeeId;
    const activeJobId: string | null = jobId ?? null;

    // On web, fall back to navigator.geolocation.watchPosition. The Expo
    // background task system is native-only.
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return;

      const sendGpsPingWeb = async (pos: GeolocationPosition) => {
        try {
          const token = authToken ?? (await getToken());
          if (!token) return;
          await fetch(`${apiBaseUrl}/api/gps/track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              employeeId: empId,
              jobId: activeJobId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ?? null,
              capturedAt: new Date(pos.timestamp).toISOString(),
            }),
          });
          countersRef.current.pingsSent += 1;
          lastPingAtRef.current = new Date();
          setState((s) => ({
            ...s,
            pingsSent: countersRef.current.pingsSent,
            lastPingAt: lastPingAtRef.current,
          }));
        } catch (err) {
          console.warn('[live-tracking] web GPS POST failed:', err);
        }
      };

      const sendHeartbeatWeb = async () => {
        try {
          const token = authToken ?? (await getToken());
          if (!token) return;
          const res = await fetch(`${apiBaseUrl}/api/employees/heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ employeeId: empId }),
          });
          if (res.ok) {
            countersRef.current.heartbeatsSent += 1;
            lastHeartbeatAtRef.current = new Date();
            setState((s) => ({
              ...s,
              heartbeatsSent: countersRef.current.heartbeatsSent,
              lastHeartbeatAt: lastHeartbeatAtRef.current,
            }));
          }
        } catch (err) {
          console.warn('[live-tracking] web heartbeat failed:', err);
        }
      };

      // Persist context (harmless on web even though there's no background task).
      setLiveTrackingContext({
        employeeId: empId,
        jobId: activeJobId,
        startedAt: new Date().toISOString(),
      }).catch(() => {});

      const watchId = navigator.geolocation.watchPosition(
        (pos) => void sendGpsPingWeb(pos),
        (err) => console.warn('[live-tracking] web watch error:', err.message),
        { enableHighAccuracy: true, maximumAge: GPS_INTERVAL_MS, timeout: 30000 }
      );

      const heartbeatTimer = setInterval(
        () => void sendHeartbeatWeb(),
        HEARTBEAT_INTERVAL_MS
      );
      void sendHeartbeatWeb();
      setState((s) => ({ ...s, isTracking: true }));

      return () => {
        navigator.geolocation.clearWatch(watchId);
        clearInterval(heartbeatTimer);
        clearLiveTrackingContext().catch(() => {});
        setState((s) => ({ ...s, isTracking: false }));
      };
    }

    let cancelled = false;
    let watchSub: Location.LocationSubscription | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let backgroundStarted = false;

    const cleanup = () => {
      try {
        if (watchSub) watchSub.remove();
      } catch {
        /* ignore */
      }
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (backgroundStarted) {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {
          /* ignore — task may have already been stopped */
        });
      }
      clearLiveTrackingContext().catch(() => {
        /* non-fatal */
      });
    };

    // ── POST a GPS ping to /api/gps/track ──────────────────────────────
    const sendGpsPing = async (loc: Location.LocationObject) => {
      try {
        const token = authToken ?? (await getToken());
        if (!token) {
          console.warn('[live-tracking] no auth token — skipping GPS ping');
          return;
        }
        const res = await fetch(`${apiBaseUrl}/api/gps/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeId: empId,
            jobId: activeJobId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? null,
            heading: loc.coords.heading ?? null,
            speed: loc.coords.speed ?? null,
            capturedAt: new Date(loc.timestamp).toISOString(),
          }),
        });
        if (res.ok) {
          countersRef.current.pingsSent += 1;
          lastPingAtRef.current = new Date();
          setState((s) => ({
            ...s,
            pingsSent: countersRef.current.pingsSent,
            lastPingAt: lastPingAtRef.current,
            lastError: null,
          }));
        } else {
          console.warn(`[live-tracking] GPS POST ${res.status}`);
        }
      } catch (err) {
        console.warn('[live-tracking] GPS POST failed:', err);
      }
    };

    // ── POST a heartbeat to /api/employees/heartbeat ───────────────────
    const sendHeartbeat = async () => {
      try {
        const token = authToken ?? (await getToken());
        if (!token) return;
        const res = await fetch(`${apiBaseUrl}/api/employees/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ employeeId: empId }),
        });
        if (res.ok) {
          countersRef.current.heartbeatsSent += 1;
          lastHeartbeatAtRef.current = new Date();
          setState((s) => ({
            ...s,
            heartbeatsSent: countersRef.current.heartbeatsSent,
            lastHeartbeatAt: lastHeartbeatAtRef.current,
          }));
        }
      } catch (err) {
        console.warn('[live-tracking] heartbeat failed:', err);
      }
    };

    async function start() {
      try {
        // 1. Persist the active tracking context so the background task
        //    (which runs outside React) knows which employee/job to attribute
        //    pings to.
        await setLiveTrackingContext({
          employeeId: empId,
          jobId: activeJobId,
          startedAt: new Date().toISOString(),
        });
        if (cancelled) return cleanup();

        // 2. Start the foreground watch (15s / 10m).
        watchSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: GPS_INTERVAL_MS,
            distanceInterval: GPS_MIN_DISTANCE_M,
          },
          (loc) => {
            void sendGpsPing(loc);
          }
        );
        if (cancelled) return cleanup();

        // 3. Start the background task (continues when app is backgrounded).
        //    Balanced accuracy saves battery; the foreground watch uses
        //    BestForNavigation when the app is visible.
        try {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: GPS_INTERVAL_MS,
            distanceInterval: GPS_MIN_DISTANCE_M,
            showsBackgroundLocationIndicator: true,
            // Android: foreground service notification config. iOS ignores.
            foregroundService: {
              notificationTitle: 'Fieseros is tracking your travel',
              notificationBody: 'Live location is being shared with dispatch.',
              notificationColor: '#10B981',
            },
          });
          backgroundStarted = true;
        } catch (bgErr) {
          // Background tracking is best-effort — foreground tracking still
          // works without it. Log and continue.
          console.warn('[live-tracking] background task start failed:', bgErr);
        }
        if (cancelled) return cleanup();

        // 4. Start the 60s heartbeat interval.
        heartbeatTimer = setInterval(() => {
          void sendHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);

        // 5. Fire an immediate heartbeat so the dashboard flips to "Live"
        //    within seconds of the user tapping "Start Travel".
        void sendHeartbeat();

        if (!cancelled) {
          setState((s) => ({ ...s, isTracking: true, lastError: null }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start tracking';
        console.error('[live-tracking] start failed:', err);
        if (!cancelled) {
          setState((s) => ({ ...s, isTracking: false, lastError: msg }));
        }
        cleanup();
      }
    }

    void start();

    return () => {
      cancelled = true;
      cleanup();
      setState((s) => ({ ...s, isTracking: false }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, employeeId, jobId, authToken, apiBaseUrl]);

  return state;
}
