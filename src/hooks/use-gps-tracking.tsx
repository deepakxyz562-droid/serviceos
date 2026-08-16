'use client';

/**
 * useGpsTracking — shared GPS tracking state for the Employee PWA + Admin Preview.
 *
 * Why this exists:
 *   The employee portal (src/components/portals/employee-portal-layout.tsx)
 *   is the file that actually renders for logged-in employees, but it had
 *   ZERO geolocation code — so the browser never showed the location
 *   permission prompt, no GPS pings were sent, and the admin Dispatch map
 *   always showed "No technician locations available".
 *
 *   The reference implementation lived in the admin-preview component
 *   (employee-portal-view.tsx) which real employees never see. This hook
 *   extracts that logic into a shared React Context so both the
 *   AttendanceView (clock-in / clock-out) and the JobDetailSheet
 *   (start_travel / arrive / complete) can drive the same tracker.
 *
 * What it does:
 *   - `captureOnce()` — one-shot `getCurrentPosition` (triggers the browser
 *     permission prompt the first time). Returns `{latitude, longitude}`
 *     or `{}` on failure. Used at clock-in + lifecycle transitions.
 *   - `startTracking(jobId?)` — starts `watchPosition` (sub-second updates
 *     on movement, Uber/Jobber-style) plus a 15s fallback interval.
 *     Acquires a screen Wake Lock so the phone doesn't sleep and throttle
 *     the GPS pings. Pings include `batteryLevel`, `isMoving`, `capturedAt`.
 *   - `stopTracking()` — clears the watch + interval, releases the Wake Lock.
 *     Called on `complete` and `clockout`.
 *   - `gpsActive` / `locationDenied` / `status` / `lastPing` / `error` /
 *     `resync` — for the status banner UI.
 *
 * Preview mode (admin preview):
 *   The admin preview component (`employee-portal-view.tsx`) renders the
 *   portal UI for owners/admins. It must NOT send real GPS pings — an
 *   admin viewing the preview from a desktop browser would otherwise
 *   POST their desktop's location as if they were a field technician,
 *   polluting the dispatch map. When `previewMode: true` is passed to
 *   the provider, all `fetch('/api/gps/track')` calls are skipped, but
 *   the local state (`gpsActive`, `status`, etc.) still updates so the
 *   UI shows what the technician would see.
 *
 * Lifecycle (Phase 2 spec):
 *     start_travel → startTracking(jobId)   GPS ON
 *     arrive        → (no-op, keep tracking)  GPS still ON
 *     start_work    → (no-op, keep tracking)  GPS still ON
 *     complete      → stopTracking()         GPS OFF
 *
 * Ping payload (matches server-side `/api/gps/track` schema):
 *   { employeeId, jobId?, latitude, longitude, accuracy?, heading?,
 *     speed?, altitude?, batteryLevel?, isMoving?, capturedAt? }
 *
 * The `capturedAt` field is critical for offline backfill — if the device
 * goes offline and comes back, queued pings can be sent with their
 * original capture timestamps so the breadcrumb trail stays accurate.
 */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

