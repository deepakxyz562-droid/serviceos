import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store, CityLocation } from '../types';
import { STORAGE_KEYS, DEFAULT_CITIES } from '../lib/constants';

interface AffinityState {
  favorites: string[];
  recentStores: Store[];
  scannedStore: Store | null;
  currentLocation: CityLocation;
  isLoading: boolean;

  // Actions
  toggleFavorite: (storeId: string) => Promise<void>;
  isFavorite: (storeId: string) => boolean;
  setScannedStore: (store: Store | null) => Promise<void>;
  addRecentStore: (store: Store) => Promise<void>;
  setCurrentLocation: (loc: CityLocation) => Promise<void>;
  loadPersisted: () => Promise<void>;
  rankStores: (stores: Store[]) => Store[];
}

export const useAffinityStore = create<AffinityState>((set, get) => ({
  favorites: ['sharma-kirana'], // Pre-favorite demo store for immediate showcase
  recentStores: [],
  scannedStore: null,
  currentLocation: DEFAULT_CITIES[0], // Patna, Bihar
  isLoading: true,

  isFavorite: (storeId: string) => {
    return get().favorites.includes(storeId);
  },

  toggleFavorite: async (storeId: string) => {
    const current = get().favorites;
    const exists = current.includes(storeId);
    const updated = exists ? current.filter((id) => id !== storeId) : [storeId, ...current];
    set({ favorites: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
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
    const current = get().recentStores;
    // Deduplicate and put at front
    const filtered = current.filter((s) => s.id !== store.id && s.slug !== store.slug);
    const updated = [store, ...filtered].slice(0, 10);
    set({ recentStores: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_STORES, JSON.stringify(updated));
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

      set({
        favorites: favRaw ? JSON.parse(favRaw) : ['sharma-kirana'],
        recentStores: recentRaw ? JSON.parse(recentRaw) : [],
        scannedStore: scannedRaw ? JSON.parse(scannedRaw) : null,
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
