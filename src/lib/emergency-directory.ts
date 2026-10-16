/**
 * Emergency Directory — Country & Location-Aware Emergency Dispatch Numbers
 * --------------------------------------------------------------------------
 * Maps ISO-3166-1 alpha-2 country codes to official national emergency numbers,
 * police, ambulance, and universal GSM standards.
 *
 * References:
 *   - ITU (International Telecommunication Union) Recommendation E.161.1
 *   - GSM Association Standard Emergency Numbers (112 / 911)
 *   - European Emergency Number Association (EENA)
 */

export interface EmergencyInfo {
  number: string;
  label: string;
  countryCode: string;
  countryName: string;
}

/** Comprehensive Country Emergency Registry */
export const EMERGENCY_REGISTRY: Record<string, EmergencyInfo> = {
  // North America
  US: { number: '911', label: 'Call 911 (Police / EMS)', countryCode: 'US', countryName: 'United States' },
  CA: { number: '911', label: 'Call 911 (Police / EMS)', countryCode: 'CA', countryName: 'Canada' },
  MX: { number: '911', label: 'Call 911 (Emergencias)', countryCode: 'MX', countryName: 'Mexico' },

  // Europe & UK
  GB: { number: '999', label: 'Call 999 (Emergency Services)', countryCode: 'GB', countryName: 'United Kingdom' },
  IE: { number: '112', label: 'Call 112 (Emergency Services)', countryCode: 'IE', countryName: 'Ireland' },
  FR: { number: '112', label: 'Appeler 112 (Urgences)', countryCode: 'FR', countryName: 'France' },
  DE: { number: '112', label: 'Notruf 112 (Notarzt / Feuerwehr)', countryCode: 'DE', countryName: 'Germany' },
  IT: { number: '112', label: 'Chiama 112 (Numero Unico Emergenza)', countryCode: 'IT', countryName: 'Italy' },
  ES: { number: '112', label: 'Llamar 112 (Emergencias)', countryCode: 'ES', countryName: 'Spain' },
  NL: { number: '112', label: 'Bel 112 (Alarmnummer)', countryCode: 'NL', countryName: 'Netherlands' },
  BE: { number: '112', label: 'Noodnummer 112 (Hulpdiensten)', countryCode: 'BE', countryName: 'Belgium' },
  CH: { number: '112', label: 'Notruf 112 (Notfall)', countryCode: 'CH', countryName: 'Switzerland' },
  AT: { number: '112', label: 'Notruf 112 (Euronotruf)', countryCode: 'AT', countryName: 'Austria' },
  SE: { number: '112', label: 'Ring 112 (Nödnummer)', countryCode: 'SE', countryName: 'Sweden' },
  NO: { number: '112', label: 'Ring 112 (Nødnummer Politi)', countryCode: 'NO', countryName: 'Norway' },
  DK: { number: '112', label: 'Ring 112 (Alarmcentral)', countryCode: 'DK', countryName: 'Denmark' },
  FI: { number: '112', label: 'Soita 112 (Hätänumero)', countryCode: 'FI', countryName: 'Finland' },
  PL: { number: '112', label: 'Zadzwoń 112 (Numer Alarmowy)', countryCode: 'PL', countryName: 'Poland' },
  PT: { number: '112', label: 'Ligar 112 (Emergência Nacional)', countryCode: 'PT', countryName: 'Portugal' },
  GR: { number: '112', label: 'Call 112 (Emergency Services)', countryCode: 'GR', countryName: 'Greece' },

  // Asia & Oceania
  IN: { number: '112', label: 'Call 112 (National Emergency Helpline)', countryCode: 'IN', countryName: 'India' },
  AU: { number: '000', label: 'Call 000 (Emergency Services)', countryCode: 'AU', countryName: 'Australia' },
  NZ: { number: '111', label: 'Call 111 (Emergency Services)', countryCode: 'NZ', countryName: 'New Zealand' },
  SG: { number: '999', label: 'Call 999 (Police / EMS)', countryCode: 'SG', countryName: 'Singapore' },
  MY: { number: '999', label: 'Call 999 (Kecemasan)', countryCode: 'MY', countryName: 'Malaysia' },
  PH: { number: '911', label: 'Call 911 (Emergency Hotline)', countryCode: 'PH', countryName: 'Philippines' },
  JP: { number: '110', label: 'Call 110 (Police) / 119 (EMS)', countryCode: 'JP', countryName: 'Japan' },
  KR: { number: '112', label: 'Call 112 (Police) / 119 (EMS)', countryCode: 'KR', countryName: 'South Korea' },
  HK: { number: '999', label: 'Call 999 (Emergency Hotline)', countryCode: 'HK', countryName: 'Hong Kong' },
  TH: { number: '191', label: 'Call 191 (Police) / 1669 (EMS)', countryCode: 'TH', countryName: 'Thailand' },
  ID: { number: '112', label: 'Call 112 (Layanan Darurat)', countryCode: 'ID', countryName: 'Indonesia' },

  // Middle East & Africa
  AE: { number: '999', label: 'Call 999 (Police / Emergency)', countryCode: 'AE', countryName: 'United Arab Emirates' },
  SA: { number: '911', label: 'Call 911 (Unified Emergency Center)', countryCode: 'SA', countryName: 'Saudi Arabia' },
  QA: { number: '999', label: 'Call 999 (Emergency Services)', countryCode: 'QA', countryName: 'Qatar' },
  ZA: { number: '112', label: 'Call 112 (Emergency Services)', countryCode: 'ZA', countryName: 'South Africa' },
  NG: { number: '112', label: 'Call 112 (Emergency Toll-Free)', countryCode: 'NG', countryName: 'Nigeria' },
  KE: { number: '999', label: 'Call 999 (Emergency Helpline)', countryCode: 'KE', countryName: 'Kenya' },
  EG: { number: '122', label: 'Call 122 (Police) / 123 (Ambulance)', countryCode: 'EG', countryName: 'Egypt' },

  // Latin America
  BR: { number: '190', label: 'Ligar 190 (Polícia) / 192 (SAMU)', countryCode: 'BR', countryName: 'Brazil' },
  AR: { number: '911', label: 'Llamar 911 (Emergencias)', countryCode: 'AR', countryName: 'Argentina' },
  CL: { number: '133', label: 'Llamar 133 (Carabineros) / 131 (SAMU)', countryCode: 'CL', countryName: 'Chile' },
  CO: { number: '123', label: 'Llamar 123 (Línea Única de Emergencias)', countryCode: 'CO', countryName: 'Colombia' },
};

