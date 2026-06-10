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
 * Enterprise view header with gradient icon, better typography, and responsive layout.
 */
export function ViewHeader({
  icon: Icon,
  iconBg = 'bg-gradient-to-br from-emerald-500 to-teal-500',
  title,
  description,
  action,
  badge,
}: ViewHeaderProps) {
  return (
    <div className="flex items-start sm:items-center justify-between flex-wrap gap-3 sm:gap-4 mb-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center justify-center size-10 rounded-xl shrink-0 shadow-sm',
            iconBg
          )}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold truncate">{title}</h2>
            {badge}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
