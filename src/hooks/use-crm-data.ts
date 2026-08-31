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
import { qk, type QueryKey } from '@/lib/query-keys';

// ── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobListParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useJobs(params: JobListParams = {}) {
  return useQuery({
    queryKey: qk.jobs.list(params),
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
    staleTime: 10_000, // 10s — Freshness Contract: CRM jobs
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
    queryKey: qk.contacts.list(params),
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
    staleTime: 10_000, // 10s — Freshness Contract: CRM customers/contacts
  });
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export function useInvoices() {
  return useQuery({
    queryKey: qk.invoices.lists(),
    queryFn: async () => {
      const res = await authFetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      return data.invoices ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 10_000, // 10s — Freshness Contract: CRM invoices
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
    queryKey: qk.leads.list(params),
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
    staleTime: 10_000, // 10s — Freshness Contract: CRM leads
  });
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export function useExpenses() {
  return useQuery({
    queryKey: qk.expenses.lists(),
    queryFn: async () => {
      const res = await authFetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      return data.expenses ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 10_000, // 10s — Freshness Contract: CRM expenses
  });
}

// ── Expense mutations (dependency-aware) ─────────────────────────────────────
//
// These hooks use `useCrmMutation` + `getExpenseInvalidations` so every
// mutation invalidates exactly the right cache keys:
//   - qk.expenses.all (lists)
//   - qk.dashboard.all (totals)
//   - qk.expenses.detail(id) (for update/delete/status-change)
//
// Migration: Phase 1.8a — expenses-view.tsx is the first consumer.

import { getExpenseInvalidations, getCustomerInvalidations, getContactInvalidations, getLeadInvalidations, getInvoiceInvalidations, getJobInvalidations } from '@/lib/invalidation-helpers';

export interface ExpenseCreateInput {
  category: string;
  description: string;
  amount: number;
  currency?: string;
  expenseDate: string;
  jobId?: string;
  notes?: string;
  receiptUrl?: string;
}

export interface ExpenseUpdateInput extends Partial<ExpenseCreateInput> {
  id: string;
}

export interface ExpenseStatusChangeInput {
  id: string;
  status: string;
}

export interface ExpenseRejectInput {
  id: string;
  rejectedReason?: string;
}

export function useCreateExpense() {
  return useCrmMutation<unknown, ExpenseCreateInput>({
    url: '/api/expenses',
    method: 'POST',
    invalidate: ({ data }) => getExpenseInvalidations({ mutation: 'create', data }),
  });
}

export function useUpdateExpense() {
  return useCrmMutation<unknown, ExpenseUpdateInput>({
    url: ({ id }) => `/api/expenses/${id}`,
    method: 'PATCH',
    invalidate: ({ data, variables }) =>
      getExpenseInvalidations({ mutation: 'update', data, variables }),
  });
}

export function useDeleteExpense() {
  return useCrmMutation<{ success: true }, { id: string }>({
    url: ({ id }) => `/api/expenses/${id}`,
    method: 'DELETE',
    invalidate: ({ variables }) =>
      getExpenseInvalidations({ mutation: 'delete', variables }),
  });
}

export function useChangeExpenseStatus() {
  return useCrmMutation<unknown, ExpenseStatusChangeInput>({
    url: ({ id }) => `/api/expenses/${id}`,
    method: 'PATCH',
    invalidate: ({ data, variables }) =>
      getExpenseInvalidations({ mutation: 'update', data, variables }),
  });
}

export function useRejectExpense() {
  return useCrmMutation<unknown, ExpenseRejectInput>({
    url: ({ id }) => `/api/expenses/${id}`,
    method: 'PATCH',
    invalidate: ({ data, variables }) =>
      getExpenseInvalidations({ mutation: 'update', data, variables }),
  });
}

/**
 * Generic CRM mutation hook with dependency-aware cache invalidation.
 *
 * Unlike a blanket "invalidate everything" approach, this hook lets each
 * mutation specify EXACTLY which queries should be invalidated based on
 * the runtime data (response) and variables (request body).
 *
 * ─── Why dependency-aware? ───────────────────────────────────────────────────
 * A job creation might affect:
 *   - the jobs list (always)
 *   - the dashboard KPIs (always)
 *   - the calendar (always)
 *   - the assigned customer's detail (only if customerId is present)
 *   - the assigned employee's detail (only if assigneeId is present)
 *
 * A static `invalidateQueries: [['jobs'], ['dashboard']]` can't express
 * "only if customerId is present" — it either always invalidates the
 * customer (wasteful) or never does (stale data). The function API solves
 * this:
 *
 *   invalidate: ({ data, variables }) => [
 *     qk.jobs.all,
 *     qk.dashboard.all,
 *     qk.jobs.calendar.all(),
 *     ...(data.customerId ? [qk.customers.detail(data.customerId)] : []),
 *     ...(data.assigneeId ? [qk.employees.detail(data.assigneeId)] : []),
 *   ]
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 * 1. Simple JSON POST (most common):
 *    const createJob = useCrmMutation({
 *      url: '/api/jobs',
 *      method: 'POST',
 *      invalidate: ({ data }) => [qk.jobs.all, qk.dashboard.all],
 *    });
 *
 * 2. Dynamic URL (PUT /api/jobs/${id}):
 *    const updateJob = useCrmMutation({
 *      url: ({ id }) => `/api/jobs/${id}`,
 *      method: 'PUT',
 *      invalidate: ({ data, variables }) => [
 *        qk.jobs.all,
 *        qk.jobs.detail(variables.id),
 *      ],
 *    });
 *
 * 3. Custom mutationFn (FormData, multi-step, etc.):
 *    const uploadPhoto = useCrmMutation({
 *      mutationFn: async (formData) => {
 *        const res = await authFetch('/api/upload', { method: 'POST', body: formData });
 *        if (!res.ok) throw new Error('Upload failed');
 *        return res.json();
 *      },
 *      invalidate: ({ data }) => [qk.jobs.detail(data.jobId)],
 *    });
 */
export function useCrmMutation<TData = unknown, TVariables = unknown>(opts: {
  /**
   * Custom mutation function. Takes precedence over `url`/`method`.
   * Use this for FormData, dynamic request bodies, multi-step mutations, etc.
   */
  mutationFn?: (variables: TVariables) => Promise<TData>;

  /**
   * URL for the default mutationFn (JSON body). Can be a string or a function
   * of variables (for dynamic URLs like /api/jobs/${id}).
   * Ignored if `mutationFn` is provided.
   */
  url?: string | ((variables: TVariables) => string);

  /** HTTP method for the default mutationFn. Default: 'POST'. */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /**
   * Dependency-aware invalidation function. Receives { data, variables } and
   * returns an array of query keys to invalidate. This is the KEY feature —
   * invalidation can depend on runtime IDs (customerId, employeeId, etc.)
   * rather than blanket-invalidating an entire entity namespace.
   *
   * For complex dependency logic, use the helper functions from
   * `@/lib/invalidation-helpers` (Phase 1.4):
   *
   *   invalidate: ({ data, variables }) =>
   *     getJobInvalidations({ mutation: 'create', data, variables })
   */
  invalidate?: (context: { data: TData; variables: TVariables }) => QueryKey[];

  /** Optional callback after successful mutation + invalidation. */
  onSuccess?: (data: TData, variables: TVariables) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: opts.mutationFn ?? (async (variables: TVariables) => {
      const url = typeof opts.url === 'function' ? opts.url(variables) : opts.url;
      if (!url) throw new Error('useCrmMutation: either mutationFn or url is required');

      const res = await authFetch(url, {
        method: opts.method ?? 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
      }
      return res.json() as Promise<TData>;
    }),
    onSuccess: (data, variables) => {
      // Dependency-aware invalidation — the key feature
      if (opts.invalidate) {
        const keys = opts.invalidate({ data, variables });
        for (const queryKey of keys) {
          queryClient.invalidateQueries({ queryKey });
        }
      }
      opts.onSuccess?.(data, variables);
    },
  });
}

// ── Calendar Events ─────────────────────────────────────────────────────────

export function useCalendarEvents(params: { employeeId?: string; startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: qk.jobs.calendar.list(params),
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
    staleTime: 10_000, // 10s — Freshness Contract: CRM calendar (jobs)
  });
}

// ── Bookings ────────────────────────────────────────────────────────────────

export function useBookings(params: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: qk.bookings.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.status && params.status !== 'all') sp.set('status', params.status);
      if (params.search) sp.set('search', params.search);
      const res = await authFetch(`/api/bookings?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      return data.bookings ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 10_000, // 10s — Freshness Contract: CRM bookings
  });
}

// ── Expenses with filters ───────────────────────────────────────────────────

export function useExpensesFiltered(params: { status?: string; category?: string; search?: string } = {}) {
  return useQuery({
    queryKey: qk.expenses.list(params),
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
    staleTime: 10_000, // 10s — Freshness Contract: CRM expenses (filtered)
  });
}

// ── Broadcasts ──────────────────────────────────────────────────────────────

export function useBroadcasts(params: { status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.broadcasts.list(params),
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
    queryKey: qk.campaigns.list(params),
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
    queryKey: qk.inventory.items(params),
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
    queryKey: qk.inventory.transactions(params),
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
    queryKey: qk.inventory.purchaseOrders(params),
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
    queryKey: qk.customers.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set('search', params.search);
      sp.set('limit', '50');
      const res = await authFetch(`/api/customers?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      return data.customers ?? (Array.isArray(data) ? data : []);
    },
    staleTime: 10_000, // 10s — Freshness Contract: CRM customers
  });
}

