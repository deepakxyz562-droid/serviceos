import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '../lib/api';
export function useResource<T>(path: string, interval = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    try { const value = await apiRequest<T>(path); if (version === generation.current) { setData(value); setError(null); } }
    catch (err) { if (version === generation.current) setError(err instanceof Error ? err.message : 'Could not load data. Please retry.'); }
    finally { if (version === generation.current) setLoading(false); }
  }, [path]);
  useEffect(() => { setLoading(true); setData(null); return () => { generation.current++; }; }, [path]);
  useFocusEffect(useCallback(() => {
    refresh();
    const timer = interval ? setInterval(() => { if (AppState.currentState === 'active') refresh(); }, interval) : undefined;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { if (timer) clearInterval(timer); subscription.remove(); generation.current++; };
  }, [refresh, interval]));
  return { data, loading, error, refresh, setData };
}
