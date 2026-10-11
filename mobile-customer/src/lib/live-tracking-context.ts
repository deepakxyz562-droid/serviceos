/**
 * Fieseros Mobile App — Live Tracking Context Storage
 *
 * The background GPS task (defined at module level in use-live-tracking.ts)
 * runs OUTSIDE the React component tree. It therefore cannot read the hook's
 * closure variables (employeeId, jobId). Instead, the foreground hook writes
 * the active tracking context to AsyncStorage (native) / localStorage (web)
 * before starting the background task, and the task reads it back on each
 * location update.
 *
 * This is intentionally a tiny JSON blob — NOT the JWT. The JWT stays in
 * SecureStore (via @/lib/auth.getToken()) and is read separately by the task.
 */

import { Platform } from 'react-native';
import { STORAGE_KEYS } from './constants';

// Lazy-load AsyncStorage only on native platforms to avoid pulling the web
// polyfill into the web bundle (which would break Metro's static analysis).
let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

const isWeb = Platform.OS === 'web';

export interface LiveTrackingContext {
  /** Employee ID (Prisma Employee.id) the background ping should be attributed to. */
  employeeId: string;
  /** Active job ID, or null if tracking outside a specific job. */
  jobId: string | null;
  /** ISO timestamp of when tracking started (for diagnostics / stale cleanup). */
  startedAt: string;
}

export async function setLiveTrackingContext(ctx: LiveTrackingContext): Promise<void> {
  try {
    const json = JSON.stringify(ctx);
    if (isWeb) {
      localStorage.setItem(STORAGE_KEYS.LIVE_TRACKING_CTX, json);
      return;
    }
    await AsyncStorage!.setItem(STORAGE_KEYS.LIVE_TRACKING_CTX, json);
  } catch (error) {
    console.error('[live-tracking-ctx] Failed to set context:', error);
  }
}

export async function getLiveTrackingContext(): Promise<LiveTrackingContext | null> {
  try {
    const raw = isWeb
      ? localStorage.getItem(STORAGE_KEYS.LIVE_TRACKING_CTX)
      : await AsyncStorage!.getItem(STORAGE_KEYS.LIVE_TRACKING_CTX);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LiveTrackingContext>;
    if (!parsed.employeeId) return null;
    return {
      employeeId: String(parsed.employeeId),
      jobId: parsed.jobId ?? null,
      startedAt: parsed.startedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearLiveTrackingContext(): Promise<void> {
  try {
    if (isWeb) {
      localStorage.removeItem(STORAGE_KEYS.LIVE_TRACKING_CTX);
      return;
    }
    await AsyncStorage!.removeItem(STORAGE_KEYS.LIVE_TRACKING_CTX);
  } catch {
    // Non-fatal — context is best-effort.
  }
}
