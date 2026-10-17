import { Platform } from 'react-native';

/**
 * Converts latitude and longitude coordinates to Slippy map tile numbers (x, y) at a given zoom level.
 * Used for open CartoDB / OpenStreetMap tile rendering without requiring private API keys.
 */
export function latLonToTileNumbers(lat: number, lon: number, zoom = 15): { x: number; y: number } {
  // Clamp latitude to standard Web Mercator range (-85.0511 to 85.0511)
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const latRad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

/**
 * Generates an open CartoDB Voyager raster tile URL.
 * Voyager is a clear, high-contrast, beautiful map tile style powered by OpenStreetMap data.
 */
export function getCartoMapTileUrl(lat: number, lon: number, zoom = 15): string {
  const { x, y } = latLonToTileNumbers(lat, lon, zoom);
  return `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`;
}

/**
 * Generates an OpenStreetMap interactive embed iframe URL with a pinpoint marker.
 */
export function getOpenStreetMapEmbedUrl(lat: number, lon: number, delta = 0.005): string {
  const left = (lon - delta).toFixed(5);
  const bottom = (lat - delta * 0.8).toFixed(5);
  const right = (lon + delta).toFixed(5);
  const top = (lat + delta * 0.8).toFixed(5);
  const markerLat = lat.toFixed(5);
  const markerLon = lon.toFixed(5);

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${markerLat}%2C${markerLon}`;
}

export interface GeocodeResult {
  formattedAddress: string;
  city?: string;
  state?: string;
  postalCode?: string;
  road?: string;
  suburb?: string;
}

/**
 * Universal cross-platform GPS coordinate detector.
 * Works seamlessly on Web (navigator.geolocation) and Native iOS/Android (expo-location).
 */
export async function getDeviceCoordinates(): Promise<{ latitude: number; longitude: number }> {
  // 1. Web browser environment
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(error.message || 'Web geolocation failed or permission was denied.'));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });
  }

  // 2. Native Mobile (iOS / Android)
  const Location = await import('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission not granted. Please allow location access in your device settings.');
  }

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };
}

/**
 * Universal reverse geocoder.
 * Primary: OpenStreetMap Nominatim API (universal on web & native, no API key required).
 * Secondary fallback: expo-location reverse geocode (on native devices).
 */
export async function reverseGeocodeCoords(latitude: number, longitude: number): Promise<GeocodeResult> {
  // 1. OpenStreetMap Nominatim Reverse Geocoding
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'BOS-Customer-Mobile/1.0',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.residential || addr.street || addr.pedestrian || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.state_district || '';
        const state = addr.state || '';
        const postalCode = addr.postcode || '';

        const cleanParts = [
          addr.house_number,
          road,
          suburb,
          city,
          state,
          postalCode,
        ].filter(Boolean);

        const formattedAddress = cleanParts.length > 0 ? cleanParts.join(', ') : data.display_name;

        return {
          formattedAddress: formattedAddress || `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
          city: city || undefined,
          state: state || undefined,
          postalCode: postalCode || undefined,
          road: road || undefined,
          suburb: suburb || undefined,
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode lookup failed:', err);
  }

  // 2. Native fallback using expo-location (iOS / Android only)
  if (Platform.OS !== 'web') {
    try {
      const Location = await import('expo-location');
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo && geo.length > 0) {
        const place = geo[0];
        const parts = [
          place.name,
          place.street,
          place.district || place.subregion,
          place.city,
          place.region,
          place.postalCode,
        ].filter(Boolean);

        return {
          formattedAddress: parts.join(', '),
          city: place.city || undefined,
          state: place.region || undefined,
          postalCode: place.postalCode || undefined,
        };
      }
    } catch (nativeErr) {
      console.warn('Native expo-location reverse geocode failed:', nativeErr);
    }
  }

  // 3. Fallback coordinates representation
  return {
    formattedAddress: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format a store or business address into a clean, human-readable single-line string.
 * Strips raw JSON objects and prevents repeating city/state/country.
 */
export function formatStoreAddress(rawAddress?: string | null, cityFallback?: string | null): string {
  if (!rawAddress && !cityFallback) return '';
  const trimmed = (rawAddress || '').trim();

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const jsonStr = trimmed.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr) as {
        street?: string | null;
        city?: string | null;
        state?: string | null;
        pincode?: string | null;
        postalCode?: string | null;
        country?: string | null;
      };

      const street = (parsed.street || '').trim();
      const city = (parsed.city || cityFallback || '').trim();
      const state = (parsed.state || '').trim();
      const pincode = (parsed.pincode || parsed.postalCode || '').trim();
      const country = (parsed.country || '').trim();

      const components: string[] = [];

      if (street) {
        components.push(street);
      }

      if (city && (!street || !new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i').test(street))) {
        components.push(city);
      }

      if (state && (!street || !new RegExp(`\\b${escapeRegExp(state)}\\b`, 'i').test(street))) {
        components.push(state);
      }

      if (pincode && (!street || !street.includes(pincode))) {
        components.push(pincode);
      }

      if (country && (!street || !new RegExp(`\\b${escapeRegExp(country)}\\b`, 'i').test(street))) {
        components.push(country);
      }

      const formatted = components.join(', ');
      if (formatted) return formatted;
    } catch {
      // Fall through to plain text
    }
  }

  let result = trimmed;
  const city = (cityFallback || '').trim();
  if (city && result && !new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i').test(result)) {
    result = `${result}, ${city}`;
  } else if (!result && city) {
    result = city;
  }

  return result;
}
