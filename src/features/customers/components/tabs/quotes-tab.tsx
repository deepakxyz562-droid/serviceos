'use client';

/**
 * QuotesTab — summary stats + quote cards with line-item previews and
 * "Convert to Job" CTA.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Pure presentational component. The parent owns:
 *   • `quotes`, `customer360Loading` — the data slice + loading flag.
 *   • `format` — the company currency formatter.
 *   • `convertingQuoteId` — id of the quote currently being converted
 *     (drives the per-card "Converting..." spinner).
 *   • `onConvertQuoteToJob(quoteId)` — callback that POSTs to
 *     `/api/quotes/[id]/convert-to-job` and invalidates the 360° query.
 */

import {
  FileText, CheckCircle2, ArrowUpRight, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  formatDate,
  quoteStatusConfig,
} from '../../utils/customer-helpers';
import type { CurrencyFormatFn } from '../../types';

interface QuotesTabProps {
  quotes: any[];
  customer360Loading: boolean;
  convertingQuoteId: string | null;
  onConvertQuoteToJob: (quoteId: string) => void;
  format: CurrencyFormatFn;
}

export function QuotesTab({
  quotes,
  customer360Loading,
  convertingQuoteId,
  onConvertQuoteToJob,
  format,
}: QuotesTabProps) {
  return (
    <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
      <div className="p-5 space-y-4">
        {customer360Loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="size-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground">No quotes</h3>
            <p className="text-xs text-muted-foreground mt-1">Quotes created for this customer will appear here</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-emerald-500 shadow-sm">
                <p className="text-lg font-extrabold text-foreground">{quotes.length}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Total Quotes</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-emerald-500 shadow-sm">
                <p className="text-lg font-extrabold text-emerald-500">{quotes.filter((q: any) => q.status === 'accepted').length}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Accepted</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-amber-500 shadow-sm">
                <p className="text-lg font-extrabold text-foreground">{format(quotes.reduce((s: number, q: any) => s + (q.total || 0), 0))}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Total Value</p>
              </div>
            </div>
            {/* Quote cards */}
            <div className="space-y-2">
              {quotes.map((quote: any) => {
                const cfg = quoteStatusConfig[quote.status] || quoteStatusConfig.draft;
                const items = (() => { try { return JSON.parse(quote.itemsJson || '[]'); } catch { return []; } })();
                const addOns = (() => { try { return JSON.parse(quote.addOnsJson || '[]'); } catch { return []; } })();
                const canConvert = quote.status === 'accepted' && !quote.jobId;
                const isConverted = !!quote.jobId;
                return (
                  <div key={quote.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <FileText className="size-3.5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{quote.title}</span>
                            <Badge variant="outline" className={cn('text-[10px] rounded-md', cfg.bg, cfg.color)}>{cfg.label}</Badge>
                            {isConverted && (
                              <Badge variant="outline" className="text-[10px] rounded-md bg-emerald-500/10 text-emerald-400 border-emerald-700">
                                <CheckCircle2 className="size-2.5 mr-0.5" /> Converted to Job
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(quote.createdAt)}
                            {quote.validUntil ? ` \u00B7 Valid until ${formatDate(quote.validUntil)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{format(quote.total)}</p>
                        <p className="text-[10px] text-muted-foreground">{items.length + addOns.length} items</p>
                      </div>
                    </div>
                    {/* Line items preview */}
                    {(items.length > 0 || addOns.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-border space-y-1">
                        {items.slice(0, 3).map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate">{item.name || item.serviceName || 'Service'} \u00D7 {item.qty || item.quantity || 1}</span>
                            <span className="shrink-0 ml-2">{format((item.price || 0) * (item.qty || item.quantity || 1))}</span>
                          </div>
                        ))}
                        {addOns.slice(0, 2).map((addon: any, i: number) => (
                          <div key={`addon-${i}`} className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate">{addon.name || 'Add-on'}</span>
                            <span className="shrink-0 ml-2">{format(addon.price || 0)}</span>
                          </div>
                        ))}
                        {(items.length > 3 || addOns.length > 2) && (
                          <p className="text-[10px] text-muted-foreground italic">
                            +{Math.max(0, items.length - 3) + Math.max(0, addOns.length - 2)} more items
                          </p>
                        )}
                      </div>
                    )}
                    {/* Convert to Job button */}
                    {canConvert && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-foreground gap-1.5 transition-all duration-200"
                          onClick={() => onConvertQuoteToJob(quote.id)}
                          disabled={convertingQuoteId === quote.id}
                        >
                          {convertingQuoteId === quote.id ? (
                            <><Loader2 className="size-3.5 animate-spin" /> Converting...</>
                          ) : (
                            <><ArrowUpRight className="size-3.5" /> Convert to Job</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
