import { cache } from '@/lib/cache';

export function invalidateAuthCache(userId?: string): void {
  if (userId) {
    cache.invalidate(`auth-me:${userId}`);
    cache.invalidate(`auth-me:cust_${userId}`);
  } else {
    cache.invalidateByPrefix('auth-me:');
  }
}
