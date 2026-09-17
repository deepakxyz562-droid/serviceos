'use client';

import React, { useEffect } from 'react';
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface TypeformEmbedValue {
  formId: string;
  embedUrl: string;
  mode: 'inline' | 'popup';
  provider: 'typeform';
}

function toEmbedUrl(formId: string): string {
  const id = formId.replace(/[^a-zA-Z0-9]/g, '');
  return `https://form.typeform.com/to/${id}?typeform-embed=embed-widget&embed-opacity=100`;
}

export function TypeformEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const formId = String(config?.formId ?? (value as TypeformEmbedValue | undefined)?.formId ?? '');
  const mode = String(config?.mode ?? 'inline') === 'popup' ? 'popup' : 'inline';
  const height = Number(config?.height ?? 500);
  const ariaLabel = String(field?.label ?? 'Typeform embed');

  const embedUrl = toEmbedUrl(formId);

  useEffect(() => {
    if (formId && !disabled) {
      onChange({ formId, embedUrl, mode, provider: 'typeform' } as TypeformEmbedValue);
    }
     
  }, [formId, mode]);

  if (!formId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <FileText className="size-6 mx-auto text-[#262627]" />
        <p className="text-xs mt-2 font-semibold">No Typeform form ID configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.formId</code> to a Typeform form ID.</p>
      </div>
    );
  }

  const isValidId = /^[a-zA-Z0-9]+$/.test(formId);

  if (!isValidId) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2" aria-label={ariaLabel}>
        <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
        <span>Invalid Typeform form ID — should be an alphanumeric string from your Typeform URL.</span>
      </div>
    );
  }

  if (mode === 'popup') {
    return (
      <div className="space-y-2" aria-label={ariaLabel}>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
          <FileText className="size-6 mx-auto text-[#262627]" />
          <p className="text-xs font-semibold">Typeform — ready to launch</p>
          <p className="text-[10px] text-muted-foreground">Click below to open the form as a popup.</p>
        </div>
        <Button asChild variant="default" size="sm" className="w-full bg-[#262627] hover:bg-black text-white text-xs gap-1.5">
          <a href={embedUrl} target="_blank" rel="noopener noreferrer">
            <FileText className="size-3.5" /> Start form
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
          title={`Typeform ${formId}`}
          className="w-full h-full"
          allow="camera; microphone; autoplay; encrypted-media; fullscreen; clipboard-read; clipboard-write"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><FileText className="size-3" /> Typeform ID: {formId}</span>
        <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="size-3" /> Open
        </a>
      </div>
    </div>
  );
}

export default TypeformEmbed;