// ── Customer mutations (dependency-aware) ────────────────────────────────────
//
// These hooks use `useCrmMutation` + `getCustomerInvalidations` so every
// mutation invalidates exactly the right cache keys:
//   - delete: customers.all + dashboard.all + customers.detail(id)
//   - portal (enable/disable/resend): customers.all + customers.detail(id)
//     (NO dashboard — portal status doesn't affect KPIs)
//   - note: customers.detail(id) ONLY (notes don't affect list or dashboard)
//
// NOTE: The 'note' mutation invalidates qk.customers.detail(id), which would
// prefix-match a timeline cache key IF the timeline were an RQ query. But
// crm-view's timeline is local state (manual authFetch + useState), so the
// caller MUST keep its existing manual timeline refetch after the note
// succeeds. This dual responsibility is intentional — see Phase 1.9 audit.
//
// Migration: Phase 1.9 — crm-view.tsx. CustomerFormSheet (create/update) is
// OUT OF SCOPE (shared component, separate future migration).

export interface CustomerDeleteInput {
  id: string;
}

export interface CustomerPortalInput {
  id: string;
}

export interface CustomerNoteInput {
  id: string;
  entryType: string;
  title: string;
  description: string;
}

export function useDeleteCustomer() {
  return useCrmMutation<unknown, CustomerDeleteInput>({
    url: ({ id }) => `/api/customers?id=${id}`,
    method: 'DELETE',
    invalidate: ({ variables }) =>
      getCustomerInvalidations({ mutation: 'delete', variables }),
  });
}

