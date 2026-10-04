import { create } from 'zustand';
import type {
  TenantBlueprint,
  CountryPack,
  BusinessCapabilities,
  BusinessType,
  CountryCode,
} from '@/lib/blueprint/types';
import { getCountryPack } from '@/lib/blueprint/country-packs';
import { getCapabilitiesForBusinessType } from '@/lib/blueprint/presets';
import { apiRequest } from '@/lib/api';
import { storageGetItem, storageSetItem } from '@/lib/storage';

const BLUEPRINT_STORAGE_KEY = 'nuvora_blueprint';

const defaultBlueprint: TenantBlueprint = {
  businessType: 'retail',
  country: 'US',
  capabilities: getCapabilitiesForBusinessType('retail'),
  version: 1,
};

interface BlueprintStore {
  blueprint: TenantBlueprint;
  countryPack: CountryPack;
  isLoading: boolean;
  isHydrated: boolean;
  init: () => Promise<void>;
  setLocalBlueprint: (bp: TenantBlueprint) => void;
  updateCapabilities: (caps: Partial<BusinessCapabilities>) => Promise<boolean>;
  saveBlueprintToServer: (data: {
    businessType?: BusinessType;
    businessName?: string;
    country?: CountryCode;
    capabilities?: Partial<BusinessCapabilities>;
  }) => Promise<boolean>;
}

export const useBlueprintStore = create<BlueprintStore>((set, get) => ({
  blueprint: defaultBlueprint,
  countryPack: getCountryPack('US'),
  isLoading: false,
  isHydrated: false,

  init: async () => {
    // 1. Instant load from local storage
    try {
      const cached = await storageGetItem(BLUEPRINT_STORAGE_KEY);
      if (cached) {
        const parsed: TenantBlueprint = JSON.parse(cached);
        if (parsed && parsed.businessType) {
          set({
            blueprint: parsed,
            countryPack: getCountryPack(parsed.country),
            isHydrated: true,
          });
        }
      }
    } catch {}

    // 2. Fetch fresh blueprint from backend
    try {
      set({ isLoading: true });
      const data = await apiRequest<{
        blueprint: TenantBlueprint;
        countryPack: CountryPack;
      }>('/api/tenant/blueprint');

      if (data?.blueprint) {
        set({
          blueprint: data.blueprint,
          countryPack: data.countryPack || getCountryPack(data.blueprint.country),
          isHydrated: true,
          isLoading: false,
        });
        await storageSetItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(data.blueprint));
      }
    } catch {
      set({ isLoading: false, isHydrated: true });
    }
  },

  setLocalBlueprint: (bp: TenantBlueprint) => {
    set({
      blueprint: bp,
      countryPack: getCountryPack(bp.country),
    });
    storageSetItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(bp));
  },

  updateCapabilities: async (caps: Partial<BusinessCapabilities>) => {
    const current = get().blueprint;
    const updatedCaps: BusinessCapabilities = {
      ...current.capabilities,
      ...caps,
    };
    const updatedBp: TenantBlueprint = {
      ...current,
      capabilities: updatedCaps,
    };

    get().setLocalBlueprint(updatedBp);

    try {
      await apiRequest('/api/tenant/blueprint', {
        method: 'PATCH',
        body: { capabilities: updatedCaps },
      });
      return true;
    } catch {
      return false;
    }
  },

  saveBlueprintToServer: async (data) => {
    set({ isLoading: true });
    try {
      const res = await apiRequest<{
        success: boolean;
        blueprint: TenantBlueprint;
        countryPack: CountryPack;
      }>('/api/tenant/blueprint', {
        method: 'PATCH',
        body: data,
      });

      if (res?.blueprint) {
        get().setLocalBlueprint(res.blueprint);
        set({ isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (err) {
      set({ isLoading: false });
      return false;
    }
  },
}));
