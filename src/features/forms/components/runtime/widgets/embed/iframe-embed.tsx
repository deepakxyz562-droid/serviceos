'use client';

import React, { useEffect } from 'react';
import { Code2, ExternalLink, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface IframeEmbedValue {
  url: string;
  height: number;
  allowFullscreen: boolean;
  embedHtml: string;
}

export function IframeEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const url = String(config?.url ?? (value as IframeEmbedValue | undefined)?.url ?? '');
  const height = Number(config?.height ?? 400);
  const allowFullscreen = Boolean(config?.allowFullscreen ?? true);
  const ariaLabel = String(field?.label ?? 'Iframe embed');

  useEffect(() => {
    if (url && !disabled) {
      const next: IframeEmbedValue = {
        url, height, allowFullscreen,
        embedHtml: `<iframe src="${url}" width="100%" height="${height}" ${allowFullscreen ? 'allowfullscreen' : ''}></iframe>`,
      };
      onChange(next);
    }
     
  }, [url, height, allowFullscreen, disabled]);

  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Code2 className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No embed URL configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.url</code> to load content in an iframe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border bg-muted/20" style={{ height }}>
        <iframe
          src={url}
          title={ariaLabel}
          className="w-full h-full"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          allow={allowFullscreen ? 'fullscreen; autoplay; clipboard-write; encrypted-media; picture-in-picture' : undefined}
          allowFullScreen={allowFullscreen}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[70%]">
          <Globe className="size-3" /> {url}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline">
          <ExternalLink className="size-3" /> Open
        </a>
      </div>
    </div>
  );
}

export default IframeEmbed;
