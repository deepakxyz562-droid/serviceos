'use client';

import React, { useRef, useState } from 'react';
import { Upload, ZoomIn, ZoomOut, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface ImagePreviewItem {
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

export function ImagePreviewWidget({
  value,
  onChange,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Image preview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);

  const image: ImagePreviewItem | null = value
    ? (value as ImagePreviewItem)
    : null;

  const handleFile = async (file?: File) => {
    if (!file || disabled) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ name: file.name, size: file.size, type: file.type, dataUrl });
  };

  const clear = () => {
    if (disabled) return;
    onChange(null);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!image ? (
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed border-border/80 hover:border-emerald-400/80 rounded-xl p-6 text-center transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <Upload className="size-6 mx-auto text-muted-foreground" />
          <p className="text-xs mt-2 font-semibold">Click to upload an image</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            PNG / JPG / WEBP — preview with zoom
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted/40 flex items-center justify-center max-h-[420px]">
            <div
              className="overflow-auto w-full h-full max-h-[420px] flex items-center justify-center"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            >
              <img
                src={image.dataUrl}
                alt={image.name}
                className="max-w-full max-h-[420px] object-contain"
              />
            </div>
            {!disabled && (
              <button
                type="button"
                aria-label="Remove image"
                onClick={clear}
                className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">
              {image.name} · {(image.size / 1024).toFixed(0)} KB
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || zoom <= 1}
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                className="size-8 p-0"
                aria-label="Zoom out"
              >
                <ZoomOut className="size-4" />
              </Button>
              <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || zoom >= 4}
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="size-8 p-0"
                aria-label="Zoom in"
              >
                <ZoomIn className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => setZoom(1)}
                className="size-8 p-0"
                aria-label="Reset zoom"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImagePreviewWidget;
