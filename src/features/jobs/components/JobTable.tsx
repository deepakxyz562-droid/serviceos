"use client";

import React from 'react';
import { DataTable, ColumnDef } from '@/components/primitives/data-table/data-table';
import { JobItem } from '../services/jobsApi';
import { Badge } from '@/components/ui/badge';
import { PaginationMeta } from '@/lib/api/pagination';

interface JobTableProps {
  jobs: JobItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSelectJob?: (job: JobItem) => void;
}

export function JobTable({
  jobs,
  loading = false,
  error = null,
  onRetry,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSelectJob,
}: JobTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25">In Progress</Badge>;
      case 'travelling':
        return <Badge className="bg-purple-500/15 text-purple-700 hover:bg-purple-500/25">Travelling</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  const columns: ColumnDef<JobItem>[] = [
    {
      key: 'jobNumber',
      header: 'Job #',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.jobNumber || row.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title & Address',
      cell: (row) => (
        <div className="flex flex-col min-w-0 max-w-xs cursor-pointer" onClick={() => onSelectJob?.(row)}>
          <span className="text-sm font-medium text-foreground hover:underline truncate">
            {row.title}
          </span>
          {row.address && (
            <span className="text-xs text-muted-foreground truncate">{row.address}</span>
          )}
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      cell: (row) => (
        <span className="text-sm text-foreground">{row.customerName || 'Unassigned'}</span>
      ),
    },
    {
      key: 'assigneeName',
      header: 'Assigned Worker',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.assigneeName || 'Unassigned'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      key: 'scheduledAt',
      header: 'Scheduled Date',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.scheduledAt ? new Date(row.scheduledAt).toLocaleDateString() : 'Unscheduled'}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={jobs}
      loading={loading}
      error={error}
      onRetry={onRetry}
      pagination={pagination}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyMessage="No jobs found."
    />
  );
}
