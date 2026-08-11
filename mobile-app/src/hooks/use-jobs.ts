/**
 * use-jobs — TanStack Query hooks for employee jobs (rewrite).
 *
 * Hooks cover the full PWA employee-portal job surface:
 *   - Lists: useEmployeeJobs(filter)
 *   - Detail: useJob(id)
 *   - Lifecycle: useJobLifecycle() — accept|start_travel|arrive|start_work|pause|resume|complete
 *   - Update: useUpdateJob() — PUT notes / internalNotes / lineItems
 *   - Photos: useJobPhotos / useUploadJobPhoto / useDeleteJobPhoto
 *   - Checklist: useJobChecklist / useToggleChecklistItem
 *   - Signatures: useJobSignatures / useUploadSignature
 *   - Expenses: useJobExpenses / useAddJobExpense / useDeleteJobExpense
 *   - Visits: useJobVisits
 *   - Time entries: useJobTimeEntries / useStartTimeEntry / useStopTimeEntry
 *   - Completion proof: useCompleteProof()
 *
 * Query keys:
 *   - ['jobs', 'employee', filter]   — employee job list
 *   - ['job', id]                    — single job detail (note: singular "job")
 *
 * Mutations invalidate the relevant queries automatically.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Job,
  JobPhoto,
  JobSignature,
  ChecklistItem,
  JobExpense,
  ScheduledVisit,
  TimeEntry,
} from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Normalise a response that may be a bare array or { data: [...] } / { items: [...] }. */
function asArray<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object') {
    const obj = r as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.jobs)) return obj.jobs as T[];
  }
  return [];
}

/** Normalise a response that may be the entity directly or wrapped: { job } | { data }. */
function unwrap<T>(r: unknown, key?: string): T {
  if (r && typeof r === 'object') {
    const obj = r as Record<string, unknown>;
    if (key && key in obj) return obj[key] as T;
    if ('data' in obj) return obj.data as T;
    if ('job' in obj) return obj.job as T;
  }
  return r as T;
}

// ── Jobs list / detail ──────────────────────────────────────────────

const JOBS_PAGE_SIZE = 50;

export function useEmployeeJobs(filter: 'all' | 'today' | 'scheduled' = 'all') {
  return useQuery({
    queryKey: ['jobs', 'employee', filter],
    queryFn: async () => {
      // FIX: Use pagination (?limit=50) to avoid fetching ALL jobs at once.
      // The backend now supports ?limit=&offset= params. We fetch the first
      // page here; useLoadMoreJobs() below handles loading additional pages.
      const r = await api.get<unknown>('/api/employee/jobs', {
        filter,
        limit: JOBS_PAGE_SIZE,
        offset: 0,
      });
      return asArray<Job>(r);
    },
  });
}

/**
 * Load additional pages of employee jobs (infinite-scroll / "Load More").
 * Uses the same query key prefix so the first page is shared.
 */
export function useLoadMoreJobs(filter: 'all' | 'today' | 'scheduled' = 'all') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ offset }: { offset: number }) => {
      const r = await api.get<unknown>('/api/employee/jobs', {
        filter,
        limit: JOBS_PAGE_SIZE,
        offset,
      });
      return asArray<Job>(r);
    },
    onSuccess: (newJobs, vars) => {
      // Append the new page to the existing cached list
      qc.setQueryData(['jobs', 'employee', filter], (old: unknown) => {
        const oldList = Array.isArray(old) ? old : [];
        return [...oldList, ...newJobs];
      });
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const r = await api.get<unknown>(`/api/jobs/${id}`);
      return unwrap<Job>(r, 'job');
    },
    enabled: !!id,
  });
}

// Legacy alias so existing callers keep working.
export const useJobDetail = useJob;
export const useMyJobs = (filter: 'all' | 'today' = 'all') => useEmployeeJobs(filter);

// ── Lifecycle ───────────────────────────────────────────────────────

