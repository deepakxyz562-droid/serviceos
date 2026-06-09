'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  className?: string;
}

/**
 * Consistent stat card component for the stats row in each view.
 * Uses p-4 padding consistently.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-foreground',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4 shrink-0', color)} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={cn('text-lg font-bold truncate', color)}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
