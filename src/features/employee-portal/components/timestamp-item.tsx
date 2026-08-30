'use client';

/**
 * TimestampItem — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Tiny presentational tile used inside ActiveJobCard to render each lifecycle
 * timestamp (Accepted / Travelling / Arrived / Started Work). The parent
 * passes the label + an ISO timestamp; this component formats the time using
 * the shared `formatTime` helper.
 */

import { formatTime } from '@/lib/format-utils';

export interface TimestampItemProps {
  label: string;
  ts: string;
}

export function TimestampItem({ label, ts }: TimestampItemProps) {
  return (
    <div className="flex flex-col bg-muted/40 rounded px-2 py-1">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium">{formatTime(ts)}</span>
    </div>
  );
}
