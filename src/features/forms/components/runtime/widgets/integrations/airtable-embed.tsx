'use client';

import React, { useEffect, useState } from 'react';
import { Table, ExternalLink, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface AirtableEmbedValue {
  url: string;
  sharedId?: string;
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
}

export function AirtableEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = str(config.airtableUrl, (value as AirtableEmbedValue | undefined)?.url ?? '');
  const [url, setUrl] = useState(initial);
  const ariaLabel = str(field?.label, 'Airtable embed');

  useEffect(() => {
    if (!disabled) {
      const m = url.match(/airtable\.com\/(?:shr|app[\w-]+)\/([a-zA-Z0-9]+)/);
      const next: AirtableEmbedValue = {
        url, sharedId: m?.[1],
        integrated: !!url, timestamp: new Date().toISOString(),
        externalId: m?.[1],
      };
      onChange(next);
    }
     
  }, [url]);

  const match = url.match(/airtable\.com\/(?:shr|app[\w-]+)\/([a-zA-Z0-9]+)/);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Table className="size-3.5 text-[#ffb400]" />
        <span className="text-xs font-semibold">Airtable</span>
      </div>
      <Input
        type="url"
        value={url}
        disabled={disabled}
        placeholder="https://airtable.com/shrXXXXXXXXXX"
        onChange={(e) => setUrl(e.target.value)}
        className="text-xs"
        aria-label="Airtable share URL"
      />
      {url && match ? (
        <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <div className="aspect-[16/10] w-full">
            <iframe
              src={`${url}?layout=grid`}
              title={ariaLabel}
              className="w-full h-full"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      ) : url ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>Enter a valid Airtable share URL (airtable.com/shr…).</span>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Paste an Airtable shared view link.</p>
      )}
      {url && (
        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 w-fit">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" /> Open in Airtable
          </a>
        </Button>
      )}
    </div>
  );
}

export default AirtableEmbed;
