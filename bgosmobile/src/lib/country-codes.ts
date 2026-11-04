/**
 * Supported Country Dial Codes & National Number Rules
 */

export interface CountryItem {
  code: string;
  name: string;
  callingCode: string;
  flag: string;
  digits: number; // Exact required national number digits
  format: string; // Formatting hint
  placeholder: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: 'IN', name: 'India', callingCode: '91', flag: '🇮🇳', digits: 10, format: 'XXXXX XXXXX', placeholder: '98765 43210' },
  { code: 'US', name: 'United States', callingCode: '1', flag: '🇺🇸', digits: 10, format: 'XXX XXX XXXX', placeholder: '555 123 4567' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '971', flag: '🇦🇪', digits: 9, format: 'XX XXX XXXX', placeholder: '50 123 4567' },
  { code: 'GB', name: 'United Kingdom', callingCode: '44', flag: '🇬🇧', digits: 10, format: 'XXXX XXXXXX', placeholder: '7911 123456' },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '966', flag: '🇸🇦', digits: 9, format: 'XX XXX XXXX', placeholder: '50 123 4567' },
  { code: 'CA', name: 'Canada', callingCode: '1', flag: '🇨🇦', digits: 10, format: 'XXX XXX XXXX', placeholder: '555 123 4567' },
  { code: 'SG', name: 'Singapore', callingCode: '65', flag: '🇸🇬', digits: 8, format: 'XXXX XXXX', placeholder: '8123 4567' },
  { code: 'AU', name: 'Australia', callingCode: '61', flag: '🇦🇺', digits: 9, format: 'XXX XXX XXX', placeholder: '412 345 678' },
  { code: 'DE', name: 'Germany', callingCode: '49', flag: '🇩🇪', digits: 10, format: 'XXXX XXXXXX', placeholder: '151 1234567' },
  { code: 'FR', name: 'France', callingCode: '33', flag: '🇫🇷', digits: 9, format: 'X XX XX XX XX', placeholder: '6 12 34 56 78' },
  { code: 'NP', name: 'Nepal', callingCode: '977', flag: '🇳🇵', digits: 10, format: 'XXXXX XXXXX', placeholder: '98412 34567' },
  { code: 'BD', name: 'Bangladesh', callingCode: '880', flag: '🇧🇩', digits: 10, format: 'XXXX XXXXXX', placeholder: '1712 345678' },
];

export const DEFAULT_COUNTRY: CountryItem = COUNTRIES[0]; // India (+91)

export function formatNationalDisplay(digits: string, country: CountryItem): string {
  const clean = digits.replace(/\D/g, '').slice(0, country.digits);
  if (!clean) return '';

  if (country.code === 'IN' || country.code === 'NP') {
    if (clean.length > 5) {
      return `${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return clean;
  }

  if (country.code === 'US' || country.code === 'CA') {
    if (clean.length > 6) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
    if (clean.length > 3) {
      return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    }
    return clean;
  }

  if (country.code === 'AE' || country.code === 'SA') {
    if (clean.length > 5) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
    }
    if (clean.length > 2) {
      return `${clean.slice(0, 2)} ${clean.slice(2)}`;
    }
    return clean;
  }

  if (country.code === 'SG') {
    if (clean.length > 4) {
      return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    }
    return clean;
  }

  return clean;
}

export function buildE164(digits: string, country: CountryItem): string {
  const clean = digits.replace(/\D/g, '').slice(0, country.digits);
  return `+${country.callingCode}${clean}`;
}
