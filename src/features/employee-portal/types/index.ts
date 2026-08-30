/**
 * Employee Portal feature types.
 *
 * Extracted from src/components/views/employee-portal-view.tsx (Phase 6A1).
 *
 * Shared between the main EmployeePortalView (admin preview), the 10 inline
 * sub-components (ActiveJobCard, JobCard, PendingJobCard, UpcomingJobRow,
 * ActiveJobActionBar, SummaryCard, QuickAction, ValidationItem,
 * TimestampItem, GpsStatusBannerAdminPreview), and the inline dialogs
 * (photo capture, signature, checklist, complete job).
 *
 * USAGE:
 *   import type {
 *     Employee, Job, ShiftData, TodayTotals, ChecklistItem,
 *     LifecycleTimestamps, LifecycleAction, PhotoType, ShiftStatus,
 *   } from '@/features/employee-portal/types';
 */

/** The signed-in employee viewing the portal. */
export interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  skills: string;
  rating: number;
  completedJobs: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  avatar?: string;
  updatedAt: string;
  [key: string]: unknown;
}

/** Per-lifecycle-state timestamp returned by /api/employee/jobs. */
export interface LifecycleTimestamps {
  assigned?: string;
  accepted?: string;
  travelling?: string;
  arrived?: string;
  working?: string;
  paused?: string;
  completed?: string;
}

/** A job assigned to the employee (today / upcoming / completed buckets). */
export interface Job {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  scheduledAt?: string | null;
  scheduledTime?: string;
  estimatedDuration?: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkOutLat?: number;
  checkOutLng?: number;
  customerRating?: number;
  employeeRating?: number;
  assignmentStatus?: string;
  completedAt?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Enriched by /api/employee/jobs */
  lifecycleTimestamps?: LifecycleTimestamps;
  lifecycleState?: string;
  _counts?: {
    photos: number;
    signatures: number;
    checklists: number;
  };
}

/** Active or recently-completed shift for the employee. */
export interface ShiftData {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut?: string | null;
  status: 'active' | 'on_break' | 'completed';
  breaksJson: string;
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
}

/** Aggregated totals for the current day (from /api/employee/shift/today). */
export interface TodayTotals {
  activeShift: ShiftData | null;
  shiftsToday: number;
  jobsAssignedToday: number;
  jobsCompletedToday: number;
  workingMinutes: number;
  breakMinutes: number;
  totalMinutes: number;
  travelDistanceMeters: number;
}

/** A single checklist line item attached to a job. */
export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes?: string | null;
}

/** Lifecycle action types accepted by /api/employee/jobs/[id]/lifecycle. */
export type LifecycleAction =
  | 'accept'
  | 'start_travel'
  | 'arrive'
  | 'start_work'
  | 'pause'
  | 'resume'
  | 'complete';

/** Subset of lifecycle actions surfaced by the sticky bottom action bar. */
export type ActionBarAction =
  | 'pause'
  | 'resume'
  | 'start_travel'
  | 'arrive'
  | 'start_work';

/** Photo bucket label (POST /api/jobs/[id]/photos). */
export type PhotoType = 'before' | 'after' | 'progress' | 'issue';

/** Derived shift status used for chip color and label rendering. */
export type ShiftStatus = 'clocked_out' | 'active' | 'on_break';

/** Live GPS status surfaced by the shared useGpsTracking hook. */
export type GpsStatus = 'live' | 'stale' | 'offline';

/** Validation result for the Complete-Job dialog. */
export interface CompletionValidation {
  missing: string[];
  details: {
    before: boolean;
    after: boolean;
    signature: boolean;
    checklist: boolean;
  };
}
