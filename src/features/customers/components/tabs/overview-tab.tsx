'use client';

/**
 * OverviewTab — "Last 30 days" summary row, grouped timeline preview,
 * and a 3-row "Recent Jobs" quick view.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Pure presentational component. The parent owns:
 *   • `customer360Loading` — used to swap the timeline body for a skeleton.
 *   • `timelineEvents`, `jobs`, `invoices`, `conversations` — the 4 data
 *     slices shown in the "Last 30 days" row.
 *   • `groupedTimeline` — pre-grouped event buckets (Today / Yesterday /
 *     This Week / Earlier) computed via `groupTimelineEvents`.
 *   • `format` — the company currency formatter.
 */

import { Clock, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  formatDate,
  jobStatusConfig,
} from '../../utils/customer-helpers';
import type { CurrencyFormatFn, TimelineGroupData } from '../../types';
import { TimelineGroup } from '../timeline-group';

interface OverviewTabProps {
  customer360Loading: boolean;
  timelineEvents: any[];
  jobs: any[];
  invoices: any[];
  conversations: any[];
  groupedTimeline: TimelineGroupData[];
  format: CurrencyFormatFn;
}

export function OverviewTab({
  customer360Loading,
  timelineEvents,
  jobs,
  invoices,
  conversations,
  groupedTimeline,
  format,
}: OverviewTabProps) {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const events30d = timelineEvents.filter(e => {
    if (!e.createdAt) return false;
    return Date.now() - new Date(e.createdAt).getTime() < THIRTY_DAYS_MS;
  }).length;

  const newJobs30d = jobs.filter(j => {
    if (!j.createdAt) return false;
    return Date.now() - new Date(j.createdAt).getTime() < THIRTY_DAYS_MS;
  }).length;

  const revenue30d = invoices
    .filter(i => {
      if (!i.paidAt) return false;
      return (
        Date.now() - new Date(i.paidAt).getTime() < THIRTY_DAYS_MS && i.status === 'paid'
      );
    })
    .reduce((s, i) => s + (i.total || 0), 0);

  const conversations30d = conversations.filter(c => {
    if (!c.lastMessageAt) return false;
    return Date.now() - new Date(c.lastMessageAt).getTime() < THIRTY_DAYS_MS;
  }).length;

  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5 space-y-6">
        {/* Last 30 Days Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
            <p className="text-lg font-extrabold text-foreground mt-1">{events30d}</p>
            <p className="text-[10px] text-muted-foreground">Events</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
            <p className="text-lg font-extrabold text-foreground mt-1">{newJobs30d}</p>
            <p className="text-[10px] text-muted-foreground">New Jobs</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
            <p className="text-lg font-extrabold text-emerald-500 mt-1">{format(revenue30d)}</p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
            <p className="text-lg font-extrabold text-foreground mt-1">{conversations30d}</p>
            <p className="text-[10px] text-muted-foreground">Conversations</p>
          </div>
        </div>

        {/* Timeline */}
        {customer360Loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedTimeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="size-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground">No activity yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Activity timeline will populate as the customer interacts
            </p>
          </div>
        ) : (
          groupedTimeline.map(group => (
            <TimelineGroup
              key={group.label}
              label={group.label}
              events={group.events}
            />
          ))
        )}

        {/* Recent Jobs Quick View */}
        {jobs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Jobs
            </h4>
            <div className="space-y-2">
              {jobs.slice(0, 3).map(job => {
                const statusCfg = jobStatusConfig[job.status] || jobStatusConfig.pending;
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Wrench className="size-3.5 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.title || job.service || 'Service'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.assigneeName || 'Unassigned'} &middot;{' '}
                          {formatDate(job.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] shrink-0 rounded-md',
                        statusCfg.bg,
                        statusCfg.color
                      )}
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
