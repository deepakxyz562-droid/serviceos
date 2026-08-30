'use client';

import * as React from 'react';
import {
  Briefcase, Clock, User, Activity, CheckCircle2, AlertCircle, XCircle,
  Search, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────

export interface JobStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export type JobStatusFilter =
  | 'all'
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export interface JobFiltersProps {
  statusFilter: JobStatusFilter;
  onStatusFilterChange: (filter: JobStatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  onRefresh: () => void;
  stats: JobStats;
}

// ── Chip config ─────────────────────────────────────────────────────────────

const CHIPS = [
  { key: 'all', label: 'All', color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', activeColor: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900', icon: Briefcase },
  { key: 'pending', label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50', activeColor: 'bg-amber-500 text-white border-amber-500', icon: Clock },
  { key: 'assigned', label: 'Assigned', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50', activeColor: 'bg-blue-600 text-white border-blue-600', icon: User },
  { key: 'in_progress', label: 'In Progress', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50', activeColor: 'bg-emerald-600 text-white border-emerald-600', icon: Activity },
  { key: 'completed', label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50', activeColor: 'bg-green-600 text-white border-green-600', icon: CheckCircle2 },
  { key: 'overdue', label: 'Overdue', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50', activeColor: 'bg-red-600 text-white border-red-600', icon: AlertCircle },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:text-zinc-400 dark:border-zinc-800', activeColor: 'bg-zinc-700 text-white border-zinc-700', icon: XCircle },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

/**
 * JobFilters — extracted from jobs-view.tsx (Phase 4.1).
 *
 * Renders the status filter chips (with counts), search input, view toggle
 * (cards/table), and refresh button. All state is controlled by the parent
 * via props — this component is purely presentational.
 */
export function JobFilters({
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  stats,
}: JobFiltersProps) {
  const statsMap: Record<string, number> = {
    all: stats.total,
    pending: stats.pending,
    assigned: stats.assigned,
    in_progress: stats.inProgress,
    completed: stats.completed,
    overdue: stats.overdue,
    cancelled: stats.cancelled,
  };

  return (
    <>
      {/* ─── Status Filter Chips ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => {
          const Icon = chip.icon;
          const isActive = statusFilter === chip.key;
          const isOverdueChip = chip.key === 'overdue';
          const value = statsMap[chip.key] ?? 0;
          return (
            <button
              key={chip.key}
              onClick={() => onStatusFilterChange(isActive ? 'all' : (chip.key as JobStatusFilter))}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors min-h-[36px]',
                isActive ? chip.activeColor : chip.color,
                isOverdueChip && value > 0 && !isActive && 'ring-1 ring-red-300 animate-pulse',
              )}
              title={isOverdueChip && value > 0 ? `${value} job(s) past their scheduled end time` : `Filter: ${chip.label}`}
            >
              <Icon className="size-3.5" />
              <span>{chip.label}</span>
              <span className={cn(
                'ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                isActive ? 'bg-white/25' : 'bg-black/5 dark:bg-white/10',
              )}>
                {value}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Search + View Toggle ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, customer, address..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="hidden sm:flex gap-1 border rounded-md p-0.5">
          <Button size="sm" variant={viewMode === 'cards' ? 'default' : 'ghost'} className="h-9 text-xs px-2 min-h-[44px]" onClick={() => onViewModeChange('cards')}>Cards</Button>
          <Button size="sm" variant={viewMode === 'table' ? 'default' : 'ghost'} className="h-9 text-xs px-2 min-h-[44px]" onClick={() => onViewModeChange('table')}>Table</Button>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>
    </>
  );
}

export default JobFilters;
