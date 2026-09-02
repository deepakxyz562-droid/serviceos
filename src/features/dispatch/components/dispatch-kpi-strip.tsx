'use client';

/**
 * DispatchKpiStrip — Actionable Operational Status Strip
 * --------------------------------------------------------
 * Displays high-level counts derived from the canonical DispatchSummary.
 * Allows filtering the queue directly by clicking on status pills.
 */

import { Users, CircleDot, Navigation, Activity, AlertTriangle, Briefcase } from 'lucide-react';
import type { DispatchSummary } from '../types';

export interface DispatchKpiStripProps {
  summary: DispatchSummary;
  activeFilter: string; // 'all' | 'unassigned' | 'available' | 'en_route' | 'on_job'
  onSelectFilter: (filter: string) => void;
  showAttention: boolean;
  onToggleAttention: () => void;
}

export function DispatchKpiStrip({
  summary,
  activeFilter,
  onSelectFilter,
  showAttention,
  onToggleAttention,
}: DispatchKpiStripProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-2.5 shrink-0">
      {/* Total Team */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'all' ? 'all' : 'all')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
          activeFilter === 'all'
            ? 'bg-card border-border shadow-xs'
            : 'bg-muted/30 border-transparent hover:border-border text-muted-foreground'
        }`}
      >
        <Users className="size-3.5 text-slate-500" />
        <span className="font-semibold text-foreground">{summary.teamCount}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Team</span>
      </button>

      {/* Available */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'available' ? 'all' : 'available')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
          activeFilter === 'available'
            ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-xs dark:bg-teal-950/40 dark:border-teal-700 dark:text-teal-200'
            : 'bg-card border-border hover:border-teal-200 text-foreground'
        }`}
      >
        <CircleDot className="size-3.5 text-teal-600" />
        <span className="font-semibold">{summary.availableCount}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Available</span>
      </button>

      {/* En Route */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'en_route' ? 'all' : 'en_route')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
          activeFilter === 'en_route'
            ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs dark:bg-sky-950/40 dark:border-sky-700 dark:text-sky-200'
            : 'bg-card border-border hover:border-sky-200 text-foreground'
        }`}
      >
        <Navigation className="size-3.5 text-sky-600" />
        <span className="font-semibold">{summary.enRouteCount}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">En Route</span>
      </button>

      {/* On Job */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'on_job' ? 'all' : 'on_job')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
          activeFilter === 'on_job'
            ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
            : 'bg-card border-border hover:border-amber-200 text-foreground'
        }`}
      >
        <Activity className="size-3.5 text-amber-600" />
        <span className="font-semibold">{summary.onJobCount}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">On Job</span>
      </button>

      {/* Unassigned — Prominent Callout */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'unassigned' ? 'all' : 'unassigned')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
          summary.unassignedCount > 0
            ? activeFilter === 'unassigned'
              ? 'bg-orange-100 border-orange-400 text-orange-900 ring-2 ring-orange-300/50 shadow-xs dark:bg-orange-950/60 dark:border-orange-600 dark:text-orange-200'
              : 'bg-orange-50/80 border-orange-200 text-orange-700 hover:bg-orange-100/60 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300'
            : 'bg-muted/40 border-border text-muted-foreground'
        }`}
      >
        <Briefcase className={`size-3.5 ${summary.unassignedCount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
        <span className="font-bold">{summary.unassignedCount}</span>
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          {summary.unassignedCount > 0 ? 'Needs Assignment' : 'Unassigned'}
        </span>
        {activeFilter === 'unassigned' && (
          <span className="text-[9px] font-bold px-1 rounded bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
            Active
          </span>
        )}
      </button>

      {/* Attention Overlay Button */}
      {summary.attentionCount > 0 && (
        <button
          type="button"
          onClick={onToggleAttention}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
            showAttention
              ? 'bg-amber-200 border-amber-400 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
          }`}
        >
          <AlertTriangle className="size-3 text-amber-600" />
          <span className="font-bold">{summary.attentionCount}</span>
          <span className="text-[10px] font-medium">Alerts</span>
        </button>
      )}
    </div>
  );
}
