'use client';

import React from 'react';
import { type LucideIcon, Plus } from 'lucide-react';

/**
 * BosEmptyState — shared illustrated empty state with a primary pill CTA,
 * matching the Vyapar pattern: icon/illustration + one-line value prop + CTA.
 *
 * Used across BOS workstations (invoices list, customers, cheques register,
 * purchase bills, …) whenever a list is empty AND not loading.
 */
export type BosEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  /** One-line value proposition shown under the title. */
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Optional secondary action (e.g. import / learn more). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Compact variant for embedding inside table cells / tight cards. */
  compact?: boolean;
  className?: string;
};

export function BosEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  compact = false,
  className = '',
}: BosEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-12 px-6'
      } ${className}`}
      role="status"
    >
      <div
        className={`flex items-center justify-center rounded-2xl bg-[#E6F6F0] text-[#0A6847] ${
          compact ? 'h-14 w-14' : 'h-16 w-16'
        }`}
        aria-hidden="true"
      >
        <Icon className={compact ? 'h-7 w-7 stroke-[1.6]' : 'h-8 w-8 stroke-[1.4]'} />
      </div>

      <h3 className={`font-bold text-[#111827] ${compact ? 'mt-3 text-[14px]' : 'mt-4 text-[15.5px]'}`}>
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#64748B]">
          {description}
        </p>
      )}

      {(ctaLabel || secondaryLabel) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {ctaLabel && (
            <button
              type="button"
              onClick={onCta}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0A6847] px-5 text-[12.5px] font-bold text-white shadow-2xs transition hover:bg-[#085238] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{ctaLabel}</span>
            </button>
          )}
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#DCE9E3] bg-white px-4 text-[12.5px] font-semibold text-[#1E293B] transition hover:bg-[#F4F8F6] cursor-pointer"
            >
              <span>{secondaryLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
