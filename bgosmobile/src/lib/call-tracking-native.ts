/**
 * Native Call Tracker Stub
 * Sensitive telephony and call log tracking are permanently removed.
 */
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
  isSupported: false,

  async getSimCards(): Promise<SimCardInfo[]> {
    return [];
  },

  async getTrackingStatus(): Promise<CallTrackingStatus> {
    return { enabled: false, designatedSimSlot: -1 };
  },

  async setTrackingConfig(_enabled: boolean, _designatedSimSlot: number = -1): Promise<boolean> {
    return false;
  },

  async getRecentCallLogs(_limit: number = 25): Promise<NativeCallLogItem[]> {
    return [];
  },
};
