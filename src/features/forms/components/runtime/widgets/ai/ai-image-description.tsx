'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface AiImageDescriptionValue {
  imageUrl?: string;
  description?: string;
  status: 'idle' | 'analyzing' | 'done' | 'error';
  timestamp?: string;
  errorMessage?: string;
}

export function AiImageDescription({ value, onChange, config, disabled, field }: WidgetProps) {
  const endpoint = str(config.endpoint, '/api/forms/ai/image-description');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const ariaLabel = str(field?.label, 'AI image description');
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = (value as Partial<AiImageDescriptionValue> | undefined) ?? {};

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setPending(true);
    setError(null);

    try {
      // Read the file as base64 (without the data: prefix).
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // strip the "data:<mime>;base64," prefix
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
          formId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Analysis failed (${res.status})`);
      }
      const description: string = data.description || '';
      const next: AiImageDescriptionValue = {
        imageUrl: url,
        description,
        status: 'done',
        timestamp: new Date().toISOString(),
      };
      onChange(next);
    } catch (err: any) {
      const msg = err?.message || 'Failed to analyze the image.';
      setError(msg);
      onChange({
        imageUrl: url,
        status: 'error',
        errorMessage: msg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">AI Image Description</span>
        <span className="ml-auto text-[10px] text-muted-foreground">vision</span>
      </div>
      <input
        ref={fileRef} type="file" accept="image/*" disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden" aria-label="Upload image"
      />
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
        {imageUrl ? (
          <img src={imageUrl} alt="Uploaded preview" className="max-h-32 mx-auto rounded-md mb-2" />
        ) : (
          <ImagePlus className="size-6 mx-auto text-muted-foreground" />
        )}
        <p className="text-[10px] text-muted-foreground mt-1">JPG/PNG · max 5 MB</p>
      </div>
      <Button type="button" disabled={disabled || pending}
        onClick={() => fileRef.current?.click()}
        className="w-full h-9 text-xs gap-1.5">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
        {pending ? 'Analyzing…' : 'Upload & describe'}
      </Button>
      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-2.5">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="size-3 mt-0.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="text-[11px] text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        </div>
      )}
      {existing.description && !error && (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-1">
          <p className="text-[11px] text-foreground leading-relaxed">{existing.description}</p>
        </div>
      )}
    </div>
  );
}

export default AiImageDescription;
