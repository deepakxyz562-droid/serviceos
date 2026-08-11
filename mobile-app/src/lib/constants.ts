/**
 * Fieseros Mobile App — Constants
 * Centralized brand, API, and domain configuration.
 * Lifecycle / status values are aligned with the PWA (web) portals.
 */

export const BRAND = {
  name: 'Fieseros',
  tagline: 'The Operating System for Service Businesses',
  domain: 'fieseros.com',
} as const;

/**
 * API base URL.
 * For a production native app we talk directly to the backend (no gateway).
 * Configurable via EXPO_PUBLIC_API_BASE_URL for dev / staging / prod.
 */
export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) || 'https://fieseros.com';

export const API_TIMEOUT_MS = 30000;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'fieseros_auth_token',
  REFRESH_TOKEN: 'fieseros_refresh_token',
  USER_DATA: 'fieseros_user_data',
  ACTIVE_ROLE: 'fieseros_active_role',
  SELECTED_CITY: 'fieseros_selected_city',
  THEME: 'fieseros_theme',
  LAST_COMPANY_SLUG: 'fieseros_last_company_slug',
  LAST_COMPANY_DATA: 'fieseros_last_company_data',
} as const;

/**
 * API endpoint paths used by the app.
 * Centralized so a path change only needs one edit.
 */
export const API_PATHS = {
  // Company / tenant resolution (public)
  companiesSearch: '/api/companies/search',
  companiesResolve: '/api/companies/resolve',

  // Customer auth
  customerDiscover: '/api/auth/customer/discover',
  customerSendOtp: '/api/auth/customer/send-otp',
  customerVerifyOtp: '/api/auth/customer/verify-otp',
  customerLogin: '/api/auth/customer/login',
  customerMagicLink: '/api/auth/customer/exchange-magic-link',
  customerActivate: '/api/auth/customer/activate',

  // Employee / admin auth
  companyLogin: '/api/auth/company-login',

  // Shared
  authMe: '/api/auth/me',
  authRefresh: '/api/auth/refresh',
  authLogout: '/api/auth/logout',
} as const;

export const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#ECFDF5',
  accent: '#F59E0B',
  background: '#FFFFFF',
  foreground: '#1F2937',
  muted: '#F3F4F6',
  mutedForeground: '#6B7280',
  border: '#E5E7EB',
  destructive: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  // customer portal accent (teal) vs employee (emerald)
  customerAccent: '#0D9488',
} as const;

export type UserRole = 'customer' | 'employee';

/**
 * Employee job lifecycle — MUST match the PWA employee portal (V1.5).
 * assigned → accepted → travelling → arrived → working → (paused) → completed → invoice_generated
 */
export const JOB_LIFECYCLE = [
  'assigned',
  'accepted',
  'travelling',
  'arrived',
  'working',
  'paused',
  'completed',
  'invoice_generated',
] as const;

export type JobLifecycleState = (typeof JOB_LIFECYCLE)[number];

/**
 * Legacy / fallback statuses still returned by some endpoints.
 * These are mapped to lifecycle states for display.
 */
export const JOB_STATUSES = [
  'pending',
  'assigned',
  'accepted',
  'travelling',
  'arrived',
  'working',
  'paused',
  'completed',
  'invoice_generated',
  'cancelled',
] as const;

/**
 * Lifecycle transitions available in each state — matches PWA
 * employee-portal-layout.tsx action button logic.
 */
export const LIFECYCLE_TRANSITIONS: Record<string, { action: string; label: string; next: string }[]> = {
  assigned: [{ action: 'accept', label: 'Accept Job', next: 'accepted' }],
  accepted: [{ action: 'start_travel', label: 'Start Travel', next: 'travelling' }],
  travelling: [{ action: 'arrive', label: 'Mark Arrived', next: 'arrived' }],
  arrived: [{ action: 'start_work', label: 'Start Work', next: 'working' }],
  working: [
    { action: 'pause', label: 'Pause', next: 'paused' },
    { action: 'complete', label: 'Complete Job', next: 'completed' },
  ],
  paused: [{ action: 'resume', label: 'Resume Work', next: 'working' }],
  completed: [],
  invoice_generated: [],
};

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'assigned',
  'en_route',
  'in_progress',
  'completed',
  'cancelled',
] as const;

/**
 * Booking timeline steps for the customer detail screen.
 * Matches the PWA customer portal — includes the 'assigned' step.
 */
export const BOOKING_TIMELINE_STEPS = [
  'pending',
  'confirmed',
  'assigned',
  'en_route',
  'in_progress',
  'completed',
] as const;

export const INVENTORY_STATUS = ['in_stock', 'low_stock', 'out_of_stock'] as const;

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
] as const;

export const SHIFT_STATUSES = ['off_duty', 'clocked_in', 'on_break', 'clocked_out'] as const;

/**
 * Marketplace sort options — matches PWA marketplace browser.
 */
export const MARKETPLACE_SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviewed' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'verified_first', label: 'Verified First' },
] as const;
