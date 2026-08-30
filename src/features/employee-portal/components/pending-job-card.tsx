'use client';

/**
 * PendingJobCard — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Highlighted card shown at the top of the portal dashboard when the employee
 * has a job awaiting acceptance (lifecycleState === 'assigned'). Renders the
 * job title, description, customer/address/duration grid, priority badge,
 * and an Accept Job + Navigate action row.
 *
 * The parent owns all mutations (handleLifecycle('accept', id),
 * openNavigation(job)) — this component is presentational.
 */

import {
  Calendar, CheckCircle2, Clock, Loader2, MapPin,
  Navigation, Phone, Radio, User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatTime } from '@/lib/format-utils';
import { PRIORITY_COLORS } from '@/features/employee-portal/utils/portal-helpers';
import type { Job } from '@/features/employee-portal/types';

export interface PendingJobCardProps {
  job: Job;
  actionLoading: string | null;
  onAccept: (jobId: string) => void;
  onOpenNav: (job: Job) => void;
}

export function PendingJobCard({
  job,
  actionLoading,
  onAccept,
  onOpenNav,
}: PendingJobCardProps) {
  return (
    <Card className="shadow-sm border-2 border-blue-200 bg-gradient-to-br from-blue-50/40 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Radio className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">New Job Assigned</CardTitle>
              <CardDescription className="text-xs">Awaiting your acceptance</CardDescription>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 border shrink-0">Assigned</Badge>
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
        <div className="flex gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 flex-1 h-11"
            onClick={() => onAccept(job.id)}
            disabled={actionLoading === `accept-${job.id}`}
          >
            {actionLoading === `accept-${job.id}` ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            Accept Job
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => onOpenNav(job)}
          >
            <Navigation className="size-4 mr-2" />
            Navigate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
