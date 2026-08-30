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
//
// NOTE: Despite the name, this hook fetches from `/api/contacts` (the Contact
// model — used by contacts-view.tsx) rather than `/api/customers` (the
// Customer model — used by crm-view.tsx via the separate `useCrmCustomers`
// hook). The two endpoints return different shapes:
//   /api/contacts  → { data: [...Contact], pagination }   (richer: contactTags,
//                                                            contactGroups, city,
//                                                            country, source, status)
//   /api/customers → { customers: [...Customer], pagination }
// The hook normalizes both into `{ customers, pagination }` so call sites can
// treat the result uniformly. The `customers` property is actually a list of
// Contact objects when called from contacts-view.tsx.

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
  pageSize?: number;          // alias for `limit` (preferred for new callers)
  groupId?: string;
  status?: string;
  // Contacts-only filters (passed through to /api/contacts — ignored by
  // /api/customers, which doesn't support them). Safe to set unconditionally.
  tagId?: string;
  source?: string;
  country?: string;
}

export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.page) searchParams.set('page', String(params.page));
      // Prefer the explicit `pageSize` over the legacy `limit` alias.
      const limit = params.pageSize ?? params.limit;
      if (limit) searchParams.set('limit', String(limit));
      if (params.groupId && params.groupId !== 'all') searchParams.set('groupId', params.groupId);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params.tagId && params.tagId !== 'all') searchParams.set('tagId', params.tagId);
      if (params.source && params.source !== 'all') searchParams.set('source', params.source);
      if (params.country) searchParams.set('country', params.country);

      // Hit /api/contacts so callers receive the full Contact shape
      // (contactTags, contactGroups, city, country, source, status, …).
      // The response is `{ data, pagination }`; we normalize it to
      // `{ customers, pagination }` for backward-compat with existing call
      // sites and tests that mock `{ customers: [...] }`.
      const res = await authFetch(`/api/contacts?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      return {
        customers: data.data ?? data.customers ?? (Array.isArray(data) ? data : []),
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

// ── Calendar Events ─────────────────────────────────────────────────────────

export function useCalendarEvents(params: { employeeId?: string; startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: ['calendar-events', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.employeeId) sp.set('assigneeId', params.employeeId);
      if (params.startDate) sp.set('startDate', params.startDate);
      if (params.endDate) sp.set('endDate', params.endDate);
      sp.set('limit', '200');
      const res = await authFetch(`/api/jobs?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch calendar events');
      const data = await res.json();
      return data.jobs ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 30_000,
  });
}

// ── Bookings ────────────────────────────────────────────────────────────────

export function useBookings(params: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.status && params.status !== 'all') sp.set('status', params.status);
      if (params.search) sp.set('search', params.search);
      const res = await authFetch(`/api/bookings?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      return data.bookings ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 30_000,
  });
}

// ── Expenses with filters ───────────────────────────────────────────────────

export function useExpensesFiltered(params: { status?: string; category?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['expenses-filtered', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.status && params.status !== 'all') sp.set('status', params.status);
      if (params.category && params.category !== 'all') sp.set('category', params.category);
      if (params.search) sp.set('search', params.search);
      const res = await authFetch(`/api/expenses?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      return data.expenses ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 30_000,
  });
}

// ── Broadcasts ──────────────────────────────────────────────────────────────

export function useBroadcasts(params: { status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['broadcasts', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.status) sp.set('status', params.status);
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      const res = await authFetch(`/api/broadcasts?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch broadcasts');
      const data = await res.json();
      return { broadcasts: data.data ?? (Array.isArray(data) ? data : []), pagination: data.pagination ?? null };
    },
    staleTime: 30_000,
  });
}

// ── Campaigns ───────────────────────────────────────────────────────────────

export function useCampaigns(params: { status?: string; type?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.status) sp.set('status', params.status);
      if (params.type) sp.set('type', params.type);
      if (params.limit) sp.set('limit', String(params.limit));
      const res = await authFetch(`/api/campaigns?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const data = await res.json();
      // The /api/campaigns endpoint returns `{ data: [...], pagination }`.
      // Also tolerate legacy `{ campaigns: [...] }` and bare-array shapes.
      return data.campaigns ?? data.data ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 30_000,
  });
}

// ── Inventory Items ─────────────────────────────────────────────────────────

export function useInventoryItems(params: { search?: string; category?: string } = {}) {
  return useQuery({
    queryKey: ['inventory-items', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      if (params.category && params.category !== 'all') sp.set('category', params.category);
      sp.set('limit', '200');
      const res = await authFetch(`/api/inventory/items?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inventory items');
      const data = await res.json();
      return data.items ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 60_000,
  });
}

// ── Inventory Transactions ──────────────────────────────────────────────────

export function useInventoryTransactions(params: { type?: string; startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: ['inventory-transactions', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.type && params.type !== 'all') sp.set('type', params.type);
      if (params.startDate) sp.set('startDate', params.startDate);
      if (params.endDate) sp.set('endDate', params.endDate);
      const res = await authFetch(`/api/inventory/transactions?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      return data.transactions ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 60_000,
  });
}

// ── Purchase Orders ─────────────────────────────────────────────────────────

export function usePurchaseOrders(params: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.status && params.status !== 'all') sp.set('status', params.status);
      if (params.search) sp.set('search', params.search);
      const res = await authFetch(`/api/inventory/purchase-orders?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch purchase orders');
      const data = await res.json();
      return data.purchaseOrders ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 60_000,
  });
}

// ── CRM Customers (for crm-view.tsx) ────────────────────────────────────────

export function useCrmCustomers(params: { search?: string } = {}) {
  return useQuery({
    queryKey: ['crm-customers', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      sp.set('limit', '50');
      const res = await authFetch(`/api/customers?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      return data.customers ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 60_000,
  });
}
