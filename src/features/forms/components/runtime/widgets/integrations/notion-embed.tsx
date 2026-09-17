'use client';

import React, { useEffect, useState } from 'react';
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface NotionEmbedValue {
  url: string;
  pageId?: string;
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
}

export function NotionEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = str(config.notionUrl, (value as NotionEmbedValue | undefined)?.url ?? '');
  const [url, setUrl] = useState(initial);
  const ariaLabel = str(field?.label, 'Notion embed');

  useEffect(() => {
    if (!disabled) {
      const m = url.match(/notion\.so\/(?:[^/]+-)?([a-f0-9]{32})/i);
      const next: NotionEmbedValue = {
        url, pageId: m?.[1],
        integrated: !!url, timestamp: new Date().toISOString(),
        externalId: m?.[1],
      };
      onChange(next);
    }
     
  }, [url]);

  const match = url.match(/notion\.so\/(?:[^/]+-)?([a-f0-9]{32})/i);
  const embedUrl = url.includes('notion.so') && url.includes('?') ? `${url}&pvs=4` : url;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <FileText className="size-3.5 text-slate-700 dark:text-slate-200" />
        <span className="text-xs font-semibold">Notion</span>
      </div>
      <Input
        type="url"
        value={url}
        disabled={disabled}
        placeholder="https://www.notion.so/your-page-..."
        onChange={(e) => setUrl(e.target.value)}
        className="text-xs"
        aria-label="Notion page URL"
      />
      {url && match ? (
        <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <div className="aspect-[16/10] w-full">
            <iframe
              src={embedUrl}
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
          <span>Enter a valid Notion page URL (notion.so/…).</span>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Paste a Notion page link to embed it inline.</p>
      )}
      {url && (
        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 w-fit">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" /> Open in Notion
          </a>
        </Button>
      )}
    </div>
  );
}

export default NotionEmbed;
