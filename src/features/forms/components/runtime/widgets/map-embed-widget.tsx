'use client';

import React from 'react';
import type { WidgetProps } from './widget-props';
import { MapPin, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function MapEmbedWidget({ config, field }: WidgetProps) {
  const address = (config?.address as string) || 'Austin, TX';
  const zoom = Number(config?.zoom || 13);
  const heightPx = Number(config?.heightPx || 260);
  const showDispatchBadge = config?.showDispatchBadge !== false;
  const badgeText = (config?.badgeText as string) || '📍 Live Verified Service Area';
  const borderRadius = (config?.borderRadius as string) || '16px';

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    address
  )}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="w-full space-y-2 py-1">
      <div
        className="relative w-full overflow-hidden shadow-md border border-slate-200/90 dark:border-slate-800 bg-slate-950"
        style={{ height: `${heightPx}px`, borderRadius }}
      >
        <iframe
          src={mapEmbedUrl}
          title={field?.label || 'Service Location Map'}
          className="w-full h-full border-0 pointer-events-none opacity-90"
          loading="lazy"
        />

        {showDispatchBadge && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900/90 text-white backdrop-blur-md border border-white/20 shadow-md">
              <MapPin className="size-3.5 text-rose-400" />
              {badgeText}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-900/90 backdrop-blur-md border border-white/15 p-2.5 rounded-xl text-white flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="size-4 text-rose-400 shrink-0" />
            <span className="text-xs font-bold truncate">{address}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold shrink-0">
            ✓ Active Service Zone
          </span>
        </div>
      </div>
    </div>
  );
}

export default MapEmbedWidget;