export function useEnableCustomerPortal() {
  return useCrmMutation<unknown, CustomerPortalInput>({
    url: ({ id }) => `/api/customers/${id}/portal/enable`,
    method: 'POST',
    invalidate: ({ variables }) =>
      getCustomerInvalidations({ mutation: 'portal', variables }),
  });
}

export function useResendCustomerPortal() {
  return useCrmMutation<unknown, CustomerPortalInput>({
    url: ({ id }) => `/api/customers/${id}/portal/resend`,
    method: 'POST',
    invalidate: ({ variables }) =>
      getCustomerInvalidations({ mutation: 'portal', variables }),
  });
}

export function useDisableCustomerPortal() {
  return useCrmMutation<unknown, CustomerPortalInput>({
    url: ({ id }) => `/api/customers/${id}/portal/disable`,
    method: 'POST',
    invalidate: ({ variables }) =>
      getCustomerInvalidations({ mutation: 'portal', variables }),
  });
}

export function useAddCustomerNote() {
  return useCrmMutation<unknown, CustomerNoteInput>({
    url: ({ id }) => `/api/customers/${id}/timeline`,
    method: 'POST',
    invalidate: ({ variables }) =>
      getCustomerInvalidations({ mutation: 'note', variables }),
  });
}

// ── Contact mutations (dependency-aware) ────────────────────────────────────
//
// These hooks use `useCrmMutation` + `getContactInvalidations` so every
// mutation invalidates exactly the right cache keys:
//   - create/update/delete → contacts.all (+ detail for update/delete)
//   - bulk (tag/group/status) → contacts.all only (no individual details)
//   - bulk-delete → contacts.all only
//   - import (CSV/FormData) → contacts.all only
//
// NOTE: The dashboard is NOT invalidated — the dashboard API does not consume
// the Contact model (verified during Phase 1.9b audit).
//
// NOTE: `useCustomers` (the read hook) is a historically-named hook that
// fetches /api/contacts → db.contact (the Contact model). The naming is
// confusing but correct — it returns Contact data normalized to a
// `{customers, pagination}` shape for backward compat. NOT renamed per
// Phase 1.9b scoping rules.
//
// Migration: Phase 1.9b — contacts-view.tsx

