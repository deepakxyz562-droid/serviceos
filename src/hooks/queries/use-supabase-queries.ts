/**
 * Supabase Query Hooks — TanStack Query + Supabase
 * 
 * All data fetching goes through these hooks.
 * Uses the backend API routes which use the Supabase adapter.
 * No direct Supabase client calls from the frontend.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Generic fetcher ────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

// ─── Query Key Factory ──────────────────────────────────────────────────────

export const queryKeys = {
  // CRM
  leads: (tenantId?: string) => ['leads', tenantId] as const,
  lead: (id: string) => ['leads', id] as const,
  contacts: (tenantId?: string) => ['contacts', tenantId] as const,
  customers: (tenantId?: string) => ['customers', tenantId] as const,
  customer: (id: string) => ['customers', id] as const,
  customer360: (id: string) => ['customer360', id] as const,
  pipeline: (tenantId?: string) => ['pipeline', tenantId] as const,

  // Communication
  conversations: (tenantId?: string) => ['conversations', tenantId] as const,
  conversation: (id: string) => ['conversation', id] as const,
  inboxMessages: (conversationId: string) => ['inboxMessages', conversationId] as const,
  campaigns: (tenantId?: string) => ['campaigns', tenantId] as const,
  broadcast: (tenantId?: string) => ['broadcast', tenantId] as const,
  templates: (tenantId?: string) => ['templates', tenantId] as const,
  channelConfigs: (tenantId?: string) => ['channelConfigs', tenantId] as const,

  // Automation
  workflows: (tenantId?: string) => ['workflows', tenantId] as const,
  workflow: (id: string) => ['workflows', id] as const,
  triggers: (tenantId?: string) => ['triggers', tenantId] as const,
  variables: (tenantId?: string) => ['variables', tenantId] as const,
  executions: (tenantId?: string) => ['executions', tenantId] as const,
  forms: (tenantId?: string) => ['forms', tenantId] as const,
  formResponses: (formId: string) => ['formResponses', formId] as const,

  // Operations
  jobs: (tenantId?: string) => ['jobs', tenantId] as const,
  job: (id: string) => ['jobs', id] as const,
  bookings: (tenantId?: string) => ['bookings', tenantId] as const,
  employees: (tenantId?: string) => ['employees', tenantId] as const,
  employee: (id: string) => ['employees', id] as const,
  dispatch: (tenantId?: string) => ['dispatch', tenantId] as const,

  // Finance
  quotes: (tenantId?: string) => ['quotes', tenantId] as const,
  quote: (id: string) => ['quotes', id] as const,
  invoices: (tenantId?: string) => ['invoices', tenantId] as const,
  invoice: (id: string) => ['invoices', id] as const,
  billing: (tenantId?: string) => ['billing', tenantId] as const,

  // System
  credentials: (tenantId?: string) => ['credentials', tenantId] as const,
  auditLogs: (tenantId?: string) => ['auditLogs', tenantId] as const,
  reports: (tenantId?: string) => ['reports', tenantId] as const,
  settings: (tenantId?: string) => ['settings', tenantId] as const,

  // Super Admin
  saasStats: () => ['saasStats'] as const,
  tenants: () => ['tenants'] as const,
  tenant: (id: string) => ['tenants', id] as const,
  subscriptions: () => ['subscriptions'] as const,
  subscription: (id: string) => ['subscriptions', id] as const,
  featureFlags: (tenantId?: string) => ['featureFlags', tenantId] as const,
  menuItems: (tenantId: string) => ['menuItems', tenantId] as const,
  users: () => ['users'] as const,

  // Dashboard
  dashboardStats: (tenantId?: string) => ['dashboardStats', tenantId] as const,
};

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_: any, vars: any) => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: queryKeys.lead(vars.id) }); },
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
    queryFn: () => apiFetch<any[]>(`/api/customers${tenantId ? `?tenantId=${tenantId}` : ''}`),
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
      const [customer, jobs, invoices, conversations, timeline] = await Promise.allSettled([
        apiFetch<any>(`/api/customers/${customerId}`),
        apiFetch<any[]>(`/api/jobs?customerId=${customerId}`),
        apiFetch<any>(`/api/invoices?customerId=${customerId}`),
        apiFetch<any>(`/api/conversations?customerId=${customerId}`),
        apiFetch<any>(`/api/timeline-events?customerId=${customerId}`),
      ]);
      return {
        customer: customer.status === 'fulfilled' ? customer.value : null,
        jobs: jobs.status === 'fulfilled'
          ? (Array.isArray(jobs.value) ? jobs.value : [])
          : [],
        invoices: invoices.status === 'fulfilled'
          ? (Array.isArray(invoices.value) ? invoices.value : invoices.value?.invoices || [])
          : [],
        conversations: conversations.status === 'fulfilled'
          ? (Array.isArray(conversations.value) ? conversations.value : conversations.value?.conversations || [])
          : [],
        timeline: timeline.status === 'fulfilled'
          ? (Array.isArray(timeline.value) ? timeline.value : timeline.value?.data || [])
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_: any, vars: any) => { qc.invalidateQueries({ queryKey: ['jobs'] }); qc.invalidateQueries({ queryKey: queryKeys.job(vars.id) }); },
  });
}

export function useBookings(customerId?: string) {
  return useQuery({
    queryKey: ['bookings', customerId],
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); },
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
    queryKey: ['workflowAutomations', tenantId],
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

export function useTenants() {
  return useQuery({
    queryKey: queryKeys.tenants(),
    queryFn: () => apiFetch<any[]>('/api/tenants'),
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.tenant(id),
    queryFn: () => apiFetch<any>(`/api/tenants/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_: any, vars: any) => { qc.invalidateQueries({ queryKey: ['tenants'] }); qc.invalidateQueries({ queryKey: queryKeys.tenant(vars.id) }); },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/tenants', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); },
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions(),
    queryFn: () => apiFetch<any[]>('/api/subscriptions'),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); },
  });
}

export function usePauseSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'paused', pauseReason: reason, pausedAt: new Date().toISOString() }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); },
  });
}

export function useFeatureFlags(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.featureFlags(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/superadmin/feature-flags${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/superadmin/feature-flags', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['featureFlags'] }); qc.invalidateQueries({ queryKey: ['menuItems'] }); },
  });
}

export function useMenuItems(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.menuItems(tenantId),
    queryFn: () => apiFetch<any[]>(`/api/superadmin/menu-items?tenantId=${tenantId}`),
    enabled: !!tenantId,
  });
}

export function useToggleMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch('/api/superadmin/menu-items', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menuItems'] }); },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => apiFetch<any[]>('/api/users'),
  });
}

export function useDashboardStats(tenantId?: string) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(tenantId),
    queryFn: () => apiFetch<any>(`/api/stats${tenantId ? `?tenantId=${tenantId}` : ''}`),
  });
}

export function useSaasStats() {
  return useQuery({
    queryKey: queryKeys.saasStats(),
    queryFn: () => apiFetch<any>('/api/saas-stats'),
  });
}
