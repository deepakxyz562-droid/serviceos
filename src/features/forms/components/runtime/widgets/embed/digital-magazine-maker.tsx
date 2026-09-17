'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface DigitalMagazineValue {
  embedUrl: string;
  provider: 'flipbook';
  pages: number;
}

export function DigitalMagazineMaker({ value, onChange, config, disabled, field }: WidgetProps) {
  const embedUrl = String(config?.embedUrl ?? '');
  const pages = Number(config?.pages ?? 12);
  const title = String(config?.title ?? field?.label ?? 'Digital Magazine');
  const coverImage = String(config?.coverImage ?? '');
  const ariaLabel = String(field?.label ?? 'Digital magazine');

  const [page, setPage] = useState(1);

  useEffect(() => {
    if (embedUrl && !disabled) {
      const next: DigitalMagazineValue = { embedUrl, provider: 'flipbook', pages };
      onChange(next);
    }
     
  }, [embedUrl, pages, disabled]);

  if (!embedUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <BookOpen className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">Configure a flipbook embed URL</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.embedUrl</code> to load your digital magazine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border bg-muted/20 relative" style={{ height: 520 }}>
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full"
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" disabled={disabled || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))} className="size-8 p-0" aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-[11px] text-muted-foreground tabular-nums w-16 text-center">
            {page} / {pages}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={disabled || page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))} className="size-8 p-0" aria-label="Next page">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-xs gap-1.5">
          <a href={embedUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" /> Open magazine
          </a>
        </Button>
      </div>
      {coverImage && (
        <p className="text-[10px] text-muted-foreground">Cover: {coverImage.split('/').pop()}</p>
      )}
    </div>
  );
}

export default DigitalMagazineMaker;
