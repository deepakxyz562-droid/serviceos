import { create } from 'zustand';
import type { TenantBlueprint, CountryPack, BusinessCapabilities, BusinessType, CountryCode, SalesChannel } from '@/lib/blueprint/types';
import { getCountryPack, resolveBlueprintCapabilities, resolveTenantBlueprint } from '@/lib/blueprint';
import { apiRequest } from '@/lib/api';
import { storageGetItem, storageSetItem } from '@/lib/storage';
import { useAuthStore } from './auth-store';

const defaultBlueprint: TenantBlueprint = {
  businessType: 'retail', country: 'US', language: 'en',
  capabilities: resolveBlueprintCapabilities('retail'), version: 1,
};
function identity() {
  const { user, isAuthenticated } = useAuthStore.getState();
  return isAuthenticated && user ? `nuvora_blueprint_${user.id}_${user.tenantId || 'personal'}` : null;
}
type BlueprintPatch = {
  businessType?: BusinessType; businessName?: string; country?: CountryCode;
  salesChannels?: SalesChannel[]; capabilities?: Partial<BusinessCapabilities>;
  language?: 'en' | 'hi'; timezone?: string;
};
interface BlueprintStore {
  blueprint: TenantBlueprint; countryPack: CountryPack;
  isLoading: boolean; isHydrated: boolean;
  init: () => Promise<void>; reset: () => void;
  setLocalBlueprint: (bp: TenantBlueprint) => void;
  updateCapabilities: (caps: Partial<BusinessCapabilities>) => Promise<boolean>;
  saveBlueprintToServer: (data: BlueprintPatch) => Promise<boolean>;
}
export const useBlueprintStore = create<BlueprintStore>((set, get) => ({
  blueprint: defaultBlueprint, countryPack: getCountryPack('US'), isLoading: false, isHydrated: false,
  reset: () => set({ blueprint: defaultBlueprint, countryPack: getCountryPack('US'), isLoading: false, isHydrated: false }),
  init: async () => {
    const key = identity();
    if (!key) return;
    set({ blueprint: defaultBlueprint, countryPack: getCountryPack('US'), isLoading: true, isHydrated: false });
    try {
      const cached = await storageGetItem(key);
      if (cached && identity() === key) {
        const parsed = JSON.parse(cached);
        const bp = resolveTenantBlueprint({ settingsJson: { blueprint: parsed } });
        set({ blueprint: bp, countryPack: getCountryPack(bp.country), isHydrated: true });
      }
    } catch { /* A broken cache must not stop server hydration. */ }
    try {
      const data = await apiRequest<{ blueprint: TenantBlueprint }>('/api/tenant/blueprint');
      if (identity() === key && data?.blueprint) {
        get().setLocalBlueprint(data.blueprint);
      }
    } finally {
      if (identity() === key) set({ isLoading: false, isHydrated: true });
    }
  },
  setLocalBlueprint: (bp) => {
    const key = identity();
    if (!key) return;
    set({ blueprint: bp, countryPack: getCountryPack(bp.country), isHydrated: true });
    void storageSetItem(key, JSON.stringify(bp)).catch(() => {});
  },
  updateCapabilities: (caps) => get().saveBlueprintToServer({ capabilities: caps }),
  saveBlueprintToServer: async (data) => {
    const key = identity();
    if (!key) return false;
    set({ isLoading: true });
    try {
      const response = await apiRequest<{ blueprint: TenantBlueprint }>('/api/tenant/blueprint', { method: 'PATCH', body: data });
      if (identity() !== key || !response?.blueprint) return false;
      get().setLocalBlueprint(response.blueprint);
      return true;
    } catch { return false; }
    finally { if (identity() === key) set({ isLoading: false }); }
  },
}));
