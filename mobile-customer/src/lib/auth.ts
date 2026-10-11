/**
 * Fieseros Mobile App — Auth Token & Preferences Storage
 * Uses expo-secure-store on native, localStorage on web.
 */

import { Platform } from 'react-native';
import { STORAGE_KEYS } from './constants';

// Lazy-load SecureStore only on native platforms to avoid web crash.
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SecureStore = require('expo-secure-store');
}

const isWeb = Platform.OS === 'web';

export async function getToken(): Promise<string | null> {
  try {
    if (isWeb) {
      return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    return await SecureStore!.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('[auth] Failed to read token:', error);
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) {
      return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
    return await SecureStore!.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    if (isWeb) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
      if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      return;
    }
    await SecureStore!.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, accessToken, {
      keychainAccessible: SecureStore!.WHEN_UNLOCKED,
    });
    if (refreshToken) {
      await SecureStore!.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  } catch (error) {
    console.error('[auth] Failed to store token:', error);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    if (isWeb) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CITY);
      return;
    }
    await SecureStore!.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    await SecureStore!.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore!.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    await SecureStore!.deleteItemAsync(STORAGE_KEYS.ACTIVE_ROLE);
  } catch (error) {
    console.error('[auth] Failed to clear tokens:', error);
  }
}

export async function getStoredUserData(): Promise<unknown | null> {
  try {
    const raw = isWeb
      ? localStorage.getItem(STORAGE_KEYS.USER_DATA)
      : await SecureStore!.getItemAsync(STORAGE_KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUserData(data: unknown): Promise<void> {
  try {
    const json = JSON.stringify(data);
    if (isWeb) {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, json);
      return;
    }
    await SecureStore!.setItemAsync(STORAGE_KEYS.USER_DATA, json);
  } catch (error) {
    console.error('[auth] Failed to store user data:', error);
  }
}

export async function getActiveRole(): Promise<'customer' | 'employee' | null> {
  try {
    const raw = isWeb
      ? localStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE)
      : await SecureStore!.getItemAsync(STORAGE_KEYS.ACTIVE_ROLE);
    return raw as 'customer' | 'employee' | null;
  } catch {
    return null;
  }
}

export async function setActiveRole(role: 'customer' | 'employee'): Promise<void> {
  try {
    if (isWeb) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, role);
      return;
    }
    await SecureStore!.setItemAsync(STORAGE_KEYS.ACTIVE_ROLE, role);
  } catch (error) {
    console.error('[auth] Failed to store role:', error);
  }
}

// ── Selected city (persisted across launches) ────────────────────────

export async function getSelectedCity(): Promise<string | null> {
  try {
    if (isWeb) return localStorage.getItem(STORAGE_KEYS.SELECTED_CITY);
    return await SecureStore!.getItemAsync(STORAGE_KEYS.SELECTED_CITY);
  } catch {
    return null;
  }
}

export async function setSelectedCity(city: string): Promise<void> {
  try {
    if (isWeb) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CITY, city);
      return;
    }
    await SecureStore!.setItemAsync(STORAGE_KEYS.SELECTED_CITY, city);
  } catch (error) {
    console.error('[auth] Failed to store city:', error);
  }
}

// ── Last-used company (tenant) persistence ──────────────────────────
// Used by the login flow to remember which company a staff member last
// logged into so they don't have to re-search on every app launch.

export async function getLastCompanySlug(): Promise<string | null> {
  try {
    if (isWeb) return localStorage.getItem(STORAGE_KEYS.LAST_COMPANY_SLUG);
    return await SecureStore!.getItemAsync(STORAGE_KEYS.LAST_COMPANY_SLUG);
  } catch {
    return null;
  }
}

export async function setLastCompanySlug(slug: string): Promise<void> {
  try {
    if (isWeb) {
      localStorage.setItem(STORAGE_KEYS.LAST_COMPANY_SLUG, slug);
      return;
    }
    await SecureStore!.setItemAsync(STORAGE_KEYS.LAST_COMPANY_SLUG, slug);
  } catch (error) {
    console.error('[auth] Failed to store last company slug:', error);
  }
}

export async function getLastCompanyData(): Promise<unknown | null> {
  try {
    const raw = isWeb
      ? localStorage.getItem(STORAGE_KEYS.LAST_COMPANY_DATA)
      : await SecureStore!.getItemAsync(STORAGE_KEYS.LAST_COMPANY_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setLastCompanyData(data: unknown): Promise<void> {
  try {
    const json = JSON.stringify(data);
    if (isWeb) {
      localStorage.setItem(STORAGE_KEYS.LAST_COMPANY_DATA, json);
      return;
    }
    await SecureStore!.setItemAsync(STORAGE_KEYS.LAST_COMPANY_DATA, json);
  } catch (error) {
    console.error('[auth] Failed to store last company data:', error);
  }
}

export async function clearLastCompany(): Promise<void> {
  try {
    if (isWeb) {
      localStorage.removeItem(STORAGE_KEYS.LAST_COMPANY_SLUG);
      localStorage.removeItem(STORAGE_KEYS.LAST_COMPANY_DATA);
      return;
    }
    await SecureStore!.deleteItemAsync(STORAGE_KEYS.LAST_COMPANY_SLUG);
    await SecureStore!.deleteItemAsync(STORAGE_KEYS.LAST_COMPANY_DATA);
  } catch {
    // Non-fatal
  }
}
