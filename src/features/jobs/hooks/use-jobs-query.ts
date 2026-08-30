/**
 * useJobsQuery — React Query hook for the Jobs feature.
 *
 * This is the feature-specific hook that wraps jobService (the service layer)
 * with React Query (the cache/dedup layer). It replaces the inline
 * `useState + useEffect + fetch` pattern in jobs-view.tsx.
 *
 * Architecture:
 *   Component → useJobsQuery (this) → jobService.list → /api/jobs → DB
 *
 * Usage:
 *   const { data, isLoading, error, refetch } = useJobsQuery({ status: 'pending' })
 *
 * Migration path for jobs-view.tsx:
 *   1. Replace fetchJobs() with this hook (the list rendering stays the same)
 *   2. Add useCreateJob() for the create form
 *   3. Add useUpdateJob() for the edit form
 *   4. Extract JobTable, JobForm, JobFilters into separate components
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobService, type JobListParams } from '../services/job-service'
import type { CreateJobInput, UpdateJobInput } from '../types'

export function useJobsQuery(params: JobListParams = {}) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => jobService.list(params),
    staleTime: 30_000, // 30s — jobs change frequently
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateJobInput) => jobService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateJobInput) => jobService.update(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job', data.id] })
    },
  })
}

export function useDeleteJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jobService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