export interface ContactSaveInput {
  id?: string; // present for update, absent for create
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  source?: string;
  status?: string;
  tagIds?: string[];
  groupIds?: string[];
}

export interface ContactDeleteInput {
  id: string;
}

export interface ContactBulkActionInput {
  contactIds: string[];
  action: string;
  groupId?: string;
  tagId?: string;
  status?: string;
}

export interface ContactImportInput {
  // For CSV JSON import: { contacts: [...] }
  // For FormData import: FormData object (use mutationFn override)
  contacts?: Record<string, string | null>[];
}

export function useCreateContact() {
  return useCrmMutation<unknown, Omit<ContactSaveInput, 'id'>>({
    url: '/api/contacts',
    method: 'POST',
    invalidate: ({ data }) =>
      getContactInvalidations({ mutation: 'create', data }),
  });
}

export function useUpdateContact() {
  return useCrmMutation<unknown, ContactSaveInput>({
    url: ({ id }) => `/api/contacts/${id}`,
    method: 'PUT',
    invalidate: ({ data, variables }) =>
      getContactInvalidations({ mutation: 'update', data, variables }),
  });
}

export function useDeleteContact() {
  return useCrmMutation<unknown, ContactDeleteInput>({
    url: ({ id }) => `/api/contacts/${id}`,
    method: 'DELETE',
    invalidate: ({ variables }) =>
      getContactInvalidations({ mutation: 'delete', variables }),
  });
}

export function useBulkContactAction() {
  return useCrmMutation<unknown, ContactBulkActionInput>({
    url: '/api/contacts/bulk',
    method: 'POST',
    invalidate: () =>
      getContactInvalidations({ mutation: 'bulk' }),
  });
}

export function useBulkDeleteContacts() {
  return useCrmMutation<unknown, ContactBulkActionInput>({
    url: '/api/contacts/bulk',
    method: 'POST',
    invalidate: () =>
      getContactInvalidations({ mutation: 'bulk-delete' }),
  });
}

/**
 * Import contacts via CSV JSON payload.
 * For FormData import, use a custom mutationFn via useCrmMutation directly.
 */
export function useImportContactsCsv() {
  return useCrmMutation<unknown, ContactImportInput>({
    url: '/api/contacts/import',
    method: 'POST',
    invalidate: () =>
      getContactInvalidations({ mutation: 'import' }),
  });
}

/**
 * Import contacts via FormData (file upload).
 * Uses a custom mutationFn because FormData can't be JSON.stringified.
 */
export function useImportContactsFormData() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const res = await authFetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Import failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      // Same as import: contacts.all only (no dashboard, no individual details)
      const keys = getContactInvalidations({ mutation: 'import' });
      for (const queryKey of keys) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

