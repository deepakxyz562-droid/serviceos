'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const BOS_LOGO_MARK_SRC = '/bos/logo-mark.png';
export const BOS_PRIMARY_LOGO_SRC = '/bos/primary-logo.png';
export const BOS_SIDEBAR_LOGO_SRC = '/bos/sidebar-logo.png';
export const BOS_APP_ICON_SRC = '/bos/app-icon.png';

export function BosLogoIcon({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={BOS_LOGO_MARK_SRC}
      alt="BOS"
      width={size}
      height={size}
      draggable={false}
      className={cn(
        'shrink-0 rounded-[11px] object-contain select-none shadow-[0_2px_8px_rgba(0,0,0,0.22)]',
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

export function BosBrand({
  variant = 'sidebar',
  compact = false,
  className,
}: {
  variant?: 'sidebar' | 'light' | 'auth';
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <div className={cn('inline-flex items-center justify-center', className)} aria-label="BOS — Business Operating System">
        <BosLogoIcon size={38} />
      </div>
    );
  }

  const isSidebar = variant === 'sidebar';

  return (
    <div
      className={cn('inline-flex items-center gap-3 min-w-0 select-none', className)}
      aria-label="BOS — Business Operating System"
    >
      <BosLogoIcon size={40} />
      <div className="min-w-0 flex flex-col justify-center leading-tight">
        <span
          className={cn(
            'text-[22px] font-extrabold tracking-[-0.02em] leading-[1.05]',
            isSidebar ? 'text-white' : 'text-[#0B1F17]',
          )}
        >
          BOS
        </span>
        <span
          className={cn(
            'text-[11px] font-medium tracking-[-0.01em] truncate mt-0.5',
            isSidebar ? 'text-[#B8DCD0]' : 'text-[#4B6358]',
          )}
        >
          Business Operating System
        </span>
      </div>
    </div>
  );
}
