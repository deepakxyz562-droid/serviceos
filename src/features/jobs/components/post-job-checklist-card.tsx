'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from '@/lib/post-job-checklist';

interface PostJobChecklistCardProps {
  jobId: string;
}

export function PostJobChecklistCard({ jobId }: PostJobChecklistCardProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/jobs/${jobId}/post-checklist`)
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items);
      })
      .catch(() => {/* silent — checklist is non-critical */})
      .finally(() => setLoading(false));
  }, [jobId]);

  if (!loading && items.length === 0) return null;

  const doneCount = items.filter((i) => i.status === 'done').length;
  const totalCount = items.length;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="size-4 text-emerald-600" />
            Post-Job Smart Checklist
          </CardTitle>
          {!loading && (
            <span className="text-xs text-muted-foreground font-medium">
              {doneCount}/{totalCount} done
            </span>
          )}
        </div>
        <CardDescription className="text-xs">
          Recommended next actions to close this job properly
        </CardDescription>
        {/* Progress bar */}
        {!loading && totalCount > 0 && (
          <div className="w-full h-1.5 bg-muted rounded-full mt-1">
            <div
              className="h-1.5 bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 last:pb-0 first:pt-0">
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {item.status === 'done' ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/50" />
                  )}
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      item.status === 'done'
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground',
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>

                {/* Action / due date */}
                <div className="shrink-0 flex items-center gap-2">
                  {item.status === 'pending' && item.dueInDays === 0 && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      Today
                    </span>
                  )}
                  {item.status === 'pending' && item.dueInDays > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      in {item.dueInDays}d
                    </span>
                  )}
                  {item.status === 'pending' && item.actionUrl && (
                    <a
                      href={item.actionUrl}
                      className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      Go <ExternalLink className="size-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
