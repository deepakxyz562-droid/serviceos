'use client';

/**
 * TimelineGroup — labeled bucket of timeline events for the Overview tab.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 * The parent groups events into Today / Yesterday / This Week / Earlier
 * (see `groupTimelineEvents` in customer-helpers) and renders one
 * `<TimelineGroup>` per bucket.
 *
 * Each event row uses the `timelineEventTypeConfig` map to pick an icon +
 * tint. Falls back to the `message` config for unknown event types.
 */

import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/format-utils';
import { timelineEventTypeConfig } from '../utils/customer-helpers';

interface TimelineGroupProps {
  label: string;
  events: any[];
}

export function TimelineGroup({ label, events }: TimelineGroupProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h4>
      <div className="space-y-1">
        {events.map((event, i) => {
          const config = timelineEventTypeConfig[event.eventType || event.type] ||
            timelineEventTypeConfig.message;
          const Icon = config.icon;
          return (
            <div
              key={event.id || i}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all duration-200 group"
            >
              <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0', config.bg)}>
                <Icon className={cn('size-4', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {event.title || event.description || 'Event'}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {event.createdAt ? timeAgo(event.createdAt) : ''}
                  </span>
                </div>
                {event.description && event.title && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>
                )}
                {event.actorName && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">by {event.actorName}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
