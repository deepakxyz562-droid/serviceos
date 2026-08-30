'use client';

/**
 * JobsTab — summary stats + status filter + filtered jobs list.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Pure presentational component. The parent owns:
 *   • `jobs`, `customer360Loading` — the data slice + loading flag.
 *   • `jobStatusFilter`, `setJobStatusFilter` — the active status filter.
 *   • `filteredJobs` — the pre-filtered list (computed in the parent via
 *     `useMemo` so the count "Showing X of Y" stays in sync with the
 *     filter button state).
 */

import { Wrench, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDate, jobStatusConfig } from '../../utils/customer-helpers';

interface JobsTabProps {
  jobs: any[];
  filteredJobs: any[];
  jobStatusFilter: string;
  setJobStatusFilter: (v: string) => void;
  customer360Loading: boolean;
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

export function JobsTab({
  jobs,
  filteredJobs,
  jobStatusFilter,
  setJobStatusFilter,
  customer360Loading,
}: JobsTabProps) {
  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5 space-y-4">
        {customer360Loading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wrench className="size-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground">No jobs yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Jobs assigned to this customer will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Jobs Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Jobs</p>
                <p className="text-lg font-extrabold text-foreground mt-1">{jobs.length}</p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border shadow-sm border-t-2 border-t-emerald-500">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Completed</p>
                <p className="text-lg font-extrabold text-emerald-500 mt-1">
                  {jobs.filter(j => j.status === 'completed').length}
                </p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border shadow-sm border-t-2 border-t-amber-500">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">In Progress</p>
                <p className="text-lg font-extrabold text-amber-500 mt-1">
                  {jobs.filter(j => j.status === 'in_progress').length}
                </p>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border shadow-sm border-t-2 border-t-red-500">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Cancelled</p>
                <p className="text-lg font-extrabold text-red-500 mt-1">
                  {jobs.filter(j => j.status === 'cancelled').length}
                </p>
              </div>
            </div>

            {/* Filter + count row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 flex-wrap">
                {FILTER_OPTIONS.map(opt => (
                  <Button
                    key={opt.key}
                    size="sm"
                    variant={jobStatusFilter === opt.key ? 'default' : 'ghost'}
                    className={cn(
                      'h-7 text-xs px-2.5 rounded-md transition-all duration-200',
                      jobStatusFilter === opt.key
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setJobStatusFilter(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredJobs.length} of {jobs.length} jobs
              </p>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No jobs match this filter</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try selecting a different status filter
                </p>
              </div>
            ) : (
              filteredJobs.map(job => {
                const statusCfg =
                  jobStatusConfig[job.status] || jobStatusConfig.pending;
                // Compute a fake progress for in_progress jobs
                const progressPct = job.status === 'completed' ? 100
                  : job.status === 'in_progress' ? (job.progress ?? 55)
                  : job.status === 'cancelled' ? 0
                  : 0;
                return (
                  <div
                    key={job.id}
                    className="p-4 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'size-10 rounded-full flex items-center justify-center shrink-0',
                            job.status === 'completed'
                              ? 'bg-emerald-500/10'
                              : job.status === 'in_progress'
                                ? 'bg-amber-500/10'
                                : job.status === 'cancelled'
                                  ? 'bg-red-500/10'
                                  : 'bg-muted/50'
                          )}
                        >
                          <Wrench
                            className={cn(
                              'size-4',
                              job.status === 'completed'
                                ? 'text-emerald-500'
                                : job.status === 'in_progress'
                                  ? 'text-amber-500'
                                  : job.status === 'cancelled'
                                    ? 'text-red-500'
                                    : 'text-muted-foreground'
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {job.title || job.service || 'Service'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {job.assigneeName || 'Unassigned'} &middot;{' '}
                            {formatDate(job.createdAt)}
                          </p>
                          {job.address && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <MapPin className="size-2.5" /> {job.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.scheduledAt && (
                          <span className="text-[11px] text-muted-foreground hidden sm:block">
                            {formatDate(job.scheduledAt)}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] rounded-md',
                            statusCfg.bg,
                            statusCfg.color
                          )}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </div>
                    {/* Mini progress bar for in-progress jobs */}
                    {job.status === 'in_progress' && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Progress</span>
                          <span className="text-[10px] font-semibold text-amber-500">{progressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
