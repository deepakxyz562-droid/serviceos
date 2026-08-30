'use client';

/**
 * EmailPreview — Phase 5B extraction from quotes-view.tsx.
 *
 * Replaces the inline `EmailPreview` function component that used to live
 * at the top of quotes-view.tsx. Renders the customer-facing quote email
 * mockup shown inside the "Email Preview" dialog (both from the quotes
 * list dropdown and from the New Quote form's "Preview WhatsApp" button —
 * the dialog title says "Email Preview" but the same component is used for
 * both flows).
 *
 * Layout:
 *   - Teal header bar + "Fieseros Quote" eyebrow
 *   - Quote title + "Prepared for {customerName}"
 *   - Pricing summary box (Subtotal / Discount / Tax / Total)
 *   - Centered "Review & Approve Quote →" CTA pill
 *   - Optional Line Items list (name × qty → line total)
 *   - Optional Notes block (quote.description)
 *
 * Returns `null` when `quote` is `null` (matches the original guard).
 *
 * Extracted from src/components/views/quotes-view.tsx (Phase 5B refactor).
 */

import { useCompanyCurrency } from '@/hooks/use-company-currency';
import type { Quote } from '@/features/quotes/types';

export interface EmailPreviewProps {
  /** The quote to render. When null, the component renders nothing. */
  quote: Quote | null;
}

/**
 * Customer-facing email mockup. Pure presentational — same JSX, same
 * Tailwind classes, same `useCompanyCurrency` hook usage as the original.
 */
export function EmailPreview({ quote }: EmailPreviewProps) {
  const { format: fmt } = useCompanyCurrency();
  if (!quote) return null;
  return (
    <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm text-slate-800 dark:text-slate-200">
        <div className="bg-teal-700 h-1.5 w-full" />
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Fieseros Quote</p>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-0.5">Quote: {quote.title}</h3>
            <p className="text-xs text-slate-500">Prepared for <span className="font-medium text-slate-700 dark:text-slate-300">{quote.customerName}</span></p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium">{fmt(quote.subtotal)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{fmt(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Tax ({quote.taxRate}%):</span>
              <span>{fmt(quote.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span>Total Quote Value:</span>
              <span className="text-teal-700 dark:text-teal-400">{fmt(quote.total)}</span>
            </div>
          </div>

          <div className="text-center pt-1">
            <span className="inline-block bg-teal-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm">
              Review & Approve Quote →
            </span>
          </div>

          {quote.services.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Line Items:</p>
              {quote.services.map((s) => (
                <div key={s.id} className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{s.name} (x{s.quantity})</span>
                  <span className="font-mono">{fmt(s.price * s.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          {quote.description && (
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border-l-2 border-teal-700">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Notes:</span> {quote.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
