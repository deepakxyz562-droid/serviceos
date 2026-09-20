'use client';

import * as React from 'react';
import { Zap, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export interface LifetimeJobBadgeProps {
  className?: string;
  onUpgradeClick?: () => void;
}

export function LifetimeJobBadge({ className, onUpgradeClick }: LifetimeJobBadgeProps) {
  const router = useRouter();
  const [data, setData] = React.useState<{
    isFreeTier: boolean;
    lifetimeJobsCreated: number;
    lifetimeJobLimit: number;
    remainingJobs: number;
    isLimitReached: boolean;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    fetch('/api/tenant/job-quota')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (mounted && json?.success) {
          setData({
            isFreeTier: json.isFreeTier,
            lifetimeJobsCreated: json.lifetimeJobsCreated,
            lifetimeJobLimit: json.lifetimeJobLimit,
            remainingJobs: json.remainingJobs,
            isLimitReached: json.isLimitReached,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !data || !data.isFreeTier) {
    return null;
  }

  const count = data.lifetimeJobsCreated;
  const limit = data.lifetimeJobLimit || 100;
  const pct = Math.min(100, Math.round((count / limit) * 100));

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      router.push('/billing');
    }
  };

  // Status color logic
  let badgeVariant: 'default' | 'outline' | 'destructive' | 'secondary' = 'secondary';
  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  let progressColor = 'bg-emerald-500';

  if (count >= 100) {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse';
    progressColor = 'bg-rose-500';
  } else if (count >= 80) {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    progressColor = 'bg-amber-500';
  } else if (count >= 50) {
    badgeColor = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    progressColor = 'bg-sky-500';
  }

  return (
    <div className={cn('flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-xs transition-all', badgeColor, className)}>
      <div className="flex items-center gap-1.5">
        {count >= 100 ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        ) : (
          <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span>
          <strong className="font-semibold">{count}</strong> / {limit} Free Lifetime Jobs
        </span>
      </div>

      <div className="w-16 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
        <div
          className={cn('h-full rounded-full transition-all duration-500', progressColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleUpgrade}
        className="h-6 px-2 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 ml-1 rounded"
      >
        <Sparkles className="w-3 h-3 mr-1" />
        Upgrade
      </Button>
    </div>
  );
}
