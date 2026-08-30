/**
 * Supabase Query Hooks — TanStack Query + Supabase
 *
 * All data fetching goes through these hooks.
 * Uses the backend API routes which use the Supabase adapter.
 * No direct Supabase client calls from the frontend.
 *
 * ─── Auth strategy (Phase 1.2) ──────────────────────────────────────────────
 * All client-side CRM queries use `authFetch` from `@/lib/api` (Bearer token
 * from localStorage + XTransformPort for the Caddy gateway). This ensures
 * auth works even when HTTP-only cookies aren't forwarded through the proxy.
 *
 * ─── Query keys (Phase 1.2) ─────────────────────────────────────────────────
 * Query keys come from the canonical `qk.*` factory in `@/lib/query-keys`.
 * The `queryKeys` export is a backward-compat shim that maps the old flat
 * API (`queryKeys.leads(tenantId)`) to the new hierarchical structure
 * (`qk.leads.lists()`). New code should use `qk.*` directly.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/api';
import { qk, queryKeys } from '@/lib/query-keys';

// ─── Generic fetcher ────────────────────────────────────────────────────────
// Uses authFetch under the hood so all CRM queries are auth-aware. Throws on
// !res.ok so React Query sees errors correctly (not silent error-JSON-as-data).

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

// ─── Query Key Factory ──────────────────────────────────────────────────────
// Re-exported from the canonical `@/lib/query-keys` module for backward compat.
// The `queryKeys` shim maps old flat calls to the new hierarchical `qk.*`
// structure. New hooks should use `qk.*` directly.
export { queryKeys };

// ─── CRM Hooks ──────────────────────────────────────────────────────────────

export function useLeads(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.leads(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/leads${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => apiFetch<any>(`/api/leads/${id}`),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.leads.all }); },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_: any, vars: any) => { qc.invalidateQueries({ queryKey: qk.leads.all }); qc.invalidateQueries({ queryKey: qk.leads.detail(vars.id) }); },
  });
}

export function useContacts(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.contacts(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/contacts${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useCustomers(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.customers(tenantId),
    queryFn: async () => {
      const data = await apiFetch<any>(`/api/customers${tenantId ? `?tenantId=${tenantId}` : ''}`);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.customers)) return data.customers;
      return [];
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => apiFetch<any>(`/api/customers/${id}`),
    enabled: !!id,
  });
}

// ─── Customer 360 Hook ──────────────────────────────────────────────────────

export function useCustomer360(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customer360(customerId),
    queryFn: async () => {
      // Phase 5: reduced from 5 parallel fetches to 2.
      // Previously fetched jobs/invoices/conversations separately, but they're
      // already nested in the /api/customers/[id] response (with lean Prisma
      // select). The timeline endpoint is separate because it returns a
      // unified view with synthesized entries from multiple tables.
      const [customer, timeline] = await Promise.allSettled([
        apiFetch<any>(`/api/customers/${customerId}`),
        apiFetch<any>(`/api/customers/${customerId}/timeline`),
      ]);
      const customerData = customer.status === 'fulfilled' ? customer.value : null;
      return {
        customer: customerData,
        // Use nested arrays from the customer response (already lean-selected)
        jobs: customerData?.jobs ?? [],
        invoices: customerData?.invoices ?? [],
        conversations: customerData?.conversations ?? [],
        quotes: customerData?.quotes ?? [],
        leads: customerData?.leads ?? [],
        stats: customerData?.stats ?? null,
        timeline: timeline.status === 'fulfilled'
          ? (Array.isArray(timeline.value)
              ? timeline.value
              : timeline.value?.entries || timeline.value?.data || [])
          : [],
      };
    },
    enabled: !!customerId,
  });
}

// ─── Communication Hooks ────────────────────────────────────────────────────

export function useConversations(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.conversations(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/conversations${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useInboxMessages(conversationId: string) {
  return useQuery({
    queryKey: queryKeys.inboxMessages(conversationId),
    queryFn: () => apiFetch<any[]>(`/api/inbox-messages?conversationId=${conversationId}`),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/inbox-messages', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_: any, vars: any) => { qc.invalidateQueries({ queryKey: queryKeys.inboxMessages(vars.conversationId) }); },
  });
}

export function useCampaigns(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.campaigns(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/campaigns${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useChannelConfigs(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.channelConfigs(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/channel-configs${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

// ─── Operations Hooks ───────────────────────────────────────────────────────

export function useJobs(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.jobs(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/jobs${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => apiFetch<any>(`/api/jobs/${id}`),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.jobs.all }); },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_: any, vars: any) => { qc.invalidateQueries({ queryKey: qk.jobs.all }); qc.invalidateQueries({ queryKey: qk.jobs.detail(vars.id) }); },
  });
}

export function useBookings(customerId?: string) {
  return useQuery({
    queryKey: qk.bookings.list({ customerId }),
    queryFn: () => apiFetch<any>(`/api/bookings${customerId ? `?customerId=${customerId}` : ''}`),
  });
}

export function useEmployees(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.employees(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/employees${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.employees.all }); },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.employees.all }); },
  });
}

// ─── Finance Hooks ──────────────────────────────────────────────────────────

export function useQuotes(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.quotes(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/quotes${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useInvoices(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.invoices(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/invoices${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.invoices.all }); },
  });
}

// ─── Automation Hooks ───────────────────────────────────────────────────────

export function useWorkflows(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.workflows(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/workflows${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: queryKeys.workflow(id),
    queryFn: () => apiFetch<any>(`/api/workflows/${id}`),
    enabled: !!id,
  });
}

export function useWorkflowAutomations(tenantId?: string) {
  return useQuery({
    queryKey: qk.workflows.automations(),
    queryFn: () => apiFetch<any[]>(`/api/workflow-automations${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useTriggers(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.triggers(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/triggers${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useForms(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.forms(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/forms${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

// ─── System Hooks ───────────────────────────────────────────────────────────

export function useCredentials(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.credentials(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/credentials${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useAuditLogs(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.auditLogs(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/audit-logs${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

// ─── Super Admin Hooks ──────────────────────────────────────────────────────

export function useTenants(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.tenants(),
    queryFn: () => apiFetch<any>('/api/superadmin/tenants'),
    enabled,
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.tenant(id),
    queryFn: () => apiFetch<any>(`/api/superadmin/tenants/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/superadmin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_: any, vars: any) => { qc.invalidateQueries({ queryKey: qk.superadmin.tenants.all }); qc.invalidateQueries({ queryKey: qk.superadmin.tenants.detail(vars.id) }); },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/superadmin/tenants', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.superadmin.tenants.all }); },
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/superadmin/tenants/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.superadmin.tenants.all }); },
  });
}

export function useSubscriptions(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.subscriptions(),
    // Server-side paginated endpoint. The API now returns
    // `{ data, page, limit, total, totalPages }`; `select` extracts the
    // page slice so existing consumers can keep treating the hook result
    // as an array (matches the prior `{ subscriptions: [...] }` shape they
    // read via the `Array.isArray(...) ? ... : .subscriptions` fallback).
    // Page 1 / limit 50 keeps the initial payload small; a future task can
    // wire up real pagination controls (Load more / page numbers) in the
    // SubscriptionsTab UI.
    queryFn: () => apiFetch<any>('/api/superadmin/subscriptions?page=1&limit=50'),
    select: (res: any) => (Array.isArray(res) ? res : (res?.data ?? [])),
    enabled,
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch('/api/superadmin/subscriptions', { method: 'PUT', body: JSON.stringify({ subscriptionId: id, ...data }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.superadmin.subscriptions.all }); },
  });
}

export function usePauseSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch('/api/superadmin/subscriptions', { method: 'PATCH', body: JSON.stringify({ action: 'pause', subscriptionId: id, reason }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.superadmin.subscriptions.all }); },
  });
}

export function useFeatureFlags(tenantId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.featureFlags(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/superadmin/feature-flags${tenantId ? `?tenantId=${tenantId}` : ''}`),
    enabled,
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/superadmin/feature-flags', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.superadmin.featureFlags }); qc.invalidateQueries({ queryKey: qk.superadmin.menuItems.all }); },
  });
}

export function useMenuItems(tenantId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: tenantId ? qk.superadmin.menuItems.forTenant(tenantId) : qk.superadmin.menuItems.global,
    queryFn: () => apiFetch<any>(`/api/superadmin/menu-items${tenantId ? `?tenantId=${tenantId}` : '?scope=global'}`),
    enabled,
  });
}

export function useGlobalMenuItems(enabled: boolean = true) {
  return useQuery({
    queryKey: qk.superadmin.menuItems.global,
    queryFn: () => apiFetch<any>(`/api/superadmin/menu-items?scope=global`),
    enabled,
  });
}

export function useToggleMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/superadmin/menu-items', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.superadmin.menuItems.all });
      qc.invalidateQueries({ queryKey: qk.superadmin.menuItems.global });
    },
  });
}

// Bulk update — single POST carrying the full [{key, enabled}] array.
// Use this for "Enable all" / "Hide all" / "Reset" instead of N concurrent
// PUTs (which caused a lost-update race: only a random subset persisted).
export function useBulkUpdateMenuItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tenantId?: string; scope: 'global' | 'tenant'; items: { key: string; enabled: boolean }[] }) =>
      apiFetch('/api/superadmin/menu-items', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.superadmin.menuItems.all });
      qc.invalidateQueries({ queryKey: qk.superadmin.menuItems.global });
    },
  });
}

export function useUsers(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.users(),
    // Server-side paginated endpoint. The API now returns
    // `{ data, page, limit, total, totalPages }`; `select` extracts the
    // page slice so existing consumers can keep treating the hook result
    // as an array (matches the prior `{ users: [...] }` shape they read
    // via the `Array.isArray(...) ? ... : .users` fallback). Page 1 /
    // limit 50 keeps the initial payload small; a future task can wire up
    // real pagination controls in the UsersTab UI.
    queryFn: () => apiFetch<any>('/api/admin/users?page=1&limit=50'),
    select: (res: any) => (Array.isArray(res) ? res : (res?.data ?? [])),
    enabled,
  });
}

export function useDashboardStats(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(tenantId),
    queryFn: () => apiFetch<any>(`/api/stats${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useSaasStats(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.saasStats(),
    queryFn: () => apiFetch<any>('/api/superadmin/stats'),
    enabled,
  });
}
