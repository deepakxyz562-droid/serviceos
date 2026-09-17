'use client';

import React, { useEffect, useState } from 'react';
import { AtSign, AlertCircle, Loader2 } from 'lucide-react';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface HubspotEmbedValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  portalId?: string;
  formId?: string;
}

export function HubspotFormEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const portalId = str(config.portalId, '');
  const formId = str(config.formId, '');
  const ariaLabel = str(field?.label, 'HubSpot form');
  const hasConfig = !!(portalId && formId);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hasConfig) return;
    const t = setTimeout(() => setLoaded(true), 600);
    return () => clearTimeout(t);
  }, [hasConfig]);

  useEffect(() => {
    if (!disabled && hasConfig) {
      const next: HubspotEmbedValue = {
        integrated: true, timestamp: new Date().toISOString(),
        externalId: `hs_${portalId}_${formId}`, portalId, formId,
      };
      onChange(next);
    }
     
  }, [portalId, formId]);

  if (!hasConfig) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2" aria-label={ariaLabel}>
        <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
        <span>Set <code>config.portalId</code> and <code>config.formId</code> to load the HubSpot form.</span>
      </div>
    );
  }

  const loading = !loaded;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <AtSign className="size-3.5 text-[#ff7a59]" />
        <span className="text-xs font-semibold">HubSpot Form</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{portalId}/{formId.slice(0, 8)}…</span>
      </div>
      <div className="rounded-xl border border-border bg-muted/30 p-4 min-h-[120px] flex items-center justify-center">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading HubSpot form…
          </div>
        ) : (
          <div className="text-center space-y-1">
            <AtSign className="size-6 mx-auto text-[#ff7a59]" />
            <p className="text-[11px] font-semibold">HubSpot form placeholder</p>
            <p className="text-[10px] text-muted-foreground">
              In production, this loads the official HubSpot embed script.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HubspotFormEmbed;
