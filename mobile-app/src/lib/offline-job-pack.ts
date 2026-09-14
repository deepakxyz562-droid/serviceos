/**
 * Mobile App — Offline "Today's Job Pack" Local Pre-Caching
 * ----------------------------------------------------------
 * Enables field technicians to work seamlessly in basements, rural zones,
 * and areas with zero cellular connectivity.
 *
 * Pre-caches:
 *   1. Today's full job descriptions, visit notes, addresses, & line items
 *   2. Customer profiles (names, phones, gate codes, service histories)
 *   3. Digital checklists & inspection forms
 *   4. Technician van inventory parts list & quantities
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './constants';
import { getToken } from './auth';

const STORAGE_KEY = '@fieseros_offline_job_pack_today_v1';

export interface OfflineJobPack {
  packVersion: string;
  generatedAt: string;
  expiresAt: string;
  employee: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  jobCount: number;
  jobs: Array<Record<string, unknown>>;
  customers: Array<{
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  }>;
  checklists: Array<Record<string, unknown>>;
  vanStock: Array<{
    itemId: string;
    name: string;
    sku?: string | null;
    unit?: string | null;
    quantityOnHand: number;
    minStockLevel?: number;
  }>;
}

/**
 * Read cached job pack from persistent storage.
 */
export async function getTodayJobPack(): Promise<OfflineJobPack | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    } else {
      raw = await AsyncStorage.getItem(STORAGE_KEY);
    }

    if (!raw) return null;
    return JSON.parse(raw) as OfflineJobPack;
  } catch (error) {
    console.warn('[OfflineJobPack] read error:', error);
    return null;
  }
}

/**
 * Save job pack to persistent storage.
 */
export async function saveTodayJobPack(pack: OfflineJobPack): Promise<void> {
  try {
    const raw = JSON.stringify(pack);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, raw);
    }
    console.log(`[OfflineJobPack] Cached ${pack.jobCount} jobs and ${pack.vanStock.length} van items`);
  } catch (error) {
    console.warn('[OfflineJobPack] save error:', error);
  }
}

/**
 * Download the latest job pack from server and update local cache.
 */
export async function downloadAndCacheTodayJobPack(
  apiBaseUrl: string = API_BASE_URL,
  authToken?: string | null,
): Promise<OfflineJobPack | null> {
  try {
    const token = authToken ?? (await getToken());
    if (!token) {
      console.warn('[OfflineJobPack] No auth token available');
      return null;
    }

    const res = await fetch(`${apiBaseUrl}/api/employee/jobs/today-pack`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn(`[OfflineJobPack] Fetch failed with status ${res.status}`);
      return null;
    }

    const pack = (await res.json()) as OfflineJobPack;
    if (pack && Array.isArray(pack.jobs)) {
      await saveTodayJobPack(pack);
      return pack;
    }

    return null;
  } catch (error) {
    console.warn('[OfflineJobPack] download network error:', error);
    return null;
  }
}

/**
 * Get a specific job from offline cache by ID.
 */
export async function getCachedJobById(jobId: string): Promise<Record<string, unknown> | null> {
  const pack = await getTodayJobPack();
  if (!pack || !pack.jobs) return null;
  return pack.jobs.find((j) => j.id === jobId) || null;
}

/**
 * Get customer information from offline cache by ID.
 */
export async function getCachedCustomerById(customerId: string) {
  const pack = await getTodayJobPack();
  if (!pack || !pack.customers) return null;
  return pack.customers.find((c) => c.id === customerId) || null;
}

/**
 * Get technician van inventory from offline cache.
 */
export async function getCachedVanStock() {
  const pack = await getTodayJobPack();
  return pack?.vanStock || [];
}
