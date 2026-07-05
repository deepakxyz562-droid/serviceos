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
 * Jobber-style stat card — clean white surface, soft shadow, subtle border,
 * muted label, bold value, optional trend indicator.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-emerald-600 dark:text-emerald-400',
  trend,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'p-5 card-shadow card-hover border-border/70 rounded-xl',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted-foreground font-medium truncate">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1.5 tracking-tight text-foreground truncate">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.value >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.value >= 0 ? '↑ ' : '↓ '}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex items-center justify-center size-10 rounded-xl shrink-0',
            'bg-muted/60'
          )}
        >
          <Icon className={cn('size-5', color)} />
        </div>
      </div>
    </Card>
  );
}
