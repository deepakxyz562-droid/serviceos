'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, FileAudio, Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface UploadedAudio {
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
 * Settings write `allowedAudioTypes` (array like ['mp3','wav'] or
 * ['audio/mpeg']). Build an `accept` attribute. Falls back to legacy
 * `config.accept` or 'audio/*'.
 */
function buildAudioAccept(config: Record<string, unknown> | undefined): string {
  const allowed = config?.allowedAudioTypes;
  if (Array.isArray(allowed) && allowed.length) {
    return allowed
      .map((t) => {
        const s = String(t).trim().toLowerCase();
        if (!s) return '';
        return s.startsWith('audio/') ? s : `audio/${s.replace(/^\./, '')}`;
      })
      .filter(Boolean)
      .join(',');
  }
  if (typeof config?.accept === 'string' && config.accept) return config.accept;
  return 'audio/*';
}

export function AudioUploadWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const maxFileSizeMb = Number(config?.maxFileSizeMb ?? 20);
  const accept = buildAudioAccept(config);
  const ariaLabel = String(field?.label ?? 'Audio upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audio: UploadedAudio | null = value
    ? (value as UploadedAudio)
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
      onChange({ name: file.name, size: file.size, type: file.type, dataUrl });
    } finally {
      setBusy(false);
    }
  };

  const togglePlay = () => {
    const el = audioRef.current;
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

      {!audio ? (
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
            <FileAudio className="size-6 mx-auto text-muted-foreground" />
          )}
          <p className="text-xs mt-2 font-semibold">
            {busy ? 'Uploading audio…' : 'Click to upload an audio file'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            MP3 / WAV / OGG / M4A · max {maxFileSizeMb}MB
          </p>
          {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
        </button>
      ) : (
        <div className="space-y-2 p-3 border border-border/80 rounded-xl bg-card">
          <audio
            ref={audioRef}
            src={audio.dataUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <FileAudio className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{audio.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(audio.size / 1024).toFixed(0)} KB · {audio.type || 'audio'}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={togglePlay}
              disabled={disabled}
              className="text-xs gap-1.5 shrink-0"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </Button>
            {!disabled && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onChange(null);
                  setPlaying(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="size-8 p-0 text-muted-foreground hover:text-red-500 shrink-0"
                aria-label="Remove audio"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioUploadWidget;
