'use client';

/**
 * PipelineTableView
 * =================
 * Sortable, filterable data table view of all deals (active + completed).
 *
 * Pipeline Redesign (Phase 4)
 */

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Inbox,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { SmartEmptyState } from '../smart-empty-state';
import { JobStatusChip } from '../job-status-chip';

export interface TableDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  customerName?: string | null;
  customerPhone?: string | null;
  assigneeName?: string | null;
  closedAt?: string | null;
  expectedCloseDate?: string | null;
  jobCancelledAt?: string | null;
  convertedJobId?: string | null;
  createdAt: string;
}

interface PipelineTableViewProps {
  deals: TableDeal[];
  stageLabels: Record<string, string>;
  onRowClick: (deal: TableDeal) => void;
  className?: string;
}

type SortField = 'title' | 'value' | 'stage' | 'probability' | 'closedAt' | 'createdAt';
type SortDir = 'asc' | 'desc';

function formatMoney(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toFixed(0)}`;
  }
}

export function PipelineTableView({
  deals,
  stageLabels,
  onRowClick,
  className,
}: PipelineTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedDeals = useMemo(() => {
    const sorted = [...deals].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'value':
          aVal = a.value;
          bVal = b.value;
          break;
        case 'stage':
          aVal = stageLabels[a.stage] || a.stage;
          bVal = stageLabels[b.stage] || b.stage;
          break;
        case 'probability':
          aVal = a.probability;
          bVal = b.probability;
          break;
        case 'closedAt':
          aVal = a.closedAt ? new Date(a.closedAt).getTime() : 0;
          bVal = b.closedAt ? new Date(b.closedAt).getTime() : 0;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [deals, sortField, sortDir, stageLabels]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return <ArrowUpDown className="size-3 opacity-30" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="size-3" />
    ) : (
      <ChevronDown className="size-3" />
    );
  };

  if (deals.length === 0) {
    return (
      <SmartEmptyState
        variant="page"
        icon={Inbox}
        title="No deals to display"
        description="Deals will appear here once they're created."
      />
    );
  }

  const columns: Array<{
    field: SortField;
    label: string;
    className?: string;
  }> = [
    { field: 'title', label: 'Title' },
    { field: 'value', label: 'Value' },
    { field: 'stage', label: 'Stage' },
    { field: 'probability', label: 'Prob.' },
    { field: 'createdAt', label: 'Created' },
    { field: 'closedAt', label: 'Closed' },
  ];

  return (
    <div className={cn('rounded-md border', className)}>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.field} className="text-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-xs font-medium hover:bg-muted/50"
                    onClick={() => handleSort(col.field)}
                  >
                    {col.label}
                    <SortIcon field={col.field} />
                  </Button>
                </TableHead>
              ))}
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Job</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDeals.map((deal) => (
              <TableRow
                key={deal.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onRowClick(deal)}
              >
                <TableCell className="text-xs font-medium max-w-[200px] truncate">
                  {deal.title}
                </TableCell>
                <TableCell className="text-xs font-semibold text-emerald-600">
                  {formatMoney(deal.value, deal.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[9px] h-4">
                    {stageLabels[deal.stage] || deal.stage}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {deal.probability}%
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(parseISO(deal.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {deal.closedAt
                    ? format(parseISO(deal.closedAt), 'MMM d, yyyy')
                    : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                  {deal.customerName || '—'}
                </TableCell>
                <TableCell>
                  {deal.convertedJobId ? (
                    <JobStatusChip
                      jobStatus={null}
                      jobCancelledAt={deal.jobCancelledAt}
                      size="sm"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
