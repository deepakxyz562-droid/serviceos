'use client';

import React, { useEffect, useState } from 'react';
import { Pin, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface PinterestPinValue {
  pinUrl: string;
  pinId: string;
  embedHtml: string;
  provider: 'pinterest';
}

export function PinterestPin({ value, onChange, config, disabled, field }: WidgetProps) {
  const initialUrl = String(config?.pinUrl ?? (value as PinterestPinValue | undefined)?.pinUrl ?? '');
  const size = String(config?.size ?? 'medium');
  const [pinUrl, setPinUrl] = useState(initialUrl);
  const ariaLabel = String(field?.label ?? 'Pinterest pin');

  useEffect(() => {
    if (initialUrl && !disabled) {
      const m = initialUrl.match(/pinterest\.[\w.]+\/pin\/(\d+)/) || initialUrl.match(/pin\.it\/([\w]+)/);
      const id = m ? m[1] : '';
      const embedHtml = `<a data-pin-do="embedPin" data-pin-width="${size === 'large' ? 'large' : 'small'}" href="${initialUrl}"></a>`;
      onChange({ pinUrl: initialUrl, pinId: id, embedHtml, provider: 'pinterest' } as PinterestPinValue);
    }
     
  }, [initialUrl]);

  const commit = (url: string) => {
    setPinUrl(url);
    if (!disabled) {
      const m = url.match(/pinterest\.[\w.]+\/pin\/(\d+)/) || url.match(/pin\.it\/([\w]+)/);
      const id = m ? m[1] : '';
      const embedHtml = `<a data-pin-do="embedPin" data-pin-width="${size === 'large' ? 'large' : 'small'}" href="${url}"></a>`;
      onChange({ pinUrl: url, pinId: id, embedHtml, provider: 'pinterest' } as PinterestPinValue);
    }
  };

  const parsed = pinUrl.match(/pinterest\.[\w.]+\/pin\/(\d+)/) || pinUrl.match(/pin\.it\/([\w]+)/);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Input
        type="url"
        value={pinUrl}
        disabled={disabled}
        placeholder="https://www.pinterest.com/pin/123456/"
        onChange={(e) => setPinUrl(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="text-xs"
        aria-label="Pinterest pin URL"
      />
      {!parsed ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>Enter a valid Pinterest pin URL. The official Pinterest embed will render here.</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20 p-4 flex flex-col items-center gap-3">
            <div className="inline-flex size-9 items-center justify-center rounded-full bg-[#E60023]">
              <Pin className="size-5 text-white" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold">Pinterest pin preview</p>
              <p className="text-[10px] text-muted-foreground break-all">Pin ID: {parsed[1]}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 bg-[#E60023] text-white hover:bg-[#BD0017]">
              <a href={pinUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" /> Open on Pinterest
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PinterestPin;
