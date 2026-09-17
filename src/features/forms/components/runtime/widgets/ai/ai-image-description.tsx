'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface AiImageDescriptionValue {
  imageUrl?: string;
  description?: string;
  status: 'idle' | 'analyzing' | 'placeholder';
  timestamp?: string;
}

const PLACEHOLDER_DESCRIPTIONS = [
  'A photo of a scenic landscape with natural lighting and balanced composition.',
  'An object centered in frame with neutral background and soft shadows.',
  'A product shot with high contrast and clear focal subject.',
  'A document containing structured text and tabular content.',
];

export function AiImageDescription({ value, onChange, config, disabled, field }: WidgetProps) {
  const endpoint = str(config.endpoint, '/api/forms/ai/image-description');
  const ariaLabel = str(field?.label, 'AI image description');
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [pending, setPending] = useState(false);
  const existing = (value as Partial<AiImageDescriptionValue> | undefined) ?? {};

  const handleFile = (file: File | undefined) => {
    if (!file || disabled) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setPending(true);
    // Phase 4: placeholder AI call — never hits a real API.
    setTimeout(() => {
      const desc = PLACEHOLDER_DESCRIPTIONS[Math.floor(Math.random() * PLACEHOLDER_DESCRIPTIONS.length)];
      const next: AiImageDescriptionValue = {
        imageUrl: url, description: desc,
        status: 'placeholder', timestamp: new Date().toISOString(),
      };
      onChange(next);
      setPending(false);
    }, 900);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">AI Image Description</span>
        <span className="ml-auto text-[10px] text-muted-foreground">placeholder</span>
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
      {existing.description && (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-1">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="size-3 mt-0.5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              <strong>Placeholder output:</strong> {existing.description}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">POST {endpoint}</p>
        </div>
      )}
    </div>
  );
}

export default AiImageDescription;
