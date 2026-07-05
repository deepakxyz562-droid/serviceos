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
 * Jobber-style view header — large bold title, muted description,
 * optional gradient icon badge, and a right-aligned action slot.
 * Clean, minimal, with generous spacing.
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
    <div className="flex items-start sm:items-center justify-between flex-wrap gap-4 mb-6 animate-fade-up">
      <div className="flex items-center gap-3.5">
        <div
          className={cn(
            'flex items-center justify-center size-11 rounded-xl shrink-0 shadow-sm',
            iconBg
          )}
        >
          <Icon className="size-5 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
