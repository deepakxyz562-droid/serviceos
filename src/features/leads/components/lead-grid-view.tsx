'use client';

/**
 * LeadGridView — Phase 4 extraction from leads-view.tsx.
 *
 * Replaces the inline `renderGridView()` closure that used to live inside
 * the parent LeadsView component. The grid view is the card-based list layout
 * (3 columns on lg) shown when the user toggles the "Cards" view button.
 *
 * Each card shows:
 *   - Priority dot + Source badge + Status badge (header row)
 *   - Title + Customer name + quick WhatsApp/Call action icons
 *   - Service type badge + deal value
 *   - Address (if present)
 *   - Footer: created date + Convert to Job button (or "View Details" if the
 *     lead is won/lost)
 *
 * Loading, error, and empty states are handled inline. The whole component is
 * pure presentational — all state lives in the parent LeadsView.
 *
 * Extracted from src/components/views/leads-view.tsx (Phase 4 refactor).
 */

import {
  Target, Plus, User, Phone, MessageSquare, Briefcase, MapPin,
  ArrowRight, Eye,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { getServiceTypeLabel } from '@/features/line-items';
import {
  PRIORITY_CONFIG,
  formatDateShort,
} from '@/features/leads/utils/lead-helpers';
import {
  renderStatusBadge,
  renderSourceBadge,
} from '@/features/leads/components/lead-shared';
import type { Lead } from '@/features/leads/types';

// ── Props contract ──────────────────────────────────────────────────────────
export interface LeadGridViewProps {
  /** Leads to render (already sorted + filtered by the parent). */
  leads: Lead[];
  /** True while the leads fetch is in-flight. */
  loading: boolean;
  /** Error message (null when no error). */
  error: string | null;
  /** Retry handler — called by the ErrorState "Try again" button. */
  onRetry: () => void;
  /** Open the empty-state "Add Lead" CTA (starts a new lead form). */
  onAddLead: () => void;
  /** Open the full-page lead detail view. */
  onLeadClick: (lead: Lead) => void;
  /** Open the convert-to-job flow (hands off to Jobs view). */
  onConvert: (lead: Lead) => void;
  /** Compact currency formatter (e.g. $1.2k). */
  formatCompact: (n: number) => string;
}

/**
 * Card-based grid view of leads. Pure presentational — see props above.
 */
export function LeadGridView({
  leads,
  loading,
  error,
  onRetry,
  onAddLead,
  onLeadClick,
  onConvert,
  formatCompact,
}: LeadGridViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Target className="size-12 mb-3 opacity-20" />
        <p className="font-medium">No leads found</p>
        <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
        <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 font-semibold" onClick={onAddLead}>
          <Plus className="size-4 mr-1" /> Add Lead
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {leads.map((lead) => {
        const isWonOrLost = ['won', 'lost'].includes(lead.status);
        return (
          <Card
            key={lead.id}
            className="group relative p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
            onClick={() => onLeadClick(lead)}
          >
            <div className="space-y-3">
              {/* Header: Priority Dot + Source + Status Badge */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn('size-2 rounded-full shrink-0', PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400')} />
                  {renderSourceBadge(lead.source)}
                </div>
                <div className="shrink-0">
                  {renderStatusBadge(lead.status)}
                </div>
              </div>

              {/* Title & Customer Name */}
              <div className="space-y-1">
                <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
                  {lead.title || lead.name}
                </h4>
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="size-3.5 shrink-0 text-slate-400" />
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{lead.name}</span>
                  </div>
                  {/* Quick WhatsApp / Call icons */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {lead.phone && (
                      <>
                        <a
                          href={`tel:${lead.phone}`}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="Call customer"
                        >
                          <Phone className="size-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="WhatsApp customer"
                        >
                          <MessageSquare className="size-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Type & Deal Value Badges */}
              <div className="flex items-center justify-between gap-2 text-xs pt-1">
                {lead.serviceType ? (
                  <Badge variant="secondary" className="text-[10px] h-5 font-medium px-2 bg-slate-100 dark:bg-slate-800">
                    <Briefcase className="size-2.5 mr-1" />
                    {getServiceTypeLabel(lead.serviceType)}
                  </Badge>
                ) : <span />}

                {lead.value > 0 && (
                  <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    {formatCompact(lead.value)}
                  </span>
                )}
              </div>

              {lead.address && (
                <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  <MapPin className="size-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span className="truncate">{lead.address}</span>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-[11px] text-slate-400">{formatDateShort(lead.createdAt)}</span>

              {!isWonOrLost ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 text-xs shadow-xs"
                  onClick={() => onConvert(lead)}
                >
                  <ArrowRight className="size-3.5 mr-1" /> Convert to Job
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => onLeadClick(lead)}
                >
                  <Eye className="size-3.5 mr-1" /> View Details
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
