'use client';

import type { LucideIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FormSectionCardProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** Right-aligned action slot (e.g. an "Add Field" button) */
  action?: React.ReactNode;
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
 * Used by the New Lead and New Job full-page forms to give every
 * section (Overview, Schedule, Billing, Product/Service, Notes, etc.)
 * a uniform, polished appearance.
 */
export function FormSectionCard({
  icon: Icon,
  title,
  description,
  action,
  className,
  contentClassName,
  separator = true,
  children,
}: FormSectionCardProps) {
  const hasHeader = !!(Icon || title || description || action);
  return (
    <section className={cn('form-card', className)}>
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <span className="form-section-icon">
                <Icon className="size-4" strokeWidth={2.2} />
              </span>
            )}
            {(title || description) && (
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base font-semibold tracking-tight text-foreground leading-tight">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {hasHeader && separator && <Separator className="bg-border/60" />}
      <div className={cn('p-6', contentClassName)}>{children}</div>
    </section>
  );
}

// ─── Form page header ───────────────────────────────────────────────

interface FormPageHeaderProps {
  icon: LucideIcon;
  iconBg?: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  /** Hide the Cancel + submit buttons in the header (e.g. if shown at the bottom instead) */
  hideActions?: boolean;
}

/**
 * Jobber-style sticky form page header.
 *
 * Full-width sticky bar with a translucent blurred background,
 * a Back button, an emerald icon badge + title on the left,
 * and a Cancel + primary submit button on the right.
 */
export function FormPageHeader({
  icon: Icon,
  iconBg = 'bg-emerald-600',
  title,
  subtitle,
  onBack,
  onSubmit,
  submitLabel = 'Save',
  submitting = false,
  hideActions = false,
}: FormPageHeaderProps) {
  return (
    <div className="form-page-header -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-6">
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
            <span className="hidden sm:inline">Back</span>
          </button>
          <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
          <div className={cn('flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm', iconBg)}>
            <Icon className="size-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
            )}
          </div>
        </div>
        {!hideActions && onSubmit && (
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
        )}
      </div>
    </div>
  );
}