// ── Lead mutations (dependency-aware) ───────────────────────────────────────
//
// These hooks use `useCrmMutation` + `getLeadInvalidations` so every
// mutation invalidates exactly the right cache keys:
//   - create/update/delete/status → leads.all + dashboard.all (+ detail)
//   - convert → leads.all + dashboard.all + customers.all + jobs.all +
//               jobs.calendar.all() + dispatch.all + customer/job details
//   - note → leads.detail(id) ONLY (NO dashboard, NO list — notesJson not
//            consumed by dashboard or list, only by detail view)
//
// ─── Dashboard consumption (verified Phase 1.9c audit) ──────────────────────
// The dashboard API consumes: lead.count, lead.groupBy(status), lead.groupBy(source),
// lead.findMany(recent 5). Note-only updates do NOT affect these → no dashboard
// invalidation for 'note' mutations.
//
// Migration: Phase 1.9c — leads-view.tsx

export interface LeadSaveInput {
  id?: string; // present for update, absent for create
  title?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  source?: string;
  status?: string;
  priority?: string;
  value?: number;
  description?: string | null;
  address?: string | null;
  serviceType?: string | null;
  serviceId?: string | null;
  lineItemsJson?: string;
  imagesJson?: string;
  assessmentImagesJson?: string;
  customerId?: string | null;
  notesJson?: string;
}

export interface LeadDeleteInput {
  id: string;
  softDelete?: boolean;
}

export interface LeadConvertInput {
  leadId: string;
}

export interface LeadStatusChangeInput {
  id: string;
  status: string;
}

export interface LeadNoteInput {
  id: string;
  notesJson: string;
}

export function useCreateLead() {
  return useCrmMutation<unknown, Omit<LeadSaveInput, 'id'>>({
    url: '/api/leads',
    method: 'POST',
    invalidate: ({ data }) =>
      getLeadInvalidations({ mutation: 'create', data }),
  });
}

export function useUpdateLead() {
  return useCrmMutation<unknown, LeadSaveInput>({
    url: ({ id }) => `/api/leads/${id}`,
    method: 'PUT',
    invalidate: ({ data, variables }) =>
      getLeadInvalidations({ mutation: 'update', data, variables }),
  });
}

export function useDeleteLead() {
  return useCrmMutation<unknown, LeadDeleteInput>({
    url: ({ id }) => `/api/leads/${id}`,
    method: 'DELETE',
    invalidate: ({ variables }) =>
      getLeadInvalidations({ mutation: 'delete', variables }),
  });
}

export function useConvertLead() {
  return useCrmMutation<unknown, LeadConvertInput>({
    url: '/api/leads/convert',
    method: 'POST',
    invalidate: ({ data, variables }) =>
      getLeadInvalidations({ mutation: 'convert', data, variables }),
  });
}

export function useChangeLeadStatus() {
  return useCrmMutation<unknown, LeadStatusChangeInput>({
    url: ({ id }) => `/api/leads/${id}`,
    method: 'PUT',
    invalidate: ({ data, variables }) =>
      getLeadInvalidations({ mutation: 'status', data, variables }),
  });
}

export function useAddLeadNote() {
  return useCrmMutation<unknown, LeadNoteInput>({
    url: ({ id }) => `/api/leads/${id}`,
    method: 'PUT',
    invalidate: ({ variables }) =>
      getLeadInvalidations({ mutation: 'note', variables }),
  });
}

// ── Invoice mutations (dependency-aware) ────────────────────────────────────
//
// These hooks use `useCrmMutation` + `getInvoiceInvalidations` so every
// mutation invalidates exactly the right cache keys:
//   - create/duplicate → invoices.all ONLY (draft, no dashboard)
//   - update/delete/status/mark_paid/reopen → invoices.all + dashboard.all +
//     invoices.detail(id) + customers.detail(customerId)
//   - send/reminder/approve → invoices.all + invoices.detail(id) (NO dashboard)
//
// ─── IMPORTANT: Invoice RQ cache is NOT YET ACTIVE ──────────────────────────
// invoices-view uses local state (useState + authFetch), NOT React Query.
// So qk.invoices.* invalidations are currently no-ops. The caller (invoices-view)
// MUST keep its existing setInvoices(prev => ...) local state updates.
// The dashboard + customer detail invalidations DO work (those ARE in RQ).
//
// Migration: Phase 1.9d — invoices-view.tsx (mutations only; reads stay manual)

