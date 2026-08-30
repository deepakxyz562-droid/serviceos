'use client';

/**
 * ActiveJobCard — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * The large highlighted card shown at the top of the portal dashboard when the
 * employee has a job in an in-flight lifecycle state (working / paused /
 * arrived / travelling / accepted). Renders:
 *   - Header with current lifecycle badge
 *   - Job title + description + customer/address/duration grid
 *   - Priority badge
 *   - Lifecycle timestamps (Accepted / Travelling / Arrived / Started Work)
 *   - Action button row that changes per state (Start Travel → Mark Arrived →
 *     Start Work → Pause ↔ Resume) plus always-available Navigate / Photo /
 *     Signature / Checklist buttons
 *   - Proof item counts (photos / signatures / checklists)
 *
 * The parent owns all mutations (handleLifecycle, openNavigation,
 * openPhotoDialog, openSignatureDialog, openChecklistDialog) — this component
 * is presentational + dispatches via callbacks.
 */

import {
  Calendar, Camera, Clock, ListChecks, Loader2, MapPin,
  Navigation, Pause, PenLine, Phone, Play, User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatTime } from '@/lib/format-utils';
import {
  LIFECYCLE_COLORS, LIFECYCLE_LABELS, PRIORITY_COLORS,
} from '@/features/employee-portal/utils/portal-helpers';
import type { Job, LifecycleAction, PhotoType } from '@/features/employee-portal/types';
import { TimestampItem } from './timestamp-item';

export interface ActiveJobCardProps {
  job: Job;
  actionLoading: string | null;
  onAction: (action: LifecycleAction, jobId: string) => void;
  onOpenNav: (job: Job) => void;
  onCapturePhoto: (jobId: string, type: PhotoType) => void;
  onOpenSignature: (jobId: string) => void;
  onOpenChecklist: (jobId: string) => void;
}

export function ActiveJobCard({
  job,
  actionLoading,
  onAction,
  onOpenNav,
  onCapturePhoto,
  onOpenSignature,
  onOpenChecklist,
}: ActiveJobCardProps) {
  const state = job.lifecycleState || 'working';
  return (
    <Card className="shadow-sm border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Play className="size-4 text-white fill-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">Active Job</CardTitle>
              <CardDescription className="text-xs">
                {LIFECYCLE_LABELS[state] || state}
              </CardDescription>
            </div>
          </div>
          <Badge className={`${LIFECYCLE_COLORS[state] || LIFECYCLE_COLORS.working} border shrink-0`}>
            {LIFECYCLE_LABELS[state] || state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">{job.title}</h3>
          {job.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {job.customerName && (
            <div className="flex items-center gap-2 min-w-0">
              <User className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{job.customerName}</span>
              {job.customerPhone && (
                <a href={`tel:${job.customerPhone}`} className="text-emerald-600 hover:text-emerald-700 shrink-0">
                  <Phone className="size-3.5" />
                </a>
              )}
            </div>
          )}
          {job.address && (
            <button
              onClick={() => onOpenNav(job)}
              className="flex items-center gap-2 text-left min-w-0 text-emerald-700 hover:text-emerald-800"
            >
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{job.address}</span>
            </button>
          )}
          {job.scheduledAt && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <span>{formatDate(job.scheduledAt)} at {formatTime(job.scheduledAt)}</span>
            </div>
          )}
          {job.estimatedDuration && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <span>Est. {job.estimatedDuration} min</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          <Badge variant="outline" className={`${PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.medium} text-xs`}>
            {job.priority}
          </Badge>
        </div>

        <Separator />

        {/* Lifecycle timestamps */}
        {job.lifecycleTimestamps && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
            {job.lifecycleTimestamps.accepted && (
              <TimestampItem label="Accepted" ts={job.lifecycleTimestamps.accepted} />
            )}
            {job.lifecycleTimestamps.travelling && (
              <TimestampItem label="Travelling" ts={job.lifecycleTimestamps.travelling} />
            )}
            {job.lifecycleTimestamps.arrived && (
              <TimestampItem label="Arrived" ts={job.lifecycleTimestamps.arrived} />
            )}
            {job.lifecycleTimestamps.working && (
              <TimestampItem label="Started Work" ts={job.lifecycleTimestamps.working} />
            )}
          </div>
        )}

        {/* Action buttons (changes based on state) */}
        <div className="flex flex-wrap gap-2">
          {state === 'accepted' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px] h-11"
              onClick={() => onAction('start_travel', job.id)}
              disabled={actionLoading === `start_travel-${job.id}`}
            >
              {actionLoading === `start_travel-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Navigation className="size-4 mr-2" />
              )}
              Start Travel
            </Button>
          )}
          {state === 'travelling' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px] h-11"
              onClick={() => onAction('arrive', job.id)}
              disabled={actionLoading === `arrive-${job.id}`}
            >
              {actionLoading === `arrive-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="size-4 mr-2" />
              )}
              Mark Arrived
            </Button>
          )}
          {state === 'arrived' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 flex-1 min-w-[140px] h-11"
              onClick={() => onAction('start_work', job.id)}
              disabled={actionLoading === `start_work-${job.id}`}
            >
              {actionLoading === `start_work-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Start Work
            </Button>
          )}
          {state === 'working' && (
            <Button
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 h-11"
              onClick={() => onAction('pause', job.id)}
              disabled={actionLoading === `pause-${job.id}`}
            >
              {actionLoading === `pause-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Pause className="size-4 mr-2" />
              )}
              Pause
            </Button>
          )}
          {state === 'paused' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 h-11"
              onClick={() => onAction('resume', job.id)}
              disabled={actionLoading === `resume-${job.id}`}
            >
              {actionLoading === `resume-${job.id}` ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Resume
            </Button>
          )}

          {/* Always-available on-site actions */}
          <Button
            variant="outline"
            className="h-11"
            onClick={() => onOpenNav(job)}
          >
            <Navigation className="size-4 mr-2" />
            Navigate
          </Button>
          <Button
            variant="outline"
            className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 h-11"
            onClick={() => onCapturePhoto(job.id, 'progress')}
          >
            <Camera className="size-4 mr-2" />
            Photo
          </Button>
          <Button
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50 h-11"
            onClick={() => onOpenSignature(job.id)}
          >
            <PenLine className="size-4 mr-2" />
            Signature
          </Button>
          <Button
            variant="outline"
            className="border-teal-200 text-teal-700 hover:bg-teal-50 h-11"
            onClick={() => onOpenChecklist(job.id)}
          >
            <ListChecks className="size-4 mr-2" />
            Checklist
          </Button>
        </div>

        {/* Counts of proof items */}
        {job._counts && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Camera className="size-3" />
              {job._counts.photos} photo{job._counts.photos !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <PenLine className="size-3" />
              {job._counts.signatures} signature{job._counts.signatures !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <ListChecks className="size-3" />
              {job._counts.checklists} checklist{job._counts.checklists !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
