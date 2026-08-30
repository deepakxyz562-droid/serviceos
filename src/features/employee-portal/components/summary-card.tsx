'use client';

/**
 * SummaryCard — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Presentational KPI tile used in the "Today's Summary" grid at the top of the
 * portal dashboard. Four of these render side-by-side: jobs assigned, jobs
 * completed, hours worked, travel distance.
 *
 * The parent owns the value computation (formatting minutes / meters happens
 * before passing the string in); this component just renders the accent +
 * icon + label + value.
 */

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type Accent = 'emerald' | 'green' | 'cyan' | 'purple';

const ACCENT_CLASSES: Record<Accent, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  green: 'bg-green-50 text-green-700',
  cyan: 'bg-cyan-50 text-cyan-700',
  purple: 'bg-purple-50 text-purple-700',
};

export interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  accent: Accent;
}

export function SummaryCard({ icon, label, value, accent }: SummaryCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className={`size-8 rounded-lg flex items-center justify-center mb-2 ${ACCENT_CLASSES[accent]}`}>
          {icon}
        </div>
        <div className="text-lg sm:text-xl font-bold leading-tight">{value}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}
