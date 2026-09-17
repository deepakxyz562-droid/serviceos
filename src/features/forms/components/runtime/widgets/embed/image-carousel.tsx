'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { WidgetProps } from '../widget-props';

interface CarouselValue {
  index: number;
  count: number;
}

export function ImageCarousel({ value, onChange, config, disabled, field }: WidgetProps) {
  const images = Array.isArray(config?.images)
    ? (config.images as Array<string | { url: string; alt?: string }>).map((item) =>
        typeof item === 'string' ? { url: item, alt: '' } : item,
      )
    : [];
  const autoplay = Boolean(config?.autoplay ?? false);
  const intervalMs = Number(config?.intervalMs ?? 4000);
  const ariaLabel = String(field?.label ?? 'Image carousel');

  const initial = (value as CarouselValue | undefined)?.index ?? 0;
  const [index, setIndex] = useState<number>(images.length ? Math.min(initial, images.length - 1) : 0);
  const [lightbox, setLightbox] = useState(false);

  const goTo = useCallback((i: number) => {
    if (!images.length || disabled) return;
    const next = ((i % images.length) + images.length) % images.length;
    setIndex(next);
    onChange({ index: next, count: images.length } as CarouselValue);
  }, [images.length, disabled, onChange]);

  useEffect(() => {
    if (!autoplay || disabled || images.length < 2) return;
    const id = window.setInterval(() => goTo(index + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [autoplay, index, intervalMs, images.length, disabled, goTo]);

  if (!images.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <ImageIcon className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No carousel images configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.images</code> as an array of URLs.</p>
      </div>
    );
  }

  const current = images[index];

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20 aspect-video group">
        <img
          src={current.url}
          alt={current.alt || `Slide ${index + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
          key={index}
        />
        <Button type="button" variant="ghost" size="sm" disabled={disabled}
          onClick={() => goTo(index - 1)} aria-label="Previous image"
          className="absolute left-1 top-1/2 -translate-y-1/2 size-9 p-0 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
          <ChevronLeft className="size-5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={disabled}
          onClick={() => goTo(index + 1)} aria-label="Next image"
          className="absolute right-1 top-1/2 -translate-y-1/2 size-9 p-0 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
          <ChevronRight className="size-5" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => setLightbox(true)} aria-label="Open fullscreen"
          className="absolute top-1 right-1 size-7 p-0 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            disabled={disabled}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-6 bg-emerald-600' : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70'
            }`}
          />
        ))}
      </div>

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
          <DialogTitle className="sr-only">{current.alt || `Slide ${index + 1}`}</DialogTitle>
          <div className="relative">
            <img src={current.url} alt={current.alt || `Slide ${index + 1}`} className="w-full max-h-[80vh] object-contain" />
            <Button type="button" variant="ghost" size="sm"
              onClick={() => setLightbox(false)} aria-label="Close"
              className="absolute top-2 right-2 size-8 p-0 text-white hover:bg-white/10">
              <X className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm"
              onClick={() => goTo(index - 1)} aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 size-9 p-0 text-white hover:bg-white/10">
              <ChevronLeft className="size-5" />
            </Button>
            <Button type="button" variant="ghost" size="sm"
              onClick={() => goTo(index + 1)} aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-9 p-0 text-white hover:bg-white/10">
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ImageCarousel;
