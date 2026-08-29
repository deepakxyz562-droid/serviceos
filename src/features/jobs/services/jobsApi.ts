import { apiFetch } from '@/lib/api/client';
import { PaginatedResponse } from '@/lib/api/pagination';

export interface JobItem {
  id: string;
  title: string;
  jobNumber?: string | null;
  status: string;
  priority?: string | null;
  type?: string | null;
  scheduledAt?: string | null;
  customerName?: string | null;
  assigneeName?: string | null;
  address?: string | null;
  createdAt: string;
}

export interface GetJobsOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchJobs(options?: GetJobsOptions): Promise<PaginatedResponse<JobItem>> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.pageSize) params.set('limit', String(options.pageSize));
  if (options?.status) params.set('status', options.status);
  if (options?.search) params.set('search', options.search);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const url = `/api/jobs${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await apiFetch<any>(url);

  const data: JobItem[] = res.jobs || res.data || (Array.isArray(res) ? res : []);
  const pagination = res.pagination || {
    page: options?.page || 1,
    pageSize: options?.pageSize || 20,
    total: data.length,
    totalPages: Math.ceil(data.length / (options?.pageSize || 20)) || 1,
  };

  return {
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.limit || pagination.pageSize || 20,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || 1,
      hasNextPage: pagination.page < (pagination.totalPages || 1),
      hasPrevPage: pagination.page > 1,
    },
  };
}
