'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, MapPin, Clock, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface WatermarkedPhoto {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  metadata?: { timestamp: string; lat?: number; lng?: number };
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const formatStamp = (d: Date) =>
  d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function PhotoWatermarkWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const includeGps = Boolean(config?.includeGps ?? true);
  const includeTimestamp = Boolean(config?.includeTimestamp ?? true);
  const stampColor = String(config?.stampColor ?? '#ffffff');
  const stampBg = String(config?.stampBg ?? 'rgba(0,0,0,0.55)');
  const ariaLabel = String(field?.label ?? 'Photo with watermark');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const photo: WatermarkedPhoto | null = value
    ? (value as WatermarkedPhoto)
    : null;

  const process = async (file: File) => {
    setBusy(true);
    try {
      const sourceDataUrl = await readFileAsDataUrl(file);
      const img = await loadImage(sourceDataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const ts = new Date();
      const lines: string[] = [];
      if (includeTimestamp) lines.push(`📅 ${formatStamp(ts)}`);

      const meta: WatermarkedPhoto['metadata'] = { timestamp: ts.toISOString() };

      if (includeGps && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 4000,
            })
          );
          meta.lat = pos.coords.latitude;
          meta.lng = pos.coords.longitude;
          lines.push(
            `📍 ${meta.lat.toFixed(5)}, ${meta.lng.toFixed(5)}`
          );
        } catch {
          lines.push('📍 Location unavailable');
        }
      }

      if (lines.length) {
        const padX = 16;
        const padY = 10;
        const fontSize = Math.max(14, Math.round(img.width / 45));
        ctx.font = `${fontSize}px monospace`;
        const lineHeight = fontSize + 4;
        const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
        const boxW = maxWidth + padX * 2;
        const boxH = lines.length * lineHeight + padY * 2;
        const x = 12;
        const y = img.height - boxH - 12;
        ctx.fillStyle = stampBg;
        ctx.fillRect(x, y, boxW, boxH);
        ctx.fillStyle = stampColor;
        lines.forEach((l, i) =>
          ctx.fillText(l, x + padX, y + padY + (i + 1) * lineHeight - 4)
        );
      }

      const dataUrl = canvas.toDataURL('image/png');
      onChange({
        name: `watermarked-${file.name.replace(/\.[^.]+$/, '')}.png`,
        size: Math.round((dataUrl.length - 22) * 0.75),
        type: 'image/png',
        dataUrl,
        metadata: meta,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) process(f);
        }}
      />

      {!photo ? (
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
            <Upload className="size-6 mx-auto text-muted-foreground" />
          )}
          <p className="text-xs mt-2 font-semibold">
            {busy ? 'Processing photo…' : 'Capture / upload photo to watermark'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-3 flex-wrap">
            {includeTimestamp && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" /> timestamp
              </span>
            )}
            {includeGps && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> GPS
              </span>
            )}
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted/40">
            <img src={photo.dataUrl} alt={photo.name} className="w-full" />
            {!disabled && (
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => {
                  onChange(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Save className="size-3.5" />
            {photo.metadata?.lat != null
              ? `Watermarked · ${photo.metadata.lat.toFixed(4)}, ${photo.metadata.lng?.toFixed(4)}`
              : 'Watermarked with timestamp'}
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoWatermarkWidget;
