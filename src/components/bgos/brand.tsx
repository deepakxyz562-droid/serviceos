'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Official BGOS Ribbon Icon Component
 * Approved folded-G artwork shared with the web favicon.
 */
export function BgosRibbonIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center ${className}`}
    >
      <Image
        src="/bgos/teal-mark.png"
        alt="BGOS Mark"
        width={size}
        height={size}
        priority
        unoptimized
        className="size-full object-contain"
      />
    </div>
  );
}

/**
 * BGOS Brand Identity Component
 * =============================
 * Implements the official BGOS design specifications:
 * - Teal/Cyan geometric ribbon loop logo mark (/bgos/teal-mark.png)
 * - Modern geometric bold typography (BGOS)
 * - Tracked uppercase sub-headline (BUSINESS GROWTH OS)
 */
export function BgosBrand({
  compact = false,
  className = '',
  inverted = false,
  size = 36,
}: {
  compact?: boolean;
  className?: string;
  inverted?: boolean;
  size?: number;
}) {
  return (
    <span className={`bgos-logo inline-flex items-center gap-2.5 ${className}`}>
      <BgosRibbonIcon size={size} />
      {!compact && (
        <span className="bgos-logo-copy flex flex-col text-left leading-none">
          <strong
            className={`text-[20px] font-black tracking-tight ${
              inverted ? 'text-white' : 'text-foreground'
            }`}
          >
            BGOS
          </strong>
          <small
            className={`mt-0.5 text-[10px] font-bold tracking-[0.2em] uppercase ${
              inverted ? 'text-teal-200' : 'text-muted-foreground'
            }`}
          >
            BUSINESS GROWTH OS
          </small>
        </span>
      )}
    </span>
  );
}
