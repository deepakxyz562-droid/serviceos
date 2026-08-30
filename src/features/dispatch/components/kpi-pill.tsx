'use client';

/**
 * KpiPill — Phase 6E extraction from dispatch-view.tsx.
 *
 * The small KPI badge used in the DispatchView header bar (Fleet / On-Duty /
 * En-Route / On-Job / Available / Unassigned). Pure presentational.
 *
 * Extracted from src/components/views/dispatch-view.tsx (Phase 6E refactor).
 */

import type { LucideIcon } from 'lucide-react';

export interface KpiPillProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
}

export function KpiPill({ icon: Icon, label, value, color }: KpiPillProps) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-xs">
      <Icon className={`size-3 ${color}`} />
      <span className="font-semibold">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
