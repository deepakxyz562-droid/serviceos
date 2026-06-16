// ============================================================
// Multi-Currency Utility
// ============================================================
// Centralized currency formatting, conversion, and metadata.
// All views should use these utilities instead of hardcoded formatters.
//
// Design Principles (per user recommendation):
// 1. Store the original transaction currency
// 2. Store the exchange rate used when the document was created
// 3. Store the converted amount in base currency
// 4. Allow users to view reports in another currency using conversion
// 5. Never simply replace ₹ with $ — always show with proper conversion
// ============================================================

// ─── Currency Metadata ──────────────────────────────────────

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', name: 'Indian Rupee',      symbol: '₹',  locale: 'en-IN', decimals: 2 },
  { code: 'USD', name: 'US Dollar',         symbol: '$',  locale: 'en-US', decimals: 2 },
  { code: 'EUR', name: 'Euro',              symbol: '€',  locale: 'de-DE', decimals: 2 },
  { code: 'GBP', name: 'British Pound',     symbol: '£',  locale: 'en-GB', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham',        symbol: 'د.إ', locale: 'ar-AE', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar',  symbol: 'S$', locale: 'en-SG', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar',   symbol: 'C$', locale: 'en-CA', decimals: 2 },
  { code: 'SAR', name: 'Saudi Riyal',       symbol: '﷼',  locale: 'ar-SA', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen',      symbol: '¥',  locale: 'ja-JP', decimals: 0 },
  { code: 'CNY', name: 'Chinese Yuan',      symbol: '¥',  locale: 'zh-CN', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY', decimals: 2 },
  { code: 'THB', name: 'Thai Baht',         symbol: '฿',  locale: 'th-TH', decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira',    symbol: '₦',  locale: 'en-NG', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real',    symbol: 'R$', locale: 'pt-BR', decimals: 2 },
];

// Quick lookup maps
export const currencyMap: Record<string, CurrencyInfo> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
);

export const currencySymbol = (code: string): string => currencyMap[code]?.symbol ?? code;
export const currencyName = (code: string): string => currencyMap[code]?.name ?? code;
export const currencyLocale = (code: string): string => currencyMap[code]?.locale ?? 'en-US';
export const currencyDecimals = (code: string): number => currencyMap[code]?.decimals ?? 2;

// ─── Formatting ─────────────────────────────────────────────

/**
 * Format a monetary amount in the given currency using Intl.NumberFormat.
 * Falls back gracefully if the currency code is unknown.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options?: { compact?: boolean; hideSymbol?: boolean }
): string {
  const info = currencyMap[currencyCode];
  const locale = info?.locale ?? 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: options?.hideSymbol ? 'decimal' : 'currency',
      currency: currencyCode,
      minimumFractionDigits: options?.compact ? 0 : (info?.decimals ?? 2),
      maximumFractionDigits: options?.compact ? 1 : (info?.decimals ?? 2),
    }).format(amount);
  } catch {
    // Fallback for unsupported currency codes
    const sym = info?.symbol ?? currencyCode;
    return options?.hideSymbol
      ? amount.toFixed(info?.decimals ?? 2)
      : `${sym}${amount.toFixed(info?.decimals ?? 2)}`;
  }
}

/**
 * Compact formatting for dashboard cards / small spaces.
 * e.g. ₹1.5L, $12.3K
 */
export function formatCurrencyCompact(amount: number, currencyCode: string = 'USD'): string {
  const info = currencyMap[currencyCode];
  const sym = info?.symbol ?? currencyCode;

  if (currencyCode === 'INR') {
    // Indian numbering system: Lakhs & Crores
    if (amount >= 1_00_00_000) return `${sym}${(amount / 1_00_00_000).toFixed(1)}Cr`;
    if (amount >= 1_00_000) return `${sym}${(amount / 1_00_000).toFixed(1)}L`;
    if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}K`;
    return `${sym}${amount.toFixed(0)}`;
  }

  // Western: K / M / B
  if (amount >= 1_000_000_000) return `${sym}${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}K`;
  return `${sym}${amount.toFixed(0)}`;
}

// ─── Conversion ─────────────────────────────────────────────

/**
 * Exchange rate table — keyed as `${FROM}_${TO}` → rate.
 * In production, this would be fetched from an external API.
 * For now, we provide sensible defaults relative to USD.
 */
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  INR: 0.01176,   // 1 INR ≈ $0.01176  →  1 USD ≈ ₹85
  EUR: 1.08,
  GBP: 1.27,
  AED: 0.2723,
  SGD: 0.7408,
  AUD: 0.6452,
  CAD: 0.7042,
  SAR: 0.2667,
  ZAR: 0.0545,
  JPY: 0.00663,
  CNY: 0.1379,
  MYR: 0.2239,
  THB: 0.0294,
  NGN: 0.00065,
  BRL: 0.1724,
};

/** Get the rate FROM → TO (how many TO units per 1 FROM unit) */
export function getExchangeRate(from: string, to: string): number {
  if (from === to) return 1;
  const fromToUsd = RATES_TO_USD[from] ?? 1;  // 1 FROM = X USD
  const toToUsd = RATES_TO_USD[to] ?? 1;      // 1 TO = Y USD
  // We want: amount_in_FROM * rate = amount_in_TO
  // amount_in_FROM * fromToUsd = amount_in_USD
  // amount_in_USD / toToUsd = amount_in_TO
  // So rate = fromToUsd / toToUsd
  return fromToUsd / toToUsd;
}

/**
 * Convert an amount from one currency to another.
 * Uses stored exchange rate if provided (for historical accuracy),
 * otherwise falls back to current rates.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  storedRate?: number
): number {
  if (fromCurrency === toCurrency) return amount;
  const rate = storedRate ?? getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Get the full exchange rate table relative to a base currency.
 * Useful for the Settings UI "Exchange Rates" display.
 */
export function getExchangeRateTable(baseCurrency: string = 'USD'): { code: string; name: string; symbol: string; rate: number }[] {
  return CURRENCIES.map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    rate: getExchangeRate(baseCurrency, c.code),
  }));
}

// ─── Currency Settings Interface ────────────────────────────

export interface CurrencySettings {
  baseCurrency: string;          // e.g. 'INR'
  multiCurrencyEnabled: boolean; // Allow multi-currency transactions
  autoExchangeRates: boolean;    // Auto-fetch exchange rates
  supportedCurrencies: string[]; // Currencies available for selection
  rateSource: string;            // 'manual' | 'auto'
  lastRateUpdate: string | null; // ISO timestamp
}

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  baseCurrency: 'INR',
  multiCurrencyEnabled: true,
  autoExchangeRates: true,
  supportedCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'],
  rateSource: 'auto',
  lastRateUpdate: null,
};

// ─── View Currency Display Helper ───────────────────────────

/**
 * Given a transaction amount with its stored currency and exchange rate,
 * return a formatted string in the requested view currency.
 * Also returns the original amount display for comparison.
 */
export function formatWithConversion(params: {
  amount: number;
  transactionCurrency: string;
  baseCurrency: string;
  viewCurrency: string;
  exchangeRate?: number;
}): { formatted: string; original: string; rate: number } {
  const { amount, transactionCurrency, baseCurrency, viewCurrency, exchangeRate } = params;

  const original = formatCurrency(amount, transactionCurrency);

  if (transactionCurrency === viewCurrency) {
    return { formatted: original, original, rate: 1 };
  }

  // Convert: transaction currency → base currency → view currency
  const rate = exchangeRate ?? getExchangeRate(transactionCurrency, viewCurrency);
  const converted = amount * rate;
  const formatted = formatCurrency(converted, viewCurrency);

  return { formatted, original, rate };
}
