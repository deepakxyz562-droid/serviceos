'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface SliderValue {
  verified: boolean;
  verifiedAt?: string;
  token?: string;
}

export function ImageCaptchaSlider({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Slider captcha');
  const hintText = str(config.hintText, 'Slide to verify');
  const trackLength = 260;

  const v: SliderValue = value && typeof value === 'object' ? (value as SliderValue) : { verified: false };

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [verified, setVerified] = useState(v.verified ?? false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef(0);

  // Mock target slot — anywhere between 70% and 90% of the track.
  const target = useRef(Math.floor(trackLength * (0.7 + Math.random() * 0.2)));

  const emit = (next: Partial<SliderValue>) => onChange({ ...v, ...next });

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const x = Math.min(trackLength, Math.max(0, e.clientX - rect.left - dragOffsetRef.current));
      setOffset(x);
    };
    const onUp = () => {
      setDragging(false);
      const success = Math.abs(offset - target.current) <= 6;
      setVerified(success);
      if (success) {
        emit({ verified: true, verifiedAt: new Date().toISOString(), token: `slider_${Math.random().toString(36).slice(2, 12)}` });
      } else {
        // Snap back if missed.
        setTimeout(() => setOffset(0), 200);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
     
  }, [dragging, offset]);

  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || verified) return;
    dragOffsetRef.current = e.clientX - (trackRef.current?.getBoundingClientRect().left ?? 0) - offset;
    setDragging(true);
  };

  const reset = () => {
    setOffset(0);
    setVerified(false);
    target.current = Math.floor(trackLength * (0.7 + Math.random() * 0.2));
    emit({ verified: false, verifiedAt: undefined, token: undefined });
  };

  const progress = verified ? 100 : Math.round((offset / trackLength) * 100);

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div
        ref={trackRef}
        className="relative h-10 rounded-md border border-border bg-muted/40 select-none overflow-hidden"
        style={{ width: trackLength }}
        role="slider"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        {/* Background fill */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-colors',
            verified ? 'bg-emerald-500/30' : 'bg-primary/15',
          )}
          style={{ width: `${progress}%` }}
        />
        {/* Hint text */}
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
          {verified ? (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="size-3.5" /> Verified
            </span>
          ) : (
            <span>{hintText}</span>
          )}
        </div>
        {/* Drag handle */}
        <button
          type="button"
          disabled={disabled || verified}
          onPointerDown={start}
          aria-label="Drag to verify"
          className={cn(
            'absolute top-0.5 bottom-0.5 w-9 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing border shadow-sm',
            verified
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-border bg-background text-foreground hover:bg-muted',
          )}
          style={{ left: offset + 1 }}
        >
          {verified ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <ShieldCheck className="size-3" /> {verified ? 'Verified' : 'Not verified'}
        </span>
        {verified && !disabled && (
          <button type="button" onClick={reset} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <RefreshCw className="size-3" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default ImageCaptchaSlider;
