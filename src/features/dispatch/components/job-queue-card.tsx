'use client';

/**
 * JobQueueCard — Phase 6E extraction from dispatch-view.tsx.
 *
 * Replaces the inline `renderJobCard()` closure. The compact job card used in
 * the Fleet pane's "Job Queue" section (and the larger non-compact variant
 * wherever else it was rendered). Pure presentational — the parent passes
 * the click + start-job handlers.
 *
 * Extracted from src/components/views/dispatch-view.tsx (Phase 6E refactor).
 */

import {
  MapPin, Clock, User, AlertTriangle,
  ArrowRight, Play, CircleDot,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getPriorityColor, getPriorityDot, getStatusColor,
  getServiceTypeIcon, formatTime, isLateJob,
} from '@/features/dispatch/utils/dispatch-helpers';
import type { Job } from '@/features/dispatch/types';

export interface JobQueueCardProps {
  job: Job;
  /** Compact mode = small card for queue list. Non-compact = larger card. */
  compact?: boolean;
  onSelect: (job: Job) => void;
  onStartJob: (job: Job) => void;
}

export function JobQueueCard({
  job,
  compact = false,
  onSelect,
  onStartJob,
}: JobQueueCardProps) {
  const late = isLateJob(job);

  return (
    <Card
      className={`border shadow-sm hover:shadow-md transition-all cursor-pointer group ${late ? 'border-red-300 bg-red-50/30' : ''}`}
      onClick={() => onSelect(job)}
    >
      <CardContent className={compact ? 'p-3 space-y-1.5' : 'p-3.5 space-y-2'}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">{getServiceTypeIcon(job.type)}</span>
            <h4 className="font-medium text-xs truncate">{job.title}</h4>
          </div>
          <div className={`size-2 rounded-full shrink-0 mt-1 ${getPriorityDot(job.priority)}`} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="outline" className={`${getPriorityColor(job.priority)} text-[9px] h-4 px-1`}>
            {job.priority}
          </Badge>
          <Badge variant="outline" className={`${getStatusColor(job.status)} text-[9px] h-4 px-1`}>
            {job.status.replace('_', ' ')}
          </Badge>
          {late && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-red-100 text-red-700 border-red-200 animate-pulse">
              <AlertTriangle className="size-2.5 mr-0.5" /> late
            </Badge>
          )}
        </div>
        {!compact && job.customerName && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="size-2.5" /> <span className="truncate">{job.customerName}</span>
          </div>
        )}
        {!compact && job.address && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="size-2.5 shrink-0" /> <span className="truncate">{job.address}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {job.scheduledAt && (
            <span className="flex items-center gap-0.5">
              <Clock className="size-2.5" /> {formatTime(job.scheduledAt)}
            </span>
          )}
          {job.assigneeName && (
            <span className="flex items-center gap-0.5 text-teal-600">
              <CircleDot className="size-2.5" /> {job.assigneeName.split(' ')[0]}
            </span>
          )}
        </div>
        {job.status === 'pending' && !compact && (
          <Button
            size="sm" className="w-full h-6 text-[10px] bg-teal-600 hover:bg-teal-700 text-white"
            onClick={(ev) => { ev.stopPropagation(); onSelect(job); }}
          >
            <ArrowRight className="size-2.5 mr-1" /> Assign
          </Button>
        )}
        {job.status === 'assigned' && !compact && (
          <Button
            size="sm" className="w-full h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={(ev) => { ev.stopPropagation(); onStartJob(job); }}
          >
            <Play className="size-2.5 mr-1" /> Start
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
