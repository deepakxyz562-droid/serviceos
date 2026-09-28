import { CURRENCIES, currencyMap, currencySymbol, formatCurrency } from '@/lib/currency';

/**
 * Detect currency from browser timezone or locale when no tenant preference is saved.
 */
export function detectGeoCurrency(): string {
  if (typeof window === 'undefined') return 'USD';

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();

    // India
    if (
      tz.includes('Kolkata') ||
      tz.includes('Calcutta') ||
      tz === 'Asia/Colombo' ||
      lang.includes('in')
    ) {
      return 'INR';
    }

    // United Kingdom
    if (tz === 'Europe/London' || lang === 'en-gb') {
      return 'GBP';
    }

    // Eurozone
    if (
      tz.startsWith('Europe/') &&
      !['Europe/London', 'Europe/Kyiv', 'Europe/Moscow', 'Europe/Minsk'].includes(tz)
    ) {
      return 'EUR';
    }

    // United Arab Emirates
    if (tz === 'Asia/Dubai') {
      return 'AED';
    }

    // Canada
    if (tz.startsWith('America/') && (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal'))) {
      return 'CAD';
    }

    // Australia
    if (tz.startsWith('Australia/')) {
      return 'AUD';
    }
  } catch {
    // Silent fallback
  }

  return 'USD';
}

/**
 * Resolve effective currency in priority order:
 * 1. Saved tenant / profile currency
 * 2. Geo-detected currency from browser timezone / locale
 * 3. Default fallback: USD
 */
export function resolveEffectiveCurrency(savedCurrency?: string | null): string {
  if (savedCurrency && savedCurrency.trim() && currencyMap[savedCurrency.toUpperCase()]) {
    return savedCurrency.toUpperCase();
  }
  return detectGeoCurrency();
}

export { CURRENCIES, currencyMap, currencySymbol, formatCurrency };
