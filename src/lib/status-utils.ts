/**
 * status-utils.ts
 * ===============
 * Shared status color/icon helpers.
 *
 * getStatusColor and getPriorityColor were duplicated across 6+ view files,
 * each with slightly different color maps. This file provides domain-aware
 * status styling.
 *
 * USAGE:
 *   import { getStatusColor, getPriorityColor } from '@/lib/status-utils';
 *   const badgeClass = getStatusColor('jobs', 'pending');
 */

// ── Job status colors ────────────────────────────────────────────────────────

const JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

// ── Lead status colors ───────────────────────────────────────────────────────

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacted: 'bg-amber-100 text-amber-700 border-amber-200',
  qualified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  converted: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

// ── Invoice status colors ────────────────────────────────────────────────────

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  void: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  partially_paid: 'bg-amber-100 text-amber-700 border-amber-200',
};

// ── Employee status colors ───────────────────────────────────────────────────

const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  invited: 'bg-amber-100 text-amber-700 border-amber-200',
};

// ── Default fallback ─────────────────────────────────────────────────────────

const DEFAULT_COLOR = 'bg-gray-100 text-gray-600 border-gray-200';

/**
 * Get a Badge className for a status, domain-aware.
 *
 *   getStatusColor('jobs', 'pending')     → 'bg-amber-100 text-amber-700 ...'
 *   getStatusColor('invoices', 'paid')    → 'bg-green-100 text-green-700 ...'
 *   getStatusColor('leads', 'new')        → 'bg-blue-100 text-blue-700 ...'
 *   getStatusColor('employees', 'active') → 'bg-emerald-100 text-emerald-700 ...'
 */
export function getStatusColor(
  domain: 'jobs' | 'leads' | 'invoices' | 'employees',
  status: string
): string {
  const maps = {
    jobs: JOB_STATUS_COLORS,
    leads: LEAD_STATUS_COLORS,
    invoices: INVOICE_STATUS_COLORS,
    employees: EMPLOYEE_STATUS_COLORS,
  };
  return (maps[domain]?.[status]) || DEFAULT_COLOR;
}

/**
 * Get a Badge className for a priority level.
 */
export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[priority] || DEFAULT_COLOR;
}

/**
 * Get a dot color for a status (for presence indicators).
 */
export function getStatusDot(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-emerald-500',
    online: 'bg-emerald-500',
    offline: 'bg-slate-400',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
    inactive: 'bg-slate-400',
    suspended: 'bg-red-500',
    invited: 'bg-amber-500',
  };
  return map[status] || 'bg-slate-400';
}
