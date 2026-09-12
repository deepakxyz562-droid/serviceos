/**
 * phone-utils.ts — Single source of truth for phone number parsing,
 * formatting, validation, and E.164 normalization.
 *
 * Designed for ServiceOS / Fieseros multi-country phone management & Twilio SMS.
 */

export interface CountryInfo {
  code: string;       // ISO 3166-1 alpha-2 (e.g. "IN", "US", "GB")
  name: string;       // e.g. "India", "United States"
  callingCode: string;// e.g. "91", "1", "44"
  flag: string;       // e.g. "🇮🇳", "🇺🇸"
  format: string;     // e.g. "XXXXX XXXXX"
  minLength: number;  // min national digits
  maxLength: number;  // max national digits
}

export const COUNTRIES: CountryInfo[] = [
  { code: "IN", name: "India", callingCode: "91", flag: "🇮🇳", format: "XXXXX XXXXX", minLength: 10, maxLength: 10 },
  { code: "US", name: "United States", callingCode: "1", flag: "🇺🇸", format: "(XXX) XXX-XXXX", minLength: 10, maxLength: 10 },
  { code: "CA", name: "Canada", callingCode: "1", flag: "🇨🇦", format: "(XXX) XXX-XXXX", minLength: 10, maxLength: 10 },
  { code: "GB", name: "United Kingdom", callingCode: "44", flag: "🇬🇧", format: "XXXXX XXXXXX", minLength: 10, maxLength: 11 },
  { code: "AU", name: "Australia", callingCode: "61", flag: "🇦🇺", format: "XXXX XXX XXX", minLength: 9, maxLength: 9 },
  { code: "AE", name: "United Arab Emirates", callingCode: "971", flag: "🇦🇪", format: "XX XXX XXXX", minLength: 9, maxLength: 9 },
  { code: "SA", name: "Saudi Arabia", callingCode: "966", flag: "🇸🇦", format: "XX XXX XXXX", minLength: 9, maxLength: 9 },
  { code: "SG", name: "Singapore", callingCode: "65", flag: "🇸🇬", format: "XXXX XXXX", minLength: 8, maxLength: 8 },
  { code: "MY", name: "Malaysia", callingCode: "60", flag: "🇲🇾", format: "XX-XXX XXXX", minLength: 9, maxLength: 10 },
  { code: "NZ", name: "New Zealand", callingCode: "64", flag: "🇳🇿", format: "XX XXX XXXX", minLength: 8, maxLength: 10 },
  { code: "DE", name: "Germany", callingCode: "49", flag: "🇩🇪", format: "XXXX XXXXXXX", minLength: 10, maxLength: 11 },
  { code: "FR", name: "France", callingCode: "33", flag: "🇫🇷", format: "X XX XX XX XX", minLength: 9, maxLength: 9 },
  { code: "ZA", name: "South Africa", callingCode: "27", flag: "🇿🇦", format: "XX XXX XXXX", minLength: 9, maxLength: 9 },
  { code: "IE", name: "Ireland", callingCode: "353", flag: "🇮🇪", format: "XX XXX XXXX", minLength: 9, maxLength: 9 },
  { code: "PH", name: "Philippines", callingCode: "63", flag: "🇵🇭", format: "XXX XXX XXXX", minLength: 10, maxLength: 10 },
];

export const DEFAULT_COUNTRY: CountryInfo = COUNTRIES[0]; // India (+91)

export const COUNTRY_MAP: Record<string, CountryInfo> = COUNTRIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {} as Record<string, CountryInfo>);

/**
 * Find country info by ISO code (case-insensitive)
 */
export function getCountryByCode(code?: string | null): CountryInfo {
  if (!code) return DEFAULT_COUNTRY;
  const upper = code.trim().toUpperCase();
  return COUNTRY_MAP[upper] || DEFAULT_COUNTRY;
}

/**
 * Auto-detect country code from a raw phone string (e.g. "+919876543210" -> "IN", "+14155552671" -> "US")
 */
export function detectCountryFromPhone(phone?: string | null): CountryInfo | null {
  if (!phone) return null;
  const clean = phone.trim().replace(/[\s\-()]/g, "");
  if (!clean.startsWith("+")) return null;

  const withoutPlus = clean.slice(1);
  // Match longest calling code first (e.g. 971 before 97)
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.callingCode.length - a.callingCode.length);
  for (const c of sortedCountries) {
    if (withoutPlus.startsWith(c.callingCode)) {
      return c;
    }
  }
  return null;
}

/**
 * Converts any phone input into standard E.164 format: +[CountryCode][SubscriberNumber]
 */
export function formatToE164(rawPhone?: string | null, defaultCountryCode: string = "IN"): string {
  if (!rawPhone || !rawPhone.trim()) return "";

  let p = rawPhone.trim().replace(/[\s\-()]/g, "");

  // 1. If explicitly starts with "+", validate & clean
  if (p.startsWith("+")) {
    const digits = p.slice(1).replace(/\D/g, "");
    return digits ? `+${digits}` : "";
  }

  // 2. Handle international prefix "00" (e.g. 00919876543210 -> +919876543210)
  if (p.startsWith("00") && p.length > 4) {
    return `+${p.slice(2).replace(/\D/g, "")}`;
  }

  // 3. Resolve target country
  const country = getCountryByCode(defaultCountryCode);
  const callingCode = country.callingCode;

  // 4. Strip local trunk zero (e.g. 09876543210 in India or 07911 in UK)
  if (p.startsWith("0") && p.length > 9) {
    p = p.slice(1);
  }

  // 5. Strip non-digits
  const digits = p.replace(/\D/g, "");
  if (!digits) return "";

  // 6. If user already included the calling code without "+", add "+"
  if (digits.startsWith(callingCode) && digits.length >= callingCode.length + country.minLength - 1) {
    return `+${digits}`;
  }

  // 7. Otherwise prefix with country calling code
  return `+${callingCode}${digits}`;
}

/**
 * Format a phone number for friendly national display.
 * E.g. "+919876543210" -> "98765 43210" (if country=IN)
 *      "+14155552671"  -> "(415) 555-2671" (if country=US)
 */
export function formatNational(phone?: string | null, defaultCountryCode: string = "IN"): string {
  if (!phone) return "";
  const detected = detectCountryFromPhone(phone);
  const country = detected || getCountryByCode(defaultCountryCode);

  let digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+") && digits.startsWith(country.callingCode)) {
    digits = digits.slice(country.callingCode.length);
  }

  // Format according to country template
  if (country.code === "IN" && digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if ((country.code === "US" || country.code === "CA") && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (country.code === "GB" && digits.length >= 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  if (country.code === "AE" && digits.length === 9) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }

  return digits;
}

/**
 * Basic validation check for phone number sanity.
 */
export function isValidPhoneNumber(phone?: string | null, countryCode: string = "IN"): boolean {
  if (!phone || !phone.trim()) return false;
  const e164 = formatToE164(phone, countryCode);
  if (!e164.startsWith("+")) return false;

  const digits = e164.slice(1);
  const country = detectCountryFromPhone(e164) || getCountryByCode(countryCode);

  const nationalDigits = digits.slice(country.callingCode.length);
  return nationalDigits.length >= country.minLength && nationalDigits.length <= country.maxLength;
}
