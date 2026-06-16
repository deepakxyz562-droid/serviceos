'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  formatCurrency,
  formatCurrencyCompact,
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
 * Simplified company currency hook.
 *
 * Design Principles:
 * 1. One Company → One Currency. No multi-workspace, no view currency, no per-user currency.
 * 2. All monetary values in the system are displayed in the company's currency.
 * 3. If company sets USD → Dashboard, CRM, Quotes, Invoices, Reports, Portals all use USD.
 * 4. No workspace switching required.
 *
 * Usage:
 *   const { currency, format, formatCompact, isLoading, refresh } = useCompanyCurrency();
 *
 *   // Format a monetary amount in company currency:
 *   format(230000)              → "$2,30,000.00" if currency=USD, "₹2,30,000.00" if currency=INR
 *
 *   // Compact format for dashboards:
 *   formatCompact(230000)       → "$230.0K" if currency=USD, "₹2.3L" if currency=INR
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

  const refresh = useCallback(async () => {
    cachedConfig = null;
    fetchPromise = null;
    setIsLoading(true);
    const config = await fetchCompanyCurrency();
    setCurrency(config.currency);
    setIsLoading(false);
  }, []);

  // ─── Formatting ────────────────────────────────────────────────────

  /**
   * Format a monetary amount in the company's currency.
   *
   * @param amount - The numeric value (already in company currency)
   * @returns Formatted string, e.g. "$2,300.00" or "₹2,30,000.00"
   */
  const format = useCallback(
    (amount: number): string => {
      return formatCurrency(amount, currency);
    },
    [currency]
  );

  /**
   * Compact format for dashboard cards / small spaces.
   *
   * @param amount - The numeric value (already in company currency)
   * @returns Compact formatted string, e.g. "$2.3K" or "₹2.3L"
   */
  const formatCompact = useCallback(
    (amount: number): string => {
      return formatCurrencyCompact(amount, currency);
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
    isLoading,
    refresh,
  };
}

/**
 * Invalidate the global currency cache.
 * Call this after saving company currency settings so other components pick up the change.
 */
export function invalidateCompanyCurrencyCache() {
  cachedConfig = null;
  fetchPromise = null;
}

// ─── Backward compatibility ─────────────────────────────────────────────
// Re-export with old names so existing imports don't break during migration

export const useBaseCurrency = useCompanyCurrency;
export const invalidateCurrencyCache = invalidateCompanyCurrencyCache;