export function useJobLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      pin,
      latitude,
      longitude,
    }: {
      id: string;
      action: string;
      pin?: string;
      // Optional GPS coords captured at the moment of the lifecycle
      // transition (PWA's captureOnce equivalent). Only forwarded for
      // start_travel / arrive / complete — but the hook itself accepts
      // them for any action; callers decide what to attach.
      latitude?: number;
      longitude?: number;
    }) =>
      api.post<{ job?: Job; id?: string; status?: string; lifecycleState?: string }>(
        `/api/employee/jobs/${id}/lifecycle`,
        {
          action,
          ...(pin !== undefined ? { pin } : {}),
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
        }
      ),
    onSuccess: (data, vars) => {
      // FIX: Use the mutation response to update the job detail cache
      // INSTANTLY — don't wait for a refetch. The backend response
      // includes { job: updatedJob } with the new status. We patch the
      // cached job with the returned data so the UI (footer buttons,
      // badges) updates immediately.
      if (data?.job) {
        const updatedJob = data.job as Job;
        qc.setQueryData(['job', vars.id], (old: unknown) => {
          if (!old || typeof old !== 'object') return updatedJob;
          return { ...(old as object), ...updatedJob };
        });
      }
      // Still invalidate to trigger a background refetch for the freshest
      // data (lifecycleTimestamps, _counts, etc. which may not be in the
      // mutation response). But the UI is already updated from setQueryData.
      qc.invalidateQueries({ queryKey: ['job', vars.id] });
      qc.invalidateQueries({ queryKey: ['jobs', 'employee'] });
    },
  });
}

// ── Job update (notes / internalNotes / lineItems) ──────────────────

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      notes,
      internalNotes,
      lineItems,
    }: {
      id: string;
      notes?: string | null;
      internalNotes?: string | null;
      lineItems?: unknown;
    }) => api.put<Job>(`/api/jobs/${id}`, { notes, internalNotes, lineItems }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.id] });
      qc.invalidateQueries({ queryKey: ['jobs', 'employee'] });
    },
  });
}

// ── Photos ──────────────────────────────────────────────────────────

export function useJobPhotos(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId, 'photos'],
    queryFn: async () => {
      const r = await api.get<unknown>(`/api/jobs/${jobId}/photos`);
      return asArray<JobPhoto>(r);
    },
    enabled: !!jobId,
  });
}

export function useUploadJobPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      formData,
    }: {
      id: string;
      formData: FormData;
    }) => api.post<JobPhoto>(`/api/jobs/${id}/photos`, formData, { formData: true }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.id] });
      qc.invalidateQueries({ queryKey: ['job', vars.id, 'photos'] });
      qc.invalidateQueries({ queryKey: ['jobs', 'employee'] });
    },
  });
}

