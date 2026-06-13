'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

/**
 * Enterprise stat card with hover effects, trend indicator, and gradient icon background.
 * Uses consistent p-4 padding.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-foreground',
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-4 card-hover group', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
          <p className={cn('text-xl font-bold mt-1 truncate', color)}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  trend.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-[11px] text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex items-center justify-center size-10 rounded-xl shrink-0',
            'bg-muted/50 group-hover:bg-muted transition-colors'
          )}
        >
          <Icon className={cn('size-5', color)} />
        </div>
      </div>
    </Card>
  );
}
