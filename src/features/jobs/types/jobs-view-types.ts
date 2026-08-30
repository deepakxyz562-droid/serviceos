// Job-related types — shared between jobs-view, job-form, job-detail, etc.
// Extracted from jobs-view.tsx (Phase 4 refactor).

import type { LineItem } from '@/features/line-items/types';
import type { RecurringScheduleValue } from '@/components/recurring/recurring-schedule-editor';
import type { LifecycleTimestamps } from '@/lib/job-lifecycle';

export interface Job {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  pickup?: string;
  dropoff?: string;
  scheduledAt?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  quotedAmount?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  completedAt?: string | null;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  serviceId?: string;
  visitInstructions?: string | null;
  lineItemsJson?: string;
  notificationLogJson?: string;
  customFieldsJson?: string;
  attachmentsJson?: string;
  linkedChecklistsJson?: string;
  linkToRelatedJson?: string;
  metadataJson?: string;
  completionNotes?: string | null;
  recurringScheduleId?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; phone: string; role: string };
  customer?: { id: string; name: string; phone: string; email?: string };
  invoices?: Array<{
    id: string;
    number: string;
    status: string;
    total: number;
    currency: string;
    sentAt?: string | null;
    paidAt?: string | null;
    dueDate?: string | null;
    createdAt: string;
  }>;
  verificationPin?: string | null;
  // ── GPS check-in / check-out coordinates (Prisma Job model fields, returned
  // by GET /api/jobs and GET /api/jobs/[id]). Used by the GPS Route section in
  // the job detail view as a fallback when no RouteHistory row exists.
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
}

// ── V1.5 Lifecycle / Time Tracking / GPS section types ───────────────────────
// Shape of the data returned by GET /api/jobs/[id]/lifecycle and the older
// GET /api/jobs/lifecycle endpoint. Shared between the three lifecycle section
// components (LifecycleTimelineSection, TimeTrackingSection, GpsRouteSection).

export interface LifecycleTimeEntry {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  pausesJson: string;
  durationMinutes: number;
  pauseMinutes: number;
  workingMinutes: number;
  employeeId: string;
}

export interface LifecycleRouteEntry {
  id: string;
  startedAt: string;
  endedAt: string | null;
  arrivedAt: string | null;
  status: string;
  distanceMeters: number;
  durationMinutes: number;
  etaMinutes: number | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
}

export interface LifecycleDataShape {
  status: string;
  timestamps: LifecycleTimestamps;
  activeTimeEntry: LifecycleTimeEntry | null;
  activeRoute: LifecycleRouteEntry | null;
  // Optional — only returned by the V1.5 /api/jobs/[id]/lifecycle endpoint.
  // The older /api/jobs/lifecycle endpoint doesn't include this field, so it
  // must be optional to keep both response shapes assignable to LifecycleDataShape.
  completedRoute?: LifecycleRouteEntry | null;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface Attachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  skills: string;
  rating: number;
  completedJobs: number;
}

export interface SmartCandidate {
  employeeId: string;
  employeeName: string;
  employeePhone: string;
  employeeRole: string;
  employeeStatus: string;
  score: number;
  breakdown: {
    total: number;
    skillScore: number;
    proximityScore: number;
    workloadScore: number;
    ratingScore: number;
    reasons: string[];
    matchedSkills: string[];
    distanceKm: number | null;
    activeJobCount: number;
  };
  conflict?: {
    type: 'none' | 'schedule' | 'travel' | 'status';
    riskLevel: 'low' | 'medium' | 'high';
    conflictingJob?: {
      id: string;
      jobNumber?: string | null;
      title: string;
      scheduledAt: string | null;
      scheduledTime?: string | null;
      estimatedDuration?: number | null;
      address?: string | null;
    };
    overlapMinutes?: number;
    travelDistanceKm?: number;
    message: string;
  } | null;
}

export interface CustomerAssetOption {
  id: string;
  name: string;
  assetType: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
}

export interface JobFormData {
  title: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  jobType: 'one-off' | 'recurring';
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  assigneeId: string;
  visitInstructions: string;
  invoiceOnClose: boolean;
  lineItems: LineItem[];
  notes: string;
  priority: string;
  serviceId: string;
  estimatedDuration: string;
  customFields: CustomField[];
  attachments: Attachment[];
  linkedChecklists: string[];
  linkToRelated: string[];
  assetId: string;
  linkedQuoteId: string;
  recurring: RecurringScheduleValue;
}

export const REASSIGNMENT_REASONS = [
  'Schedule Conflict',
  'Technician Unavailable',
  'Technician Illness',
  'Customer Request',
  'Proximity / Route Optimization',
  'Skill Requirement',
  'Emergency Reassignment',
  'Other',
] as const;

// ── V1.6 "Link to related → Quotes" picker option ──────────────────────────
// Lightweight customer-quote shape used by the job form's Quote picker. Only
// draft / sent quotes are linkable (accepted/rejected/expired are filtered out
// before they reach the picker).
export interface QuoteOption {
  id: string;
  title: string;
  total: number;
  currency: string;
  status: string;
}

// ── Customer search-result shape (server-side search returns this) ──────────
// Matches the inline type used by CustomerPicker in leads-view.tsx. Both the
// JobsView state (selectedCustomer / customers) and the JobFormPage prop
// (customers / selectedCustomer) share this shape so we can pass them through
// without conversion.
export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}
