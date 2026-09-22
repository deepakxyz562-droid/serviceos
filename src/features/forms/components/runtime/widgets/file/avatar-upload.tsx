'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, User, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface AvatarValue {
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

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export function AvatarUploadWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Avatar upload');
  const maxFileSizeMb = Number(config?.maxFileSizeMb ?? 5);
  const size = Number(config?.size ?? 128);
  // Settings write `shape` ('circle' | 'square'). Default circle to preserve
  // legacy appearance; render square corners when `shape === 'square'`.
  const shape = String(config?.shape ?? 'circle').toLowerCase();
  const isSquare = shape === 'square';
  const frameClass = isSquare ? 'rounded-md' : 'rounded-full';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatar: AvatarValue | null = value ? (value as AvatarValue) : null;

  const cropToSquare = async (srcDataUrl: string): Promise<string> => {
    const img = await loadImage(srcDataUrl);
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) return srcDataUrl;
    ctx.drawImage(
      img,
      (img.width - side) / 2,
      (img.height - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side
    );
    return canvas.toDataURL('image/png');
  };

  const handleFile = async (file?: File) => {
    if (!file || disabled) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      setError(`File exceeds ${maxFileSizeMb}MB limit`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const source = await readFileAsDataUrl(file);
      const cropped = await cropToSquare(source);
      onChange({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: cropped,
      });
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    if (disabled) return;
    onChange(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => !disabled && !busy && fileInputRef.current?.click()}
          disabled={disabled || busy}
          aria-label={avatar ? 'Replace avatar' : 'Upload avatar'}
          className={`block w-full h-full ${frameClass} overflow-hidden border-2 border-border bg-muted hover:border-emerald-400 transition-colors flex items-center justify-center`}
        >
          {busy ? (
            <Loader2 className="size-6 animate-spin text-emerald-600" />
          ) : avatar ? (
            <img
              src={avatar.dataUrl}
              alt={ariaLabel}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="size-8 text-muted-foreground" />
          )}
        </button>

        {avatar && !disabled && (
          <button
            type="button"
            aria-label="Remove avatar"
            onClick={clear}
            className="absolute -top-1 -right-1 size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-1 min-w-0">
        <p className="text-xs font-semibold">{ariaLabel}</p>
        {avatar ? (
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p className="truncate">{avatar.name}</p>
            <p>{(avatar.size / 1024).toFixed(0)} KB · square crop applied</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] gap-1 h-6 px-2"
            >
              <RotateCcw className="size-3" /> Replace
            </Button>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p>Click the {isSquare ? 'square' : 'circle'} to upload an avatar.</p>
            <p>Images auto-crop to a square. Max {maxFileSizeMb}MB.</p>
          </div>
        )}
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        {!avatar && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs gap-1.5 h-7"
          >
            <Upload className="size-3.5" /> Choose image
          </Button>
        )}
      </div>
    </div>
  );
}

export default AvatarUploadWidget;
