/**
 * Fieseros Mobile App — Location Service
 * City auto-detection using expo-location + the PWA reverse-geocode API.
 *
 * This fixes the user's most critical reported bug: "city auto detect is not working".
 *
 * Flow:
 *   1. Request foreground location permission.
 *   2. Get current GPS coordinates.
 *   3. Reverse-geocode via /api/geocode/reverse to get city name.
 *   4. Match against marketplace cities list; if close match, select it.
 *   5. Persist selection so it survives relaunches.
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { api } from './api';
import { getSelectedCity, setSelectedCity } from './auth';
import type { MarketplaceCity } from '@/types';

export interface DetectedLocation {
  city: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  source: 'gps' | 'ip' | 'cached';
}

/**
 * Request location permission. Returns true if granted.
 * On web, permission is requested implicitly via the Geolocation API.
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Web uses navigator.permissions / geolocation — handled in detectCity.
    return true;
  }
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Get the current GPS position.
 * Falls back to IP-based geolocation (/api/geocode/ip) if GPS is unavailable.
 */
export async function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  const granted = await requestLocationPermission();
  if (!granted) {
    // Fallback to IP geolocation
    const ipLoc = await api.get<{ latitude?: number; longitude?: number; city?: string }>(
      '/api/geocode/ip'
    );
    if (ipLoc.latitude && ipLoc.longitude) {
      return { latitude: ipLoc.latitude, longitude: ipLoc.longitude };
    }
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
  };
}

/**
 * Reverse-geocode coordinates to a city name via the PWA API.
 */
export async function reverseGeocodeCity(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const res = await api.get<{ city?: string; name?: string; locality?: string; address?: string }>(
      '/api/geocode/reverse',
      { latitude, longitude }
    );
    return res.city || res.name || res.locality || null;
  } catch {
    return null;
  }
}

/**
 * Fetch the full list of marketplace cities so we can match the detected
 * city against a known marketplace city.
 */
export async function fetchMarketplaceCities(): Promise<MarketplaceCity[]> {
  try {
    const res = await api.get<MarketplaceCity[] | { cities: MarketplaceCity[] }>(
      '/api/marketplace/cities'
    );
    if (Array.isArray(res)) return res;
    return res.cities || [];
  } catch {
    return [];
  }
}

/**
 * Best-effort fuzzy match of a detected city name against the marketplace
 * cities list (case-insensitive, trimmed).
 */
export function matchCity(
  detected: string | null,
  cities: MarketplaceCity[]
): MarketplaceCity | null {
  if (!detected) return null;
  const lower = detected.toLowerCase().trim();

  // Exact match
  let match = cities.find((c) => c.name.toLowerCase() === lower);
  if (match) return match;

  // Contains match
  match = cities.find(
    (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
  );
  return match || null;
}

/**
 * Full city auto-detect pipeline.
 *
 * 1. Try cached selection first (instant, no permission prompt).
 * 2. Try GPS + reverse geocode.
 * 3. Try IP geolocation as fallback.
 * 4. Persist the result.
 *
 * Returns the detected city name (matched against marketplace cities),
 * or null if detection failed.
 */
export async function detectCity(options?: { skipCache?: boolean }): Promise<DetectedLocation | null> {
  // 1. Cache
  if (!options?.skipCache) {
    const cached = await getSelectedCity();
    if (cached) {
      return { city: cached, latitude: 0, longitude: 0, source: 'cached' };
    }
  }

  // 2. GPS
  try {
    const pos = await getCurrentPosition();
    const cities = await fetchMarketplaceCities();
    const rawCity = await reverseGeocodeCity(pos.latitude, pos.longitude);

    const matched = matchCity(rawCity, cities);
    const cityName = matched?.name || rawCity;
    if (cityName) {
      await setSelectedCity(cityName);
      return {
        city: cityName,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        source: 'gps',
      };
    }
  } catch (err) {
    console.warn('[location] GPS detection failed, falling back to IP:', err);
  }

  // 3. IP fallback
  try {
    const ipLoc = await api.get<{ latitude?: number; longitude?: number; city?: string }>(
      '/api/geocode/ip'
    );
    if (ipLoc.city) {
      const cities = await fetchMarketplaceCities();
      const matched = matchCity(ipLoc.city, cities);
      const cityName = matched?.name || ipLoc.city;
      await setSelectedCity(cityName);
      return {
        city: cityName,
        latitude: ipLoc.latitude || 0,
        longitude: ipLoc.longitude || 0,
        source: 'ip',
      };
    }
  } catch (err) {
    console.warn('[location] IP detection failed:', err);
  }

  return null;
}
