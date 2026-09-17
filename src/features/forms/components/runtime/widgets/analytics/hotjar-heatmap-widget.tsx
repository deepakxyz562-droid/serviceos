'use client';

import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';

interface HotjarValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  siteId?: string;
}

/**
 * Hotjar heatmap integration — placeholder.
 * Phase 3: does NOT inject the real h._hq script.
 */
export function HotjarHeatmapWidget({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Hotjar heatmap');
  const siteId = str(config.siteId, '0000000');
  const heatmapName = str(config.heatmapName, 'Form view');

  const [v, setV] = useState<HotjarValue>(
    value && typeof value === 'object' ? (value as HotjarValue) : { eventId: '', fired: false },
  );

  useEffect(() => {
    if (v.siteId === siteId) return;
    setV((prev) => ({ ...prev, siteId }));
  }, [siteId, v.siteId]);

  useEffect(() => {
    onChange({
      eventId: `hj_${siteId}`,
      fired: v.fired,
      timestamp: v.timestamp ?? new Date().toISOString(),
      siteId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.fired, v.timestamp]);

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <Flame className="size-4 text-rose-500" />
        <span className="text-xs font-semibold text-foreground">Hotjar Heatmap</span>
        {v.fired ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <CheckCircle2 className="size-2.5 text-emerald-600" /> Recorded
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Tracking</Badge>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-1 text-[10px]">
        <dt className="text-muted-foreground">Site ID</dt>
        <dd className="font-mono text-foreground truncate">{siteId}</dd>
        <dt className="text-muted-foreground">Heatmap</dt>
        <dd className="font-mono text-foreground truncate">{heatmapName}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd className="font-mono text-foreground truncate">
          {v.fired ? 'Session recorded' : 'Awaiting session'}
        </dd>
      </dl>
      <p className="text-[9px] text-muted-foreground italic">
        Passive — session recorded on form submit. Heatmap available in Hotjar dashboard.
      </p>
    </div>
  );
}

export default HotjarHeatmapWidget;
