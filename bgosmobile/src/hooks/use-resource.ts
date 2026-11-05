import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '../lib/api';
import { sessionRevision } from '../lib/auth';
import { useAuthStore } from '../stores/auth-store';
import { getResource, subscribePartition, resourcePartition } from '../lib/resource-cache';

export function useResource<T>(path: string, interval = 0, enabled = true) {
  const user = useAuthStore(state => state.user);
  const partition = useSyncExternalStore(subscribePartition, resourcePartition, resourcePartition);
  const entry = getResource<T>(JSON.stringify([sessionRevision(),user?.id,user?.tenantId,user?.workspaceId,partition,path]));
  const state = useSyncExternalStore(entry.subscribe, entry.snapshot, entry.snapshot);
  const load = useCallback(() => apiRequest<T>(path), [path]);
  const refresh = useCallback(() => entry.read(load, 0, true), [entry, load]);
  useFocusEffect(useCallback(() => {
    if (!enabled || !user) return;
    const check = () => { if (AppState.currentState !== 'background') void entry.read(load, Math.min(interval || 30000, 30000)); };
    check();
    const timer = interval ? setInterval(check, interval) : undefined;
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') check(); });
    return () => { if (timer) clearInterval(timer); subscription.remove(); };
  }, [entry, load, interval, enabled, user]));
  return {...state, refresh, setData:entry.setData};
}
