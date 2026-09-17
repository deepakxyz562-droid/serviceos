/**
 * AI Smart Validation (heuristic)
 * --------------------------------
 * Generates a regex pattern + human-readable error message from a natural-
 * language description of the validation rule.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for arbitrary natural-language → regex.
 */
export interface ValidationRegex {
  pattern: string;
  message: string;
}

interface Rule {
  keywords: string[];
  build: (prompt: string) => ValidationRegex | null;
}

const RULES: Rule[] = [
  // Phone numbers
  { keywords: ['phone', 'mobile', 'tel'], build: () => ({ pattern: '^[+]?[0-9\\s\\-()]{7,20}$', message: 'Enter a valid phone number (7-20 digits, may include +, spaces, dashes, parentheses).' }) },
  // International phone (E.164)
  { keywords: ['e164', 'e.164', 'international phone'], build: () => ({ pattern: '^\\+[1-9]\\d{6,14}$', message: 'Enter a valid international phone number in E.164 format (e.g. +14155550123).' }) },
  // Email
  { keywords: ['email', 'e-mail'], build: () => ({ pattern: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$', message: 'Enter a valid email address.' }) },
  // URL
  { keywords: ['url', 'website', 'link'], build: () => ({ pattern: '^https?:\\/\\/[A-Za-z0-9.-]+\\.[A-Za-z]{2,}.*$', message: 'Enter a valid URL starting with http:// or https://.' }) },
  // US ZIP code
  { keywords: ['zip', 'postal code', 'postcode', 'us zip'], build: () => ({ pattern: '^\\d{5}(-\\d{4})?$', message: 'Enter a valid US ZIP code (e.g. 12345 or 12345-6789).' }) },
  // UK postcode
  { keywords: ['uk postcode', 'british postcode'], build: () => ({ pattern: '^[A-Z]{1,2}\\d[A-Z\\d]? \\d[A-Z]{2}$', message: 'Enter a valid UK postcode (e.g. SW1A 1AA).' }) },
  // Canadian postal code
  { keywords: ['canada postal', 'canadian postal'], build: () => ({ pattern: '^[A-Z]\\d[A-Z] \\d[A-Z]\\d$', message: 'Enter a valid Canadian postal code (e.g. K1A 0B1).' }) },
  // Credit card (basic 16-digit)
  { keywords: ['credit card', 'card number'], build: () => ({ pattern: '^\\d{13,19}$', message: 'Enter a valid card number (13-19 digits).' }) },
  // Date YYYY-MM-DD
  { keywords: ['date', 'iso date'], build: () => ({ pattern: '^\\d{4}-\\d{2}-\\d{2}$', message: 'Enter a date in YYYY-MM-DD format.' }) },
  // Time HH:MM
  { keywords: ['time', 'hh:mm'], build: () => ({ pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', message: 'Enter a time in 24-hour HH:MM format.' }) },
  // Strong password
  { keywords: ['password', 'strong password'], build: () => ({ pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$', message: 'Password must be at least 8 characters and include upper-case, lower-case, a digit, and a symbol.' }) },
  // Username (alphanumeric + underscore, 3-20 chars)
  { keywords: ['username', 'handle'], build: () => ({ pattern: '^[A-Za-z0-9_]{3,20}$', message: 'Username must be 3-20 characters: letters, digits, or underscore.' }) },
  // Slug
  { keywords: ['slug', 'permalink'], build: () => ({ pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', message: 'Slug must be lower-case letters, digits, and dashes only.' }) },
  // Hex color
  { keywords: ['hex color', 'color code'], build: () => ({ pattern: '^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$', message: 'Enter a valid hex color (e.g. #FF5733 or FFF).' }) },
  // IPv4
  { keywords: ['ipv4', 'ip address'], build: () => ({ pattern: '^(\\d{1,3}\\.){3}\\d{1,3}$', message: 'Enter a valid IPv4 address (e.g. 192.168.0.1).' }) },
  // Year (1900-2099)
  { keywords: ['year'], build: () => ({ pattern: '^(19|20)\\d{2}$', message: 'Enter a valid 4-digit year (1900-2099).' }) },
  // Age (positive integer)
  { keywords: ['age'], build: () => ({ pattern: '^(0|[1-9]\\d?|1[0-4]\\d|150)$', message: 'Enter a valid age (0-150).' }) },
  // Currency / money
  { keywords: ['money', 'currency amount', 'price', 'amount'], build: () => ({ pattern: '^\\d+(\\.\\d{1,2})?$', message: 'Enter a valid amount (e.g. 99.99).' }) },
  // VIN (17 chars)
  { keywords: ['vin', 'vehicle identification'], build: () => ({ pattern: '^[A-HJ-NPR-Z0-9]{17}$', message: 'Enter a valid 17-character VIN (no I, O, or Q).' }) },
  // SSN
  { keywords: ['ssn', 'social security'], build: () => ({ pattern: '^\\d{3}-\\d{2}-\\d{4}$', message: 'Enter a valid SSN in XXX-XX-XXXX format.' }) },
];

// Generic length pattern extractor
function tryLengthPattern(prompt: string): ValidationRegex | null {
  const m = prompt.match(/(\d+)\s*(?:to|[-–])\s*(\d+)\s*(?:characters|chars|letters)/i);
  if (m) {
    const min = parseInt(m[1], 10);
    const max = parseInt(m[2], 10);
    return { pattern: `^.{${min},${max}}$`, message: `Must be between ${min} and ${max} characters.` };
  }
  const exact = prompt.match(/exactly\s*(\d+)\s*(?:characters|chars|letters)/i);
  if (exact) {
    const n = parseInt(exact[1], 10);
    return { pattern: `^.{${n}}$`, message: `Must be exactly ${n} characters.` };
  }
  const minOnly = prompt.match(/at least\s*(\d+)\s*(?:characters|chars|letters)/i);
  if (minOnly) {
    const n = parseInt(minOnly[1], 10);
    return { pattern: `^.{${n},}$`, message: `Must be at least ${n} characters.` };
  }
  return null;
}

// Alphanumeric-only
function tryAlphanumeric(prompt: string): ValidationRegex | null {
  if (/alphanumeric|letters and numbers/i.test(prompt)) {
    return { pattern: '^[A-Za-z0-9]+$', message: 'Only letters and digits are allowed.' };
  }
  if (/letters only|alpha only/i.test(prompt)) {
    return { pattern: '^[A-Za-z]+$', message: 'Only letters are allowed.' };
  }
  if (/digits only|numbers only|numeric only/i.test(prompt)) {
    return { pattern: '^\\d+$', message: 'Only digits are allowed.' };
  }
  return null;
}

export async function generateValidationRegex(prompt: string): Promise<ValidationRegex> {
  const text = (prompt || '').toLowerCase().trim();
  if (!text) {
    return { pattern: '', message: 'No validation rule provided.' };
  }

  // 1. Length-based patterns
  const length = tryLengthPattern(text);
  if (length) return length;

  // 2. Character-class patterns
  const alpha = tryAlphanumeric(text);
  if (alpha) return alpha;

  // 3. Keyword-mapped patterns
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      const built = rule.build(text);
      if (built) return built;
    }
  }

  // 4. Generic fallback — non-empty
  if (/required|mandatory|must not be empty|not empty/i.test(text)) {
    return { pattern: '^.+$', message: 'This field is required.' };
  }

  // 5. Unable to infer — return a permissive pattern with a TODO message
  // TODO: integrate z-ai-web-dev-sdk LLM here for arbitrary prompts.
  return { pattern: '', message: 'No specific validation rule could be inferred. Add a custom pattern manually.' };
}

export { generateValidationRegex as default };
