'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  formatCurrency,
  formatCurrencyCompact,
  convertCurrency,
  getExchangeRate,
  CURRENCIES,
} from '@/lib/currency';

// ─── Company Currency Config ────────────────────────────────────────────

interface CompanyCurrencyConfig {
  currency: string; // e.g. 'USD', 'INR'
}

// Global cache so all components share one fetch
let cachedConfig: CompanyCurrencyConfig | null = null;
let fetchPromise: Promise<CompanyCurrencyConfig> | null = null;

const DEFAULT_CONFIG: CompanyCurrencyConfig = {
  currency: 'USD',
};

// Custom event name for currency change propagation
const CURRENCY_CHANGE_EVENT = 'company-currency-changed';

async function fetchCompanyCurrency(): Promise<CompanyCurrencyConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/settings/currency');
      if (res.ok) {
        const data = await res.json();
        const config: CompanyCurrencyConfig = {
          currency: data.baseCurrency || data.currency || 'USD',
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

// ─── Main Hook ──────────────────────────────────────────────────────────

/**
 * Simplified company currency hook with conversion support.
 *
 * Design Principles:
 * 1. One Company → One Currency. No multi-workspace, no view currency, no per-user currency.
 * 2. All monetary values in the system are displayed in the company's currency.
 * 3. If company sets USD → Dashboard, CRM, Quotes, Invoices, Reports, Portals all use USD.
 * 4. When source currency differs from company currency, conversion happens automatically.
 * 5. No workspace switching required.
 *
 * Usage:
 *   const { currency, format, formatCompact, isLoading, refresh } = useCompanyCurrency();
 *
 *   // Amount already in company currency (default behavior, e.g. leads, deals, jobs from DB):
 *   format(670)                    → "₹670.00" if currency=INR, "$670.00" if currency=USD
 *   formatCompact(2300)            → "₹2.3K" if currency=INR, "$2.3K" if currency=USD
 *
 *   // Explicit cross-currency conversion (e.g. converting a locked USD quote to company currency):
 *   format(79, 'USD')              → "$79.00" if currency=USD, "₹6,717.69" if currency=INR
 *   formatCompact(2300, 'USD')     → "$2.3K" if currency=USD, "₹1.96L" if currency=INR
 */
export function useCompanyCurrency() {
  const [currency, setCurrency] = useState<string>(cachedConfig?.currency || 'USD');
  const [isLoading, setIsLoading] = useState(!cachedConfig);
  const fetched = useRef(!!cachedConfig);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetchCompanyCurrency().then((config) => {
      setCurrency(config.currency);
      setIsLoading(false);
    });
  }, []);

  // Listen for currency change events from other components
  useEffect(() => {
    const handler = () => {
      cachedConfig = null;
      fetchPromise = null;
      setIsLoading(true);
      fetchCompanyCurrency().then((config) => {
        setCurrency(config.currency);
        setIsLoading(false);
      });
    };
    window.addEventListener(CURRENCY_CHANGE_EVENT, handler);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, handler);
  }, []);

  const refresh = useCallback(async () => {
    cachedConfig = null;
    fetchPromise = null;
    setIsLoading(true);
    const config = await fetchCompanyCurrency();
    setCurrency(config.currency);
    setIsLoading(false);
  }, []);

  // ─── Conversion-aware formatting ────────────────────────────────────

  /**
   * Format a monetary amount with optional currency conversion.
   *
   * @param amount - The numeric value
   * @param sourceCurrency - The currency this amount is originally in.
   *                         Defaults to company currency (no conversion needed).
   *                         Pass a different currency code (e.g. 'USD') only if
   *                         converting an external or locked currency value.
   * @returns Formatted string in the company currency, e.g. "₹670.00" or "$79.00"
   *
   * Examples:
   *   format(670)             → if company=INR: "₹670.00" (default: no conversion)
   *                           → if company=USD: "$670.00" (default: no conversion)
   *   format(79, 'USD')       → if company=INR: "₹6,717.69" (explicit USD conversion)
   *                           → if company=USD: "$79.00" (no conversion)
   *   format(230000, 'INR')   → if company=USD: "$2,705.28" (explicit INR conversion)
   *                           → if company=INR: "₹2,30,000.00" (no conversion)
   */
  const format = useCallback(
    (amount: number, sourceCurrency?: string): string => {
      const src = sourceCurrency || currency;
      if (src === currency) {
        return formatCurrency(amount, currency);
      }
      const converted = convertCurrency(amount, src, currency);
      return formatCurrency(converted, currency);
    },
    [currency]
  );

  /**
   * Compact format with optional currency conversion.
   * Used for dashboard cards, small spaces.
   *
   * Examples:
   *   formatCompact(2300)         → if company=INR: "₹2.3K" (no conversion)
   *   formatCompact(2300, 'USD')  → if company=INR: "₹1.96L" (converted)
   *                               → if company=USD: "$2.3K"
   */
  const formatCompact = useCallback(
    (amount: number, sourceCurrency?: string): string => {
      const src = sourceCurrency || currency;
      if (src === currency) {
        return formatCurrencyCompact(amount, currency);
      }
      const converted = convertCurrency(amount, src, currency);
      return formatCurrencyCompact(converted, currency);
    },
    [currency]
  );

  /**
   * Convert an amount from source currency to company currency.
   * Returns the numeric result (no formatting).
   */
  const convert = useCallback(
    (amount: number, sourceCurrency?: string): number => {
      const src = sourceCurrency || currency;
      if (src === currency) return amount;
      return convertCurrency(amount, src, currency);
    },
    [currency]
  );

  /**
   * Get the exchange rate from source to company currency.
   */
  const getRate = useCallback(
    (sourceCurrency?: string): number => {
      const src = sourceCurrency || currency;
      return getExchangeRate(src, currency);
    },
    [currency]
  );

  /**
   * Get the currency symbol for the company's currency.
   */
  const symbol = (() => {
    const info = CURRENCIES.find((c) => c.code === currency);
    return info?.symbol ?? currency;
  })();

  return {
    currency,
    symbol,
    format,
    formatCompact,
    convert,
    getRate,
    isLoading,
    refresh,
  };
}

/**
 * Invalidate the global currency cache and notify all mounted components.
 * Call this after saving company currency settings so other views pick up the change.
 */
export function invalidateCompanyCurrencyCache() {
  cachedConfig = null;
  fetchPromise = null;
  // Dispatch custom event so all mounted hook instances re-fetch
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT));
  }
}

// ─── Backward compatibility ─────────────────────────────────────────────
// Re-export with old names so existing imports don't break during migration

export const useBaseCurrency = useCompanyCurrency;
export const invalidateCurrencyCache = invalidateCompanyCurrencyCache;
