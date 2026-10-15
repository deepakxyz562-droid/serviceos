import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../lib/constants';

export interface SavedAddress {
  id: string;
  label: string; // 'Home' | 'Office' | 'Other'
  address: string;
  latitude?: number;
  longitude?: number;
}

interface ProfileState {
  name: string;
  phone: string;
  defaultAddress: string;
  defaultLatitude?: number;
  defaultLongitude?: number;
  savedAddresses: SavedAddress[];
  isLoaded: boolean;

  // Actions
  updateProfile: (data: {
    name?: string;
    phone?: string;
    defaultAddress?: string;
    defaultLatitude?: number;
    defaultLongitude?: number;
  }) => Promise<void>;
  addSavedAddress: (
    label: string,
    address: string,
    latitude?: number,
    longitude?: number
  ) => Promise<void>;
  removeSavedAddress: (id: string) => Promise<void>;
  loadProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  name: '',
  phone: '',
  defaultAddress: '',
  defaultLatitude: undefined,
  defaultLongitude: undefined,
  savedAddresses: [],
  isLoaded: false,

  updateProfile: async (data) => {
    const updated = {
      name: data.name !== undefined ? data.name : get().name,
      phone: data.phone !== undefined ? data.phone : get().phone,
      defaultAddress:
        data.defaultAddress !== undefined ? data.defaultAddress : get().defaultAddress,
      defaultLatitude:
        data.defaultLatitude !== undefined ? data.defaultLatitude : get().defaultLatitude,
      defaultLongitude:
        data.defaultLongitude !== undefined ? data.defaultLongitude : get().defaultLongitude,
      savedAddresses: get().savedAddresses,
    };

    set(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMER_PROFILE, JSON.stringify(updated));
    } catch {}
  },

  addSavedAddress: async (label, address, latitude, longitude) => {
    const newAddress: SavedAddress = {
      id: `addr-${Date.now()}`,
      label,
      address,
      latitude,
      longitude,
    };
    const updatedAddresses = [...get().savedAddresses, newAddress];
    set({
      savedAddresses: updatedAddresses,
      defaultAddress: get().defaultAddress || address,
      defaultLatitude: get().defaultLatitude !== undefined ? get().defaultLatitude : latitude,
      defaultLongitude: get().defaultLongitude !== undefined ? get().defaultLongitude : longitude,
    });

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CUSTOMER_PROFILE,
        JSON.stringify({
          name: get().name,
          phone: get().phone,
          defaultAddress: get().defaultAddress || address,
          defaultLatitude: get().defaultLatitude !== undefined ? get().defaultLatitude : latitude,
          defaultLongitude: get().defaultLongitude !== undefined ? get().defaultLongitude : longitude,
          savedAddresses: updatedAddresses,
        })
      );
    } catch {}
  },

  removeSavedAddress: async (id) => {
    const updatedAddresses = get().savedAddresses.filter((a) => a.id !== id);
    set({ savedAddresses: updatedAddresses });
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CUSTOMER_PROFILE,
        JSON.stringify({
          name: get().name,
          phone: get().phone,
          defaultAddress: get().defaultAddress,
          defaultLatitude: get().defaultLatitude,
          defaultLongitude: get().defaultLongitude,
          savedAddresses: updatedAddresses,
        })
      );
    } catch {}
  },

  loadProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMER_PROFILE);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          name: parsed.name || '',
          phone: parsed.phone || '',
          defaultAddress: parsed.defaultAddress || '',
          defaultLatitude: typeof parsed.defaultLatitude === 'number' ? parsed.defaultLatitude : undefined,
          defaultLongitude: typeof parsed.defaultLongitude === 'number' ? parsed.defaultLongitude : undefined,
          savedAddresses: Array.isArray(parsed.savedAddresses) ? parsed.savedAddresses : [],
          isLoaded: true,
        });
        return;
      }
    } catch {}

    set({ isLoaded: true });
  },
}));