export interface InvoiceSaveInput {
  id?: string; // present for update, absent for create
  customerId: string;
  jobId?: string;
  employeeId?: string;
  items: Array<{ description: string; quantity: number; rate: number }>;
  dueDate?: string;
  notes?: string;
  discount?: number;
  taxPercent?: number;
  currency?: string;
}

export interface InvoiceUpdateInput extends Partial<InvoiceSaveInput> {
  id: string;
  status?: string;
  paidAt?: string | null;
}

export interface InvoiceActionInput {
  id: string;
  action: string; // 'send' | 'send_email' | 'send_whatsapp' | 'mark_paid' | 'reminder' | 'approve'
}

export function useCreateInvoice() {
  return useCrmMutation<unknown, Omit<InvoiceSaveInput, 'id'>>({
    url: '/api/invoices',
    method: 'POST',
    invalidate: ({ data }) =>
      getInvoiceInvalidations({ mutation: 'create', data }),
  });
}

export function useUpdateInvoice() {
  return useCrmMutation<unknown, InvoiceUpdateInput>({
    url: ({ id }) => `/api/invoices/${id}`,
    method: 'PUT',
    invalidate: ({ data, variables }) =>
      getInvoiceInvalidations({ mutation: 'update', data, variables }),
  });
}

export function useDeleteInvoice() {
  return useCrmMutation<unknown, { id: string }>({
    url: ({ id }) => `/api/invoices/${id}`,
    method: 'DELETE',
    invalidate: ({ variables }) =>
      getInvoiceInvalidations({ mutation: 'delete', variables }),
  });
}

export function useDuplicateInvoice() {
  return useCrmMutation<unknown, Omit<InvoiceSaveInput, 'id'>>({
    url: '/api/invoices',
    method: 'POST',
    invalidate: ({ data }) =>
      getInvoiceInvalidations({ mutation: 'duplicate', data }),
  });
}

export function useInvoiceAction() {
  return useCrmMutation<unknown, InvoiceActionInput>({
    url: ({ id }) => `/api/invoices/${id}/actions`,
    method: 'POST',
    invalidate: ({ data, variables }) => {
      // Map the action to the correct mutation type for invalidation
      const action = variables.action;
      if (action === 'mark_paid') {
        return getInvoiceInvalidations({ mutation: 'mark_paid', data, variables });
      }
      // send, send_email, send_whatsapp, reminder, approve → no dashboard
      return getInvoiceInvalidations({ mutation: action || 'send', data, variables });
    },
  });
}

export function useChangeInvoiceStatus() {
  return useCrmMutation<unknown, InvoiceUpdateInput>({
    url: ({ id }) => `/api/invoices/${id}`,
    method: 'PUT',
    invalidate: ({ data, variables }) =>
      getInvoiceInvalidations({ mutation: 'status', data, variables }),
  });
}

export function useReopenInvoice() {
  return useCrmMutation<unknown, { id: string }>({
    url: ({ id }) => `/api/invoices/${id}`,
    method: 'PUT',
    invalidate: ({ data, variables }) =>
      getInvoiceInvalidations({ mutation: 'reopen', data, variables }),
  });
}