interface GpsCoords {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

/** Declarative GPS status for the status banner. */
export type GpsStatus = 'live' | 'stale' | 'offline';

interface GpsTrackingContextValue {
  /** True when watchPosition + fallback interval are running. */
  gpsActive: boolean;
  /** True when the user denied location permission (or it's unavailable). */
  locationDenied: boolean;
  /** False on SSR or unsupported browsers. */
  gpsSupported: boolean;
  /** True when this provider is running in admin-preview mode (no real pings). */
  previewMode: boolean;
  /** Declarative status derived from `gpsActive` + `lastPing` age. */
  status: GpsStatus;
  /** Timestamp of the last successful (or attempted) ping. */
  lastPing: Date | null;
  /** Last error message (permission denied, network, etc.). Null when healthy. */
  error: string | null;
  /** One-shot capture — triggers the browser permission prompt. */
  captureOnce: () => Promise<GpsCoords>;
  /** Start continuous watchPosition + 15s fallback. Optional jobId tags the pings. */
  startTracking: (jobId?: string) => void;
  /** Stop continuous pings + release Wake Lock. */
  stopTracking: () => void;
  /** Manually re-ping the current position (the "Re-sync Location" button). */
  resync: () => void;
}

const GpsTrackingContext = createContext<GpsTrackingContextValue | null>(null);

const NOOP: GpsTrackingContextValue = {
  gpsActive: false,
  locationDenied: false,
  gpsSupported: false,
  previewMode: false,
  status: 'offline',
  lastPing: null,
  error: null,
  captureOnce: async () => ({}),
  startTracking: () => {},
  stopTracking: () => {},
  resync: () => {},
};

/** Status thresholds (mirror dispatch-view.tsx for consistency). */
const STALE_PING_MS = 5 * 60 * 1000; // no ping in 5 min → stale
const OFFLINE_PING_MS = 30 * 60 * 1000; // no ping in 30 min → offline

/**
 * Compute the declarative status from `gpsActive` + `lastPing` age.
 * - Tracking not started → 'offline'
 * - Last ping > 30 min ago → 'offline'
 * - Last ping > 5 min ago → 'stale'
 * - Otherwise → 'live'
 */
function computeStatus(gpsActive: boolean, lastPing: Date | null): GpsStatus {
  if (!gpsActive || !lastPing) return 'offline';
  const ageMs = Date.now() - lastPing.getTime();
  if (ageMs > OFFLINE_PING_MS) return 'offline';
  if (ageMs > STALE_PING_MS) return 'stale';
  return 'live';
}

/** Wake Lock sentinel type — TS lib may not include it yet. */
interface WakeLockSentinelLike {
  released: boolean;
  type: 'screen';
  addEventListener: (type: 'release', listener: () => void) => void;
  release: () => Promise<void>;
}
interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}
interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<{
    level: number; // 0..1
    charging: boolean;
    addEventListener: (type: 'levelchange' | 'chargingchange', listener: () => void) => void;
  }>;
}

