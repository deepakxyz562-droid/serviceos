'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

/**
 * Hook to get the tenant's base currency setting.
 * Fetches once from /api/settings/currency and caches globally.
 * All views should use this instead of hardcoding 'INR' or 'USD'.
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
  const fetched = useRef(!!cachedConfig);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetchCurrencyConfig().then((config) => {
      setBaseCurrency(config.baseCurrency);
      setSupportedCurrencies(config.supportedCurrencies);
      setMultiCurrencyEnabled(config.multiCurrencyEnabled);
      setIsLoading(false);
    });
  }, []);

  const refresh = useCallback(async () => {
    // Invalidate cache and re-fetch
    cachedConfig = null;
    fetchPromise = null;
    setIsLoading(true);
    const config = await fetchCurrencyConfig();
    setBaseCurrency(config.baseCurrency);
    setSupportedCurrencies(config.supportedCurrencies);
    setMultiCurrencyEnabled(config.multiCurrencyEnabled);
    setIsLoading(false);
  }, []);

  return {
    baseCurrency,
    supportedCurrencies,
    multiCurrencyEnabled,
    isLoading,
    refresh,
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
