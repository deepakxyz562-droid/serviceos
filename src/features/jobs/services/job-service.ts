/**
 * jobService — API layer for Job CRUD operations.
 *
 * This is the service layer in the architecture:
 *   UI → Hook → Service → API → Validation → Business Logic → DB
 *
 * As jobs-view.tsx (5,962 lines) is incrementally refactored, raw fetch()
 * calls will be replaced with jobService method calls. This centralizes:
 *   - URL construction
 *   - Error handling
 *   - Response parsing
 *   - Type safety
 *
 * Usage from a hook:
 *   import { jobService } from '@/features/jobs/services/job-service'
 *   const jobs = await jobService.list({ status: 'pending' })
 *
 * Usage from a component (via hook):
 *   const { data, isLoading } = useJobs({ status: 'pending' })
 *   // useJobs internally calls jobService.list
 */

import { authFetch } from '@/lib/api'
import type { Job, JobListResponse, CreateJobInput, UpdateJobInput } from '../types'

export interface JobListParams {
  status?: string
  search?: string
  page?: number
  limit?: number
  includeDeleted?: boolean
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const jobService = {
  /** List jobs with optional filters */
  async list(params: JobListParams = {}): Promise<JobListResponse> {
    const searchParams = new URLSearchParams()
    if (params.status && params.status !== 'all') {
      searchParams.set('status', params.status)
    }
    if (params.search) searchParams.set('search', params.search)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    searchParams.set('includeDeleted', String(params.includeDeleted ?? false))

    const res = await authFetch(`/api/jobs?${searchParams.toString()}`)
    const data = await parseResponse<JobListResponse | Job[]>(res)

    if (Array.isArray(data)) {
      return { jobs: data, pagination: null }
    }
    return data
  },

  /** Get a single job by ID */
  async getById(id: string): Promise<Job> {
    const res = await authFetch(`/api/jobs/${id}`)
    return parseResponse<Job>(res)
  },

  /** Create a new job */
  async create(input: CreateJobInput): Promise<Job> {
    const res = await authFetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return parseResponse<Job>(res)
  },

  /** Update an existing job */
  async update(input: UpdateJobInput): Promise<Job> {
    const { id, ...body } = input
    const res = await authFetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return parseResponse<Job>(res)
  },

  /** Delete a job (soft delete) */
  async delete(id: string): Promise<void> {
    const res = await authFetch(`/api/jobs/${id}`, { method: 'DELETE' })
    await parseResponse(res)
  },

  /** Update job status */
  async updateStatus(id: string, status: string): Promise<Job> {
    const res = await authFetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    return parseResponse<Job>(res)
  },
}
