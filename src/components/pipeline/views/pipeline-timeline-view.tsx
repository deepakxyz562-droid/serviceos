'use client';

/**
 * PipelineTimelineView
 * ====================
 * Activity timeline grouped by day. Shows won/lost/created events as a
 * vertical timeline (like an activity feed).
 *
 * Pipeline Redesign (Phase 4)
 */

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  XCircle,
  Plus,
  Inbox,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { authFetch } from '@/lib/client-auth';
import { cn } from '@/lib/utils';
import { SmartEmptyState } from '../smart-empty-state';

interface TimelineEvent {
  id: string;
  type: 'won' | 'lost' | 'created';
  title: string;
  value: number;
  currency: string;
  customerName: string | null;
  date: string;
}

interface PipelineTimelineViewProps {
  onEventClick?: (eventId: string) => void;
  className?: string;
}

function formatMoney(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toFixed(0)}`;
  }
}

const EVENT_CONFIG = {
  won: {
    icon: Trophy,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    label: 'Won',
  },
  lost: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Lost',
  },
  created: {
    icon: Plus,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    label: 'Created',
  },
} as const;

export function PipelineTimelineView({
  onEventClick,
  className,
}: PipelineTimelineViewProps) {
  const [grouped, setGrouped] = useState<Record<string, TimelineEvent[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch(
          '/api/pipeline/timeline?days=30&XTransformPort=3000',
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setGrouped(json?.grouped || {});
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const days = Object.keys(grouped).sort().reverse();

  if (days.length === 0) {
    return (
      <SmartEmptyState
        variant="page"
        icon={Inbox}
        title="No timeline events"
        description="Deal activity from the last 30 days will appear here."
      />
    );
  }

  return (
    <ScrollArea className={cn('h-[600px] rounded-md border p-4', className)}>
      <div className="space-y-6">
        {days.map((day) => {
          const events = grouped[day];
          const date = parseISO(day);
          const isToday =
            format(new Date(), 'yyyy-MM-dd') === day;
          const isYesterday =
            format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === day;

          return (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
                <h4 className="text-sm font-semibold">
                  {isToday
                    ? 'Today'
                    : isYesterday
                      ? 'Yesterday'
                      : format(date, 'EEEE, MMM d')}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {events.length} event{events.length === 1 ? '' : 's'}
                </span>
              </div>
              <ol className="space-y-1.5 ml-2 border-l-2 border-muted pl-4">
                {events.map((event) => {
                  const config = EVENT_CONFIG[event.type];
                  const Icon = config.icon;
                  return (
                    <li
                      key={event.id}
                      className={cn(
                        'flex items-start gap-2 cursor-pointer hover:bg-muted/30 rounded-md p-1.5 -ml-1.5',
                      )}
                      onClick={() => onEventClick?.(event.id)}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center size-6 rounded-full shrink-0 -ml-5 border-2 border-background',
                          config.bg,
                        )}
                      >
                        <Icon className={cn('size-3', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-medium', config.color)}>
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(event.date), 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-1">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {event.value > 0 && (
                            <span className="font-semibold text-emerald-600">
                              {formatMoney(event.value, event.currency)}
                            </span>
                          )}
                          {event.customerName && (
                            <span className="truncate">· {event.customerName}</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