export function GpsTrackingProvider({
  children,
  employeeId,
  previewMode = false,
}: {
  children: ReactNode;
  employeeId: string | null;
  previewMode?: boolean;
}) {
  const [gpsActive, setGpsActive] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, forceStatusTick] = useState(0); // forces status recompute every 30s

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPingRef = useRef<number>(0);
  const jobIdRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const batteryRef = useRef<{ level: number; charging: boolean } | null>(null);
  const previewModeRef = useRef(previewMode);

  // ── Phase A: Watchdog + watcher recovery refs ─────────────────────────
  // `lastSuccessRef` tracks the timestamp of the last SUCCESSFUL GPS fix
  // (not just the last ping attempt). The watchdog checks this to detect a
  // stalled watcher — if no success in 45s, we restart watchPosition.
  const lastSuccessRef = useRef<number>(0);
  // `watchdogRef` holds the watchdog interval (checks every 15s).
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // `retryCountRef` tracks consecutive recovery attempts for backoff.
  const retryCountRef = useRef<number>(0);
  // `isRecoveringRef` prevents concurrent recovery attempts.
  const isRecoveringRef = useRef<boolean>(false);

  // Keep previewModeRef in sync so sendPing (which is a useCallback) reads
  // the latest value without needing to be re-created.
  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);

  const gpsSupported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // ── Wake Lock helpers ──────────────────────────────────────────────────
  // Acquire a screen wake lock so the phone doesn't dim/sleep and throttle
  // the GPS watchPosition callback. Re-acquired on visibilitychange → visible
  // because the sentinel auto-releases when the tab is hidden.
  const acquireWakeLock = useCallback(async () => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return; // Safari 15.x, older browsers — silently skip
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) return;
      const sentinel = await nav.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      sentinel.addEventListener('release', () => {
        // Sentinel was released (tab hidden, screen locked, low-power).
        // We'll re-acquire on visibilitychange → visible.
      });
    } catch {
      // Wake Lock acquisition can throw if the document isn't focused or
      // the user denied the screen-wake permission. Non-fatal — GPS still
      // works, just may be throttled when the screen dims.
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Already released — ignore.
      }
    }
    wakeLockRef.current = null;
  }, []);

  // ── Battery Level (Chrome-only) ────────────────────────────────────────
  // Read once at provider mount + listen for changes. Falls back to null
  // on Safari/Firefox where navigator.getBattery is undefined.
  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return;
    let battery: Awaited<ReturnType<NonNullable<NavigatorWithBattery['getBattery']>>> | null = null;
    const update = () => {
      if (battery) {
        batteryRef.current = { level: battery.level, charging: battery.charging };
      }
    };
    nav.getBattery().then((b) => {
      battery = b;
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    }).catch(() => {
      // Battery API can be blocked by permissions — non-fatal.
    });
    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', update);
        battery.removeEventListener('chargingchange', update);
      }
    };
  }, []);

  // ── Core ping: POSTs a position to /api/gps/track ─────────────────────
  // Throttled to max once per 5s to avoid overwhelming the server when
  // watchPosition fires rapidly. The first ping after startTracking is
  // always sent immediately (lastPingRef reset to 0).
  //
  // Preview mode: skip the fetch entirely but still update `lastPing` so
  // the admin preview UI shows the simulated "live" state.
  const sendPing = useCallback(
    (latitude: number, longitude: number, accuracy?: number, heading?: number | null, speed?: number | null, altitude?: number | null) => {
      const now = Date.now();
      if (now - lastPingRef.current < 5000) return; // throttle: min 5s between pings
      lastPingRef.current = now;
      const tagJobId = jobIdRef.current;
      const capturedAt = new Date(now).toISOString();
      const isMoving = typeof speed === 'number' && speed > 1; // >1 m/s ≈ walking pace
      const batteryLevel = batteryRef.current
        ? Math.round(batteryRef.current.level * 100)
        : null;

      setLastPing(new Date(now));
      setError(null);

      // Preview mode: don't POST — admin preview must not pollute the
      // dispatch map with desktop coordinates.
      if (previewModeRef.current) return;

      fetch('/api/gps/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId || undefined,
          jobId: tagJobId ?? undefined,
          latitude,
          longitude,
          accuracy: accuracy ?? undefined,
          heading: heading ?? undefined,
          speed: speed ?? undefined,
          altitude: altitude ?? undefined,
          batteryLevel: batteryLevel ?? undefined,
          isMoving,
          capturedAt,
        }),
      }).catch(() => {
        // Silent — offline pings are lost
      });
    },
    [employeeId],
  );

  // ── Phase A: Visibility recovery ──────────────────────────────────────
  // When the PWA returns from background (phone was locked, user switched
  // apps), the watchPosition callback may have been suspended by the OS.
  // We immediately:
  //   1. Re-acquire the Wake Lock (sentinel auto-releases on hidden)
  //   2. Force an immediate one-shot getCurrentPosition ping (bypass throttle)
  //   3. Update lastSuccessRef so the watchdog doesn't fire a redundant recovery
  // This gives the "return to app → instant GPS refresh" UX.
  //
  // NOTE: This effect MUST be declared after `sendPing` because it references
  // it in the dependency array + callback. Moved here to fix the
  // "Cannot access variable before it is declared" lint error.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && gpsActive) {
        acquireWakeLock();
        // Phase A: Immediate resync on visible. Bypass throttle + force ping.
        if (gpsSupported && !previewModeRef.current) {
          lastPingRef.current = 0;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
              lastSuccessRef.current = Date.now();
              sendPing(latitude, longitude, accuracy ?? undefined, heading, speed, altitude ?? undefined);
            },
            () => {
              // Silent — the watchdog will handle recovery if this fails.
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [gpsActive, gpsSupported, acquireWakeLock, sendPing]);

  // ── captureOnce: one-shot position (triggers permission prompt) ───────
  const captureOnce = useCallback(async (): Promise<GpsCoords> => {
    if (!gpsSupported) return {};
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });
      setLocationDenied(false);
      setError(null);
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch (err) {
      if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
        setLocationDenied(true);
        setError('Location permission denied');
      } else {
        setError('Could not get current location');
      }
      // Swallow — clock-in / lifecycle should still work without location.
      return {};
    }
  }, [gpsSupported]);

  // ── Phase A: restartWatcher — tear down + recreate watchPosition ───────
  // Called by the watchdog when it detects a stalled watcher (no successful
  // GPS fix in 45s). Also called on error recovery (non-permission errors).
  // Uses exponential backoff: 1st retry immediate, then 60s, 90s, 2min.
  const restartWatcher = useCallback(() => {
    if (!gpsSupported) return;
    if (isRecoveringRef.current) return; // prevent concurrent restarts
    isRecoveringRef.current = true;

    try {
      // Tear down existing watcher.
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Recreate watchPosition with fresh options.
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          // SUCCESS — reset recovery state + update lastSuccessRef.
          lastSuccessRef.current = Date.now();
          retryCountRef.current = 0;
          isRecoveringRef.current = false;
          const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
          sendPing(latitude, longitude, accuracy ?? undefined, heading, speed, altitude ?? undefined);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
            setError('Location permission denied');
            setGpsActive(false);
            releaseWakeLock();
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            isRecoveringRef.current = false;
          } else {
            // Non-permission error (timeout, position unavailable) — the
            // watchdog will retry on the next cycle. Don't clear the watcher
            // here; let it keep trying.
            isRecoveringRef.current = false;
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch {
      isRecoveringRef.current = false;
    }
  }, [gpsSupported, sendPing, releaseWakeLock]);

  // ── startTracking: continuous watchPosition + watchdog + 15s fallback ──
  // Phase A architecture (3 layers):
  //
  //   Layer 1 — watchPosition (primary GPS source)
  //     Fires on movement for smooth real-time tracking (Uber/Jobber-style).
  //
  //   Layer 2 — Watchdog (stall detection)
  //     Checks every 15s: if no successful GPS fix in 45s, restart the
  //     watcher. Uses exponential backoff for retries:
  //       45s  → first recovery attempt
  //       60s  → retry
  //       90s  → retry
  //       2min → retry (max interval)
  //     Resets to 0 on any successful fix.
  //
  //   Layer 3 — 15s fallback interval
  //     Ensures pings continue even if watchPosition stalls (device sleep,
  //     poor GPS signal). This is the "keep-alive" — it supplements the
  //     watcher but does NOT replace it.
  //
  //   Layer 4 — Visibility recovery (in the visibilitychange effect above)
  //     When the PWA returns from background, immediately force a one-shot
  //     ping + re-acquire Wake Lock.
  //
  //   Layer 5 — Wake Lock
  //     Keeps the screen awake during active travel so the OS doesn't
  //     throttle/suspend the GPS watcher.
  //
  // LIMITATION: A watchdog CANNOT defeat full OS suspension (iOS/Android
  // backgrounding the PWA completely). When the OS suspends JavaScript,
  // the watchdog itself is suspended. The visibilitychange handler (Layer 4)
  // is the recovery path for that scenario — it fires when the user returns.
  const startTracking = useCallback(
    (jobId?: string) => {
      if (!gpsSupported) return;
      // Stop any existing tracking first.
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      jobIdRef.current = jobId ?? null;
      lastPingRef.current = 0; // reset throttle so first ping is immediate
      lastSuccessRef.current = 0; // reset so watchdog doesn't immediately fire
      retryCountRef.current = 0;
      isRecoveringRef.current = false;
      setGpsActive(true);
      setLocationDenied(false);
      setError(null);

      // Acquire Wake Lock so the screen stays awake during travel.
      acquireWakeLock();

      // Immediate one-shot ping for instant feedback on the map.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lastSuccessRef.current = Date.now();
          const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
          sendPing(latitude, longitude, accuracy ?? undefined, heading, speed, altitude ?? undefined);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
            setError('Location permission denied');
            setGpsActive(false);
            releaseWakeLock();
          }
          // Non-permission errors: the watchdog will handle recovery.
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );

      // Layer 1: watchPosition — primary GPS source (fires on movement).
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          lastSuccessRef.current = Date.now();
          retryCountRef.current = 0;
          const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
          sendPing(latitude, longitude, accuracy ?? undefined, heading, speed, altitude ?? undefined);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
            setError('Location permission denied');
            setGpsActive(false);
            releaseWakeLock();
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (watchdogRef.current) {
              clearInterval(watchdogRef.current);
              watchdogRef.current = null;
            }
          }
          // Non-permission errors: watchdog will restart the watcher.
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );

      // Layer 2: Watchdog — checks every 15s for stalled watcher.
      // If no successful GPS fix in 45s, restart the watcher with backoff.
      watchdogRef.current = setInterval(() => {
        const now = Date.now();
        const lastSuccess = lastSuccessRef.current;
        const staleMs = lastSuccess > 0 ? now - lastSuccess : Infinity;

        // Backoff schedule: 45s, 60s, 90s, 120s (max)
        const backoffThresholds = [45000, 60000, 90000, 120000];
        const currentThreshold = backoffThresholds[
          Math.min(retryCountRef.current, backoffThresholds.length - 1)
        ];

        if (staleMs > currentThreshold) {
          retryCountRef.current++;
          restartWatcher();
        }
      }, 15000);

      // Layer 3: 15s fallback interval — keeps pings flowing even if
      // watchPosition stalls. This is a supplement, NOT a replacement for
      // the watchdog (which restarts the stalled watcher).
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lastSuccessRef.current = Date.now();
            const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
            sendPing(latitude, longitude, accuracy ?? undefined, heading, speed, altitude ?? undefined);
          },
          () => {
            // Silent — watchPosition is the primary source, watchdog
            // handles recovery.
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
        );
      }, 15000);

      if (!previewModeRef.current) {
        toast.success('Live GPS tracking started');
      } else {
        toast.info('GPS preview mode — no real pings sent');
      }
    },
    [employeeId, gpsSupported, sendPing, acquireWakeLock, releaseWakeLock, restartWatcher],
  );

  // ── stopTracking: clear watch + watchdog + interval + release Wake Lock ─
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Phase A: clear the watchdog too so it doesn't fire after stop.
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
    jobIdRef.current = null;
    retryCountRef.current = 0;
    isRecoveringRef.current = false;
    setGpsActive(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  // ── resync: manual re-ping (the "Re-sync Location" button) ────────────
  // Forces an immediate one-shot ping, bypassing the 5s throttle. Useful
  // when the user knows the watchPosition may have stalled (e.g., after
  // waking the phone from sleep) and wants to refresh their position on
  // the dispatch map immediately.
  const resync = useCallback(() => {
    if (!employeeId || !gpsSupported) return;
    lastPingRef.current = 0; // bypass throttle
    // Phase A: reset lastSuccess on manual resync so the watchdog doesn't
    // fire immediately after (the resync itself is a fresh GPS fix attempt).
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastSuccessRef.current = Date.now();
        retryCountRef.current = 0;
        const { latitude, longitude, accuracy, heading, speed, altitude } = pos.coords;
        sendPing(latitude, longitude, accuracy ?? undefined, heading, speed, altitude ?? undefined);
        toast.success('Location re-synced');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationDenied(true);
          setError('Location permission denied');
          toast.error('Location permission denied');
        } else {
          setError('Could not re-sync location');
          toast.error('Could not get current location');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [employeeId, gpsSupported, sendPing]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Phase A: clear the watchdog on unmount too.
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // Tick every 30s so `status` (derived from lastPing age) stays fresh even
  // when no pings are flowing. Without this, the banner would show "live"
  // indefinitely after the last ping if tracking was silently dropped.
  useEffect(() => {
    if (!gpsActive) return;
    const id = setInterval(() => forceStatusTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [gpsActive]);

  const status = computeStatus(gpsActive, lastPing);

  return (
    <GpsTrackingContext.Provider
      value={{
        gpsActive,
        locationDenied,
        gpsSupported,
        previewMode,
        status,
        lastPing,
        error,
        captureOnce,
        startTracking,
        stopTracking,
        resync,
      }}
    >
      {children}
    </GpsTrackingContext.Provider>
  );
}

/**
 * useGpsTracking — access the shared GPS tracking controls.
 *
 * Must be called from a component rendered inside <GpsTrackingProvider>.
 * Returns a no-op fallback if used outside the provider (so hooks like
 * useJobDetailSheet don't crash if the provider is absent).
 */
export function useGpsTracking(): GpsTrackingContextValue {
  const ctx = useContext(GpsTrackingContext);
  return ctx ?? NOOP;
}
