'use client';

import { useAppStore } from '@/store/app-store';

/**
 * Demo tenants get a large seed dataset (2,000+ customers, hundreds of
 * bookings / invoices / jobs / leads). To keep demo-mode list views feeling
 * snappy and to make pagination demonstrable, we cap the page size to 5 for
 * the demo tenant (`abc-plumbing-demo`). Non-demo tenants keep the default
 * page size (20) so production behavior is unchanged.
 *
 * The hook checks both the Zustand auth state (primary) and the
 * `serviceos_auth` localStorage entry (fallback — set by `/api/demo-login`
 * with `isDemo: true`) so it works even before the store has hydrated.
 */
const DEMO_TENANT_SLUG = 'abc-plumbing-demo';
const DEMO_PAGE_SIZE = 5;
const DEFAULT_PAGE_SIZE = 20;

/** Returns 5 when the current session is the demo tenant, else the default page size. */
export function useDemoPageSize(defaultSize = DEFAULT_PAGE_SIZE): number {
  const tenant = useAppStore((s) => s.auth?.tenant);
  if (tenant?.slug === DEMO_TENANT_SLUG) return DEMO_PAGE_SIZE;
  // Also check localStorage flag as a fallback (demo login sets isDemo: true)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('serviceos_auth');
      if (raw) {
        const parsed = JSON.parse(raw) as { isDemo?: boolean };
        if (parsed.isDemo) return DEMO_PAGE_SIZE;
      }
    } catch {
      /* ignore */
    }
  }
  return defaultSize;
}

export { DEMO_PAGE_SIZE, DEMO_TENANT_SLUG, DEFAULT_PAGE_SIZE };
