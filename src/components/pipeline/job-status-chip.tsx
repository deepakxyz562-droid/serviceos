'use client';

/**
 * JobStatusChip
 * =============
 * Compact color-coded chip that surfaces the linked Job's status on a Won
 * deal card (in the Completed Deals table) and in the Won Summary widget.
 *
 * States:
 *   - No Job Yet         (gray)    — Deal is won but no Job created yet
 *   - Job Scheduled      (blue)    — Job exists + scheduledAt is set
 *   - Job In Progress    (purple)  — Job status = in_progress / en_route
 *   - Job Completed      (green)   — Job status = completed
 *   - Job Cancelled      (red)     — Job status = cancelled (⚠ attention)
 *   - Invoice Paid       (emerald) — Job paymentStatus = paid
 *
 * Pipeline Redesign (Phase 1)
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  DollarSign,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export type JobStatusChipVariant =
  | 'no_job'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'paid';

export interface JobStatusChipProps {
  /** The linked Job's status, or null if no job is linked. */
  jobStatus?: string | null;
  /** The linked Job's scheduledAt, if any. */
  jobScheduledAt?: string | null;
  /** The linked Job's paymentStatus, if any. */
  jobPaymentStatus?: string | null;
  /** The linked Job's cancelledAt, if any (Phase 1 field). */
  jobCancelledAt?: string | null;
  /** Size variant — 'sm' for compact card, 'default' for table rows. */
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * Resolve the chip variant from the Job's fields.
 *
 * Priority order (most-specific first):
 *   1. cancelled (red)  — overrides everything; the deal needs attention
 *   2. paid (emerald)   — invoice paid is the terminal "all done" state
 *   3. completed (green)
 *   4. in_progress (purple)
 *   5. scheduled (blue)
 *   6. no_job (gray)    — Deal is won but no Job linked yet
 */
export function resolveJobStatusVariant(
  jobStatus?: string | null,
  jobScheduledAt?: string | null,
  jobPaymentStatus?: string | null,
  jobCancelledAt?: string | null,
): JobStatusChipVariant {
  if (jobCancelledAt || jobStatus === 'cancelled') return 'cancelled';
  if (jobPaymentStatus === 'paid' || jobPaymentStatus === 'collected') return 'paid';
  if (jobStatus === 'completed') return 'completed';
  if (jobStatus === 'in_progress' || jobStatus === 'en_route') return 'in_progress';
  if (jobStatus && jobStatus !== 'pending') return 'scheduled';
  if (jobScheduledAt) return 'scheduled';
  return 'no_job';
}

const VARIANT_CONFIG: Record<
  JobStatusChipVariant,
  { label: string; icon: typeof Clock; className: string }
> = {
  no_job: {
    label: 'No Job Yet',
    icon: Clock,
    className: 'bg-muted text-muted-foreground border-muted',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Calendar,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: Truck,
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Job Cancelled',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  paid: {
    label: 'Invoice Paid',
    icon: DollarSign,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
};

export function JobStatusChip({
  jobStatus,
  jobScheduledAt,
  jobPaymentStatus,
  jobCancelledAt,
  size = 'default',
  className,
}: JobStatusChipProps) {
  const variant = resolveJobStatusVariant(
    jobStatus,
    jobScheduledAt,
    jobPaymentStatus,
    jobCancelledAt,
  );
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;
  const isAttention = variant === 'cancelled';

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        size === 'sm' ? 'text-[9px] h-4 px-1' : 'text-[10px] h-5 px-1.5',
        config.className,
        isAttention && 'ring-1 ring-red-300',
        className,
      )}
      title={isAttention ? '⚠ This deal\'s job was cancelled — needs attention' : config.label}
    >
      {isAttention ? (
        <AlertCircle className={size === 'sm' ? 'size-2.5' : 'size-3'} />
      ) : (
        <Icon className={size === 'sm' ? 'size-2.5' : 'size-3'} />
      )}
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}
