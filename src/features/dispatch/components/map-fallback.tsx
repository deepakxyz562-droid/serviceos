'use client';

/**
 * MapFallback — Graceful Operational Map Fallback
 * ------------------------------------------------
 * Ensures dispatch workflows (queue, assignment, roster inspection)
 * remain 100% operational when Google Maps script or WebGL is unavailable.
 */

import { MapPinOff, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MapFallbackProps {
  onRetry?: () => void;
  teamCount?: number;
  unassignedCount?: number;
}

export function MapFallback({ onRetry, teamCount = 0, unassignedCount = 0 }: MapFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px] p-6 text-center bg-muted/20 border rounded-2xl">
      <div className="flex items-center justify-center size-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 dark:bg-teal-950/50 dark:border-teal-800 dark:text-teal-300 mb-3.5 shadow-xs">
        <MapPinOff className="size-6.5" />
      </div>

      <h3 className="text-sm font-bold text-foreground">
        Live Map Visualization Offline
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-relaxed">
        The interactive map view is temporarily unavailable. All dispatch workflows, technician assignment, and job tracking remain fully operational via the sidebar.
      </p>

      {/* Operational reassurance stats */}
      <div className="flex items-center gap-3 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-card border border-border mb-4">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          {teamCount} Techs Online
        </span>
        <span className="text-border">|</span>
        <span className="text-foreground">
          {unassignedCount} Jobs in Queue
        </span>
      </div>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="h-8 text-xs gap-1.5 bg-background shadow-xs border-border"
        >
          <RefreshCw className="size-3.5 text-muted-foreground" />
          <span>Retry Map Connection</span>
        </Button>
      )}
    </div>
  );
}
