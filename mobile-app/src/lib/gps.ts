/**
 * Fieseros Mobile App — Best-effort GPS capture for uploads
 *
 * PWA's PhotoCapture + SignaturePad both attach lat/long/accuracy to every
 * upload. Mobile previously didn't, which meant the backend's JobPhoto and
 * Signature records lost their GPS provenance — making it impossible to
 * verify an employee was actually on-site when the proof was captured.
 *
 * This helper is intentionally BEST-EFFORT:
 *   - If the user denied location permission → returns null (no coords).
 *   - If the location request times out (8s) → returns null.
 *   - If expo-location is unavailable (shouldn't happen — it's a dependency)
 *     or the geolocation API is missing on web → returns null.
 *
 * The caller should ALWAYS proceed with the upload even when coords are null.
 * The helper logs a warning so the gap is visible during debugging.
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface GpsCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

const GPS_TIMEOUT_MS = 8000;

let cachedPermissionGranted: boolean | null = null;

/**
 * Request foreground location permission if not already granted.
 * Caches the result so we don't re-prompt on every photo.
 * Returns true if permission is (or was just) granted.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  if (cachedPermissionGranted === true) return true;
  try {
    if (Platform.OS === 'web') {
      // Web uses the Geolocation API directly — permission is implicit.
      cachedPermissionGranted =
        typeof navigator !== 'undefined' && !!navigator.geolocation;
      return cachedPermissionGranted;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    cachedPermissionGranted = status === 'granted';
    return cachedPermissionGranted;
  } catch (err) {
    console.warn('[gps] permission request failed:', err);
    cachedPermissionGranted = false;
    return false;
  }
}

/**
 * Capture the current GPS position. Best-effort: returns null on any error
 * (permission denied, timeout, etc.) so the caller can proceed without
 * blocking the employee.
 *
 * Set `enableHighAccuracy: false` to match the PWA's behavior (faster fix,
 * lower battery drain) — employees don't need sub-meter accuracy for proof
 * of presence.
 */
export async function captureGps(): Promise<GpsCoords | null> {
  const granted = await ensureLocationPermission();
  if (!granted) {
    console.warn('[gps] permission not granted — uploading without coords');
    return null;
  }

  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      return await new Promise<GpsCoords | null>((resolve) => {
        const timer = setTimeout(() => {
          console.warn('[gps] web geolocation timed out');
          resolve(null);
        }, GPS_TIMEOUT_MS);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (err) => {
            clearTimeout(timer);
            console.warn('[gps] web geolocation error:', err.message);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: GPS_TIMEOUT_MS, maximumAge: 60000 }
        );
      });
    }

    // Native: expo-location. Accuracy.Balanced = ~10m, fast fix, low battery.
    // Matches the PWA's enableHighAccuracy=false behavior.
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err) {
    console.warn('[gps] capture failed:', err);
    return null;
  }
}
