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

  const state: DispatchConnectionState = isRealtimeConnected
    ? 'live'
    : lastSyncAt && Date.now() - lastSyncAt.getTime() < 60000
    ? 'syncing'
    : 'offline';

  let label = 'Live';
  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300';
  let dotClass = 'bg-emerald-500';

  if (state === 'syncing') {
    label = 'Syncing';
    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300';
    dotClass = 'bg-amber-500';
  } else if (state === 'offline') {
    label = 'Connection lost';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300';
    dotClass = 'bg-rose-500';
  }

  return {
    state,
    label,
    badgeClass,
    dotClass,
    lastUpdatedText,
    lastSyncAt,
    markSync,
  };
}
