import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import {
  getTotalPendingOfflineCount,
  drainAllOfflineQueues,
} from '@/lib/offline-queue';
import { useToast } from '@/components/ui/Toast';

export function OfflineStatusBar() {
  const { show } = useToast();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);

  const checkCount = useCallback(async () => {
    try {
      const c = await getTotalPendingOfflineCount();
      setPendingCount(c);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    checkCount();
    const interval = setInterval(checkCount, 15_000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkCount();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [checkCount]);

  const handleSyncNow = async () => {
    if (syncing || pendingCount === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSyncing(true);

    try {
      const res = await drainAllOfflineQueues();
      await checkCount();

      if (res.total > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        show(`Synced ${res.total} offline item${res.total > 1 ? 's' : ''} ✓`, 'success');
      } else {
        show('Device appears offline. Will retry automatically once connected.', 'info');
      }
    } catch (err: any) {
      show('Could not complete sync. Will retry automatically.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <Pressable
      onPress={handleSyncNow}
      disabled={syncing}
      className="mx-4 mb-2.5 flex-row items-center justify-between rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 active:opacity-80"
    >
      <View className="flex-row items-center gap-2 flex-1 pr-2">
        <CloudOff size={15} color="#D97706" />
        <Text className="text-xs font-semibold text-amber-900" numberOfLines={1}>
          {pendingCount} offline {pendingCount === 1 ? 'item' : 'items'} saved locally
        </Text>
      </View>

      <View className="flex-row items-center gap-1">
        {syncing ? (
          <ActivityIndicator size="small" color="#D97706" />
        ) : (
          <RefreshCw size={13} color="#D97706" />
        )}
        <Text className="text-[11px] font-bold text-amber-900">
          {syncing ? 'Syncing…' : 'Sync Now'}
        </Text>
      </View>
    </Pressable>
  );
}
