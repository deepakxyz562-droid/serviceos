/**
 * Emergency Directory — Mobile Client Country & Location-Aware Emergency Numbers
 * -------------------------------------------------------------------------------
 * Resolves local emergency dispatch services dynamically based on tenant country,
 * GPS coordinates, or device timezone.
 */

export interface EmergencyInfo {
  number: string;
  label: string;
  countryCode: string;
}

export const EMERGENCY_REGISTRY: Record<string, EmergencyInfo> = {
  US: { number: '911', label: 'CALL 911 (POLICE / EMS)', countryCode: 'US' },
  CA: { number: '911', label: 'CALL 911 (POLICE / EMS)', countryCode: 'CA' },
  MX: { number: '911', label: 'LLAMAR 911 (EMERGENCIAS)', countryCode: 'MX' },

  GB: { number: '999', label: 'CALL 999 (EMERGENCY SERVICES)', countryCode: 'GB' },
  IE: { number: '112', label: 'CALL 112 (EMERGENCY SERVICES)', countryCode: 'IE' },
  FR: { number: '112', label: 'APPELER 112 (URGENCES)', countryCode: 'FR' },
  DE: { number: '112', label: 'NOTRUF 112 (NOTFALL)', countryCode: 'DE' },
  IT: { number: '112', label: 'CHIAMA 112 (EMERGENZA)', countryCode: 'IT' },
  ES: { number: '112', label: 'LLAMAR 112 (EMERGENCIAS)', countryCode: 'ES' },
  NL: { number: '112', label: 'BEL 112 (ALARMNUMMER)', countryCode: 'NL' },
  BE: { number: '112', label: 'NOODNUMMER 112 (HULP)', countryCode: 'BE' },
  SE: { number: '112', label: 'RING 112 (NÖDNUMMER)', countryCode: 'SE' },
  PL: { number: '112', label: 'NUMER ALARMOWY 112', countryCode: 'PL' },
  PT: { number: '112', label: 'LIGAR 112 (EMERGÊNCIA)', countryCode: 'PT' },

  IN: { number: '112', label: 'CALL 112 (NATIONAL EMERGENCY)', countryCode: 'IN' },
  AU: { number: '000', label: 'CALL 000 (EMERGENCY SERVICES)', countryCode: 'AU' },
  NZ: { number: '111', label: 'CALL 111 (EMERGENCY SERVICES)', countryCode: 'NZ' },
  SG: { number: '999', label: 'CALL 999 (POLICE / EMS)', countryCode: 'SG' },
  MY: { number: '999', label: 'CALL 999 (KECEMASAN)', countryCode: 'MY' },
  PH: { number: '911', label: 'CALL 911 (EMERGENCY)', countryCode: 'PH' },
  JP: { number: '110', label: 'CALL 110 (POLICE) / 119 (EMS)', countryCode: 'JP' },

  AE: { number: '999', label: 'CALL 999 (POLICE / EMERGENCY)', countryCode: 'AE' },
  SA: { number: '911', label: 'CALL 911 (EMERGENCY CENTER)', countryCode: 'SA' },
  ZA: { number: '112', label: 'CALL 112 (EMERGENCY SERVICES)', countryCode: 'ZA' },
  BR: { number: '190', label: 'LIGAR 190 (POLÍCIA / SAMU)', countryCode: 'BR' },
};

export const GLOBAL_FALLBACK: EmergencyInfo = {
  number: '112',
  label: 'CALL 112 (EMERGENCY SERVICES)',
  countryCode: 'GLOBAL',
};

/**
 * Resolves the emergency number using country code, GPS latitude/longitude,
 * or device timezone.
 */
export function resolveEmergencyInfo(
  countryCode?: string | null,
  coords?: { latitude?: number | null; longitude?: number | null } | null
): EmergencyInfo {
  if (countryCode && typeof countryCode === 'string') {
    const code = countryCode.trim().toUpperCase();
    if (EMERGENCY_REGISTRY[code]) {
      return EMERGENCY_REGISTRY[code];
    }
  }

  // GPS Bounding box heuristic
  if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    const { latitude: lat, longitude: lng } = coords;
    // India
    if (lat >= 8.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0) {
      return EMERGENCY_REGISTRY.IN;
    }
    // USA
    if (lat >= 24.0 && lat <= 50.0 && lng >= -125.0 && lng <= -66.0) {
      return EMERGENCY_REGISTRY.US;
    }
    // UK
    if (lat >= 49.5 && lat <= 61.0 && lng >= -9.0 && lng <= 2.0) {
      return EMERGENCY_REGISTRY.GB;
    }
    // Australia
    if (lat >= -45.0 && lat <= -9.0 && lng >= 112.0 && lng <= 155.0) {
      return EMERGENCY_REGISTRY.AU;
    }
  }

  // Timezone heuristic fallback
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('India')) {
      return EMERGENCY_REGISTRY.IN;
    }
    if (tz.includes('London')) {
      return EMERGENCY_REGISTRY.GB;
    }
    if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane')) {
      return EMERGENCY_REGISTRY.AU;
    }
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) {
      return EMERGENCY_REGISTRY.US;
    }
  } catch {}

  return GLOBAL_FALLBACK;
}
