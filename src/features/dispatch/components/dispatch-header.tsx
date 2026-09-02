'use client';

/**
 * DispatchHeader — Operational Command Center Header
 * ---------------------------------------------------
 * Provides operational context (date, job counts, connection state) and primary
 * actions without technical debugging noise.
 */

import { Radio, RefreshCw, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DispatchConnectionInfo } from '../hooks/use-dispatch-connection';
import type { DispatchSummary } from '../types';

export interface DispatchHeaderProps {
  summary: DispatchSummary;
  connection: DispatchConnectionInfo;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenAssignJob: () => void;
  onOpenAutoAssign: () => void;
}

export function DispatchHeader({
  summary,
  connection,
  isRefreshing,
  onRefresh,
  onOpenAssignJob,
  onOpenAutoAssign,
}: DispatchHeaderProps) {
  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const totalJobs = summary.onJobCount + summary.enRouteCount + summary.unassignedCount;

  return (
    <header className="flex items-center justify-between flex-wrap gap-2 mb-3 shrink-0">
      {/* Title & Today Context */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center size-9 rounded-xl bg-teal-600 shadow-md shadow-teal-600/20 shrink-0 text-white">
          <Radio className="size-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground leading-none truncate">
              Live Dispatch
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Today · {todayStr}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
            {summary.teamCount} technician{summary.teamCount !== 1 ? 's' : ''} · {totalJobs} active job{totalJobs !== 1 ? 's' : ''}
            {summary.unassignedCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                · {summary.unassignedCount} need assignment
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                · All assigned
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Connection status & action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Connection state pill with last updated time */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium cursor-help transition-colors ${connection.badgeClass}`}
              >
                <span className="relative flex size-2">
                  {connection.state === 'live' && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex size-2 rounded-full ${connection.dotClass}`} />
                </span>
                <span>{connection.label}</span>
                <span className="text-[10px] opacity-70 ml-0.5">· {connection.lastUpdatedText}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {connection.state === 'live'
                ? 'Realtime updates active — GPS telemetry streams live'
                : connection.state === 'syncing'
                ? 'Syncing via background polling — markers refresh every 5s'
                : 'Connection lost — showing cached technician and job data'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 text-xs gap-1.5 border-border"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* Secondary: Auto-Assign (Modal Trigger) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAutoAssign}
          disabled={summary.unassignedCount === 0}
          className="h-8 text-xs gap-1.5 border-teal-200 text-teal-700 bg-teal-50/50 hover:bg-teal-100/60 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300"
        >
          <Sparkles className="size-3.5" />
          <span>Auto-Assign</span>
          {summary.unassignedCount > 0 && (
            <span className="size-4 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-bold">
              {summary.unassignedCount}
            </span>
          )}
        </Button>

        {/* Primary: + Assign Job */}
        <Button
          size="sm"
          onClick={onOpenAssignJob}
          className="h-8 text-xs gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm font-medium"
        >
          <Plus className="size-3.5" />
          <span>Assign Job</span>
        </Button>
      </div>
    </header>
  );
}
