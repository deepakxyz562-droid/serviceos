'use client';

/**
 * CompletedDealsDialog
 * ====================
 * Full-screen modal that shows a paginated, searchable table of won/lost
 * deals. Opens when the user clicks "View All →" on the Won/Lost Summary
 * widgets.
 *
 * Pipeline Redesign (Phase 1)
 * ---------------------------
 * Replaces the old Won/Lost Kanban columns. Instead of rendering 100 cards
 * in a column, we show a compact summary widget and let the user open this
 * table modal to see the full list with pagination + search.
 *
 * Features:
 *   - Paginated table (10 rows per page)
 *   - Search by title / customer name / customer phone
 *   - Type filter: won | lost | all (defaults to the widget that opened it)
 *   - Job Status Chip per row (Scheduled / Completed / Cancelled / etc.)
 *   - Archive / Unarchive button per row
 *   - Click row → opens deal detail (calls onOpenDeal callback)
 *
 * Data source: GET /api/deals/completed?type=won|lost|all&page=&limit=&search=
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Loader2,
  Trophy,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { JobStatusChip } from './job-status-chip';

export type CompletedDealsType = 'won' | 'lost' | 'all';

interface CompletedDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  closedAt: string | null;
  archivedAt: string | null;
  jobCancelledAt: string | null;
  convertedJobId: string | null;
  assigneeName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  leadSource: string | null;
  job: {
    id: string;
    status: string;
    scheduledAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    paymentStatus: string | null;
  } | null;
}

interface CompletedDealsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial type filter — set by the widget that opened the dialog. */
  initialType: CompletedDealsType;
  /** Called when the user clicks a row to open the deal detail. */
  onOpenDeal: (dealId: string) => void;
  /** Called after a successful archive/unarchive so the parent can refresh. */
  onArchiveChange?: () => void;
}

const PAGE_SIZE = 10;

export function CompletedDealsDialog({
  open,
  onOpenChange,
  initialType,
  onOpenDeal,
  onArchiveChange,
}: CompletedDealsDialogProps) {
  const [type, setType] = useState<CompletedDealsType>(initialType);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deals, setDeals] = useState<CompletedDeal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Sync type when dialog opens
  useEffect(() => {
    if (open) {
      setType(initialType);
      setPage(1);
      setSearch('');
      setSearchInput('');
    }
  }, [open, initialType]);

  // Debounce search input → search query
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set('search', search);
      // Include archived deals in this view so the user can see + unarchive them
      params.set('includeArchived', 'true');

      const res = await authFetch(
        `/api/deals/completed?${params.toString()}&XTransformPort=3000`,
      );
      if (!res.ok) {
        toast.error('Failed to load completed deals');
        return;
      }
      const json = await res.json();
      setDeals(json?.data ?? []);
      setTotal(json?.pagination?.total ?? 0);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [type, page, search]);

  useEffect(() => {
    if (open) fetchDeals();
  }, [open, fetchDeals]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleArchive = async (dealId: string, currentlyArchived: boolean) => {
    setArchivingId(dealId);
    try {
      const method = currentlyArchived ? 'DELETE' : 'POST';
      const res = await authFetch(
        `/api/deals/${dealId}/archive?XTransformPort=3000`,
        { method },
      );
      if (!res.ok) {
        toast.error('Failed to update archive status');
        return;
      }
      toast.success(
        currentlyArchived ? 'Deal unarchived' : 'Deal archived',
      );
      // Refresh the list
      fetchDeals();
      onArchiveChange?.();
    } catch {
      toast.error('Network error');
    } finally {
      setArchivingId(null);
    }
  };

  const formatMoney = (value: number, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(value || 0);
    } catch {
      return `$${(value || 0).toFixed(0)}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            {type === 'won' && <Trophy className="size-4 text-emerald-600" />}
            {type === 'lost' && <XCircle className="size-4 text-red-600" />}
            {type === 'all' && <Trophy className="size-4 text-muted-foreground" />}
            Completed Deals
            <Badge variant="secondary" className="text-[10px] h-5">
              {total} total
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Paginated table of won and lost deals
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30 flex-wrap">
          <div className="flex items-center gap-1">
            {(['won', 'lost', 'all'] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={type === t ? 'default' : 'outline'}
                onClick={() => {
                  setType(t);
                  setPage(1);
                }}
                className="h-7 text-xs capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search title, customer, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs w-[25%]">Business / Title</TableHead>
                <TableHead className="text-xs w-[10%]">Value</TableHead>
                <TableHead className="text-xs w-[12%]">Closed</TableHead>
                <TableHead className="text-xs w-[15%]">Job Status</TableHead>
                <TableHead className="text-xs w-[13%]">Owner</TableHead>
                <TableHead className="text-xs w-[10%]">Source</TableHead>
                <TableHead className="text-xs w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    {search
                      ? `No deals match "${search}"`
                      : `No ${type === 'all' ? 'completed' : type} deals yet`}
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => {
                  const isArchived = !!deal.archivedAt;
                  return (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => onOpenDeal(deal.id)}
                    >
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium line-clamp-1">{deal.title}</span>
                          {deal.customerName && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {deal.customerName}
                              {deal.customerPhone ? ` · ${deal.customerPhone}` : ''}
                            </span>
                          )}
                          {isArchived && (
                            <Badge variant="outline" className="text-[9px] h-4 w-fit px-1 bg-muted/50">
                              Archived
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-600">
                        {formatMoney(deal.value, deal.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {deal.closedAt
                          ? format(parseISO(deal.closedAt), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {deal.convertedJobId && deal.job ? (
                          <JobStatusChip
                            jobStatus={deal.job.status}
                            jobScheduledAt={deal.job.scheduledAt}
                            jobPaymentStatus={deal.job.paymentStatus}
                            jobCancelledAt={deal.job.cancelledAt || deal.jobCancelledAt}
                            size="sm"
                          />
                        ) : (
                          <JobStatusChip jobStatus={null} size="sm" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {deal.assigneeName || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {deal.leadSource && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                            {deal.leadSource}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => onOpenDeal(deal.id)}
                            title="Open deal detail"
                          >
                            <ExternalLink className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={archivingId === deal.id}
                            onClick={() => handleArchive(deal.id, isArchived)}
                            title={isArchived ? 'Unarchive deal' : 'Archive deal'}
                          >
                            {archivingId === deal.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : isArchived ? (
                              <ArchiveRestore className="size-3" />
                            ) : (
                              <Archive className="size-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} deal{total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
