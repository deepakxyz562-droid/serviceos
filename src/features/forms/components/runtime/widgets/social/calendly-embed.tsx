'use client';

import React, { useEffect } from 'react';
import { Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface CalendlyEmbedValue {
  schedulingUrl: string;
  embedUrl: string;
  mode: 'inline' | 'popup';
  provider: 'calendly';
}

function toCalendlyEmbed(url: string, mode: 'inline' | 'popup'): string {
  if (!url) return '';
  return mode === 'popup' ? url : `https://calendly.com/${url.replace(/^https?:\/\/calendly\.com\//, '')}?embed_domain=${typeof window !== 'undefined' ? window.location.origin : ''}&embed_type=Inline`;
}

export function CalendlyEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const schedulingUrl = String(config?.schedulingUrl ?? (value as CalendlyEmbedValue | undefined)?.schedulingUrl ?? '');
  const mode = String(config?.mode ?? 'inline') === 'popup' ? 'popup' : 'inline';
  const height = Number(config?.height ?? 580);
  const ariaLabel = String(field?.label ?? 'Calendly scheduling');

  const embedUrl = toCalendlyEmbed(schedulingUrl, mode);

  useEffect(() => {
    if (schedulingUrl && !disabled) {
      onChange({ schedulingUrl, embedUrl, mode, provider: 'calendly' } as CalendlyEmbedValue);
    }
     
  }, [schedulingUrl, mode]);

  if (!schedulingUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Calendar className="size-6 mx-auto text-[#006BFF]" />
        <p className="text-xs mt-2 font-semibold">No Calendly URL configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.schedulingUrl</code> to your Calendly link.</p>
      </div>
    );
  }

  const isValid = /calendly\.com\//.test(schedulingUrl);

  if (!isValid) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2" aria-label={ariaLabel}>
        <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
        <span>Invalid Calendly URL — should look like <code>calendly.com/username/event</code>.</span>
      </div>
    );
  }

  if (mode === 'popup') {
    return (
      <div className="space-y-2" aria-label={ariaLabel}>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
          <Calendar className="size-6 mx-auto text-[#006BFF]" />
          <p className="text-xs font-semibold">Schedule with Calendly</p>
          <p className="text-[10px] text-muted-foreground">Click below to open the scheduling popup.</p>
        </div>
        <Button asChild variant="default" size="sm" className="w-full bg-[#006BFF] hover:bg-[#005BD1] text-white text-xs gap-1.5">
          <a href={schedulingUrl} target="_blank" rel="noopener noreferrer">
            <Calendar className="size-3.5" /> Pick a time
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border bg-white" style={{ height }}>
        <iframe
          src={embedUrl}
          title="Calendly scheduling"
          className="w-full h-full"
          frameBorder={0}
          allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Calendar className="size-3" /> Calendly inline widget</span>
        <a href={schedulingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="size-3" /> Open
        </a>
      </div>
    </div>
  );
}

export default CalendlyEmbed;
