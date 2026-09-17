'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, FileText, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface BrochureEmbedValue {
  url: string;
  mode: 'pdf' | 'flipbook' | 'image';
  embedHtml: string;
}

function detectMode(url: string): 'pdf' | 'flipbook' | 'image' {
  if (!url) return 'pdf';
  if (/\.(pdf)(\?|$)/i.test(url)) return 'pdf';
  if (/\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(url)) return 'image';
  return 'flipbook';
}

export function BrochureEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const url = String(config?.url ?? (value as BrochureEmbedValue | undefined)?.url ?? '');
  const title = String(config?.title ?? field?.label ?? 'Brochure');
  const height = Number(config?.height ?? 520);
  const ariaLabel = String(field?.label ?? 'Brochure embed');
  const [page, setPage] = useState(1);

  const mode = detectMode(url);

  useEffect(() => {
    if (url && !disabled) {
      const embedHtml =
        mode === 'pdf'
          ? `<embed src="${url}" type="application/pdf" width="100%" height="${height}" />`
          : mode === 'image'
            ? `<img src="${url}" alt="${title}" />`
            : `<iframe src="${url}" width="100%" height="${height}" allowfullscreen></iframe>`;
      onChange({ url, mode, embedHtml } as BrochureEmbedValue);
    }
     
  }, [url, mode, height, title, disabled]);

  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <FileText className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No brochure URL configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.url</code> to a PDF, image, or flipbook URL.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-muted-foreground" />
        <p className="text-xs font-semibold truncate flex-1">{title}</p>
        <span className="text-[10px] text-muted-foreground uppercase">{mode}</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-border bg-muted/20" style={{ height }}>
        {mode === 'pdf' && (
          <iframe src={`${url}#view=FitH`} title={title} className="w-full h-full" />
        )}
        {mode === 'image' && (
          <img src={url} alt={title} className="w-full h-full object-contain" />
        )}
        {mode === 'flipbook' && (
          <iframe src={url} title={title} className="w-full h-full" allowFullScreen />
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" disabled={disabled || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))} className="size-7 p-0" aria-label="Previous">
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-center">p. {page}</span>
          <Button type="button" variant="outline" size="sm" disabled={disabled}
            onClick={() => setPage((p) => p + 1)} className="size-7 p-0" aria-label="Next">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3" /> Open brochure
          </a>
        </Button>
      </div>
    </div>
  );
}

export default BrochureEmbed;
