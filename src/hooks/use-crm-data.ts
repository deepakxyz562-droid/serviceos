/**
 * use-crm-data.ts
 * ================
 * React Query hooks for the 5 main CRM entities.
 *
 * WHY THIS EXISTS:
 *   The project already has use-supabase-queries.ts with comprehensive hooks,
 *   but only 9 of 91 views use React Query. The other 82 views use the
 *   `useState + useEffect + fetch` pattern, which means:
 *     - No caching (every mount refetches)
 *     - No request deduplication (multiple components fetch the same data)
 *     - No background refetch / stale-while-revalidate
 *     - No automatic retry
 *     - Manual loading/error state management (error-prone)
 *
 *   This file provides clean, minimal hooks that match the response shapes the
 *   views already expect, making migration as simple as:
 *
 *     // Before (200+ lines of boilerplate per view):
 *     const [jobs, setJobs] = useState([]);
 *     const [loading, setLoading] = useState(true);
 *     const [error, setError] = useState(null);
 *     const fetchJobs = useCallback(async () => {
 *       setLoading(true); setError(null);
 *       try {
 *         const res = await authFetch('/api/jobs');
 *         const data = await res.json();
 *         setJobs(data.jobs || []);
 *       } catch (e) {
 *         setError(e.message);
 *       } finally { setLoading(false); }
 *     }, []);
 *     useEffect(() => { fetchJobs(); }, [fetchJobs]);
 *
 *     // After (3 lines):
 *     const { data: jobs = [], isLoading, error, refetch } = useJobs();
 *
 * MIGRATION:
 *   Each view migration is a separate commit. Start with the smallest view
 *   (expenses-view, 995 lines) and work up to the largest (jobs-view, 5,962 lines).
 *
 *   1. expenses-view  (995 lines) — simplest, good proving ground
 *   2. contacts-view  (2,048 lines) — already paginated
 *   3. leads-view     (4,165 lines) — already paginated
 *   4. invoices-view  (3,386 lines) — has create/update mutations
 *   5. jobs-view      (5,962 lines) — most complex, do last
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/api';

// ── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobListParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useJobs(params: JobListParams = {}) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      searchParams.set('includeDeleted', 'false');

      const res = await authFetch(`/api/jobs?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      return {
        jobs: data.jobs ?? (Array.isArray(data) ? data : []),
        pagination: data.pagination ?? null,
      };
    },
    staleTime: 30_000, // 30s — jobs change frequently
  });
}

// ── Customers / Contacts ─────────────────────────────────────────────────────

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
  groupId?: string;
  status?: string;
}

export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.groupId && params.groupId !== 'all') searchParams.set('groupId', params.groupId);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);

      const res = await authFetch(`/api/customers?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      return {
        customers: data.customers ?? (Array.isArray(data) ? data : []),
        pagination: data.pagination ?? null,
      };
    },
    staleTime: 60_000, // 60s — customers change less frequently
  });
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await authFetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      return data.invoices ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 60_000,
  });
}

// ── Leads ────────────────────────────────────────────────────────────────────

export interface LeadListParams {
  status?: string;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useLeads(params: LeadListParams = {}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params.source && params.source !== 'all') searchParams.set('source', params.source);
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      searchParams.set('deleted', 'false');

      const res = await authFetch(`/api/leads?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      return {
        leads: data.leads ?? [],
        pagination: data.pagination ?? null,
      };
    },
    staleTime: 30_000,
  });
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await authFetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      return data.expenses ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 60_000,
  });
}

// ── Mutation helpers ─────────────────────────────────────────────────────────

/**
 * Generic mutation hook that invalidates the given query keys on success.
 *
 * Usage:
 *   const createJob = useCrmMutation({
 *     url: '/api/jobs',
 *     method: 'POST',
 *     invalidateQueries: ['jobs'],
 *   });
 *   createJob.mutate(jobData);
 */
export function useCrmMutation<TData, TVariables = unknown>(opts: {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  invalidateQueries?: unknown[][];
  onSuccess?: (data: TData) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const res = await authFetch(opts.url, {
        method: opts.method ?? 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (opts.invalidateQueries) {
        for (const queryKey of opts.invalidateQueries) {
          queryClient.invalidateQueries({ queryKey });
        }
      }
      opts.onSuccess?.(data);
    },
  });
}
