import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store, CityLocation } from '../types';
import { STORAGE_KEYS, DEFAULT_CITIES } from '../lib/constants';

interface AffinityState {
  favorites: string[];
  favoriteStores: Store[];
  recentStores: Store[];
  scannedStore: Store | null;
  currentLocation: CityLocation;
  isLoading: boolean;

  // Actions
  toggleFavorite: (storeOrId: Store | string) => Promise<void>;
  isFavorite: (storeId: string) => boolean;
  setScannedStore: (store: Store | null) => Promise<void>;
  addRecentStore: (store: Store) => Promise<void>;
  clearRecentStores: () => Promise<void>;
  setCurrentLocation: (loc: CityLocation) => Promise<void>;
  loadPersisted: () => Promise<void>;
  rankStores: (stores: Store[]) => Store[];
}

export const LEGACY_MOCK_SLUGS = new Set([
  'sharma-kirana',
  'store-sharma-kirana',
  'gupta-sweets',
  'store-gupta-sweets',
  'patna-medicos',
  'store-patna-medicos',
  'verma-salon',
  'store-verma-salon',
  'fresh-mart',
  'store-fresh-mart',
  'daily-needs',
  'daily-needs-store',
  'store-daily-needs',
  'apollo-pharmacy',
  'store-apollo-pharmacy',
  'the-cake-corner',
  'cake-corner',
  'store-cake-corner',
  'green-leaf',
  'green-leaf-vegetables',
  'store-green-leaf',
  'store',
  'sample-store',
  'test-store',
  'demo-store',
]);

export function isRealStoreSlug(slugOrId?: string | null): boolean {
  if (!slugOrId) return false;
  const s = slugOrId.toLowerCase().trim();
  if (LEGACY_MOCK_SLUGS.has(s)) return false;
  if (
    s === 'store' ||
    s.startsWith('sample-') ||
    s.endsWith('-sample') ||
    s.startsWith('mock-') ||
    s.endsWith('-mock') ||
    s.startsWith('demo-') ||
    s.endsWith('-demo') ||
    s === 'test' ||
    s === 'demo'
  ) {
    return false;
  }
  return true;
}

