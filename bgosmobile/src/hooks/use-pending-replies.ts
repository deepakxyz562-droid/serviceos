import { useResource } from './use-resource';
export const pendingCountPath = '/api/reviews?source=google&needsReply=true&countOnly=true';
export function usePendingReplies(intervalMs = 0) {
  return useResource<{total:number}>(pendingCountPath, intervalMs).data?.total ?? null;
}
