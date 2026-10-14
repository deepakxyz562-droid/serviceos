'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { type BosLanguage, getBosText } from './bos-translations';

interface BosI18nContextValue {
  language: BosLanguage;
  setLanguage: (lang: BosLanguage) => void;
  t: (key: string, fallbackEn?: string, fallbackHi?: string) => string;
}

const BosI18nContext = createContext<BosI18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallbackEn) => fallbackEn || key,
});

interface BosI18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: BosLanguage;
  onLanguageChange?: (lang: BosLanguage) => void;
}

export function BosI18nProvider({
  children,
  initialLanguage = 'en',
  onLanguageChange,
}: BosI18nProviderProps) {
  const [language, setLanguageState] = useState<BosLanguage>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bos_language');
        if (saved === 'en' || saved === 'hi' || saved === 'both') {
          return saved;
        }
      } catch {}
    }
    return initialLanguage;
  });

  // Sync if initialLanguage prop changes from server hydration
  useEffect(() => {
    if (initialLanguage && (initialLanguage === 'en' || initialLanguage === 'hi' || initialLanguage === 'both')) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('bos_language');
        // Only override if user hasn't explicitly set a local preference
        if (!saved) {
          setLanguageState(initialLanguage);
        }
      }
    }
  }, [initialLanguage]);

  const setLanguage = useCallback(
    (nextLang: BosLanguage) => {
      setLanguageState(nextLang);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('bos_language', nextLang);
        } catch {}
      }
      onLanguageChange?.(nextLang);
    },
    [onLanguageChange]
  );

  const t = useCallback(
    (key: string, fallbackEn?: string, fallbackHi?: string) => {
      return getBosText(key, language, fallbackEn, fallbackHi);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <BosI18nContext.Provider value={value}>{children}</BosI18nContext.Provider>;
}

export function useBosTranslation() {
  return useContext(BosI18nContext);
}
