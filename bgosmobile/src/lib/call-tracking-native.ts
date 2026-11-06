import { NativeModules, Platform } from 'react-native';

const { BgosCallTracking } = NativeModules;

export interface SimCardInfo {
  subscriptionId: number;
  simSlotIndex: number;
  displayName: string;
  carrierName: string;
  countryIso: string;
}

export interface NativeCallLogItem {
  id: string;
  number: string;
  type: 'inbound' | 'outbound' | 'missed' | 'rejected' | 'other';
  timestamp: number;
  durationSec: number;
  cachedName?: string;
}

export interface CallTrackingStatus {
  enabled: boolean;
  designatedSimSlot: number;
}

export const NativeCallTracker = {
  isSupported: Platform.OS === 'android' && Boolean(BgosCallTracking),

  async getSimCards(): Promise<SimCardInfo[]> {
    if (!this.isSupported) return [];
    try {
      return await BgosCallTracking.getSimCards();
    } catch {
      return [];
    }
  },

  async getTrackingStatus(): Promise<CallTrackingStatus> {
    if (!this.isSupported) return { enabled: false, designatedSimSlot: -1 };
    try {
      return await BgosCallTracking.getTrackingStatus();
    } catch {
      return { enabled: false, designatedSimSlot: -1 };
    }
  },

  async setTrackingConfig(enabled: boolean, designatedSimSlot: number = -1): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      return await BgosCallTracking.setTrackingConfig(enabled, designatedSimSlot);
    } catch {
      return false;
    }
  },

  async getRecentCallLogs(limit: number = 25): Promise<NativeCallLogItem[]> {
    if (!this.isSupported) return [];
    try {
      return await BgosCallTracking.getRecentCallLogs(limit);
    } catch {
      return [];
    }
  },
};
