/**
 * Calendar types — shared between calendar-view.tsx and the calendar feature
 * components extracted in Phase 6D (booking-form-dialog, day-detail-dialog).
 *
 * This file is the single source of truth for Calendar-related TypeScript
 * types. Extracted from src/components/views/calendar-view.tsx in Phase 6D.
 *
 * USAGE:
 *   import type {
 *     ViewMode, CalendarEvent, Booking, Job, BookingFormData,
 *   } from '@/features/calendar/types';
 */

export type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'booking' | 'job';
  status: string;
  scheduledAt: string | null;
  scheduledEndTime?: string | null;
  customerName?: string;
  employeeName?: string;
  address?: string;
  duration?: number;
  priority?: string;
  jobType?: string;
  description?: string;
  employee?: { id: string; name: string; avatar?: string };
}

export interface Booking {
  id: string;
  title: string;
  description?: string;
  status: string;
  source: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  employeeId?: string;
  employee?: { id: string; name: string; avatar?: string };
  serviceId?: string;
  address?: string;
  scheduledAt?: string;
  scheduledEndTime?: string;
  duration: number;
  notes?: string;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  scheduledAt?: string;
  customerName?: string;
  assigneeId?: string;
  assigneeName?: string;
  notes?: string;
  createdAt: string;
}

export interface BookingFormData {
  title: string;
  customerName: string;
  employee: string;
  scheduledAt: string;
  scheduledEndTime: string;
  duration: number;
  address: string;
  source: string;
  notes: string;
}

/** Calendar status config used for color-coding event chips/badges. */
export interface CalendarStatusConfig {
  label: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
}
