'use client';

import React, { useEffect, useState } from 'react';
import { Youtube, AlertCircle } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

interface YoutubeEmbedValue {
  videoId: string;
  embedUrl: string;
  watchUrl: string;
  provider: 'youtube';
}

function parseYoutube(url: string): { id: string; embedUrl: string; watchUrl: string } | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const id = m[1];
      return {
        id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
      };
    }
  }
  return null;
}

export function YoutubeVideoEmbed({ value, onChange, config, field }: WidgetProps) {
  const url = String(config?.url ?? (value as YoutubeEmbedValue | undefined)?.watchUrl ?? '');
  const startAt = Number(config?.startAt ?? 0);
  const autoplay = Boolean(config?.autoplay ?? false);
  const ariaLabel = String(field?.label ?? 'YouTube video');

  const [error, setError] = useState(false);

  const parsed = parseYoutube(url);

  useEffect(() => {
    if (parsed) {
      const embedUrl = `${parsed.embedUrl}?start=${startAt}&autoplay=${autoplay ? 1 : 0}&rel=0`;
      const next: YoutubeEmbedValue = {
        videoId: parsed.id, embedUrl, watchUrl: parsed.watchUrl, provider: 'youtube',
      };
      onChange(next);
    }
     
  }, [url, startAt, autoplay]);

  if (!parsed) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Youtube className="size-6 mx-auto text-[#FF0000]" />
        <p className="text-xs mt-2 font-semibold">Invalid or missing YouTube URL</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.url</code> to a valid YouTube link.</p>
      </div>
    );
  }

  const embedUrl = `${parsed.embedUrl}?start=${startAt}&autoplay=${autoplay ? 1 : 0}&rel=0`;

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video relative">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <AlertCircle className="size-6" />
            <p className="text-xs">Unable to load YouTube video.</p>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            title={ariaLabel}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={() => setError(true)}
          />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground truncate">Video ID: {parsed.id}</p>
    </div>
  );
}

export default YoutubeVideoEmbed;
