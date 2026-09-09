'use client';

/**
 * <PaginationBar />
 * ================
 * Reusable pagination control matching the canonical pattern used by
 * invoices-view / jobs-view / booking-view.
 *
 * Props:
 *   - currentPage: active page (1-indexed)
 *   - totalPages: total page count (0 if no data)
 *   - totalItems: total row count (for the "Showing X–Y of Z" text)
 *   - pageSize: current rows-per-page value
 *   - onPageChange: callback when page changes (prev/next)
 *   - onPageSizeChange: callback when rows-per-page changes (also resets to page 1)
 *   - itemName: label for the "Showing X–Y of Z <itemName>" text (e.g. "invoices")
 *
 * Usage:
 *   <PaginationBar
 *     currentPage={currentPage}
 *     totalPages={totalPages}
 *     totalItems={totalCustomers}
 *     pageSize={customersPerPage}
 *     onPageChange={setCurrentPage}
 *     onPageSizeChange={(size) => { setCustomersPerPage(size); setCurrentPage(1); }}
 *     itemName="customers"
 *   />
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 / page' },
  { value: 20, label: '20 / page' },
  { value: 50, label: '50 / page' },
  { value: 100, label: '100 / page' },
];

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName = 'items',
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemName?: string;
}) {
  const safeTotalPages = totalPages || 1;
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 p-3 border-t border-slate-100 dark:border-slate-800 bg-muted/20">
      <p className="text-sm text-muted-foreground">
        {totalItems === 0
          ? `No ${itemName}`
          : `Showing ${Math.min((currentPage - 1) * pageSize + 1, totalItems)}–${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} ${itemName}`}
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="h-8 text-xs"
          >
            <ChevronLeft className="size-3.5 mr-1" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Page {currentPage} of {safeTotalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
            disabled={currentPage >= safeTotalPages}
            className="h-8 text-xs"
          >
            Next <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
