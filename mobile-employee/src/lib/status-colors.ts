/**
 * Fieseros Mobile App — Status → Badge Variant Mapping (canonical)
 *
 * Replaces the per-screen LIFECYCLE_BADGE_VARIANT tables that previously
 * collapsed several lifecycle states into the same color (e.g. on mobile
 * 'accepted' / 'travelling' / 'arrived' were all blue, and 'working' /
 * 'paused' were both yellow). The PWA employee portal uses 11 distinct
 * color tokens; this helper aligns mobile with that palette so an employee
 * switching between platforms sees consistent semantics — most importantly,
 * 'working' is GREEN (success) on both, not yellow on mobile.
 *
 * Canonical mapping (matches src/components/job/* on the PWA):
 *   emerald → success   : assigned / completed / invoice_generated / paid / active
 *   blue    → info      : accepted / travelling / arrived / confirmed / sent / in_stock
 *   amber   → warning   : pending / paused / low_stock / draft
 *   rose    → destructive: cancelled / rejected / overdue / out_of_stock / failed
 *   violet  → primary   : (custom — 'in_progress' was violet on PWA; mapped to
 *                          primary since the mobile Badge has no violet variant)
 *   slate   → default   : unknown / fallback
 *   cyan    → info      : (collapsed into info on mobile)
 *
 * BadgeVariant is the union accepted by src/components/ui/Badge.tsx.
 */

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info';

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  // Job lifecycle (employee portal)
  assigned: 'primary',
  accepted: 'info',
  travelling: 'info',
  arrived: 'info',
  working: 'success',
  paused: 'warning',
  completed: 'success',
  invoice_generated: 'success',
  cancelled: 'destructive',

  // Legacy / generic job statuses
  pending: 'warning',
  in_progress: 'primary',
  en_route: 'info',
  on_site: 'info',
  confirmed: 'primary',
  active: 'success',
  rejected: 'destructive',
  failed: 'destructive',
  draft: 'warning',
  sent: 'info',
  paid: 'success',
  overdue: 'destructive',

  // Inventory
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'destructive',

  // Booking statuses
  pending_payment: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  invoice_generated: 'Invoice Generated',
  in_progress: 'In Progress',
  en_route: 'En Route',
  on_site: 'On Site',
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  pending_payment: 'Pending Payment',
};

/**
 * Resolve a status string (job lifecycle, expense status, inventory status,
 * etc.) to the canonical Badge variant. Unknown / unmapped statuses fall
 * back to 'default' (slate).
 *
 * @example
 *   getStatusVariant('working')        // 'success'  (green — was 'warning' on mobile)
 *   getStatusVariant('completed')      // 'success'
 *   getStatusVariant('cancelled')      // 'destructive'
 *   getStatusVariant('paused')         // 'warning'
 *   getStatusVariant('something_new')  // 'default'
 */
export function getStatusVariant(status: string | null | undefined): BadgeVariant {
  if (!status || typeof status !== 'string') return 'default';
  const key = status.toLowerCase().trim();
  return STATUS_VARIANT_MAP[key] ?? 'default';
}

/**
 * Pretty-print a status: replaces underscores with spaces and title-cases
 * the words, with a few friendly overrides (e.g. 'invoice_generated' →
 * 'Invoice Generated' rather than 'Invoice generated').
 */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status || typeof status !== 'string') return '';
  const key = status.toLowerCase().trim();
  if (STATUS_LABEL_MAP[key]) return STATUS_LABEL_MAP[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
