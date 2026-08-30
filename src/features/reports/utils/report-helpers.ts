/**
 * Reports feature helpers.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * Pure helpers, constants, chart configs, and color palettes for the
 * Reports view and its 7 detail tabs. Where a helper duplicates a Phase 0
 * shared util (formatNumber, getInitials), we import from
 * `@/lib/format-utils` — these are NOT redefined here.
 */

import type { ChartConfig } from '@/components/ui/chart';

// ============================================================
// Sales Outcomes — date-range presets
// ============================================================

/**
 * Date-range presets for the Sales Pipeline tab. Maps the dropdown value
 * to a { from, to } pair of YYYY-MM-DD strings used in the API query.
 *
 * Distinct from the global date-range dropdown because the Sales Pipeline
 * tab exposes additional presets (This year, All time, Custom range).
 */
export const SALES_OUTCOMES_RANGE_PRESETS: Record<
  string,
  { label: string; from: string; to: string }
> = (() => {
  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

  return {
    week: { label: 'Last week', from: toISO(shift(-7)), to: toISO(today) },
    '30d': { label: 'Last 30 days', from: toISO(shift(-30)), to: toISO(today) },
    month: { label: 'Last month', from: toISO(shift(-30)), to: toISO(today) },
    this_month: {
      label: 'This month',
      from: toISO(startOfMonth(today)),
      to: toISO(today),
    },
    year: { label: 'This year', from: toISO(startOfYear(today)), to: toISO(today) },
    '12m': { label: 'Last 12 months', from: toISO(shift(-365)), to: toISO(today) },
    all: { label: 'All time', from: '2000-01-01', to: toISO(today) },
    // 'custom' is a sentinel — when selected, the user manually picks
    // from/to via the date inputs below the dropdown.
    custom: { label: 'Custom range', from: toISO(shift(-30)), to: toISO(today) },
  };
})();

// ============================================================
// Chart Configs
// ============================================================

export const revenueChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: '#10b981' },
};

export const jobCompletionConfig: ChartConfig = {
  completed: { label: 'Completed', color: '#10b981' },
  inProgress: { label: 'In Progress', color: '#14b8a6' },
  pending: { label: 'Pending', color: '#f59e0b' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

export const jobsByStatusConfig: ChartConfig = {
  pending: { label: 'Pending', color: '#f59e0b' },
  assigned: { label: 'Assigned', color: '#14b8a6' },
  in_progress: { label: 'In Progress', color: '#10b981' },
  completed: { label: 'Completed', color: '#059669' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

export const serviceRevenueConfig: ChartConfig = {
  jobs: { label: 'Jobs', color: '#14b8a6' },
};

export const revenueSourceConfig: ChartConfig = {
  leads: { label: 'Leads', color: '#14b8a6' },
};

export const workloadConfig: ChartConfig = {
  jobs: { label: 'Completed Jobs', color: '#14b8a6' },
};

export const leadTrendConfig: ChartConfig = {
  leads: { label: 'New Leads', color: '#10b981' },
  converted: { label: 'Converted', color: '#14b8a6' },
};

export const leadSourceConfig: ChartConfig = {
  count: { label: 'Leads', color: '#10b981' },
};

export const whatsappVolumeConfig: ChartConfig = {
  conversations: { label: 'Conversations', color: '#10b981' },
};

export const intentConfig: ChartConfig = {
  count: { label: 'Requests', color: '#10b981' },
};

export const journeyStageConfig: ChartConfig = {
  count: { label: 'Customers', color: '#10b981' },
};

export const journeyTimeConfig: ChartConfig = {
  hours: { label: 'Avg Hours', color: '#14b8a6' },
};

// ============================================================
// Color palettes (used for dynamic data from API records)
// ============================================================

export const SOURCE_COLOR_PALETTE = [
  '#10b981', '#14b8a6', '#2dd4bf', '#5eead4',
  '#99f6e4', '#a7f3d0', '#94a3b8', '#f59e0b',
];

export const INTENT_COLOR_PALETTE = [
  '#10b981', '#14b8a6', '#2dd4bf', '#f59e0b',
  '#5eead4', '#99f6e4', '#a7f3d0', '#94a3b8',
];

export const JOB_STATUS_COLOR_MAP: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#14b8a6',
  in_progress: '#10b981',
  en_route: '#06b6d4',
  completed: '#059669',
  cancelled: '#ef4444',
  on_hold: '#94a3b8',
};

export const JOB_STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  en_route: 'En Route',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

// ============================================================
// Pure helpers
// ============================================================

/**
 * Format a YYYY-MM[-DD] date key as a short chart label, depending on
 * whether the API grouped by `month` or `day`.
 */
export function formatRevenueDate(dateKey: string, groupBy: string): string {
  if (groupBy === 'month') {
    const [year, month] = dateKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = parseInt(month, 10) - 1;
    if (idx >= 0 && idx < 12) return monthNames[idx];
    return dateKey;
  }
  if (groupBy === 'day') {
    const parts = dateKey.split('-');
    if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  }
  return dateKey;
}

/**
 * Title-case a snake/kebab-case API key (e.g. "in_progress" → "In progress").
 */
export function humanizeKey(key: string): string {
  return key
    .charAt(0)
    .toUpperCase()
    .concat(key.slice(1).replace(/[_-]/g, ' '));
}