// ── Operations mutations (dependency-aware) ─────────────────────────────────
//
// Job lifecycle action → uses getJobInvalidations('update') — this IS a job
//   mutation (updates db.job). Invalidates jobs + dashboard + calendar +
//   dispatch + customer detail + employee detail.
//
// Resource CRUD → uses qk.operations.resourcesAll() — self-contained, no
//   cross-domain dependencies. Dashboard does NOT consume resources.
//
// Webhook source mutations → NOT included here. Webhook sources use manual
// useState (not React Query), so there's no RQ cache to invalidate. The
// caller keeps its existing fetchWebhookSources() call.
//
// Migration: Phase 1.9e — operations-view.tsx
//
// NOTE: useJobLifecycleAction + JobLifecycleInput live in the Phase 1.9f
// block below (lines ~1127+). They were relocated there in 1.9f so the
// assign-aware invalidation (mutation='assign' for assign, 'update' otherwise)
// could be applied. The earlier declaration that lived here was removed to
// avoid a duplicate-export parse error (rolldown).

export interface ResourceSaveInput {
  id?: string; // present for update, absent for create
  name: string;
  phone: string;
  type: string;
  location?: string;
  skills?: string[];
}

export function useCreateResource() {
  return useCrmMutation<unknown, Omit<ResourceSaveInput, 'id'>>({
    url: '/api/resources',
    method: 'POST',
    invalidate: () => [qk.operations.resourcesAll()],
  });
}

export function useUpdateResource() {
  return useCrmMutation<unknown, ResourceSaveInput>({
    url: '/api/resources',
    method: 'PUT',
    invalidate: () => [qk.operations.resourcesAll()],
  });
}

export function useDeleteResource() {
  return useCrmMutation<unknown, { id: string }>({
    url: ({ id }) => `/api/resources?id=${id}`,
    method: 'DELETE',
    invalidate: () => [qk.operations.resourcesAll()],
  });
}

// ── Job mutations (dependency-aware) ────────────────────────────────────────
//
// Uses getJobInvalidations for create/update/delete/assign/status/note.
// 'note' → jobs.detail(id) ONLY (completionNotes not consumed by dashboard/list/etc.)
//
// Recurring schedule pause/resume → NOT getJobInvalidations (changes schedule, not job).
// Generate invoice → special (creates invoice + updates job detail, no dashboard).
// Lead/invoice/quote link operations → cross-domain targeted invalidation.
//
// Migration: Phase 1.9f — jobs-view.tsx (largest view, 14 mutations)

export interface JobCreateInput {
  title?: string | null;
  customerId?: string | null;
  assigneeId?: string | null;
  status?: string;
  priority?: string;
  type?: string;
  description?: string | null;
  address?: string | null;
  scheduledAt?: string | null;
  lineItemsJson?: string;
  imagesJson?: string;
  linkedChecklistsJson?: string;
  // ... other fields as needed
  [key: string]: unknown;
}

export interface JobUpdateInput extends Partial<JobCreateInput> {
  id: string;
}

export interface JobBulkActionInput {
  jobIds: string[];
  action: 'delete' | 'softDelete' | 'updateStatus';
  status?: string;
}

export interface JobLifecycleInput {
  action: string;
  jobId: string;
  resourceId?: string;
  reason?: string;
  reassignmentNote?: string;
}

export interface JobLifecycleTransitionInput {
  action: string;
  jobId: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  completionNotes?: string;
  extraPayload?: Record<string, unknown>;
}

export function useCreateJob() {
  return useCrmMutation<unknown, JobCreateInput>({
    url: '/api/jobs',
    method: 'POST',
    invalidate: ({ data }) =>
      getJobInvalidations({ mutation: 'create', data }),
  });
}

export function useUpdateJob() {
  return useCrmMutation<unknown, JobUpdateInput>({
    url: ({ id }) => `/api/jobs/${id}`,
    method: 'PUT',
    invalidate: ({ data, variables }) =>
      getJobInvalidations({ mutation: 'update', data, variables }),
  });
}

export function useDeleteJob() {
  return useCrmMutation<unknown, { id: string }>({
    url: ({ id }) => `/api/jobs/${id}`,
    method: 'DELETE',
    invalidate: ({ variables }) =>
      getJobInvalidations({ mutation: 'delete', variables }),
  });
}

