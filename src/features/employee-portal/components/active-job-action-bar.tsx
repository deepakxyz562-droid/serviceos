'use client';

/**
 * ActiveJobActionBar — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Sticky bottom action bar that shows the primary action for the active job
 * (the one in working / paused / arrived / travelling / accepted state).
 * Renders a single primary button whose label + icon + onClick change per
 * lifecycle state:
 *
 *   accepted  → Start Travel    (onAction('start_travel', jobId))
 *   travelling → Mark Arrived   (onAction('arrive', jobId))
 *   arrived   → Start Work      (onAction('start_work', jobId))
 *   working   → Pause Work      (onAction('pause', jobId))
 *   paused    → Resume Work     (onAction('resume', jobId))
 *   (other)   → Complete Job    (onOpenComplete())
 *
 * When the state is working or paused, an extra "Complete" button is shown
 * next to the primary so the employee can wrap up without expanding the job
 * card.
 *
 * The parent owns all mutations — this component is presentational +
 * dispatches via callbacks.
 */

import type { ReactNode } from 'react';
import {
  CheckCircle2, Loader2, MapPin, Navigation, Pause, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LIFECYCLE_LABELS } from '@/features/employee-portal/utils/portal-helpers';
import type { ActionBarAction, Job } from '@/features/employee-portal/types';

interface PrimaryAction {
  label: string;
  icon: ReactNode;
  action?: ActionBarAction;
  onClick?: () => void;
}

export interface ActiveJobActionBarProps {
  job: Job;
  actionLoading: string | null;
  onAction: (action: ActionBarAction, jobId: string) => void;
  onOpenComplete: () => void;
}

export function ActiveJobActionBar({
  job,
  actionLoading,
  onAction,
  onOpenComplete,
}: ActiveJobActionBarProps) {
  const state = job.lifecycleState || 'working';
  let primary: PrimaryAction;
  if (state === 'working') {
    primary = {
      label: 'Pause Work',
      icon: <Pause className="size-4" />,
      action: 'pause',
    };
  } else if (state === 'paused') {
    primary = {
      label: 'Resume Work',
      icon: <Play className="size-4" />,
      action: 'resume',
    };
  } else if (state === 'accepted') {
    primary = {
      label: 'Start Travel',
      icon: <Navigation className="size-4" />,
      action: 'start_travel',
    };
  } else if (state === 'travelling') {
    primary = {
      label: 'Mark Arrived',
      icon: <MapPin className="size-4" />,
      action: 'arrive',
    };
  } else if (state === 'arrived') {
    primary = {
      label: 'Start Work',
      icon: <Play className="size-4" />,
      action: 'start_work',
    };
  } else {
    primary = {
      label: 'Complete Job',
      icon: <CheckCircle2 className="size-4" />,
      onClick: onOpenComplete,
    };
  }

  const handleClick = () => {
    if (primary.onClick) {
      primary.onClick();
    } else if (primary.action) {
      onAction(primary.action, job.id);
    }
  };

  const isLoading =
    !!primary.action && actionLoading === `${primary.action}-${job.id}`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {LIFECYCLE_LABELS[state] || state}
        </p>
        <p className="text-sm font-medium truncate">{job.title}</p>
      </div>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6 shrink-0"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="size-4 mr-2 animate-spin" />
        ) : (
          <span className="mr-2">{primary.icon}</span>
        )}
        {primary.label}
      </Button>
      {(state === 'working' || state === 'paused') && (
        <Button
          variant="outline"
          className="h-12 px-4 shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={onOpenComplete}
        >
          <CheckCircle2 className="size-4 mr-2" />
          Complete
        </Button>
      )}
    </div>
  );
}
