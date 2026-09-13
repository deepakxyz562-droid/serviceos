'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineSyncManager, SYNC_STATUS_EVENT, type SyncStatusPayload } from '@/lib/offline-sync-manager';

/**
 * Hook to access real-time online/offline status, pending sync count, and manual sync action.
 */
export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatusPayload>(() => offlineSyncManager.getStatus());

  useEffect(() => {
    // Initial sync
    setStatus(offlineSyncManager.getStatus());

    const handleStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<SyncStatusPayload>;
      if (customEvent.detail) {
        setStatus(customEvent.detail);
      } else {
        setStatus(offlineSyncManager.getStatus());
      }
    };

    window.addEventListener(SYNC_STATUS_EVENT, handleStatusChange);
    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, handleStatusChange);
    };
  }, []);

  const syncNow = useCallback(async () => {
    return await offlineSyncManager.syncNow();
  }, []);

  return {
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    lastSyncAt: status.lastSyncAt,
    lastError: status.lastError,
    syncNow,
  };
}
