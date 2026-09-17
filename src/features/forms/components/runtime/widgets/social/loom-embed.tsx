'use client';

import React, { useEffect } from 'react';
import { Video, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface LoomEmbedValue {
  videoUrl: string;
  shareId: string;
  embedUrl: string;
  provider: 'loom';
}

function parseLoom(url: string): { id: string; embedUrl: string } | null {
  if (!url) return null;
  const m = url.match(/loom\.com\/share\/([a-f0-9]+)/i) ||
    url.match(/loom\.com\/embed\/([a-f0-9]+)/i);
  if (m) {
    const id = m[1];
    return { id, embedUrl: `https://www.loom.com/embed/${id}` };
  }
  return null;
}

export function LoomEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const videoUrl = String(config?.videoUrl ?? (value as LoomEmbedValue | undefined)?.videoUrl ?? '');
  const height = Number(config?.height ?? 480);
  const ariaLabel = String(field?.label ?? 'Loom video');

  const parsed = parseLoom(videoUrl);

  useEffect(() => {
    if (parsed && !disabled) {
      onChange({
        videoUrl, shareId: parsed.id, embedUrl: parsed.embedUrl, provider: 'loom',
      } as LoomEmbedValue);
    }
     
  }, [videoUrl]);

  if (!videoUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Video className="size-6 mx-auto text-[#625DF5]" />
        <p className="text-xs mt-2 font-semibold">No Loom video URL configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.videoUrl</code> to a Loom share link.</p>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2" aria-label={ariaLabel}>
        <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
        <span>Invalid Loom URL — should look like <code>loom.com/share/abc123</code>.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
        <iframe
          src={parsed.embedUrl}
          title={`Loom video ${parsed.id}`}
          className="w-full h-full"
          frameBorder={0}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Video className="size-3" /> Loom · {parsed.id.slice(0, 8)}…
        </span>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="size-3" /> Open
        </a>
      </div>
    </div>
  );
}

export default LoomEmbed;
