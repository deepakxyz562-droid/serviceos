import { create } from 'zustand';
import type { TenantBlueprint, CountryPack, BusinessCapabilities, BusinessType, CountryCode, SalesChannel } from '@/lib/blueprint/types';
import {
  getCountryPack,
  resolveBlueprintCapabilities,
  resolveTenantBlueprint,
  DEFAULT_CHANNELS_FOR_BUSINESS_TYPE,
} from '@/lib/blueprint';
import { apiRequest } from '@/lib/api';
import { storageGetItem, storageSetItem } from '@/lib/storage';
import { useAuthStore } from './auth-store';

const defaultBlueprint: TenantBlueprint = {
  businessType: 'retail',
  country: 'US',
  language: 'en',
  capabilities: resolveBlueprintCapabilities('retail'),
  version: 1,
};

function identity() {
  const { user, isAuthenticated } = useAuthStore.getState();
  return isAuthenticated && user
    ? `nuvora_blueprint_${user.id}_${user.tenantId || 'personal'}`
    : 'nuvora_blueprint_local_device';
}

export type BlueprintPatch = {
  businessType?: BusinessType;
  businessName?: string;
  country?: CountryCode;
  salesChannels?: SalesChannel[];
  capabilities?: Partial<BusinessCapabilities>;
  language?: 'en' | 'hi';
  timezone?: string;
};

interface BlueprintStore {
  blueprint: TenantBlueprint;
  countryPack: CountryPack;
  isLoading: boolean;
  isHydrated: boolean;
  isSynced: boolean;
  lastSyncError: string | null;
  init: () => Promise<void>;
  reset: () => void;
  setLocalBlueprint: (bp: TenantBlueprint) => void;
  updateCapabilities: (caps: Partial<BusinessCapabilities>) => Promise<boolean>;
  saveBlueprintToServer: (data: BlueprintPatch) => Promise<boolean>;
}

export const useBlueprintStore = create<BlueprintStore>((set, get) => ({
  blueprint: defaultBlueprint,
  countryPack: getCountryPack('US'),
  isLoading: false,
  isHydrated: false,
  isSynced: true,
  lastSyncError: null,
  reset: () =>
    set({
      blueprint: defaultBlueprint,
      countryPack: getCountryPack('US'),
      isLoading: false,
      isHydrated: false,
      isSynced: true,
      lastSyncError: null,
    }),
  init: async () => {
    const key = identity();
    set({ isLoading: true, isHydrated: false });

    // 1. First restore from local AsyncStorage cache
    try {
      const cached = await storageGetItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        const bp = resolveTenantBlueprint({ settingsJson: { blueprint: parsed } });
        set({ blueprint: bp, countryPack: getCountryPack(bp.country), isHydrated: true });
      }
    } catch {
      /* Cache read error should not block initialization */
    }

    // 2. Hydrate from server if authenticated
    try {
      const data = await apiRequest<{ blueprint: TenantBlueprint }>('/api/tenant/blueprint');
      if (data?.blueprint) {
        get().setLocalBlueprint(data.blueprint);
        set({ isSynced: true, lastSyncError: null });
      }
    } catch (err: any) {
      // Offline fallback: keep local cached blueprint
      set({ isSynced: false, lastSyncError: err?.message || 'Server unreachable' });
    } finally {
      set({ isLoading: false, isHydrated: true });
    }
  },

  setLocalBlueprint: (bp) => {
    const key = identity();
    set({ blueprint: bp, countryPack: getCountryPack(bp.country), isHydrated: true });
    void storageSetItem(key, JSON.stringify(bp)).catch(() => {});
  },

  updateCapabilities: (caps) => get().saveBlueprintToServer({ capabilities: caps }),

  saveBlueprintToServer: async (data) => {
    const key = identity();
    set({ isLoading: true });

    // 1. Local-first update: apply changes to device storage immediately
    const current = get().blueprint;
    const type = data.businessType || current.businessType;
    const typeChanged = type !== current.businessType;
    const channels =
      data.salesChannels ||
      (typeChanged ? DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[type] : current.salesChannels);

    const updatedLocal: TenantBlueprint = {
      ...current,
      ...data,
      businessType: type,
      salesChannels: channels,
      capabilities: resolveBlueprintCapabilities(type, channels, {
        ...current.capabilities,
        ...(data.capabilities || {}),
      }),
      language: data.language || current.language || 'en',
      configuredAt: new Date().toISOString(),
      version: (current.version || 1) + 1,
    };

    get().setLocalBlueprint(updatedLocal);

    // 2. Sync to server
    try {
      const response = await apiRequest<{ blueprint: TenantBlueprint }>('/api/tenant/blueprint', {
        method: 'PATCH',
        body: data,
      });

      if (response?.blueprint) {
        get().setLocalBlueprint(response.blueprint);
        set({ isSynced: true, lastSyncError: null, isLoading: false });
        return true;
      }
      set({ isSynced: false, lastSyncError: 'Empty server response', isLoading: false });
      return true; // Still returns true because it saved locally
    } catch (err: any) {
      const errMsg = err?.message || 'Could not reach server';
      console.warn('Blueprint server sync failed (saved locally on device):', errMsg);
      set({ isSynced: false, lastSyncError: errMsg, isLoading: false });
      return true; // Local-first success: the user's business type is saved
    }
  },
}));
