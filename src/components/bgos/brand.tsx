'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Official BGOS Ribbon Icon Component
 * Vector gradient ribbon loop matching the official brand identity sheet.
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
        className="size-full object-contain filter drop-shadow-xs"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.includes('icon-mark.png')) {
            target.src = '/bgos/icon-mark.png';
          }
        }}
      />
    </div>
  );
}

/**
 * BGOS Brand Identity Component
 * =============================
 * Implements the official BGOS design specifications:
 * - Teal/Cyan geometric ribbon loop logo mark (/bgos/icon-mark.png or /bgos/icon.svg)
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
              inverted ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            BGOS
          </strong>
          <small
            className={`mt-0.5 text-[8.5px] font-bold tracking-[0.2em] uppercase ${
              inverted ? 'text-teal-200' : 'text-slate-500 dark:text-teal-400'
            }`}
          >
            BUSINESS GROWTH OS
          </small>
        </span>
      )}
    </span>
  );
}
