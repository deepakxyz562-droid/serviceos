import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiRequest } from '../lib/api';

type ReviewsResponse = {
  reviews?: { responseJson?: string | null }[];
  pagination?: { total?: number };
};

function hasReply(responseJson?: string | null): boolean {
  if (!responseJson) return false;
  try {
    const parsed = JSON.parse(responseJson);
    return Boolean(parsed?.text);
  } catch {
    return false;
  }
}

/**
 * Lightweight count of Google reviews still awaiting a reply — drives the
 * Review Replies tab badge. Fails silent (badge simply hidden) when the
 * request errors so the tab bar never blocks on it.
 */
export function usePendingReplies(intervalMs = 0) {
  const [count, setCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<ReviewsResponse>('/api/reviews?source=google&limit=50');
      const reviews = res.reviews || [];
      setCount(reviews.filter((r) => !hasReply(r.responseJson)).length);
    } catch {
      setCount(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = intervalMs
        ? setInterval(() => {
            if (AppState.currentState === 'active') load();
          }, intervalMs)
        : undefined;
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') load();
      });
      return () => {
        if (timer) clearInterval(timer);
        subscription.remove();
      };
    }, [load, intervalMs]),
  );

  return count;
}
