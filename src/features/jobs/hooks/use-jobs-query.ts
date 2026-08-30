/**
 * useJobsQuery — React Query hook for the Jobs feature.
 *
 * NOTE: This hook currently has ZERO external callers. The canonical jobs
 * hook is `useJobs` in `@/hooks/use-crm-data.ts` (used by jobs-view.tsx and
 * operations-view.tsx). This file is kept for the planned jobs-view.tsx
 * migration (Phase 1.8g) and will become the canonical hook once the service
 * layer (`jobService`) is fully wired into the view.
 *
 * Architecture:
 *   Component → useJobsQuery (this) → jobService.list → /api/jobs → DB
 *
 * Usage:
 *   const { data, isLoading, error, refetch } = useJobsQuery({ status: 'pending' })
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobService, type JobListParams } from '../services/job-service'
import { qk } from '@/lib/query-keys'
import type { CreateJobInput, UpdateJobInput } from '../types'

export function useJobsQuery(params: JobListParams = {}) {
  return useQuery({
    queryKey: qk.jobs.list(params),
    queryFn: () => jobService.list(params),
    staleTime: 30_000, // 30s — jobs change frequently
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateJobInput) => jobService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.jobs.all })
    },
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateJobInput) => jobService.update(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qk.jobs.all })
      // FIX: was ['job', data.id] (singular) — no query registered that key.
      // The canonical detail key is qk.jobs.detail(id) (plural, hierarchical).
      queryClient.invalidateQueries({ queryKey: qk.jobs.detail(data.id) })
    },
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jobService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.jobs.all })
    },
  })
}
