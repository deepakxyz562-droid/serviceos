/**
 * Customer 360° feature types.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 * Shared across the main view, the 8 tab sections, the sub-components
 * (KpiCard, HealthScoreGauge, TimelineGroup, ChatBubble), and the dialogs
 * (booking create, invoice create, note edit, note delete).
 *
 * The 360° API is heavily dynamic — many fields arrive as `any` from the
 * Supabase RPC. We keep permissive types here (`any[]`, `Record<string, …>`)
 * to match the original code's runtime shape and avoid forcing 12 narrowing
 * casts at every call site.
 */

import type { ElementType } from 'react';

// ─── Sort + tab types ────────────────────────────────────────────────────────

export type SortOption = 'name' | 'recent' | 'value';

export type Customer360Tab =
  | 'overview'
  | 'timeline'
  | 'jobs'
  | 'quotes'
  | 'invoices'
  | 'payments'
  | 'communication'
  | 'notes';

export type ViewLayout = 'grid' | 'table';

// ─── Status config maps ──────────────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

export interface BookingStatusConfig extends StatusConfig {}

export interface QuoteStatusConfig extends StatusConfig {}

export interface InvoiceStatusConfig extends StatusConfig {
  icon: ElementType;
}

export interface TimelineEventTypeConfig {
  icon: ElementType;
  color: string;
  bg: string;
}

export interface OrderStatusBadgeConfig {
  label: string;
  cls: string;
}

// ─── Customer stats + health score ───────────────────────────────────────────

export interface CustomerStats {
  totalBookings: number;
  totalRevenue: number;
  completedJobs: number;
  avgRating: number;
  outstandingBalance: number;
  totalJobs: number;
}

export interface HealthScoreInputs {
  totalRevenue: number;
  completedJobs: number;
  avgRating: number;
  outstandingBalance: number;
  totalBookings: number;
}

// ─── Timeline grouping (used by Overview + Timeline tabs) ────────────────────

export interface TimelineGroupData {
  label: string;
  events: any[];
}

// ─── Notes (inline edit + delete state) ──────────────────────────────────────

export interface NoteEditState {
  id: string;
  title: string;
  description: string;
}

// ─── Invoice create dialog ───────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
}

// ─── Currency formatter signature (from useCompanyCurrency) ──────────────────

export type CurrencyFormatFn = (amount: number, sourceCurrency?: string) => string;
