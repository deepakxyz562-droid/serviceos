'use client';

/**
 * use-user-location.ts — Client-side hook for marketplace location detection.
 *
 * Flow:
 *   1. If the user previously granted location, load from localStorage (instant).
 *   2. On `requestLocation()`, prompt for GPS permission via navigator.geolocation.
 *   3. On success, reverse-geocode the lat/lng via /api/geocode/reverse.
 *   4. Store { city, lat, lng, source, accuracy, timestamp } in localStorage.
 *   5. Expose { location, loading, error, requestLocation, clearLocation }.
 *
 * Used by:
 *   - Marketplace hero search "Use my location" button (Crosshair icon)
 *   - Mobile bottom nav "Near Me" tab
 *   - /[industry]/[city] route (reads localStorage for initial city)
 */

import { useState, useEffect, useCallback } from 'react';

export interface UserLocation {
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
  source: 'gps' | 'ip' | 'manual';
  accuracy: 'gps' | 'ip' | 'manual';
  timestamp: number;
}

const STORAGE_KEY = 'fieseros_user_location';
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadStored(): UserLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserLocation;
    if (Date.now() - parsed.timestamp > STORAGE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function store(loc: UserLocation) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // localStorage may be full or disabled — non-fatal
  }
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount.
  // setState-in-effect is the correct pattern here: we must defer the
  // localStorage read to after hydration to avoid SSR/client mismatch
  // (localStorage is browser-only and the server-rendered HTML must match
  // the first client render).
  useEffect(() => {
    const stored = loadStored();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setLocation(stored);
  }, []);

  const requestLocation = useCallback(async (): Promise<UserLocation | null> => {
    setLoading(true);
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return null;
    }

    return new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Reverse-geocode
            const res = await fetch(
              `/api/geocode/reverse?lat=${latitude}&lng=${longitude}`
            );
            let city: string | null = null;
            let state: string | null = null;
            let country: string | null = null;
            if (res.ok) {
              const data = await res.json();
              city = data.city || null;
              state = data.state || null;
              country = data.countryCode || null;
            }
            const loc: UserLocation = {
              city,
              state,
              country,
              lat: latitude,
              lng: longitude,
              source: 'gps',
              accuracy: 'gps',
              timestamp: Date.now(),
            };
            store(loc);
            setLocation(loc);
            setLoading(false);
            resolve(loc);
          } catch {
            // Even if reverse-geocode fails, we still have lat/lng for distance ranking
            const loc: UserLocation = {
              city: null,
              state: null,
              country: null,
              lat: latitude,
              lng: longitude,
              source: 'gps',
              accuracy: 'gps',
              timestamp: Date.now(),
            };
            store(loc);
            setLocation(loc);
            setLoading(false);
            resolve(loc);
          }
        },
        (err) => {
          let msg = 'Unable to get your location';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Location permission denied. Enter your city manually below.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Location information is unavailable. Try entering your city manually.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Location request timed out. Try again or enter your city manually.';
          }
          setError(msg);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: false, // faster, lower power for marketplace use
          timeout: 10000,
          maximumAge: 5 * 60 * 1000, // accept cached position up to 5 min old
        }
      );
    });
  }, []);

  const setManualLocation = useCallback(
    (loc: { city: string; lat?: number; lng?: number }) => {
      const userLoc: UserLocation = {
        city: loc.city,
        state: null,
        country: null,
        lat: loc.lat ?? 0,
        lng: loc.lng ?? 0,
        source: 'manual',
        accuracy: 'manual',
        timestamp: Date.now(),
      };
      store(userLoc);
      setLocation(userLoc);
      setError(null);
    },
    []
  );

  const clearLocation = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation,
    setManualLocation,
    clearLocation,
  };
}
