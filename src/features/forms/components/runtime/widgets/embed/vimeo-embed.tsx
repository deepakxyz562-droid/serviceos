'use client';

import React, { useEffect, useState } from 'react';
import { Video, AlertCircle } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

interface VimeoEmbedValue {
  videoId: string;
  embedUrl: string;
  watchUrl: string;
  provider: 'vimeo';
}

function parseVimeo(url: string): { id: string; embedUrl: string; watchUrl: string } | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) {
    const id = m[1];
    return {
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      watchUrl: `https://vimeo.com/${id}`,
    };
  }
  return null;
}

export function VimeoEmbed({ value, onChange, config, field }: WidgetProps) {
  const url = String(config?.url ?? (value as VimeoEmbedValue | undefined)?.watchUrl ?? '');
  const autoplay = Boolean(config?.autoplay ?? false);
  const ariaLabel = String(field?.label ?? 'Vimeo video');
  const [error, setError] = useState(false);

  const parsed = parseVimeo(url);

  useEffect(() => {
    if (parsed) {
      const embedUrl = `${parsed.embedUrl}?autoplay=${autoplay ? 1 : 0}`;
      const next: VimeoEmbedValue = {
        videoId: parsed.id, embedUrl, watchUrl: parsed.watchUrl, provider: 'vimeo',
      };
      onChange(next);
    }
     
  }, [url, autoplay]);

  if (!parsed) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Video className="size-6 mx-auto text-[#1AB7EA]" />
        <p className="text-xs mt-2 font-semibold">Invalid or missing Vimeo URL</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.url</code> to a valid Vimeo link.</p>
      </div>
    );
  }

  const embedUrl = `${parsed.embedUrl}?autoplay=${autoplay ? 1 : 0}`;

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video relative">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <AlertCircle className="size-6" />
            <p className="text-xs">Unable to load Vimeo video.</p>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            title={ariaLabel}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onError={() => setError(true)}
          />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground truncate">Vimeo ID: {parsed.id}</p>
    </div>
  );
}

export default VimeoEmbed;
