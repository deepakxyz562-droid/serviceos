'use client';

/**
 * KpiCard — small bordered stat tile for the Customer 360° KPI row.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Distinct from the shared `StatCard` (`@/components/shared/stat-card`) — the
 * 360° view uses a compact 2xl-value card with a colored left border and a
 * tinted icon, which the shared `StatCard` doesn't model. The shared
 * `StatCard` is used by other views (inventory, dashboard) for its own
 * trend-aware layout.
 */

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ElementType } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ElementType;
  accent?: string;
  borderColor?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'text-emerald-400',
  borderColor = 'border-l-emerald-500',
}: KpiCardProps) {
  return (
    <Card className={cn(
      'bg-card border-border border-l-4 transition-all duration-200 hover:shadow-md',
      borderColor
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <Icon className={cn('size-4', accent)} />
        </div>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-extrabold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
