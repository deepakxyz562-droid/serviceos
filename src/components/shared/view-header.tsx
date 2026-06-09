'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewHeaderProps {
  icon: LucideIcon;
  iconBg?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

/**
 * Consistent header component for all views.
 * Provides icon + title + description + optional action button on the right.
 */
export function ViewHeader({
  icon: Icon,
  iconBg = 'bg-emerald-600',
  title,
  description,
  action,
  badge,
}: ViewHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center justify-center size-10 rounded-lg shrink-0',
            iconBg
          )}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold truncate">{title}</h2>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
