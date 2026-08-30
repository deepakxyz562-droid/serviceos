/**
 * job-helpers.ts
 * ===============
 * Job-specific helper functions used by jobs-view.tsx and other job-related
 * components. Pure (no React, no side effects) so they can be safely unit-tested.
 *
 * Functions that duplicate shared utilities (formatDate, formatDateTime,
 * formatHMS, formatMinutes, formatFileSize, getStatusColor, getPriorityColor,
 * parseCustomFields, parseAttachments, parseStringArray, parseNotificationLog,
 * parseAssetIdFromMetadata) were DELETED in favour of the shared util files:
 *   - @/lib/format-utils
 *   - @/lib/status-utils
 *   - @/lib/json-parsers
 *
 * USAGE:
 *   import { getStatusIcon, getJobTypeLabel, formatSchedulePill, isJobOverdue }
 *     from '@/features/jobs/utils/job-helpers';
 */

import type { ReactNode } from 'react';
import { Clock, User, Activity, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Get a Lucide icon node for a job status (used in status badges).
 * Returns null for unknown statuses.
 */
export function getStatusIcon(status: string): ReactNode {
  const map: Record<string, ReactNode> = {
    pending: <Clock className="size-3" />,
    assigned: <User className="size-3" />,
    in_progress: <Activity className="size-3" />,
    completed: <CheckCircle2 className="size-3" />,
    cancelled: <XCircle className="size-3" />,
  };
  return map[status] || null;
}

/**
 * Get a human-readable label for a job type slug.
 * Returns the input unchanged for unknown types.
 */
export function getJobTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    delivery: 'Delivery',
    service: 'Service',
    transport: 'Transport',
    installation: 'Installation',
    salon: 'Salon',
    healthcare: 'Healthcare',
    repair: 'Repair',
    maintenance: 'Maintenance',
  };
  return labels[type] || type;
}

/**
 * Phase 2: Format a job's scheduled window as a compact pill label.
 * Returns strings like:
 *   "Today, 2:00 PM"              — single time, no duration known
 *   "Today, 2:00 PM – 4:00 PM"    — start + computed end
 *   "Tomorrow, 9:00 AM – 11:30 AM"
 *   "Aug 16, 2:00 PM – 4:00 PM"   — further out
 *   null — no scheduledAt
 *
 * @param scheduledAt   ISO string of the job start
 * @param scheduledTime Optional explicit time string ("14:00") — overrides the time portion
 * @param estimatedDuration Minutes (optional). Used to compute the end time.
 */
export function formatSchedulePill(
  scheduledAt?: string | null,
  scheduledTime?: string | null,
  estimatedDuration?: number | null,
): string | null {
  if (!scheduledAt) return null;
  try {
    const start = new Date(scheduledAt);
    const now = new Date();
    // Day label: Today / Tomorrow / short date
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const dayLabel = isSameDay(start, now) ? 'Today'
      : isSameDay(start, tomorrow) ? 'Tomorrow'
      : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Start time — prefer explicit scheduledTime, else derive from scheduledAt
    const startTime = scheduledTime
      ? scheduledTime
      : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // End time — only if we have a duration
    if (estimatedDuration && estimatedDuration > 0) {
      const end = new Date(start.getTime() + estimatedDuration * 60_000);
      const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${dayLabel}, ${startTime} – ${endTime}`;
    }
    return `${dayLabel}, ${startTime}`;
  } catch {
    return null;
  }
}

/**
 * Phase 2: Determine if a job is overdue (past scheduled end, not terminal).
 * Used to show a red "Overdue" pill on the card.
 */
export function isJobOverdue(job: {
  scheduledAt?: string | null;
  estimatedDuration?: number | null;
  status: string;
}): boolean {
  if (!job.scheduledAt || job.status === 'completed' || job.status === 'cancelled') return false;
  const endMs = new Date(job.scheduledAt).getTime() + ((job.estimatedDuration || 60) * 60_000);
  return endMs < Date.now();
}
