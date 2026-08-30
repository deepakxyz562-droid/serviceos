'use client';

/**
 * AIInsightsSheet — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * Slide-out Sheet that displays AI-generated pipeline insights:
 *   - 2×2 grid of metric cards (New / At Risk / Won / Lost over the last
 *     24 hours)
 *   - AI summary text (with model + timestamp footer)
 *
 * Pure presentational — the parent owns the `showInsights` state and the
 * `loadInsights` fetcher. The parent passes the cached `insightsData`
 * (null = never loaded) and the `insightsLoading` flag for skeletons.
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import { format, parseISO } from 'date-fns';
import {
  Sparkles, RefreshCw, Plus, AlertCircle, Trophy, XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { InsightsResponse } from '@/features/pipeline/types';

export interface AIInsightsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insightsData: InsightsResponse | null;
  insightsLoading: boolean;
  onRefresh: () => void;
}

export function AIInsightsSheet({
  open,
  onOpenChange,
  insightsData,
  insightsLoading,
  onRefresh,
}: AIInsightsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] sm:max-w-none p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              AI Insights
            </SheetTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={insightsLoading}
              className="h-7 text-xs"
            >
              <RefreshCw className={cn('size-3 mr-1', insightsLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
          <SheetDescription className="sr-only">
            AI-generated pipeline analysis
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Last 24 hours metric cards — 2x2 grid */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Last 24 Hours
            </p>
            <div className="grid grid-cols-2 gap-3">
              {insightsLoading ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </>
              ) : (
                <>
                  {/* New */}
                  <Card className="p-3 border-blue-200 bg-blue-50/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-blue-700 uppercase">New</p>
                        <p className="text-xl font-bold text-blue-700">
                          {insightsData?.metrics.new ?? 0}
                        </p>
                      </div>
                      <div className="flex items-center justify-center size-8 rounded-md bg-blue-100">
                        <Plus className="size-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">deals added</p>
                  </Card>

                  {/* At Risk */}
                  <Card className="p-3 border-amber-200 bg-amber-50/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-amber-700 uppercase">At Risk</p>
                        <p className="text-xl font-bold text-amber-700">
                          {insightsData?.metrics.atRisk ?? 0}
                        </p>
                      </div>
                      <div className="flex items-center justify-center size-8 rounded-md bg-amber-100">
                        <AlertCircle className="size-4 text-amber-600" />
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">going stale</p>
                  </Card>

                  {/* Won */}
                  <Card className="p-3 border-emerald-200 bg-emerald-50/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-emerald-700 uppercase">Won</p>
                        <p className="text-xl font-bold text-emerald-700">
                          {insightsData?.metrics.won ?? 0}
                        </p>
                      </div>
                      <div className="flex items-center justify-center size-8 rounded-md bg-emerald-100">
                        <Trophy className="size-4 text-emerald-600" />
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">closed-won</p>
                  </Card>

                  {/* Lost */}
                  <Card className="p-3 border-red-200 bg-red-50/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-red-700 uppercase">Lost</p>
                        <p className="text-xl font-bold text-red-700">
                          {insightsData?.metrics.lost ?? 0}
                        </p>
                      </div>
                      <div className="flex items-center justify-center size-8 rounded-md bg-red-100">
                        <XCircle className="size-4 text-red-600" />
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">closed-lost</p>
                  </Card>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* AI summary text */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="size-3 text-purple-600" />
              Pipeline Analysis
            </p>
            {insightsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-9/12" />
              </div>
            ) : insightsData ? (
              <Card className="p-3 bg-purple-50/30 border-purple-200">
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {insightsData.summary}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-200">
                  <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                    {insightsData.aiModel === 'fallback' ? 'fallback' : 'AI-generated'}
                  </Badge>
                  {insightsData.generatedAt && (
                    <span className="text-[9px] text-muted-foreground">
                      {format(parseISO(insightsData.generatedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  )}
                </div>
              </Card>
            ) : (
              <p className="text-xs text-muted-foreground">
                Click &quot;Refresh&quot; to generate insights.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
