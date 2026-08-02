'use client';

/**
 * ViewSwitcher
 * ============
 * Segmented control to switch between Pipeline view modes:
 *   Kanban | Table | Timeline | Calendar | Analytics
 *
 * Pipeline Redesign (Phase 4)
 */

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import {
  Columns3,
  Table as TableIcon,
  CalendarDays,
  LineChart,
  GitBranch,
} from 'lucide-react';

export type PipelineViewMode =
  | 'kanban'
  | 'table'
  | 'timeline'
  | 'calendar'
  | 'analytics';

interface ViewSwitcherProps {
  className?: string;
}

const VIEWS: Array<{
  mode: PipelineViewMode;
  label: string;
  icon: typeof Columns3;
}> = [
  { mode: 'kanban', label: 'Kanban', icon: Columns3 },
  { mode: 'table', label: 'Table', icon: TableIcon },
  { mode: 'timeline', label: 'Timeline', icon: GitBranch },
  { mode: 'calendar', label: 'Calendar', icon: CalendarDays },
  { mode: 'analytics', label: 'Analytics', icon: LineChart },
];

export function ViewSwitcher({ className }: ViewSwitcherProps) {
  const viewMode = useAppStore((s) => s.pipelineViewMode) ?? 'kanban';
  const setViewMode = useAppStore((s) => s.setPipelineViewMode);

  return (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(value) => {
        if (value && value !== viewMode) {
          setViewMode?.(value as PipelineViewMode);
        }
      }}
      className={cn('h-8', className)}
      size="sm"
      aria-label="Pipeline view mode"
    >
      {VIEWS.map(({ mode, label, icon: Icon }) => (
        <ToggleGroupItem
          key={mode}
          value={mode}
          className="text-xs h-7 px-2 gap-1"
          aria-label={`${label} view`}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
