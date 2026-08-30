'use client';

/**
 * Activity Tab — recent activity timeline by/for the employee.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import type { ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, Pencil, Trash2, UserCheck, AlertTriangle, Activity as ActivityIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import { timeAgo } from '@/lib/format-utils';
import type { ActivityLogEntry, ActivityLogsResponse, Employee } from '../../types';
import { apiUrl } from '../../utils/employee-helpers';
import { EmptyState } from '../employee-shared';

const activityConfig: Record<string, { icon: ElementType; color: string; bg: string }> = {
  create: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  update: { icon: Pencil, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  assign: { icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
  complete: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  status_change: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  default: { icon: ActivityIcon, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export function ActivityTab({ employee }: { employee: Employee }) {
  // Query activity logs scoped to this employee. We try multiple filters:
  //   1. entityId = employee.id (employee-scoped events)
  //   2. actorId = employee.userId (events the employee performed)
  // We'll fetch up to 50 of each and merge client-side, sorted by createdAt desc.
  const { data, isLoading } = useQuery<ActivityLogsResponse>({
    queryKey: ['employee-activity', employee.id],
    queryFn: async () => {
      const [byEntity, byActor] = await Promise.all([
        authFetch(apiUrl(`/api/activity-logs?entityType=employee&entityId=${employee.id}&limit=50`)).then((r) => r.ok ? r.json() : { logs: [], total: 0 }),
        employee.userId
          ? authFetch(apiUrl(`/api/activity-logs?actorId=${employee.userId}&limit=50`)).then((r) => r.ok ? r.json() : { logs: [], total: 0 })
          : Promise.resolve({ logs: [], total: 0 }),
      ]);
      const merged: ActivityLogEntry[] = [...(byEntity.logs ?? []), ...(byActor.logs ?? [])];
      // Dedupe by id
      const seen = new Set<string>();
      const unique = merged.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { logs: unique.slice(0, 50), total: unique.length };
    },
  });

  const logs = data?.logs ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No recent activity"
        description="This employee's recent actions and events will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ActivityIcon className="size-4 text-emerald-600" /> Activity Timeline
        </CardTitle>
        <CardDescription className="text-xs">Recent events and actions by/for this employee</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative max-h-[600px] overflow-y-auto pr-2">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-3">
            {logs.map((log) => {
              const cfg = activityConfig[log.action] || activityConfig.default;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-3 relative">
                  <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background', cfg.bg)}>
                    <Icon className={cn('size-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {log.entityName || log.description || log.action}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[9px] capitalize">{log.action.replace('_', ' ')}</Badge>
                      {log.entityType && <span>· {log.entityType}</span>}
                      {log.actorName && <span>· by {log.actorName}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
