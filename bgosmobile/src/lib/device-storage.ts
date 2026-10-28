import * as SecureStore from 'expo-secure-store';

/**
 * Small device-persistence helper for non-sensitive UI state (GBP connect
 * wizard progress, automation toggle defaults).
 *
 * Why not @react-native-async-storage/async-storage? It is not part of the
 * approved dependency set ("do not add other deps"), and `expo-secure-store`
 * is already the app's device persistence layer (auth sessions). These keys
 * hold nothing sensitive — they simply ride on the same vetted mechanism.
 *
 * Android SecureStore caps values at ~2048 bytes, so callers keep payloads
 * small; every write degrades gracefully (a failed save never breaks UX —
 * the wizard simply resumes from step 1 next launch).
 */
export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null; // corrupt/oversized payload → treat as absent, never crash
  }
}

export async function saveJson(key: string, value: unknown): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
    return true;
  } catch {
    try {
      // One retry with a compacted payload (drops formatting-heavy fields).
      await SecureStore.setItemAsync(key, JSON.stringify(value, (_k, v) => (typeof v === 'string' ? v.trim() : v)));
      return true;
    } catch {
      return false;
    }
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // best-effort
  }
}
