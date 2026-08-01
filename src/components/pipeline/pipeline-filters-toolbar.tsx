'use client';

/**
 * PipelineFiltersToolbar
 * ======================
 * Consolidated filter toolbar for the Sales Pipeline. Groups all filters
 * into one horizontal row (like HubSpot):
 *   - Search input
 *   - Salesperson dropdown
 *   - Date range dropdown
 *   - Sort dropdown
 *   - Density toggle (Phase 3)
 *
 * Pipeline Redesign (Phase 3)
 * ---------------------------
 * Replaces the scattered filter UI (separate dropdowns + search box) with
 * a single toolbar that's easier to scan + saves vertical space.
 */

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { DensityToggle } from './density-toggle';
import { cn } from '@/lib/utils';

export type SortOption = 'recent' | 'value_desc' | 'value_asc' | 'oldest';
export type DateRange = 'all' | '7d' | '30d' | '90d';

interface PipelineFiltersToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  salesperson: string;
  onSalespersonChange: (v: string) => void;
  salespeople: Array<{ id: string; name: string }>;
  dateRange: DateRange;
  onDateRangeChange: (v: DateRange) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  className?: string;
}

export function PipelineFiltersToolbar({
  search,
  onSearchChange,
  salesperson,
  onSalespersonChange,
  salespeople,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
  className,
}: PipelineFiltersToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap p-2 rounded-md border bg-muted/20',
        className,
      )}
    >
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-7 text-xs"
        />
      </div>

      <Select value={salesperson} onValueChange={onSalespersonChange}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <Filter className="size-3 mr-1 shrink-0" />
          <SelectValue placeholder="Salesperson" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All salespeople</SelectItem>
          {salespeople.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={dateRange}
        onValueChange={(v) => onDateRangeChange(v as DateRange)}
      >
        <SelectTrigger className="h-8 w-[110px] text-xs">
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most recent</SelectItem>
          <SelectItem value="value_desc">Value: High → Low</SelectItem>
          <SelectItem value="value_asc">Value: Low → High</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto">
        <DensityToggle />
      </div>
    </div>
  );
}
