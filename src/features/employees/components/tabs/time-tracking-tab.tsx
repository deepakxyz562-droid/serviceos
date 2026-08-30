'use client';

/**
 * Time Tracking Tab — today's shift + recent shifts (last 7 days).
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import type { ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, CalendarCheck, PlayCircle, Coffee, StopCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authFetch } from '@/lib/client-auth';
import { formatDate, formatMinutes } from '@/lib/format-utils';
import type { ShiftsResponse } from '../../types';
import { apiUrl, formatTime } from '../../utils/employee-helpers';

interface TimelineEntry {
  time: string;
  label: string;
  icon: ElementType;
  color: string;
}

export function TimeTrackingTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery<ShiftsResponse>({
    queryKey: ['employee-shifts', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/shifts?days=7`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = data?.today;
  const totals = data?.todayTotals;
  const recent = data?.recent ?? [];

  // Build today's timeline entries from clockIn, breaks, clockOut
  const timeline: TimelineEntry[] = [];
  if (today) {
    timeline.push({
      time: formatTime(today.clockIn),
      label: 'Check In',
      icon: PlayCircle,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    });
    if (totals && Array.isArray(totals.breaks)) {
      totals.breaks.forEach((b, idx) => {
        if (b.start) {
          timeline.push({
            time: formatTime(b.start),
            label: b.reason === 'lunch' ? 'Lunch Break' : `Break ${idx + 1}`,
            icon: Coffee,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
          });
        }
        if (b.end) {
          timeline.push({
            time: formatTime(b.end),
            label: 'Resume Work',
            icon: PlayCircle,
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
          });
        }
      });
    }
    if (today.clockOut) {
      timeline.push({
        time: formatTime(today.clockOut),
        label: 'Check Out',
        icon: StopCircle,
        color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's Shift */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4 text-emerald-600" /> Today&apos;s Shift
              </CardTitle>
              <CardDescription className="text-xs">
                {today ? new Date(today.clockIn).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'No shift today'}
              </CardDescription>
            </div>
            {today && (
              <Badge variant="outline" className={cn(
                'text-[10px]',
                today.status === 'active' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                today.status === 'on_break' && 'bg-amber-50 text-amber-700 border-amber-200',
                today.status === 'completed' && 'bg-slate-50 text-slate-700 border-slate-200',
              )}>
                {today.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!today ? (
            <div className="py-6 text-center">
              <Clock className="size-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No shift recorded today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Timeline */}
              <div className="space-y-3">
                {timeline.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0', entry.color)}>
                      <entry.icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-3 self-start">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Time</p>
                  <p className="text-xl font-bold mt-1">{totals ? formatMinutes(totals.totalMinutes) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Working</p>
                  <p className="text-xl font-bold mt-1 text-emerald-600">{totals ? formatMinutes(totals.workingMinutes) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Break</p>
                  <p className="text-xl font-bold mt-1 text-amber-600">{totals ? formatMinutes(totals.breakMinutes) : '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</p>
                  <p className="text-sm font-semibold mt-1 capitalize">{today.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Shifts (last 7 days) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarCheck className="size-4 text-emerald-600" /> Recent Shifts (Last 7 Days)
          </CardTitle>
          <CardDescription className="text-xs">{recent.length} shift{recent.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No recent shifts recorded.</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Working</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="text-sm">{formatDate(shift.shiftDate)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatTime(shift.clockIn)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{shift.clockOut ? formatTime(shift.clockOut) : '—'}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatMinutes(shift.totalMinutes)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-emerald-600">{formatMinutes(shift.workingMinutes)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{shift.status.replace('_', ' ')}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
