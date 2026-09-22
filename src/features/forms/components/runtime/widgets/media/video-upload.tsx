'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, Film, Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface UploadedVideo {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Settings write `allowedVideoTypes` (array like ['mp4','webm'] or
 * ['video/mp4']). Build an `accept` attribute. Falls back to legacy
 * `config.accept` or 'video/*'.
 */
function buildVideoAccept(config: Record<string, unknown> | undefined): string {
  const allowed = config?.allowedVideoTypes;
  if (Array.isArray(allowed) && allowed.length) {
    return allowed
      .map((t) => {
        const s = String(t).trim().toLowerCase();
        if (!s) return '';
        return s.startsWith('video/') ? s : `video/${s.replace(/^\./, '')}`;
      })
      .filter(Boolean)
      .join(',');
  }
  if (typeof config?.accept === 'string' && config.accept) return config.accept;
  return 'video/*';
}

export function VideoUploadWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const maxFileSizeMb = Number(config?.maxFileSizeMb ?? 50);
  const accept = buildVideoAccept(config);
  // Settings write `maxDuration` (seconds). When set, reject videos longer
  // than the limit after the metadata loads.
  const maxDurationSeconds = Math.max(0, Number(config?.maxDuration ?? 0));
  const ariaLabel = String(field?.label ?? 'Video upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const video: UploadedVideo | null = value
    ? (value as UploadedVideo)
    : null;

  const handleFile = async (file?: File) => {
    if (!file || disabled) return;
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      setError(`File exceeds ${maxFileSizeMb}MB limit`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      // Honor `maxDuration` by probing the video's duration before
      // accepting it. Fail gracefully if the metadata cannot be read.
      if (maxDurationSeconds > 0) {
        const duration = await new Promise<number>((resolve) => {
          const probe = document.createElement('video');
          probe.preload = 'metadata';
          probe.onloadedmetadata = () => resolve(Number(probe.duration) || 0);
          probe.onerror = () => resolve(0);
          probe.src = dataUrl;
        });
        if (duration > maxDurationSeconds) {
          setError(`Video exceeds ${maxDurationSeconds}s duration limit`);
          return;
        }
      }
      onChange({ name: file.name, size: file.size, type: file.type, dataUrl });
    } finally {
      setBusy(false);
    }
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!video ? (
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          disabled={disabled || busy}
          className={`w-full border-2 border-dashed border-border/80 hover:border-emerald-400/80 rounded-xl p-6 text-center transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {busy ? (
            <Loader2 className="size-6 mx-auto animate-spin text-emerald-600" />
          ) : (
            <Film className="size-6 mx-auto text-muted-foreground" />
          )}
          <p className="text-xs mt-2 font-semibold">
            {busy ? 'Uploading video…' : 'Click to upload a video'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            MP4 / WebM / MOV · max {maxFileSizeMb}MB
          </p>
          {error && (
            <p className="text-[11px] text-red-600 mt-1">{error}</p>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-border/80 bg-black">
            <video
              ref={videoRef}
              src={video.dataUrl}
              onEnded={() => setPlaying(false)}
              className="w-full max-h-72 object-contain bg-black"
              controls
            />
            {!disabled && (
              <button
                type="button"
                aria-label="Remove video"
                onClick={() => {
                  onChange(null);
                  setPlaying(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate max-w-[70%]">{video.name}</span>
            <span>{(video.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={togglePlay}
            disabled={disabled}
            className="text-xs gap-1.5"
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default VideoUploadWidget;
