/**
 * Booking types — shared between booking-view.tsx and the extracted booking
 * feature components (BookingFormDialog, BookingViewDialog,
 * BookingDeleteDialog).
 *
 * Single source of truth for Booking-related TypeScript types. Extracted
 * from src/components/views/booking-view.tsx in Phase 6E.
 *
 * USAGE:
 *   import type {
 *     Booking, BookingFormData, EmployeeInfo, Pagination,
 *     BookingsResponse, ServiceOption, EmployeeOption,
 *   } from '@/features/booking/types';
 *   import { EMPTY_FORM } from '@/features/booking/types';
 */

export interface EmployeeInfo {
  id: string;
  name: string;
  phone: string;
  avatar: string | null;
}

export interface Booking {
  id: string;
  title: string;
  description: string | null;
  status: string;
  source: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  employeeId: string | null;
  serviceId: string | null;
  branchId: string | null;
  address: string | null;
  scheduledAt: string | null;
  scheduledEndTime: string | null;
  duration: number;
  notes: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  rescheduledFrom: string | null;
  metadataJson: string;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeInfo | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BookingsResponse {
  bookings: Booking[];
  pagination: Pagination;
}

export interface ServiceOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  duration: number;
  isActive: boolean;
}

export interface EmployeeOption {
  id: string;
  name: string;
  role: string;
  status: string;
}

export interface BookingFormData {
  title: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  scheduledAt: string;
  duration: string;
  description: string;
  notes: string;
  status: string;
  source: string;
  employeeId: string;
  serviceId: string;
  assignmentType: 'unassigned' | 'assign_now' | 'auto_assign';
}

export const EMPTY_FORM: BookingFormData = {
  title: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  address: '',
  scheduledAt: '',
  duration: '60',
  description: '',
  notes: '',
  status: 'pending',
  source: 'manual',
  employeeId: '',
  serviceId: '',
  assignmentType: 'unassigned',
};
