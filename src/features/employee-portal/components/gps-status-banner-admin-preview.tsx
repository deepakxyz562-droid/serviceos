'use client';

/**
 * GpsStatusBannerAdminPreview — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Admin-preview variant of the GpsStatusBanner. Mirrors the banner that real
 * employees see on /portal/[id] (see employee-portal-layout.tsx) but is driven
 * by props because the admin preview's GPS provider lives in the wrapper, not
 * the layout. Shows:
 *   - Amber banner if location permission was denied (error)
 *   - Live / Stale / Offline banner with pulsing dot + "Re-sync" button when
 *     active
 *   - Always notes "preview mode — no real pings sent" so the admin knows the
 *     dispatch map is NOT being updated by this preview.
 *
 * Returns null when GPS is not active.
 */

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GpsStatus } from '@/features/employee-portal/types';

export interface GpsStatusBannerAdminPreviewProps {
  gpsActive: boolean;
  status: GpsStatus;
  lastPing: Date | null;
  error: string | null;
  onResync: () => void;
}

export function GpsStatusBannerAdminPreview({
  gpsActive,
  status,
  lastPing,
  error,
  onResync,
}: GpsStatusBannerAdminPreviewProps) {
  if (!gpsActive) return null;

  const ago = lastPing
    ? (() => {
        const secs = Math.floor((Date.now() - lastPing.getTime()) / 1000);
        if (secs < 60) return `${secs}s ago`;
        const mins = Math.floor(secs / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ago`;
      })()
    : 'never';

  const isLive = status === 'live';
  const isStale = status === 'stale';
  const color = isLive
    ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
    : isStale
      ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
      : 'border-red-300 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200';
  const dotColor = isLive ? 'bg-emerald-500' : isStale ? 'bg-amber-500' : 'bg-red-500';
  const label = isLive
    ? `GPS preview active · last ${ago} (no real pings)`
    : isStale
      ? `GPS stale · last ${ago} — tap Re-sync`
      : `GPS offline · last ${ago} — tap Re-sync`;

  return (
    <div className={`flex items-center gap-2 rounded-lg border ${color} px-3 py-2 mb-3`}>
      <span className="relative flex size-2.5 shrink-0">
        {isLive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex size-2.5 rounded-full ${dotColor}`} />
      </span>
      <p className="text-xs flex-1">{label}</p>
      {error && (
        <span className="text-[10px] opacity-70 truncate max-w-[120px]" title={error}>
          {error}
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 text-[10px] gap-1 shrink-0"
        onClick={onResync}
      >
        <RefreshCw className="size-3" />
        Re-sync
      </Button>
    </div>
  );
}
