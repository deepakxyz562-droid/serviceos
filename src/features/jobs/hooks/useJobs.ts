"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchJobs, JobItem, GetJobsOptions } from '../services/jobsApi';
import { PaginationMeta } from '@/lib/api/pagination';

export function useJobs(initialOptions?: GetJobsOptions) {
  const [data, setData] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialOptions?.page || 1);
  const [pageSize, setPageSize] = useState(initialOptions?.pageSize || 20);
  const [status, setStatus] = useState(initialOptions?.status || '');
  const [search, setSearch] = useState(initialOptions?.search || '');
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJobs({ page, pageSize, status, search });
      setData(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, search]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    jobs: data,
    loading,
    error,
    pagination,
    page,
    pageSize,
    status,
    search,
    setPage,
    setPageSize,
    setStatus,
    setSearch,
    refresh: loadJobs,
  };
}
