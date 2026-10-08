/**
 * GPTForm Mobile — generic on-device key/value storage.
 *
 * Uses expo-secure-store on native (already a project dependency) and falls
 * back to localStorage on web so screens like Appearance can persist a
 * non-sensitive user preference (theme choice) without introducing a new
 * npm dependency.
 *
 * Mirrors the pattern in `src/lib/auth.ts` but kept separate so the auth
 * module isn't bloated with non-auth concerns.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export async function storageSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(sanitizeKey(key), value);
  } catch (err) {
    console.warn(`[storage] setItemAsync failed for key "${key}":`, err);
  }
}

export async function storageGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(sanitizeKey(key));
  } catch (err) {
    console.warn(`[storage] getItemAsync failed for key "${key}":`, err);
    return null;
  }
}

export async function storageDeleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(sanitizeKey(key));
  } catch (err) {
    console.warn(`[storage] deleteItemAsync failed for key "${key}":`, err);
  }
}

/** Persisted theme preference keys for the Appearance screen. */
export const STORAGE_KEYS = {
  theme: 'gptform_theme',
} as const;
