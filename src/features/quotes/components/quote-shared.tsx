'use client';

/**
 * quote-shared.tsx — Phase 5B extraction from quotes-view.tsx.
 *
 * Small JSX-returning badge + icon helpers shared across the quote feature
 * components (QuoteDetailPage, NewQuotePage, the inline data-table columns
 * in quotes-view.tsx, the legacy detail Dialog, EmailPreview). Mirrors the
 * `invoice-shared.tsx` pattern from Phase 5A.
 *
 * Extracted from src/components/views/quotes-view.tsx (Phase 5B refactor).
 */

import {
  Clock,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG } from '@/features/quotes/utils/quote-helpers';
import type { QuoteStatus } from '@/features/quotes/types';

/**
 * Resolve the status-specific lucide icon for a QuoteStatus.
 *
 * Mirrors the icon assignments that used to live inline on the original
 * `STATUS_CONFIG[status].icon` field (Draft → FileText, Sent → Send,
 * Accepted → CheckCircle2, Rejected → XCircle, Expired → Clock). Returns
 * `<FileText />` as a safe fallback for unknown statuses.
 */
export function getQuoteStatusIcon(status: QuoteStatus | string) {
  switch (status) {
    case 'draft':
      return <FileText className="size-3" />;
    case 'sent':
      return <Send className="size-3" />;
    case 'accepted':
      return <CheckCircle2 className="size-3" />;
    case 'rejected':
      return <XCircle className="size-3" />;
    case 'expired':
      return <Clock className="size-3" />;
    default:
      return <FileText className="size-3" />;
  }
}

/**
 * Render the inline status pill (icon + label) for a Quote.status.
 *
 * Used by the data-table status column, the legacy detail dialog, the
 * full-page detail view, and the EmailPreview header. Preserves the
 * exact Tailwind classes from the original `renderStatusBadge()` closure.
 */
export function renderStatusBadge(status: QuoteStatus | string) {
  const config =
    STATUS_CONFIG[status as QuoteStatus] || STATUS_CONFIG.draft;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-5 ${config.bg} ${config.text} ${config.border}`}
    >
      {getQuoteStatusIcon(status)}
      <span className="ml-1">{config.label}</span>
    </Badge>
  );
}
