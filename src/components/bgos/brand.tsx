'use client';

import Image from 'next/image';

/**
 * BGOS Brand Identity Component
 * =============================
 * Implements the official BGOS design specifications:
 * - Teal/Cyan geometric ribbon loop logo mark (/bgos/teal-mark.png)
 * - Modern geometric bold typography (BGOS)
 * - Tracked uppercase sub-headline (BUSINESS GROWTH OS)
 */
export function BgosBrand({ compact = false, className = '', inverted = false }: { compact?: boolean; className?: string; inverted?: boolean }) {
  return (
    <span className={`bgos-logo inline-flex items-center gap-2.5 ${className}`}>
      <div className="relative size-10 shrink-0">
        <Image
          src="/bgos/teal-mark.png"
          alt={compact ? "BGOS" : ""}
          width={36}
          height={36}
          priority
          unoptimized
          className="size-full object-contain filter drop-shadow-xs"
        />
      </div>
      {!compact && (
        <span className="bgos-logo-copy flex flex-col text-left leading-none">
          <strong className={`text-[20px] font-black tracking-tight ${inverted ? "text-white" : "text-slate-900 dark:text-white"}`}>
            BGOS
          </strong>
          <small className={`mt-0.5 text-[8.5px] font-bold tracking-[0.18em] uppercase ${inverted ? "text-teal-100" : "text-slate-500 dark:text-slate-400"}`}>
            BUSINESS GROWTH OS
          </small>
        </span>
      )}
    </span>
  );
}
