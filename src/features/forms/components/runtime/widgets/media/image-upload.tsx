'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

export interface UploadedImage {
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

export function ImageUploadWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const maxFiles = Number(config?.maxFiles ?? 6);
  const maxFileSizeMb = Number(config?.maxFileSizeMb ?? 5);
  const accept = String(config?.accept ?? 'image/*');
  const ariaLabel = String(field?.label ?? 'Image upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const items: UploadedImage[] = Array.isArray(value) ? (value as UploadedImage[]) : [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || disabled) return;
    setBusy(true);
    try {
      const next: UploadedImage[] = [...items];
      for (let i = 0; i < files.length; i++) {
        if (next.length >= maxFiles) break;
        const file = files[i];
        if (file.size > maxFileSizeMb * 1024 * 1024) continue;
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await readFileAsDataUrl(file);
        next.push({ name: file.name, size: file.size, type: file.type, dataUrl });
      }
      onChange(next);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (idx: number) => {
    if (disabled) return;
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-border/80 hover:border-emerald-400/80 bg-muted/20 hover:bg-muted/40'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="size-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          </div>
          <p className="text-xs font-semibold">
            Click or drop images here
          </p>
          <p className="text-[11px] text-muted-foreground">
            Up to {maxFiles} images, {maxFileSizeMb}MB each
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border/60 bg-muted"
            >
              <img
                src={item.dataUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                  className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="size-3.5" /> No images uploaded yet
        </div>
      )}
    </div>
  );
}

export default ImageUploadWidget;
