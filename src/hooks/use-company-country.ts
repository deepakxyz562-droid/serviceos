'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCountryByCode,
  type CountryInfo,
  DEFAULT_COUNTRY,
} from '@/lib/phone-utils';

interface CompanyCountryConfig {
  country: string; // e.g. 'US', 'IN', 'GB'
}

let cachedConfig: CompanyCountryConfig | null = null;
let fetchPromise: Promise<CompanyCountryConfig> | null = null;

const DEFAULT_CONFIG: CompanyCountryConfig = {
  country: 'US',
};

const COUNTRY_CHANGE_EVENT = 'company-country-changed';

async function fetchCompanyCountry(): Promise<CompanyCountryConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/settings/country');
      if (res.ok) {
        const data = await res.json();
        const config: CompanyCountryConfig = {
          country: data.country || 'US',
        };
        cachedConfig = config;
        return config;
      }
    } catch {
      // Fallback
    }
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  })();

  return fetchPromise;
}

/**
 * useCompanyCountry — Hook providing the active business owner's configured country
 * Single Source of Truth (SSOT) from Tenant settings.
 */
export function useCompanyCountry() {
  const [country, setCountry] = useState<string>(cachedConfig?.country || 'US');
  const [isLoading, setIsLoading] = useState(!cachedConfig);
  const fetched = useRef(!!cachedConfig);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetchCompanyCountry().then((config) => {
      setCountry(config.country);
      setIsLoading(false);
    });
  }, []);

  // Listen for country change events
  useEffect(() => {
    const handler = () => {
      cachedConfig = null;
      fetchPromise = null;
      setIsLoading(true);
      fetchCompanyCountry().then((config) => {
        setCountry(config.country);
        setIsLoading(false);
      });
    };
    window.addEventListener(COUNTRY_CHANGE_EVENT, handler);
    return () => window.removeEventListener(COUNTRY_CHANGE_EVENT, handler);
  }, []);

  const refresh = useCallback(async () => {
    cachedConfig = null;
    fetchPromise = null;
    setIsLoading(true);
    const config = await fetchCompanyCountry();
    setCountry(config.country);
    setIsLoading(false);
  }, []);

  const countryInfo: CountryInfo = getCountryByCode(country);

  return {
    country,
    countryInfo,
    callingCode: countryInfo.callingCode,
    flag: countryInfo.flag,
    format: countryInfo.format,
    isLoading,
    refresh,
  };
}

/**
 * Invalidate the global company country cache and notify all mounted components.
 */
export function invalidateCompanyCountryCache() {
  cachedConfig = null;
  fetchPromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COUNTRY_CHANGE_EVENT));
  }
}
