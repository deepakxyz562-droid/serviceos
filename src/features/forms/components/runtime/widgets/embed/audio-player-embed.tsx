'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface AudioTrack {
  title: string;
  url: string;
  artist?: string;
}

interface AudioPlayerValue {
  trackIndex: number;
  position: number;
  playing: boolean;
}

export function AudioPlayerEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const tracksRaw = Array.isArray(config?.tracks) ? (config.tracks as AudioTrack[]) : [];
  const tracks = tracksRaw.length
    ? tracksRaw
    : config?.url
      ? [{ title: String(config?.title ?? 'Audio'), url: String(config.url), artist: String(config?.artist ?? '') }]
      : [];
  const autoplay = Boolean(config?.autoplay ?? false);
  const ariaLabel = String(field?.label ?? 'Audio player');

  const initialIdx = (value as AudioPlayerValue | undefined)?.trackIndex ?? 0;
  const [index, setIndex] = useState(Math.min(initialIdx, Math.max(0, tracks.length - 1)));
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, index]);

  useEffect(() => {
    if (!disabled) {
      onChange({ trackIndex: index, position, playing } as AudioPlayerValue);
    }
     
  }, [index, position, playing]);

  if (!tracks.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Music className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No audio tracks configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.url</code> or <code>config.tracks[]</code>.</p>
      </div>
    );
  }

  const current = tracks[index];
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const skip = (delta: number) => {
    const next = ((index + delta) % tracks.length + tracks.length) % tracks.length;
    setIndex(next);
    setPlaying(true);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setPosition(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2" aria-label={ariaLabel}>
      <audio
        ref={audioRef}
        src={current.url}
        autoPlay={autoplay}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => skip(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="flex items-center gap-2">
        <div className="size-10 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
          <Music className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{current.title}</p>
          {current.artist && <p className="text-[10px] text-muted-foreground truncate">{current.artist}</p>}
        </div>
        {tracks.length > 1 && (
          <span className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-1">
            <ListMusic className="size-3" /> {index + 1}/{tracks.length}
          </span>
        )}
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
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground tabular-nums">{fmt(position)}</span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" disabled={disabled || tracks.length < 2}
            onClick={() => skip(-1)} className="size-8 p-0" aria-label="Previous track">
            <SkipBack className="size-4" />
          </Button>
          <Button type="button" variant="default" size="sm" disabled={disabled}
            onClick={() => setPlaying((p) => !p)} className="size-9 p-0 rounded-full" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled || tracks.length < 2}
            onClick={() => skip(1)} className="size-8 p-0" aria-label="Next track">
            <SkipForward className="size-4" />
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={disabled}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            if (audioRef.current) audioRef.current.muted = next;
          }} className="size-8 p-0" aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export default AudioPlayerEmbed;
