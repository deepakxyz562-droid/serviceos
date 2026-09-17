'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Film, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface VideoPlayerValue {
  url: string;
  position: number;
  playing: boolean;
}

export function VideoPlayerEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const url = String(config?.url ?? (value as VideoPlayerValue | undefined)?.url ?? '');
  const poster = String(config?.poster ?? '');
  const autoplay = Boolean(config?.autoplay ?? false);
  const loop = Boolean(config?.loop ?? false);
  const muted = Boolean(config?.muted ?? false);
  const controls = Boolean(config?.controls ?? true);
  const ariaLabel = String(field?.label ?? 'Video player');

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(muted);

  useEffect(() => {
    if (!disabled && url) {
      onChange({ url, position, playing } as VideoPlayerValue);
    }
     
  }, [url, position, playing]);

  if (!url) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Film className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No video URL configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.url</code> to a MP4 / WebM / HLS source.</p>
      </div>
    );
  }

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const restart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setPlaying(true);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setPosition(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video group">
        <video
          ref={videoRef}
          src={url}
          poster={poster || undefined}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          controls={controls}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="w-full h-full"
        />
        {!controls && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button type="button" variant="default" size="sm" onClick={togglePlay}
              className="size-12 p-0 rounded-full" aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </Button>
          </div>
        )}
        <Button type="button" variant="ghost" size="sm"
          onClick={() => videoRef.current?.requestFullscreen()}
          className="absolute top-2 right-2 size-7 p-0 text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Fullscreen">
          <Maximize2 className="size-3.5" />
        </Button>
      </div>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={position}
        onChange={onSeek}
        disabled={disabled}
        aria-label="Seek"
        className="w-full accent-emerald-600 h-1 cursor-pointer"
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="tabular-nums">{fmt(position)} / {fmt(duration)}</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" disabled={disabled}
            onClick={restart} className="size-7 p-0" aria-label="Restart">
            <RotateCcw className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}
            onClick={toggleMute} className="size-7 p-0" aria-label={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayerEmbed;
