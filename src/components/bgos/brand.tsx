'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Official BGOS Ribbon Icon Component
 * Lowercase b mark matching the approved green reference.
 */
export function BgosRibbonIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center ${className}`}
    >
      <Image
        src="/bgos/icon.svg"
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
 * - Green lowercase b logo mark (/bgos/icon.svg)
 * - Lowercase wordmark (bgos)
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
            bgos
          </strong>

        </span>
      )}
    </span>
  );
}
