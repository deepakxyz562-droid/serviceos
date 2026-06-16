'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  formatCurrency,
  formatCurrencyCompact,
  convertCurrency,
  getExchangeRate,
  CURRENCIES,
  type CurrencyInfo,
} from '@/lib/currency';

// ─── Currency Config ────────────────────────────────────────────

interface CurrencyConfig {
  baseCurrency: string;
  multiCurrencyEnabled: boolean;
  supportedCurrencies: string[];
}

// Global cache so all components share one fetch
let cachedConfig: CurrencyConfig | null = null;
let fetchPromise: Promise<CurrencyConfig> | null = null;

const DEFAULT_CONFIG: CurrencyConfig = {
  baseCurrency: 'INR',
  multiCurrencyEnabled: true,
  supportedCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'],
};

async function fetchCurrencyConfig(): Promise<CurrencyConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/settings/currency');
      if (res.ok) {
        const data = await res.json();
        const config: CurrencyConfig = {
          baseCurrency: data.baseCurrency || data.currencySettings?.baseCurrency || 'INR',
          multiCurrencyEnabled: data.currencySettings?.multiCurrencyEnabled ?? true,
          supportedCurrencies: data.currencySettings?.supportedCurrencies || ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'],
        };
        cachedConfig = config;
        return config;
      }
    } catch {
      // Fallback to defaults
    }
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  })();

  return fetchPromise;
}

// ─── Main Hook ──────────────────────────────────────────────────

/**
 * Centralized currency display hook.
 *
 * Design Principles (per user requirements):
 * 1. Every monetary value has a source/original currency
 * 2. User may optionally select a view/display currency
 * 3. If sourceCurrency !== viewCurrency → convert using exchange rate, then format in target
 * 4. If sourceCurrency === viewCurrency → format normally without conversion
 * 5. Original values and currencies remain unchanged in storage
 * 6. Currency conversion occurs at the presentation layer only
 *
 * Usage:
 *   const { format, formatCompact, viewCurrency, setViewCurrency } = useBaseCurrency();
 *
 *   // Amount stored in base currency (most common case):
 *   format(230000)              → "₹2,30,000" if view=INR, "$2,705.28" if view=USD
 *
 *   // Amount stored in a specific currency:
 *   format(79, 'USD')           → "$79.00" if view=USD, "₹6,718.00" if view=INR
 *
 *   // Compact format for dashboards:
 *   formatCompact(230000)       → "₹2.3L" if view=INR, "$2.7K" if view=USD
 */
export function useBaseCurrency() {
  const [baseCurrency, setBaseCurrency] = useState<string>(cachedConfig?.baseCurrency || 'INR');
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(
    cachedConfig?.supportedCurrencies || DEFAULT_CONFIG.supportedCurrencies
  );
  const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState<boolean>(
    cachedConfig?.multiCurrencyEnabled ?? true
  );
  const [isLoading, setIsLoading] = useState(!cachedConfig);
  const [viewCurrency, setViewCurrency] = useState<string>(cachedConfig?.baseCurrency || 'INR');
  const fetched = useRef(!!cachedConfig);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetchCurrencyConfig().then((config) => {
      setBaseCurrency(config.baseCurrency);
      setSupportedCurrencies(config.supportedCurrencies);
      setMultiCurrencyEnabled(config.multiCurrencyEnabled);
      setViewCurrency(config.baseCurrency);
      setIsLoading(false);
    });
  }, []);

  const refresh = useCallback(async () => {
    cachedConfig = null;
    fetchPromise = null;
    setIsLoading(true);
    const config = await fetchCurrencyConfig();
    setBaseCurrency(config.baseCurrency);
    setSupportedCurrencies(config.supportedCurrencies);
    setMultiCurrencyEnabled(config.multiCurrencyEnabled);
    setViewCurrency(config.baseCurrency);
    setIsLoading(false);
  }, []);

  // ─── Conversion-aware formatting ────────────────────────────────

  /**
   * Format a monetary amount with automatic currency conversion.
   *
   * @param amount - The numeric value
   * @param sourceCurrency - The currency this amount is originally in.
   *                         Defaults to baseCurrency (tenant's configured currency).
   * @returns Formatted string in the view currency, e.g. "₹6,718.00" or "$79.00"
   *
   * Examples:
   *   format(79, 'USD')       → if view=INR: "₹6,718.00" (converted)
   *                           → if view=USD: "$79.00" (no conversion)
   *   format(230000)          → if base=INR & view=INR: "₹2,30,000.00" (no conversion)
   *                           → if base=INR & view=USD: "$2,705.28" (converted)
   */
  const format = useCallback(
    (amount: number, sourceCurrency?: string): string => {
      const src = sourceCurrency || baseCurrency;
      if (src === viewCurrency) {
        return formatCurrency(amount, viewCurrency);
      }
      const converted = convertCurrency(amount, src, viewCurrency);
      return formatCurrency(converted, viewCurrency);
    },
    [baseCurrency, viewCurrency]
  );

  /**
   * Compact format with automatic currency conversion.
   * Used for dashboard cards, small spaces.
   *
   * Examples:
   *   formatCompact(230000, 'INR') → if view=INR: "₹2.3L"
   *                                 → if view=USD: "$2.7K"
   *   formatCompact(79, 'USD')     → if view=INR: "₹6.7K"
   *                                 → if view=USD: "$79"
   */
  const formatCompact = useCallback(
    (amount: number, sourceCurrency?: string): string => {
      const src = sourceCurrency || baseCurrency;
      if (src === viewCurrency) {
        return formatCurrencyCompact(amount, viewCurrency);
      }
      const converted = convertCurrency(amount, src, viewCurrency);
      return formatCurrencyCompact(converted, viewCurrency);
    },
    [baseCurrency, viewCurrency]
  );

  /**
   * Convert an amount from source currency to view currency.
   * Returns the numeric result (no formatting).
   */
  const convert = useCallback(
    (amount: number, sourceCurrency?: string): number => {
      const src = sourceCurrency || baseCurrency;
      if (src === viewCurrency) return amount;
      return convertCurrency(amount, src, viewCurrency);
    },
    [baseCurrency, viewCurrency]
  );

  /**
   * Get the exchange rate from source to view currency.
   */
  const getRate = useCallback(
    (sourceCurrency?: string): number => {
      const src = sourceCurrency || baseCurrency;
      return getExchangeRate(src, viewCurrency);
    },
    [baseCurrency, viewCurrency]
  );

  // Filtered list of CurrencyInfo for selectors
  const currencyOptions = useMemo<{ code: string; name: string; symbol: string }[]>(() => {
    return supportedCurrencies
      .map((code) => {
        const info = CURRENCIES.find((c) => c.code === code);
        return info ? { code: info.code, name: info.name, symbol: info.symbol } : null;
      })
      .filter(Boolean) as { code: string; name: string; symbol: string }[];
  }, [supportedCurrencies]);

  return {
    baseCurrency,
    viewCurrency,
    setViewCurrency,
    supportedCurrencies,
    multiCurrencyEnabled,
    currencyOptions,
    isLoading,
    refresh,
    // Conversion-aware formatters
    format,
    formatCompact,
    convert,
    getRate,
  };
}

/**
 * Invalidate the global currency cache.
 * Call this after saving currency settings so other components pick up the change.
 */
export function invalidateCurrencyCache() {
  cachedConfig = null;
  fetchPromise = null;
}
