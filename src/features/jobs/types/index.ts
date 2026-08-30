/**
 * Job types — shared between client and server.
 *
 * This file is the single source of truth for Job-related TypeScript types.
 * Currently mirrors the inline types in jobs-view.tsx; as the view is
 * refactored, the inline types will be replaced with imports from here.
 */

export type JobStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Job {
  id: string
  title: string
  status: JobStatus
  priority?: JobPriority
  customerId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  employeeId?: string | null
  employeeName?: string | null
  scheduledAt?: string | null
  estimatedDuration?: number | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  description?: string | null
  notes?: string | null
  total?: number | null
  currency?: string | null
  deletedAt?: string | null
  completedAt?: string | null
  actualEndTime?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface JobListResponse {
  jobs: Job[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  } | null
}

export interface CreateJobInput {
  title: string
  customerId?: string | null
  employeeId?: string | null
  scheduledAt?: string | null
  estimatedDuration?: number
  address?: string
  description?: string
  priority?: JobPriority
  status?: JobStatus
}

export interface UpdateJobInput extends Partial<CreateJobInput> {
  id: string
}
