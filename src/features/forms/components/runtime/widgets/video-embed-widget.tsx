'use client';

import React from 'react';
import type { WidgetProps } from './widget-props';
import { Film } from 'lucide-react';

function parseEmbedVideo(url?: string): { type: 'youtube' | 'vimeo' | 'mp4'; embedUrl: string } {
  if (!url) return { type: 'mp4', embedUrl: '' };
  const trimmed = url.trim();
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`,
    };
  }
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }
  return { type: 'mp4', embedUrl: trimmed };
}

export function VideoEmbedWidget({ config, field }: WidgetProps) {
  const videoUrl = (config?.videoUrl as string) || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const autoplay = Boolean(config?.autoplay);
  const muted = config?.muted !== false;
  const loop = Boolean(config?.loop);
  const aspectRatio = (config?.aspectRatio as string) || '16:9';
  const borderRadius = (config?.borderRadius as string) || '16px';

  const parsed = parseEmbedVideo(videoUrl);

  const aspectClass =
    aspectRatio === '4:3'
      ? 'aspect-[4/3]'
      : aspectRatio === '1:1'
      ? 'aspect-square'
      : aspectRatio === '9:16'
      ? 'aspect-[9/16] max-w-xs mx-auto'
      : 'aspect-video';

  return (
    <div className="w-full space-y-2 py-1">
      <div
        className={`relative w-full overflow-hidden shadow-md border border-slate-200/90 dark:border-slate-800 bg-slate-950 ${aspectClass}`}
        style={{ borderRadius }}
      >
        {parsed.type === 'youtube' || parsed.type === 'vimeo' ? (
          <iframe
            src={`${parsed.embedUrl}${parsed.embedUrl.includes('?') ? '&' : '?'}autoplay=${autoplay ? '1' : '0'}&mute=${muted ? '1' : '0'}&loop=${loop ? '1' : '0'}`}
            title={field?.label || 'Video'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={parsed.embedUrl}
            controls
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            playsInline
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </div>
  );
}

export default VideoEmbedWidget;