export const useAffinityStore = create<AffinityState>((set, get) => ({
  favorites: [],
  favoriteStores: [],
  recentStores: [],
  scannedStore: null,
  currentLocation: DEFAULT_CITIES[0],
  isLoading: true,

  isFavorite: (storeId: string) => {
    return get().favorites.includes(storeId);
  },

  toggleFavorite: async (storeOrId: Store | string) => {
    const isObj = typeof storeOrId === 'object' && storeOrId !== null;
    const storeId = isObj ? storeOrId.id : storeOrId;
    const storeSlug = isObj ? storeOrId.slug : storeOrId;

    const currentFavs = get().favorites;
    const currentStores = get().favoriteStores;

    const exists = currentFavs.includes(storeId) || (storeSlug && currentFavs.includes(storeSlug));

    let updatedFavs: string[];
    let updatedStores: Store[];

    if (exists) {
      updatedFavs = currentFavs.filter((id) => id !== storeId && id !== storeSlug);
      updatedStores = currentStores.filter((s) => s.id !== storeId && s.slug !== storeSlug);
    } else {
      updatedFavs = [storeId, ...(storeSlug && storeSlug !== storeId ? [storeSlug] : []), ...currentFavs];
      updatedStores = isObj ? [storeOrId, ...currentStores.filter((s) => s.id !== storeId)] : currentStores;
    }

    set({ favorites: updatedFavs, favoriteStores: updatedStores });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updatedStores.length > 0 ? updatedStores : updatedFavs));
    } catch {}
  },

  setScannedStore: async (store: Store | null) => {
    set({ scannedStore: store });
    if (store) {
      await get().addRecentStore(store);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SCANNED_STORE, JSON.stringify(store));
      } catch {}
    } else {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SCANNED_STORE);
      } catch {}
    }
  },

  addRecentStore: async (store: Store) => {
    if (
      !store ||
      !store.name ||
      store.name === 'Store' ||
      !isRealStoreSlug(store.id) ||
      !isRealStoreSlug(store.slug)
    ) {
      return;
    }

    const current = get().recentStores;
    // Deduplicate and put at front
    const filtered = current.filter((s) => s.id !== store.id && s.slug !== store.slug);
    const updated = [store, ...filtered].slice(0, 15);
    set({ recentStores: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_STORES, JSON.stringify(updated));
    } catch {}
  },

  clearRecentStores: async () => {
    set({ recentStores: [] });
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_STORES);
    } catch {}
  },

  setCurrentLocation: async (loc: CityLocation) => {
    set({ currentLocation: loc });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOCATION, JSON.stringify(loc));
    } catch {}
  },

  loadPersisted: async () => {
    try {
      const [favRaw, recentRaw, scannedRaw, locRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT_STORES),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SCANNED_STORE),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATION),
      ]);

      let parsedFavs: string[] = [];
      let parsedStores: Store[] = [];
      let hadMockFavs = false;

      if (favRaw) {
        try {
          const raw = JSON.parse(favRaw);
          if (Array.isArray(raw)) {
            for (const item of raw) {
              if (typeof item === 'object' && item !== null && item.id) {
                if (isRealStoreSlug(item.id) && isRealStoreSlug(item.slug)) {
                  parsedStores.push(item as Store);
                  parsedFavs.push(item.id);
                  if (item.slug) parsedFavs.push(item.slug);
                } else {
                  hadMockFavs = true;
                }
              } else if (typeof item === 'string') {
                if (isRealStoreSlug(item)) {
                  parsedFavs.push(item);
                } else {
                  hadMockFavs = true;
                }
              }
            }
          }
        } catch {}
      }

      let parsedRecent: Store[] = [];
      let hadMockRecent = false;
      if (recentRaw) {
        try {
          const raw = JSON.parse(recentRaw);
          if (Array.isArray(raw)) {
            parsedRecent = raw.filter((s: Store) => {
              const keep =
                s &&
                s.name &&
                s.name !== 'Store' &&
                isRealStoreSlug(s.id) &&
                isRealStoreSlug(s.slug);
              if (!keep) hadMockRecent = true;
              return keep;
            });
          }
        } catch {}
      }

      let parsedScanned: Store | null = null;
      let hadMockScanned = false;
      if (scannedRaw) {
        try {
          const raw = JSON.parse(scannedRaw);
          if (raw && isRealStoreSlug(raw.id) && isRealStoreSlug(raw.slug)) {
            parsedScanned = raw;
          } else if (raw) {
            hadMockScanned = true;
          }
        } catch {}
      }

      // If mock entries were stripped, overwrite storage with clean data
      if (hadMockFavs) {
        void AsyncStorage.setItem(
          STORAGE_KEYS.FAVORITES,
          JSON.stringify(parsedStores.length > 0 ? parsedStores : parsedFavs)
        );
      }
      if (hadMockRecent) {
        void AsyncStorage.setItem(STORAGE_KEYS.RECENT_STORES, JSON.stringify(parsedRecent));
      }
      if (hadMockScanned) {
        void AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SCANNED_STORE);
      }

      set({
        favorites: parsedFavs,
        favoriteStores: parsedStores,
        recentStores: parsedRecent,
        scannedStore: parsedScanned,
        currentLocation: locRaw ? JSON.parse(locRaw) : DEFAULT_CITIES[0],
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  // ── Core Ranking Algorithm ("Show at Top") ─────────────────────────────
  // 1. Scanned Store (Highest Priority / Pinned) -> Score +10,000
  // 2. Favorited Stores -> Score +5,000
  // 3. Recently Ordered / Visited Stores -> Score +1,000 * (1 / (index + 1))
  // 4. GPS Distance penalty -> -50 * distanceKm
  rankStores: (stores: Store[]) => {
    const { favorites, scannedStore, recentStores } = get();

    return [...stores].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // 1. Check if scanned in this session
      if (scannedStore && (a.id === scannedStore.id || a.slug === scannedStore.slug)) scoreA += 10000;
      if (scannedStore && (b.id === scannedStore.id || b.slug === scannedStore.slug)) scoreB += 10000;

      // 2. Check if favorited
      if (favorites.includes(a.id) || favorites.includes(a.slug)) scoreA += 5000;
      if (favorites.includes(b.id) || favorites.includes(b.slug)) scoreB += 5000;

      // 3. Check recency in past orders / visits
      const recentIdxA = recentStores.findIndex((s) => s.id === a.id || s.slug === a.slug);
      const recentIdxB = recentStores.findIndex((s) => s.id === b.id || s.slug === b.slug);
      if (recentIdxA !== -1) scoreA += Math.round(2000 / (recentIdxA + 1));
      if (recentIdxB !== -1) scoreB += Math.round(2000 / (recentIdxB + 1));

      // 4. Proximity weighting
      if (a.distanceKm != null) scoreA -= a.distanceKm * 50;
      if (b.distanceKm != null) scoreB -= b.distanceKm * 50;

      return scoreB - scoreA;
    });
  },
}));
