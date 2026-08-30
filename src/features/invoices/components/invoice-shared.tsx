'use client';

/**
 * invoice-shared.tsx — Phase 5A extraction from invoices-view.tsx.
 *
 * Small JSX-returning badge helpers shared across the invoice feature
 * components (InvoiceDetailPage, NewInvoicePage, the inline data-table
 * columns in invoices-view.tsx, the legacy detail Dialog). Mirrors the
 * `lead-shared.tsx` pattern from Phase 4.
 *
 * Extracted from src/components/views/invoices-view.tsx (Phase 5A refactor).
 */

import { getStatusConfig } from '@/features/invoices/utils/invoice-helpers';

/**
 * Render a small inline status pill (dot + label) for an Invoice.status.
 * Used by the data-table status column, the legacy detail dialog, and the
 * full-page detail view.
 */
export function renderStatusBadge(status: string) {
  const config = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}
    >
      <span className={`size-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
