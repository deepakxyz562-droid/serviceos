'use client';

/**
 * useGpsTracking — shared GPS tracking state for the Employee PWA.
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
 *   - `startTracking(jobId?)` — starts a 30-second interval pinging
 *     `/api/gps/track` with high-accuracy coords. Called on clock-in
 *     (no jobId) and on `start_travel` (with jobId).
 *   - `stopTracking()` — clears the interval. Called on `arrive`,
 *     `complete`, and `clockout`.
 *   - `gpsActive` / `locationDenied` — for the status banner UI.
 *
 * The pings POST to `/api/gps/track` (which already exists and writes
 * GPSLocation + updates Employee.latitude/longitude/lastLocationAt).
 * No backend changes needed.
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

interface GpsTrackingContextValue {
  /** True when the 30s ping interval is running. */
  gpsActive: boolean;
  /** True when the user denied location permission (or it's unavailable). */
  locationDenied: boolean;
  /** False on SSR or unsupported browsers. */
  gpsSupported: boolean;
  /** One-shot capture — triggers the browser permission prompt. */
  captureOnce: () => Promise<GpsCoords>;
  /** Start continuous 30s pings. Optional jobId tags the pings. */
  startTracking: (jobId?: string) => void;
  /** Stop continuous pings. */
  stopTracking: () => void;
}

const GpsTrackingContext = createContext<GpsTrackingContextValue | null>(null);

const NOOP: GpsTrackingContextValue = {
  gpsActive: false,
  locationDenied: false,
  gpsSupported: false,
  captureOnce: async () => ({}),
  startTracking: () => {},
  stopTracking: () => {},
};

export function GpsTrackingProvider({
  children,
  employeeId,
}: {
  children: ReactNode;
  employeeId: string | null;
}) {
  const [gpsActive, setGpsActive] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPingRef = useRef<number>(0);
  const jobIdRef = useRef<string | null>(null);

  const gpsSupported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // ── Core ping: POSTs a position to /api/gps/track ─────────────────────
  // Throttled to max once per 5s to avoid overwhelming the server when
  // watchPosition fires rapidly. The first ping after startTracking is
  // always sent immediately (lastPingRef reset to 0).
  const sendPing = useCallback(
    (latitude: number, longitude: number, accuracy?: number, heading?: number | null, speed?: number | null) => {
      if (!employeeId) return;
      const now = Date.now();
      if (now - lastPingRef.current < 5000) return; // throttle: min 5s between pings
      lastPingRef.current = now;
      const tagJobId = jobIdRef.current;
      fetch('/api/gps/track?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          jobId: tagJobId ?? undefined,
          latitude,
          longitude,
          accuracy,
          heading: heading ?? undefined,
          speed: speed ?? undefined,
        }),
      }).catch(() => {
        // Silent — offline pings are lost (acceptable for V1.5)
      });
    },
    [employeeId],
  );

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
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch (err) {
      if (err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED) {
        setLocationDenied(true);
      }
      // Swallow — clock-in / lifecycle should still work without location.
      return {};
    }
  }, [gpsSupported]);

  // ── startTracking: continuous watchPosition + 15s fallback interval ───
  // Uses navigator.geolocation.watchPosition for smooth real-time movement
  // (Uber/Jobber-style live tracking). watchPosition fires whenever the
  // device detects movement, giving sub-second updates on mobile. A 15s
  // fallback interval ensures pings continue even if watchPosition stalls
  // (e.g., device sleeps). Pings are throttled to max 1 per 5s in sendPing.
  const startTracking = useCallback(
    (jobId?: string) => {
      if (!employeeId || !gpsSupported) return;
      // Stop any existing tracking first.
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      jobIdRef.current = jobId ?? null;
      lastPingRef.current = 0; // reset throttle so first ping is immediate
      setGpsActive(true);
      setLocationDenied(false);

      // Immediate one-shot ping for instant feedback on the map.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading, speed } = pos.coords;
          sendPing(latitude, longitude, accuracy ?? undefined, heading, speed);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
            setGpsActive(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );

      // watchPosition: fires on movement — smooth live tracking.
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading, speed } = pos.coords;
          sendPing(latitude, longitude, accuracy ?? undefined, heading, speed);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
            setGpsActive(false);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );

      // 15s fallback interval: ensures pings continue even if watchPosition
      // stalls (device sleep, poor GPS signal).
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy, heading, speed } = pos.coords;
            sendPing(latitude, longitude, accuracy ?? undefined, heading, speed);
          },
          () => {
            // Silent — watchPosition is the primary source
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
        );
      }, 15000);

      toast.success('Live GPS tracking started');
    },
    [employeeId, gpsSupported, sendPing],
  );

  // ── stopTracking: clear watch + interval ──────────────────────────────
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    jobIdRef.current = null;
    setGpsActive(false);
  }, []);

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
    };
  }, []);

  return (
    <GpsTrackingContext.Provider
      value={{
        gpsActive,
        locationDenied,
        gpsSupported,
        captureOnce,
        startTracking,
        stopTracking,
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
