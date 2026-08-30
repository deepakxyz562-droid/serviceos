'use client';

/**
 * Calendar Tab — unified date-grouped agenda of jobs + shifts + bookings.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import { formatMinutes } from '@/lib/format-utils';
import type {
  BookingsResponse, CalendarBucket, CalendarItem, EmployeeJob, ShiftsResponse,
} from '../../types';
import {
  apiUrl, dateBucketKey, formatTime, jobStatusBadgeClass,
} from '../../utils/employee-helpers';
import { EmptyState } from '../employee-shared';

export function CalendarTab({ employeeId }: { employeeId: string }) {
  // Phase 2: merge 3 data sources into a unified date-grouped agenda.
  //   - /api/employees/[id]/jobs   → Briefcase icon, source-of-truth for
  //                                  what the employee is assigned to.
  //   - /api/employees/[id]/shifts → Clock icon, the employee's clocked-in
  //                                  shifts (today + recent).
  //   - /api/bookings?employeeId=X → Calendar icon, customer-made bookings
  // Each source fetches independently; the three results are merged and
  // bucketed by date (Today / Tomorrow / This Week / Upcoming).
  const jobsQuery = useQuery<{ employee: { id: string; name: string; status: string }; jobs: EmployeeJob[] }>({
    queryKey: ['employee-calendar-jobs', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/jobs`));
      if (!res.ok) throw new Error('Failed to load jobs');
      return res.json();
    },
  });

  const shiftsQuery = useQuery<ShiftsResponse>({
    queryKey: ['employee-calendar-shifts', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/shifts?days=30`));
      if (!res.ok) throw new Error('Failed to load shifts');
      return res.json();
    },
  });

  const bookingsQuery = useQuery<BookingsResponse>({
    queryKey: ['employee-calendar-bookings', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/bookings?employeeId=${employeeId}&limit=50`));
      if (!res.ok) throw new Error('Failed to load bookings');
      return res.json();
    },
  });

  const isLoading = jobsQuery.isLoading || shiftsQuery.isLoading || bookingsQuery.isLoading;

  // Merge into CalendarItem[], filter out past items, sort by scheduledAt asc.
  const items = useMemo<CalendarItem[]>(() => {
    const out: CalendarItem[] = [];

    for (const job of jobsQuery.data?.jobs ?? []) {
      if (job.status === 'completed' || job.status === 'cancelled') continue;
      const customerName = job.customer?.name || job.customerName || 'No customer';
      const timeStr = job.scheduledAt ? ` · ${formatTime(job.scheduledAt)}` : '';
      out.push({
        kind: 'job',
        id: job.id,
        title: job.title,
        subtitle: `${customerName}${timeStr}`,
        scheduledAt: job.scheduledAt,
        status: job.status,
      });
    }

    for (const shift of shiftsQuery.data?.recent ?? []) {
      // Only surface future or in-progress shifts on the agenda.
      if (shift.status === 'completed' && shift.clockOut) {
        const age = Date.now() - new Date(shift.clockOut).getTime();
        if (age > 24 * 60 * 60 * 1000) continue; // older than 1 day
      }
      const dateStr = shift.clockIn ? formatTime(shift.clockIn) : '';
      out.push({
        kind: 'shift',
        id: shift.id,
        title: shift.clockOut ? 'Shift (completed)' : 'Active shift',
        subtitle: `${formatMinutes(shift.totalMinutes)}${dateStr ? ` · ${dateStr}` : ''}`,
        scheduledAt: shift.clockIn,
        status: shift.status,
      });
    }

    for (const booking of bookingsQuery.data?.bookings ?? []) {
      if (booking.status === 'cancelled' || booking.status === 'completed') continue;
      const customerName = booking.customerName || 'No customer';
      const timeStr = booking.scheduledAt ? ` · ${formatTime(booking.scheduledAt)}` : '';
      out.push({
        kind: 'booking',
        id: booking.id,
        title: booking.title,
        subtitle: `${customerName}${timeStr}`,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
      });
    }

    // Sort: scheduled (asc by time) first, unscheduled last.
    out.sort((a, b) => {
      const aT = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bT = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aT - bT;
    });
    return out;
  }, [jobsQuery.data, shiftsQuery.data, bookingsQuery.data]);

  // Bucket by Today / Tomorrow / This Week / Upcoming / Unscheduled.
  // Past items are filtered out.
  const buckets = useMemo<{ key: CalendarBucket; label: string; items: CalendarItem[] }[]>(() => {
    const order: CalendarBucket[] = ['Today', 'Tomorrow', 'This Week', 'Upcoming', 'Unscheduled'];
    const map = new Map<CalendarBucket, CalendarItem[]>();
    for (const item of items) {
      const key = dateBucketKey(item.scheduledAt);
      if (key === 'Past') continue;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ key: k, label: k, items: map.get(k)! }));
  }, [items]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No scheduled items"
        description="This employee has no upcoming jobs, shifts, or bookings. Assign a job or schedule a shift to see it appear on the calendar."
      />
    );
  }

  return (
    <div className="space-y-4">
      {buckets.map(({ key, label, items: bucketItems }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-emerald-600" /> {label}
            </CardTitle>
            <CardDescription className="text-xs">
              {bucketItems.length} item{bucketItems.length === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bucketItems.map((item) => (
              <CalendarItemRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CalendarItemRow({ item }: { item: CalendarItem }) {
  const Icon = item.kind === 'job' ? Briefcase : item.kind === 'shift' ? Clock : Calendar;
  const iconColor =
    item.kind === 'job'
      ? 'text-emerald-600'
      : item.kind === 'shift'
      ? 'text-blue-600'
      : 'text-purple-600';
  const iconBg =
    item.kind === 'job'
      ? 'bg-emerald-50 dark:bg-emerald-950/30'
      : item.kind === 'shift'
      ? 'bg-blue-50 dark:bg-blue-950/30'
      : 'bg-purple-50 dark:bg-purple-950/30';
  const kindLabel =
    item.kind === 'job' ? 'Job' : item.kind === 'shift' ? 'Shift' : 'Booking';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
      <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('size-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-[9px] uppercase tracking-wide">{kindLabel}</Badge>
        <Badge variant="outline" className={cn('text-[10px] capitalize', jobStatusBadgeClass(item.status))}>
          {item.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  );
}
