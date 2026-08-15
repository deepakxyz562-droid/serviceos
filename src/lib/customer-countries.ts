/**
 * Customer-form country list (ISSUE-3).
 *
 * The marketplace directory's `COUNTRIES` constant in `directory-seed.ts`
 * is intentionally EU-focused (43 European countries + UK + TR + RU + XK).
 * For a CRM customer form, we want a broader list that includes the most
 * common customer-destination countries (US, CA, IN, AU, etc.) while
 * still reusing the existing EU countries.
 *
 * To avoid importing the heavy `directory-seed.ts` (which transitively
 * imports `db`), this module ships its own curated list of ISO-3166
 * alpha-2 codes + names. The codes align with the TaxRule `country`
 * column so the "No tax rate created" alert can match cleanly.
 */
export interface CustomerCountryOption {
  code: string;
  name: string;
}

// Top common countries first (US, CA, IN, AU, NZ, ZA, AE, SG, etc.) so the
// dropdown shows the most-used options at the top. Followed by the EU +
// Nordic + Balkan + CIS countries already in the marketplace directory.
// Source: ISO-3166 alpha-2 codes.
export const CUSTOMER_COUNTRIES: CustomerCountryOption[] = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },

  // ── European Union (EU-27) ──────────────────────────────────────────
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'FI', name: 'Finland' },
  { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'HR', name: 'Croatia' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },

  // ── Non-EU Europe ──────────────────────────────────────────────────
  { code: 'CH', name: 'Switzerland' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'DK', name: 'Denmark' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'IS', name: 'Iceland' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'MD', name: 'Moldova' },
  { code: 'BY', name: 'Belarus' },
  { code: 'RU', name: 'Russia' },
  { code: 'RS', name: 'Serbia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'AL', name: 'Albania' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'TR', name: 'Turkey' },

  // ── Asia-Pacific ───────────────────────────────────────────────────
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
];

/** Convenience lookup: code → name. */
export const CUSTOMER_COUNTRY_NAMES: Record<string, string> =
  Object.fromEntries(CUSTOMER_COUNTRIES.map((c) => [c.code, c.name]));
