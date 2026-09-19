'use client';

import React from 'react';
import type { WidgetProps } from './widget-props';
import { ImageIcon, ExternalLink } from 'lucide-react';

export function StaticImageWidget({ config, field }: WidgetProps) {
  const imageUrl =
    (config?.imageUrl as string) ||
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80';
  const altText = (config?.altText as string) || (field?.label as string) || 'Image';
  const caption = (config?.caption as string) || '';
  const alignment = (config?.alignment as string) || 'center';
  const maxWidthPercent = (config?.maxWidthPercent as number) || 100;
  const heightPx = Number(config?.heightPx || 0);
  const borderRadius = (config?.borderRadius as string) || '12px';
  const linkUrl = (config?.linkUrl as string) || '';

  const alignClass =
    alignment === 'left'
      ? 'justify-start text-left'
      : alignment === 'right'
      ? 'justify-end text-right'
      : 'justify-center text-center';

  const imageContent = (
    <div
      className="overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
      style={{
        borderRadius,
        maxWidth: `${maxWidthPercent}%`,
        height: heightPx > 0 ? `${heightPx}px` : 'auto',
      }}
    >
      <img
        src={imageUrl}
        alt={altText}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );

  return (
    <div className={`w-full flex flex-col ${alignClass} py-1 space-y-1.5`}>
      {linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block transition-transform hover:scale-[1.01]"
        >
          {imageContent}
        </a>
      ) : (
        imageContent
      )}
      {caption && (
        <p className="text-[11px] text-muted-foreground italic px-1">{caption}</p>
      )}
    </div>
  );
}

export default StaticImageWidget;
