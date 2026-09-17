'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface ProductCatalogValue {
  currentPage: number;
  totalPages: number;
  provider: 'flipbook';
}

export function ProductCatalogFlipbook({ value, onChange, config, disabled, field }: WidgetProps) {
  const pages = Array.isArray(config?.pages)
    ? (config.pages as string[])
    : [String(config?.coverImage ?? '')].filter(Boolean);
  const title = String(config?.title ?? field?.label ?? 'Product Catalog');
  const ariaLabel = String(field?.label ?? 'Product catalog flipbook');
  const fullscreen = Boolean(config?.allowFullscreen ?? true);

  const initialPage = (value as ProductCatalogValue | undefined)?.currentPage ?? 1;
  const [page, setPage] = useState<number>(initialPage > 0 && initialPage <= pages.length ? initialPage : 1);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (!disabled) {
      onChange({ currentPage: page, totalPages: pages.length, provider: 'flipbook' } as ProductCatalogValue);
    }
     
  }, [page, pages.length]);

  if (pages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <BookOpen className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs mt-2 font-semibold">No catalog pages configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.pages</code> as an array of image URLs.</p>
      </div>
    );
  }

  const go = (delta: number) => {
    if (disabled || flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setPage((p) => Math.max(1, Math.min(pages.length, p + delta)));
      setFlipping(false);
    }, 150);
  };

  const currentImage = pages[page - 1];

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold truncate">{title}</p>
        <span className="text-[10px] text-muted-foreground tabular-nums">{page} / {pages.length}</span>
      </div>
      <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20 aspect-[3/4] max-h-[520px] mx-auto flex items-center justify-center">
        <img
          key={page}
          src={currentImage}
          alt={`${title} — page ${page}`}
          className={`w-full h-full object-contain transition-transform duration-150 ${flipping ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => go(-1)}
          aria-label="Previous page"
          className="absolute left-1 top-1/2 -translate-y-1/2 size-9 p-0 bg-white/70 dark:bg-black/40 backdrop-blur-sm"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || page >= pages.length}
          onClick={() => go(1)}
          aria-label="Next page"
          className="absolute right-1 top-1/2 -translate-y-1/2 size-9 p-0 bg-white/70 dark:bg-black/40 backdrop-blur-sm"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setPage(1)} className="text-[10px] gap-1">
            <RotateCw className="size-3" /> Restart
          </Button>
        </div>
        {fullscreen && currentImage && (
          <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1">
            <a href={currentImage} target="_blank" rel="noopener noreferrer">
              <Maximize2 className="size-3" /> Fullscreen
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export default ProductCatalogFlipbook;
