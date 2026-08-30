/**
 * Lead types — shared between leads-view.tsx, the lead feature components,
 * and other views that consume lead data (e.g. customer-360, dashboard).
 *
 * This file is the single source of truth for Lead-related TypeScript types.
 * Extracted from src/components/views/leads-view.tsx in Phase 4.
 *
 * USAGE:
 *   import type { Lead, LeadFormData, CustomerOption } from '@/features/leads/types';
 */

import type { LineItem } from '@/features/line-items/types';

/**
 * A lead row as returned by /api/leads. The shape mirrors the Prisma
 * Lead model plus nested relations (assignedTo, customer, job).
 */
export interface Lead {
  id: string;
  title?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  status: string;
  priority: string;
  value: number;
  description?: string | null;
  address?: string | null;
  serviceType?: string | null;
  serviceId?: string | null;
  assignedToId?: string | null;
  customerId?: string | null;
  jobId?: string | null;
  notesJson: string;
  tagsJson: string;
  lineItemsJson?: string;
  imagesJson?: string;
  assessmentImagesJson?: string;
  followUpAt?: string | null;
  convertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    phone: string;
    avatar?: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  job?: {
    id: string;
    title: string;
    status: string;
  } | null;
  /** Optional soft-delete flag (set by /api/leads?deleted=true). */
  deletedAt?: string | null;
}

/**
 * Form state shape for the New/Edit Lead form (renderLeadFormPage).
 * Mirrors the Lead interface but with strings for inputs and arrays for
 * multi-value fields (images, assessmentImages, lineItems).
 */
export interface LeadFormData {
  title: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  serviceType: string;
  serviceId: string;
  address: string;
  priority: string;
  value: string;
  serviceDetails: string;
  notes: string;
  images: string[];
  assessmentImages: string[];
  customerId: string;
  lineItems: LineItem[];
}

/**
 * Customer reference used by the CustomerPicker / CreateCustomerDialog.
 * Kept here so the lead form props are self-documenting.
 */
export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}
