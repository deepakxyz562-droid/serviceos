'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FormSectionCardProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string; strokeWidth?: number }> | React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  description?: string;
  /** Right-aligned action slot (e.g. an "Add Field" button or subtotal) */
  action?: React.ReactNode;
  /** Legacy alias for action */
  headerAction?: React.ReactNode;
  /** Extra className for the outer card */
  className?: string;
  /** Extra className for the content area */
  contentClassName?: string;
  /** Whether to show a separator below the header. Default: true */
  separator?: boolean;
  children: React.ReactNode;
}

/**
 * Jobber-style form section card.
 *
 * Clean white surface with subtle shadow, rounded-xl corners, and a
 * consistent header pattern: emerald icon badge + semibold title +
 * optional muted description + optional right-aligned action,
 * followed by a separator and the content area (p-6 / 24px padding).
 *
 * Used by New Lead, New Job, Booking Detail, and Booking Form to give every
 * section a uniform, polished appearance.
 */
export function FormSectionCard({
  icon,
  title,
  subtitle,
  badge,
  description,
  action,
  headerAction,
  className,
  contentClassName,
  separator = true,
  children,
}: FormSectionCardProps) {
  const resolvedAction = action ?? headerAction;
  const resolvedDescription = description ?? subtitle;
  const hasHeader = !!(icon || title || resolvedDescription || badge || resolvedAction);

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ className?: string; strokeWidth?: number }>;
    if (typeof IconComponent === 'function' || typeof IconComponent === 'object') {
      return <IconComponent className="size-4" strokeWidth={2.2} />;
    }
    return null;
  };

  return (
    <section className={cn('form-card', className)}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span className="form-section-icon">
                {renderIcon()}
              </span>
            )}
            {(title || resolvedDescription || badge) && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h3 className="text-base font-semibold tracking-tight text-foreground leading-tight">
                      {title}
                    </h3>
                  )}
                  {badge}
                </div>
                {resolvedDescription && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {resolvedDescription}
                  </p>
                )}
              </div>
            )}
          </div>
          {resolvedAction && <div className="shrink-0">{resolvedAction}</div>}
        </div>
      )}
      {hasHeader && separator && <Separator className="bg-border/60" />}
      <div className={cn('p-6', contentClassName)}>{children}</div>
    </section>
  );
}

// ─── Form page header ───────────────────────────────────────────────

export interface FormPageHeaderProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string; strokeWidth?: number }> | React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  backLabel?: string;
  onBack: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  /** Hide the Cancel + submit buttons in the header (e.g. if shown at the bottom instead) */
  hideActions?: boolean;
  /** Custom right-hand actions slot (overrides default Cancel/Submit buttons if provided) */
  actions?: React.ReactNode;
}

/**
 * Jobber-style sticky form/detail page header.
 *
 * Full-width sticky bar with a translucent blurred background,
 * a Back button, an emerald icon badge + title + optional badge on the left,
 * and customizable action buttons on the right.
 */
export function FormPageHeader({
  icon,
  iconBg = 'bg-emerald-600',
  title,
  subtitle,
  badge,
  backLabel = 'Back',
  onBack,
  onSubmit,
  submitLabel = 'Save',
  submitting = false,
  hideActions = false,
  actions,
}: FormPageHeaderProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon as React.ComponentType<{ className?: string; strokeWidth?: number }>;
    if (typeof IconComponent === 'function' || typeof IconComponent === 'object') {
      return <IconComponent className="size-5 text-white" strokeWidth={2.2} />;
    }
    return null;
  };

  return (
    <div className="form-page-header -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 py-3 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
          <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
          {icon && (
            <div className={cn('flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm', iconBg)}>
              {renderIcon()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side actions */}
        {actions ? (
          <div className="shrink-0">{actions}</div>
        ) : !hideActions && onSubmit ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBack}
              className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting && (
                <svg className="size-4 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {submitLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
