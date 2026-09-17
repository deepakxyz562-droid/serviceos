'use client';

import React, { useEffect, useState } from 'react';
import { Music2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface TiktokEmbedValue {
  videoUrl: string;
  videoId: string;
  embedUrl: string;
  provider: 'tiktok';
}

export function TiktokEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const initialUrl = String(config?.videoUrl ?? (value as TiktokEmbedValue | undefined)?.videoUrl ?? '');
  const [videoUrl, setVideoUrl] = useState(initialUrl);
  const ariaLabel = String(field?.label ?? 'TikTok embed');

  useEffect(() => {
    if (initialUrl && !disabled) {
      const m = initialUrl.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/) || initialUrl.match(/tiktok\.com\/.*?\/video\/(\d+)/);
      const id = m ? m[1] : '';
      const embedUrl = `https://www.tiktok.com/embed/v2/${id}`;
      onChange({ videoUrl: initialUrl, videoId: id, embedUrl, provider: 'tiktok' } as TiktokEmbedValue);
    }
     
  }, [initialUrl]);

  const commit = (url: string) => {
    setVideoUrl(url);
    if (!disabled) {
      const m = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/) || url.match(/tiktok\.com\/.*?\/video\/(\d+)/);
      const id = m ? m[1] : '';
      onChange({ videoUrl: url, videoId: id, embedUrl: `https://www.tiktok.com/embed/v2/${id}`, provider: 'tiktok' } as TiktokEmbedValue);
    }
  };

  const parsed = videoUrl.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/) || videoUrl.match(/tiktok\.com\/.*?\/video\/(\d+)/);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Input
        type="url"
        value={videoUrl}
        disabled={disabled}
        placeholder="https://www.tiktok.com/@user/video/1234567890"
        onChange={(e) => setVideoUrl(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="text-xs"
        aria-label="TikTok video URL"
      />
      {!parsed ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>Enter a valid TikTok video URL. The official TikTok embed will render here.</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-border bg-black max-w-[340px] mx-auto" style={{ height: 580 }}>
            <iframe
              src={`https://www.tiktok.com/embed/v2/${parsed[1]}`}
              title={`TikTok video ${parsed[1]}`}
              className="w-full h-full"
              allow="encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Music2 className="size-3" /> TikTok · ID {parsed[1]}
            </p>
            <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1">
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" /> Open
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TiktokEmbed;