export function useDeleteJobPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, photoId }: { jobId: string; photoId: string }) =>
      api.delete(`/api/jobs/${jobId}/photos/${photoId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] });
      qc.invalidateQueries({ queryKey: ['job', vars.jobId, 'photos'] });
    },
  });
}

// ── Checklist ───────────────────────────────────────────────────────

export function useJobChecklist(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId, 'checklist'],
    queryFn: async () => {
      const r = await api.get<unknown>(`/api/jobs/${jobId}/checklist`);
      return asArray<ChecklistItem>(r);
    },
    enabled: !!jobId,
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      itemId,
      completed,
      notes,
    }: {
      jobId: string;
      itemId: string;
      completed: boolean;
      notes?: string | null;
    }) =>
      api.patch<ChecklistItem>(`/api/jobs/${jobId}/checklist/item/${itemId}`, {
        completed,
        ...(notes !== undefined ? { notes } : {}),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] });
      qc.invalidateQueries({ queryKey: ['job', vars.jobId, 'checklist'] });
    },
  });
}

// ── Signatures ──────────────────────────────────────────────────────

export function useJobSignatures(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId, 'signatures'],
    queryFn: async () => {
      const r = await api.get<unknown>(`/api/jobs/${jobId}/signatures`);
      return asArray<JobSignature>(r);
    },
    enabled: !!jobId,
  });
}

export function useUploadSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      formData,
    }: {
      id: string;
      formData: FormData;
    }) => api.post<JobSignature>(`/api/jobs/${id}/signatures`, formData, { formData: true }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.id] });
      qc.invalidateQueries({ queryKey: ['job', vars.id, 'signatures'] });
    },
  });
}

// Legacy alias (kept for callers using the old name/shape).
export const useSaveSignature = useUploadSignature;

// ── Expenses ────────────────────────────────────────────────────────

export function useJobExpenses(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId, 'expenses'],
    queryFn: async () => {
      const r = await api.get<unknown>(`/api/jobs/${jobId}/expenses`);
      return asArray<JobExpense>(r);
    },
    enabled: !!jobId,
  });
}

export function useAddJobExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      description,
      amount,
      category,
      receiptFormData,
    }: {
      jobId: string;
      description: string;
      amount: number;
      category?: string | null;
      receiptFormData?: FormData | null;
    }) => {
      if (receiptFormData) {
        // Append metadata fields to the existing FormData.
        receiptFormData.append('description', description);
        receiptFormData.append('amount', String(amount));
        if (category) receiptFormData.append('category', category);
        return api.post<JobExpense>(
          `/api/jobs/${jobId}/expenses`,
          receiptFormData,
          { formData: true }
        );
      }
      return api.post<JobExpense>(`/api/jobs/${jobId}/expenses`, {
        description,
        amount,
        category,
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] });
      qc.invalidateQueries({ queryKey: ['job', vars.jobId, 'expenses'] });
    },
  });
}

export function useDeleteJobExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, expenseId }: { jobId: string; expenseId: string }) =>
      api.delete(`/api/jobs/${jobId}/expenses/${expenseId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] });
      qc.invalidateQueries({ queryKey: ['job', vars.jobId, 'expenses'] });
    },
  });
}

// ── Visits ──────────────────────────────────────────────────────────

export function useJobVisits(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId, 'visits'],
    queryFn: async () => {
      const r = await api.get<unknown>(`/api/jobs/${jobId}/visits`);
      return asArray<ScheduledVisit>(r);
    },
    enabled: !!jobId,
  });
}

// ── Time Entries ────────────────────────────────────────────────────

export function useJobTimeEntries(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId, 'time-entries'],
    queryFn: async () => {
      const r = await api.get<unknown>(`/api/jobs/${jobId}/time-entries`);
      return asArray<TimeEntry>(r);
    },
    enabled: !!jobId,
  });
}

export function useStartTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, type }: { jobId: string; type?: string }) =>
      api.post<TimeEntry>(`/api/jobs/${jobId}/time-entries`, {
        startTime: new Date().toISOString(),
        ...(type ? { type } : {}),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] });
      qc.invalidateQueries({ queryKey: ['job', vars.jobId, 'time-entries'] });
    },
  });
}

export function useStopTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, entryId }: { jobId: string; entryId: string }) =>
      api.patch<TimeEntry>(`/api/jobs/${jobId}/time-entries/${entryId}`, {
        endTime: new Date().toISOString(),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] });
      qc.invalidateQueries({ queryKey: ['job', vars.jobId, 'time-entries'] });
    },
  });
}

// ── Completion proof ────────────────────────────────────────────────

export function useCompleteProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      payload,
    }: {
      jobId: string;
      payload: {
        photos?: string[];
        signature?: string;
        notes?: string;
        customerName?: string;
      };
    }) => api.post<{ ok?: boolean }>(`/api/jobs/${jobId}/complete-proof`, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] });
      qc.invalidateQueries({ queryKey: ['jobs', 'employee'] });
    },
  });
}
