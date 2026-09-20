'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

/**
 * JobCounterBar — shows the user's job usage progress on the free plan.
 *
 * Displays: "47 / 100 free jobs used" with a progress bar.
 * Only shows for free plan users (paid plans have unlimited jobs).
 * Shows a warning at 80%+ and celebration at 100%.
 */
export function JobCounterBar({ className = '' }: { className?: string }) {
  const [data, setData] = useState<{ used: number; limit: number; remaining: number; percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant/job-quota')
      .then((res) => res.json())
      .then((d) => {
        if (d.used !== undefined && d.limit && d.limit > 0) {
          const used = d.used || 0;
          const limit = d.limit;
          const remaining = Math.max(0, limit - used);
          const percentage = Math.min((used / limit) * 100, 100);
          setData({ used, limit, remaining, percentage });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="size-3 animate-spin" />
        <span>Loading job usage...</span>
      </div>
    );
  }

  if (!data) return null; // Paid plan or no data

  const isUrgent = data.percentage >= 80;
  const isComplete = data.remaining === 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`size-3.5 ${isUrgent ? 'text-amber-500' : 'text-emerald-500'}`} />
          <span className="font-medium text-slate-700">
            {isComplete ? 'Free jobs limit reached' : `${data.used} / ${data.limit} free jobs`}
          </span>
        </div>
        <span className={`text-[10px] font-medium ${isUrgent ? 'text-amber-600' : 'text-slate-400'}`}>
          {data.remaining > 0 ? `${data.remaining} remaining` : 'Upgrade for unlimited'}
        </span>
      </div>
      <Progress
        value={data.percentage}
        className={`h-1.5 ${isUrgent ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
      />
      {isUrgent && !isComplete && (
        <p className="text-[10px] text-amber-600 font-medium">
          You're running low on free jobs. <a href="/billing" className="underline">Upgrade to CRM</a> for unlimited jobs.
        </p>
      )}
      {isComplete && (
        <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">
          100 jobs completed — upgrade for unlimited
        </Badge>
      )}
    </div>
  );
}
