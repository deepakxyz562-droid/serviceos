'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Official BGOS App Icon Component
 * Emerald squircle (#0B9042) enclosing the stylized lowercase 'b' with upward growth arrow.
 */
export function BgosRibbonIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 flex items-center justify-center ${className}`}
    >
      <Image
        src="/bgos/icon-squircle.png"
        alt="BGOS Icon"
        width={size}
        height={size}
        loading="eager"
        unoptimized
        className="size-full object-contain"
      />
    </div>
  );
}

/**
 * BGOS Brand Identity Component
 * =============================
 * Renders the official BGOS horizontal logo lockup (/bgos/primary-logo.png)
 * with the emerald growth 'b' mark, bold BGOS wordmark, and "Business Growth OS" subtitle,
 * or the compact squircle icon when collapsed.
 */
export function BgosBrand({
  compact = false,
  className = '',
  inverted = false,
  themeAdaptive = false,
  size = 40,
}: {
  compact?: boolean;
  className?: string;
  inverted?: boolean;
  themeAdaptive?: boolean;
  size?: number;
}) {
  if (compact) {
    return <BgosRibbonIcon size={size} className={className} />;
  }

  // Primary horizontal lockup natural aspect ratio: 946 x 308
  const width = Math.round((size * 946) / 308);

  if (themeAdaptive && !inverted) {
    return (
      <span className={`bgos-logo inline-flex items-center shrink-0 ${className}`}>
        <Image
          src="/bgos/primary-logo.png"
          alt="BGOS — Business Growth OS"
          width={width}
          height={size}
          loading="eager"
          unoptimized
          style={{ width, height: size }}
          className="object-contain dark:hidden"
        />
        <Image
          src="/bgos/primary-logo-dark.png"
          alt="BGOS — Business Growth OS"
          width={width}
          height={size}
          loading="eager"
          unoptimized
          style={{ width, height: size }}
          className="hidden object-contain dark:block"
        />
      </span>
    );
  }

  return (
    <span className={`bgos-logo inline-flex items-center shrink-0 ${className}`}>
      <Image
        src={inverted ? '/bgos/primary-logo-dark.png' : '/bgos/primary-logo.png'}
        alt="BGOS — Business Growth OS"
        width={width}
        height={size}
        loading="eager"
        unoptimized
        style={{ width, height: size }}
        className="object-contain"
      />
    </span>
  );
}
