'use client';

/**
 * AttentionPanel — Phase 6E extraction from dispatch-view.tsx.
 *
 * Replaces the inline `renderAttentionPanel()` closure. Shows a collapsible
 * overlay at top-left of the map with the count of attention items (late
 * jobs, stale GPS, unassigned jobs, idle techs). Clicking an item selects
 * the corresponding technician or job in the Inspector.
 *
 * Pure presentational — the parent owns the items list, the collapsed state,
 * and the click handler (which decides whether to call handleTechnicianSelect
 * or handleJobSelect based on item.action).
 *
 * Extracted from src/components/views/dispatch-view.tsx (Phase 6E refactor).
 */

import {
  AlertTriangle, MapPin, Briefcase, Clock,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AttentionItem } from '@/features/dispatch/types';

export interface AttentionPanelProps {
  items: AttentionItem[];
  expanded: boolean;
  onToggle: () => void;
  onItemClick: (item: AttentionItem) => void;
}

const SEVERITY_COLOR: Record<AttentionItem['severity'], string> = {
  red: 'text-red-600 bg-red-500',
  amber: 'text-amber-600 bg-amber-500',
  yellow: 'text-yellow-600 bg-yellow-500',
};

const ICON_MAP: Record<AttentionItem['icon'], LucideIcon> = {
  alert: AlertTriangle,
  gps: MapPin,
  unassigned: Briefcase,
  idle: Clock,
};

export function AttentionPanel({
  items,
  expanded,
  onToggle,
  onItemClick,
}: AttentionPanelProps) {
  if (items.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 z-[1000] w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border border-amber-200 bg-background/95 backdrop-blur shadow-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5 flex-1">
          <AlertTriangle className="size-3.5 text-amber-600" />
          <span className="text-xs font-semibold">{items.length} Attention</span>
        </div>
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t max-h-72 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                className="w-full flex items-start gap-2 p-2.5 hover:bg-muted/50 transition-colors border-b last:border-0 text-left"
              >
                <span
                  className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded ${SEVERITY_COLOR[item.severity]} bg-opacity-15`}
                >
                  <Icon className="size-3" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium leading-tight truncate">
                    {item.title}
                  </p>
                  {item.detail && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.detail}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
