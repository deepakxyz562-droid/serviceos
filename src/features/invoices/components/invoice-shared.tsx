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

import { Badge } from '@/components/ui/badge';
import { getStatusConfig } from '@/features/invoices/utils/invoice-helpers';

/**
 * Render a polished status pill (dot + label) for an Invoice.status.
 * Used by the data-table status column, the legacy detail dialog, and the
 * full-page detail view.
 */
export function renderStatusBadge(status: string) {
  const config = getStatusConfig(status);
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border shadow-2xs transition-colors ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}
