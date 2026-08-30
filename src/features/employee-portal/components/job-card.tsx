'use client';

/**
 * JobCard — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Collapsible card used in the "Today's Jobs" list. Renders a compact summary
 * (priority dot, title, lifecycle badge, scheduled time, customer, address)
 * and expands to reveal the description + customer phone + a state-aware
 * action button row (Accept → Start Travel → Mark Arrived → Start Work →
 * Pause ↔ Resume) plus Navigate / Photo / Sign / Checklist shortcuts.
 *
 * The parent owns all mutations and the expanded state — this component is
 * presentational + dispatches via callbacks.
 */

import {
  Calendar, Camera, CheckCircle2, ChevronDown, ChevronUp, Clock,
  ListChecks, Loader2, MapPin, Navigation, Pause, PenLine, Phone,
  Play, Radio, User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatTime } from '@/lib/format-utils';
import {
  LIFECYCLE_COLORS, LIFECYCLE_LABELS, PRIORITY_COLORS, PRIORITY_DOTS,
} from '@/features/employee-portal/utils/portal-helpers';
import type { Job, LifecycleAction, PhotoType } from '@/features/employee-portal/types';

export interface JobCardProps {
  job: Job;
  expanded: boolean;
  onToggle: () => void;
  actionLoading: string | null;
  onAction: (action: LifecycleAction, jobId: string) => void;
  onOpenNav: (job: Job) => void;
  onCapturePhoto: (jobId: string, type: PhotoType) => void;
  onOpenSignature: (jobId: string) => void;
  onOpenChecklist: (jobId: string) => void;
}

export function JobCard({
  job,
  expanded,
  onToggle,
  actionLoading,
  onAction,
  onOpenNav,
  onCapturePhoto,
  onOpenSignature,
  onOpenChecklist,
}: JobCardProps) {
  const state = job.lifecycleState || 'assigned';
  return (
    <Card
      className={`border transition-all ${
        state === 'assigned'
          ? 'border-blue-100 bg-blue-50/30'
          : ['working', 'travelling', 'arrived'].includes(state)
            ? 'border-emerald-200 bg-emerald-50/30'
            : state === 'paused'
              ? 'border-amber-200 bg-amber-50/30'
              : 'border-border'
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <button className="w-full text-left" onClick={onToggle}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`size-2 rounded-full shrink-0 ${PRIORITY_DOTS[job.priority] || PRIORITY_DOTS.medium}`} />
              <span className="font-medium text-sm truncate">{job.title}</span>
              <Badge
                className={`${LIFECYCLE_COLORS[state] || LIFECYCLE_COLORS.assigned} border text-[10px] h-5 shrink-0`}
              >
                {LIFECYCLE_LABELS[state] || state}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {job.scheduledAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(job.scheduledAt)}
                </span>
              )}
              {expanded ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {job.customerName && (
              <span className="flex items-center gap-1">
                <User className="size-3" /> {job.customerName}
              </span>
            )}
            {job.address && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" /> {job.address}
              </span>
            )}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {job.description && (
              <p className="text-sm text-muted-foreground">{job.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {job.customerPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3 text-muted-foreground" />
                  <a href={`tel:${job.customerPhone}`} className="text-emerald-600 hover:underline">
                    {job.customerPhone}
                  </a>
                </div>
              )}
              {job.scheduledAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3 text-muted-foreground" />
                  {formatDate(job.scheduledAt)}
                </div>
              )}
              {job.estimatedDuration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-muted-foreground" />
                  Est. {job.estimatedDuration} min
                </div>
              )}
              {job.type && (
                <div className="flex items-center gap-1.5">
                  <Radio className="size-3 text-muted-foreground" />
                  <span className="capitalize">{job.type}</span>
                </div>
              )}
            </div>

            {/* Action buttons based on state */}
            <div className="flex flex-wrap gap-2 pt-1">
              {state === 'assigned' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('accept', job.id)}
                  disabled={actionLoading === `accept-${job.id}`}
                >
                  {actionLoading === `accept-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5 mr-1.5" />
                  )}
                  Accept
                </Button>
              )}
              {state === 'accepted' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('start_travel', job.id)}
                  disabled={actionLoading === `start_travel-${job.id}`}
                >
                  {actionLoading === `start_travel-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Navigation className="size-3.5 mr-1.5" />
                  )}
                  Start Travel
                </Button>
              )}
              {state === 'travelling' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('arrive', job.id)}
                  disabled={actionLoading === `arrive-${job.id}`}
                >
                  {actionLoading === `arrive-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <MapPin className="size-3.5 mr-1.5" />
                  )}
                  Mark Arrived
                </Button>
              )}
              {state === 'arrived' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('start_work', job.id)}
                  disabled={actionLoading === `start_work-${job.id}`}
                >
                  {actionLoading === `start_work-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5 mr-1.5" />
                  )}
                  Start Work
                </Button>
              )}
              {state === 'working' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 h-10"
                    onClick={() => onAction('pause', job.id)}
                    disabled={actionLoading === `pause-${job.id}`}
                  >
                    {actionLoading === `pause-${job.id}` ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Pause className="size-3.5 mr-1.5" />
                    )}
                    Pause
                  </Button>
                </>
              )}
              {state === 'paused' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-10"
                  onClick={() => onAction('resume', job.id)}
                  disabled={actionLoading === `resume-${job.id}`}
                >
                  {actionLoading === `resume-${job.id}` ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5 mr-1.5" />
                  )}
                  Resume
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="h-10"
                onClick={() => onOpenNav(job)}
              >
                <Navigation className="size-3.5 mr-1.5" />
                Navigate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 h-10"
                onClick={() => onCapturePhoto(job.id, state === 'assigned' ? 'before' : 'progress')}
              >
                <Camera className="size-3.5 mr-1.5" />
                Photo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 h-10"
                onClick={() => onOpenSignature(job.id)}
              >
                <PenLine className="size-3.5 mr-1.5" />
                Sign
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-teal-200 text-teal-700 hover:bg-teal-50 h-10"
                onClick={() => onOpenChecklist(job.id)}
              >
                <ListChecks className="size-3.5 mr-1.5" />
                Checklist
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