/**
 * Universal Global GSM Fallback (Recognized worldwide on all mobile networks)
 */
export const GLOBAL_GSM_FALLBACK: EmergencyInfo = {
  number: '112',
  label: 'Call 112 (Universal Emergency)',
  countryCode: 'GLOBAL',
  countryName: 'Universal GSM',
};

/**
 * Resolve the appropriate emergency contact number based on country code or coordinates.
 */
export function getEmergencyInfo(
  countryCode?: string | null,
  coords?: { lat: number; lng: number } | null
): EmergencyInfo {
  // 1. Direct country code match (case-insensitive)
  if (countryCode && typeof countryCode === 'string') {
    const code = countryCode.trim().toUpperCase();
    if (EMERGENCY_REGISTRY[code]) {
      return EMERGENCY_REGISTRY[code];
    }
  }

  // 2. Coords bounding box fallback (e.g. India bounding box)
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    const { lat, lng } = coords;
    // India: Lat 8.4 to 37.6, Lng 68.7 to 97.25
    if (lat >= 8.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0) {
      return EMERGENCY_REGISTRY.IN;
    }
    // USA (contiguous): Lat 24.5 to 49.4, Lng -125.0 to -66.9
    if (lat >= 24.0 && lat <= 50.0 && lng >= -125.0 && lng <= -66.0) {
      return EMERGENCY_REGISTRY.US;
    }
    // UK: Lat 49.8 to 60.9, Lng -8.6 to 1.8
    if (lat >= 49.5 && lat <= 61.0 && lng >= -9.0 && lng <= 2.0) {
      return EMERGENCY_REGISTRY.GB;
    }
    // Australia: Lat -44.0 to -10.0, Lng 113.0 to 154.0
    if (lat >= -45.0 && lat <= -9.0 && lng >= 112.0 && lng <= 155.0) {
      return EMERGENCY_REGISTRY.AU;
    }
  }

  // 3. Worldwide GSM standard fallback
  return GLOBAL_GSM_FALLBACK;
}
