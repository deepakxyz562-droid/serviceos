/**
 * useCompany — React Query hooks for company / tenant discovery.
 *
 * Wraps the auth store's company-search + resolve methods so components can
 * use them with proper loading / error state + caching.
 *
 * Used by:
 *   - CompanyFinder (search-as-you-type)
 *   - Login screen (resolve slug from deep-link, load last company)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import type { Company } from '@/types';

export const COMPANY_KEYS = {
  search: (q: string) => ['company', 'search', q] as const,
  resolve: (slug: string) => ['company', 'resolve', slug] as const,
  last: ['company', 'last'] as const,
};

/**
 * Search companies by name or slug. Debounce before calling (the
 * CompanyFinder component already debounces 280ms before triggering a query).
 */
export function useCompanySearch(query: string) {
  const searchCompanies = useAuthStore((s) => s.searchCompanies);
  return useQuery<Company[]>({
    queryKey: COMPANY_KEYS.search(query),
    queryFn: () => searchCompanies(query),
    enabled: query.trim().length >= 2,
    staleTime: 60 * 1000, // cache for 1 min — companies don't change often
  });
}

/**
 * Resolve a slug → company. Used by deep-link handler.
 */
export function useResolveCompany(slug: string | null) {
  const resolveCompany = useAuthStore((s) => s.resolveCompany);
  return useQuery<Company | null>({
    queryKey: COMPANY_KEYS.resolve(slug ?? ''),
    queryFn: () => resolveCompany(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Refresh the last-used company from SecureStore / API.
 */
export function useRefreshLastCompany() {
  const queryClient = useQueryClient();
  const loadLastCompany = useAuthStore((s) => s.loadLastCompany);
  return useMutation({
    mutationFn: () => loadLastCompany(),
    onSuccess: (company) => {
      if (company) {
        queryClient.setQueryData(COMPANY_KEYS.last, company);
      }
    },
  });
}
