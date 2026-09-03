/**
 * useDispatchConnection — Connection Health & Sync Timestamp Tracker
 * -------------------------------------------------------------------
 * Tracks operational connection state without leaking transport technology
 * details to the dispatcher:
 *   - LIVE:    Realtime live feed active
 *   - SYNCING: Background sync / polling active
 *   - OFFLINE: Disconnected, displaying cached data
 */

import { useState, useEffect, useCallback } from 'react';
import { formatTimeAgo } from '../utils/gps-status';

export type DispatchConnectionState = 'live' | 'syncing' | 'offline';

export interface DispatchConnectionInfo {
  state: DispatchConnectionState;
  label: string;
  badgeClass: string;
  dotClass: string;
  lastUpdatedText: string;
  lastSyncAt: Date | null;
  markSync: () => void;
}

export function useDispatchConnection(isRealtimeConnected: boolean): DispatchConnectionInfo {
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(new Date());
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('Updated just now');

  const markSync = useCallback(() => {
    setLastSyncAt(new Date());
  }, []);

  // Update human readable duration string every 3 seconds
  useEffect(() => {
    const updateText = () => {
      if (!lastSyncAt) {
        setLastUpdatedText('Syncing…');
        return;
      }
      const ago = formatTimeAgo(lastSyncAt.toISOString());
      if (ago === 'Never' || ago === 'Just now') {
        setLastUpdatedText('Updated just now');
      } else {
        setLastUpdatedText(`Updated ${ago}`);
      }
    };

    updateText();
    const interval = setInterval(updateText, 3000);
    return () => clearInterval(interval);
  }, [lastSyncAt]);

  return useMemo(
    () => ({
      state,
      label,
      badgeClass,
      dotClass,
      lastUpdatedText,
      lastSyncAt,
      markSync,
    }),
    [state, label, badgeClass, dotClass, lastUpdatedText, lastSyncAt, markSync]
  );
}