export function useBulkJobAction() {
  return useCrmMutation<unknown, JobBulkActionInput>({
    url: '/api/jobs/bulk',
    method: 'POST',
    // Bulk operations don't have individual IDs → invalidate jobs.all + dashboard + calendar + dispatch
    invalidate: () => [qk.jobs.all, qk.dashboard.all, qk.jobs.calendar.all(), qk.dispatch.all],
  });
}

export function useJobLifecycleAction() {
  return useCrmMutation<unknown, JobLifecycleInput>({
    url: '/api/jobs/lifecycle',
    method: 'POST',
    invalidate: ({ data, variables }) =>
      // 'assign' handles old+new employee detail; all other actions use 'update'
      getJobInvalidations({
        mutation: variables.action === 'assign' ? 'assign' : 'update',
        data,
        variables,
      }),
  });
}

export function useJobLifecycleTransition() {
  return useCrmMutation<unknown, JobLifecycleTransitionInput>({
    url: ({ jobId }) => `/api/jobs/${jobId}/lifecycle`,
    method: 'POST',
    invalidate: ({ data, variables }) =>
      getJobInvalidations({ mutation: 'update', data, variables }),
  });
}

export function useCancelJob() {
  return useCrmMutation<unknown, { id: string }>({
    url: ({ id }) => `/api/jobs/${id}`,
    method: 'PUT',
    invalidate: ({ variables }) =>
      getJobInvalidations({ mutation: 'update', variables }),
  });
}

export function useSaveJobNotes() {
  return useCrmMutation<unknown, { id: string; completionNotes: string }>({
    url: ({ id }) => `/api/jobs/${id}`,
    method: 'PUT',
    invalidate: ({ variables }) =>
      getJobInvalidations({ mutation: 'note', variables }),
  });
}

// Recurring schedule pause/resume — NOT getJobInvalidations (changes schedule, not job)
export function usePauseRecurringSchedule() {
  return useCrmMutation<unknown, { scheduleId: string }>({
    url: ({ scheduleId }) => `/api/recurring-jobs/${scheduleId}/pause`,
    method: 'POST',
    invalidate: () => [qk.jobs.all], // list shows schedule state
  });
}

export function useResumeRecurringSchedule() {
  return useCrmMutation<unknown, { scheduleId: string }>({
    url: ({ scheduleId }) => `/api/recurring-jobs/${scheduleId}/resume`,
    method: 'POST',
    invalidate: () => [qk.jobs.all], // list shows schedule state
  });
}

// Generate invoice — special: creates invoice + updates job detail (no dashboard — job status doesn't change)
export function useGenerateJobInvoice() {
  return useCrmMutation<unknown, { jobId: string }>({
    url: '/api/jobs/generate-invoice',
    method: 'POST',
    invalidate: ({ data, variables }) => {
      const keys: QueryKey[] = [qk.invoices.all, qk.jobs.detail(variables.jobId)];
      const customerId = (data as any)?.invoice?.customerId;
      if (customerId) keys.push(qk.customers.detail(customerId));
      return keys;
    },
  });
}

// Cross-domain link operations (called after job create in handleSaveJob)
export function useLinkLeadToJob() {
  return useCrmMutation<unknown, { leadId: string; status: string; jobId: string; customerId?: string; convertedAt: string }>({
    url: ({ leadId }) => `/api/leads/${leadId}`,
    method: 'PUT',
    invalidate: ({ variables }) => [
      qk.leads.all,
      qk.leads.detail(variables.leadId),
    ],
  });
}

export function useLinkInvoiceToJob() {
  return useCrmMutation<unknown, { customerId: string; jobId: string; items: Array<{ description: string; quantity: number; rate: number }> }>({
    url: '/api/invoices',
    method: 'POST',
    invalidate: () => [qk.invoices.all],
  });
}

export function useLinkQuoteToJob() {
  return useCrmMutation<unknown, { quoteId: string; jobId: string; status: string }>({
    url: ({ quoteId }) => `/api/quotes/${quoteId}`,
    method: 'PUT',
    invalidate: ({ variables }) => [
      qk.quotes.all,
      qk.quotes.detail(variables.quoteId),
    ],
  });
}