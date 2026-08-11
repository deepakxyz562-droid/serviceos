/**
 * Fieseros Mobile App — Currency Helper
 *
 * Mirrors the PWA's useCompanyCurrency hook: formats amounts using the
 * tenant-configured currency code (Tenant.currency) instead of hardcoding
 * USD everywhere.
 *
 * The /api/auth/me response includes `tenant.currency` (e.g. "USD", "INR",
 * "EUR", "PHP"). The mobile auth-store now unwraps that envelope so
 * `useAuthStore().tenant?.currency` is populated after bootstrap.
 *
 * All formatCurrency calls gracefully fall back to USD if no currency is
 * provided (e.g. before login completes, or for a tenant with a null
 * currency column).
 *
 * Intl.NumberFormat is available on both native (Hermes / JSC) and web —
 * React Native ships a full Intl polyfill since 0.64+.
 */

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_LOCALE = 'en-US';

// Intl.NumberFormat construction is relatively expensive; cache one formatter
// per currency to avoid re-creating on every render of a long expense list.
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      });
    } catch {
      // Invalid currency code (e.g. tenant has garbage in the column) —
      // fall back to USD so we never crash the UI.
      fmt = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: DEFAULT_CURRENCY,
      });
    }
    formatterCache.set(key, fmt);
  }
  return fmt;
}

/**
 * Format a numeric amount as a currency string.
 *
 * @example
 *   formatCurrency(12.5)                       // "$12.50"
 *   formatCurrency(12.5, 'INR')                // "₹12.50"
 *   formatCurrency(12.5, 'EUR')                // "€12.50"
 *   formatCurrency(12.5, null)                 // "$12.50" (fallback)
 *   formatCurrency(NaN)                        // "$0.00"
 */
export function formatCurrency(amount: number, currency?: string | null): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const code = (currency && typeof currency === 'string' && currency.trim()) || DEFAULT_CURRENCY;
  return getFormatter(code, DEFAULT_LOCALE).format(safeAmount);
}

/**
 * Return the tenant's currency code, or 'USD' if unset.
 * Convenient for labels like "Amount (USD)".
 */
export function currencyCode(currency?: string | null): string {
  return (currency && typeof currency === 'string' && currency.trim()) || DEFAULT_CURRENCY;
}
