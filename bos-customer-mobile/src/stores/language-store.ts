import React, { useCallback } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileLanguage, getMobileText, detectMobileDefaultLanguage } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'bos_customer_language';
const EXPLICIT_PREF_KEY = 'bos_customer_lang_explicit';

interface LanguageState {
  language: MobileLanguage;
  hasExplicitPreference: boolean;
  isLoading: boolean;
  setLanguage: (lang: MobileLanguage, isExplicit?: boolean) => Promise<void>;
  applyLocationCity: (city: string) => Promise<void>;
  loadLanguage: (currentCity?: string) => Promise<void>;
  t: (key: string, fallbackEn?: string, fallbackHi?: string) => string;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  hasExplicitPreference: false,
  isLoading: true,

  setLanguage: async (lang: MobileLanguage, isExplicit = true) => {
    set({ language: lang, hasExplicitPreference: isExplicit });
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      if (isExplicit) {
        await AsyncStorage.setItem(EXPLICIT_PREF_KEY, 'true');
      }
    } catch {}
  },

  applyLocationCity: async (city: string) => {
    // If user has manually locked a language preference, don't overwrite it
    if (get().hasExplicitPreference) return;

    const detected = detectMobileDefaultLanguage(city);
    if (detected !== get().language) {
      set({ language: detected });
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
      } catch {}
    }
  },

  loadLanguage: async (currentCity?: string) => {
    try {
      const [saved, explicit] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
        AsyncStorage.getItem(EXPLICIT_PREF_KEY),
      ]);

      const isExplicit = explicit === 'true';

      if (saved === 'en' || saved === 'hi' || saved === 'both') {
        set({
          language: saved as MobileLanguage,
          hasExplicitPreference: isExplicit,
          isLoading: false,
        });
        return;
      }
    } catch {}

    // Auto-detect default if not explicitly chosen
    const detected = detectMobileDefaultLanguage(currentCity);
    set({ language: detected, hasExplicitPreference: false, isLoading: false });
  },

  t: (key: string, fallbackEn?: string, fallbackHi?: string) => {
    return getMobileText(key, get().language, fallbackEn, fallbackHi);
  },
}));

/**
 * Primary reactive hook for all screens and components.
 * Subscribes to `language` state so that changing the language immediately
 * triggers a re-render across every screen in the app.
 */
export function useMobileTranslation() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const t = useCallback(
    (key: string, fallbackEn?: string, fallbackHi?: string) => {
      return getMobileText(key, language, fallbackEn, fallbackHi);
    },
    [language]
  );

  return { language, setLanguage, t };
}
