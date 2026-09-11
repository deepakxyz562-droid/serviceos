/**
 * Fieseros Mobile App — Global Tracking Manager
 *
 * Manages the global live GPS tracking lifecycle across all screens and tabs.
 *
 * WHY THIS IS NEEDED:
 * Previously, `useLiveTracking` was mounted only inside `jobs/[id].tsx`.
 * When the technician navigated away from the job screen (e.g., switched tabs
 * to Schedule or Today, or hit Back), the hook unmounted and stopped the
 * background GPS task — causing the technician to appear "Offline" on the
 * Live Dispatch map mid-trip.
 *
 * With this manager:
 *   1. State is persisted in AsyncStorage (`fieseros_active_travel_state`).
 *   2. The root `(employee)/_layout.tsx` hosts the active tracking loop.
 *   3. Tab switching, screen navigation, and app backgrounding NEVER kill tracking.
 *   4. Lifecycle transitions ('arrived', 'completed', 'cancelled') cleanly stop tracking.
 */

import { Platform } from 'react-native';
import { STORAGE_KEYS } from './constants';
import { setLiveTrackingContext, clearLiveTrackingContext } from './live-tracking-context';

let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

const isWeb = Platform.OS === 'web';
const TRAVEL_KEY = STORAGE_KEYS.ACTIVE_TRAVEL_STATE;

export interface ActiveTravelState {
  jobId: string;
  employeeId: string;
  startedAt: string;
  isTravelling?: boolean;
}

type TravelStateListener = (state: ActiveTravelState | null) => void;
const listeners = new Set<TravelStateListener>();

let currentTravelState: ActiveTravelState | null = null;
let isInitialized = false;

export const trackingManager = {
  /**
   * Initialize state from storage on app boot.
   */
  async init(): Promise<ActiveTravelState | null> {
    if (isInitialized) return currentTravelState;
    try {
      const raw = isWeb
        ? localStorage.getItem(TRAVEL_KEY)
        : await AsyncStorage?.getItem(TRAVEL_KEY);
      if (raw) {
        currentTravelState = JSON.parse(raw) as ActiveTravelState;
        if (currentTravelState) {
          currentTravelState.isTravelling = true;
        }
      }
    } catch {
      currentTravelState = null;
    }
    isInitialized = true;
    return currentTravelState;
  },

  /**
   * Get the current active travel state synchronously.
   */
  getState(): ActiveTravelState | null {
    return currentTravelState;
  },

  /**
   * Alias for getState
   */
  getActiveState(): ActiveTravelState | null {
    return currentTravelState;
  },

  /**
   * Check if technician is currently travelling
   */
  isTravelling(): boolean {
    return !!currentTravelState?.jobId;
  },

  /**
   * Start travelling for a job.
   */
  async startTravelling(employeeId: string, jobId: string): Promise<void> {
    const newState: ActiveTravelState = {
      jobId,
      employeeId,
      startedAt: new Date().toISOString(),
      isTravelling: true,
    };
    currentTravelState = newState;

    try {
      const json = JSON.stringify(newState);
      if (isWeb) {
        localStorage.setItem(TRAVEL_KEY, json);
      } else {
        await AsyncStorage?.setItem(TRAVEL_KEY, json);
      }
      await setLiveTrackingContext({
        employeeId,
        jobId,
        startedAt: newState.startedAt,
      });
    } catch (err) {
      console.warn('[tracking-manager] Failed to persist travel state:', err);
    }

    listeners.forEach((listener) => {
      try {
        listener(currentTravelState);
      } catch (e) {
        console.error('[tracking-manager] listener error:', e);
      }
    });
  },

  /**
   * Stop travelling (arrived, completed, or cancelled).
   */
  async stopTravelling(): Promise<void> {
    currentTravelState = null;

    try {
      if (isWeb) {
        localStorage.removeItem(TRAVEL_KEY);
      } else {
        await AsyncStorage?.removeItem(TRAVEL_KEY);
      }
      await clearLiveTrackingContext();

      if (Platform.OS !== 'web') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Location = require('expo-location');
          const running = await Location.hasStartedLocationUpdatesAsync('fieseros-live-dispatch-tracking').catch(() => false);
          if (running) {
            await Location.stopLocationUpdatesAsync('fieseros-live-dispatch-tracking').catch(() => {});
          }
        } catch {
          /* non-fatal */
        }
      }
    } catch (err) {
      console.warn('[tracking-manager] Failed to clear travel state:', err);
    }

    listeners.forEach((listener) => {
      try {
        listener(null);
      } catch (e) {
        console.error('[tracking-manager] listener error:', e);
      }
    });
  },

  /**
   * Subscribe to active travel state changes.
   */
  subscribe(listener: TravelStateListener): () => void {
    listeners.add(listener);
    if (isInitialized) {
      listener(currentTravelState);
    } else {
      this.init().then((st) => listener(st));
    }
    return () => {
      listeners.delete(listener);
    };
  },
};
