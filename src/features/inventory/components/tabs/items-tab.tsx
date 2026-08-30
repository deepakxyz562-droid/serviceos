'use client';

/**
 * ItemsTab — search/filter + table of inventory SKUs.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Pure presentational component. All state (items list, loading, error,
 * search, category filter) is owned by the parent `InventoryView` and passed
 * in as props. Write actions (edit / create-asset / adjust-stock / delete)
 * are surfaced to the parent via callback props.
 */

import {
  Package, Search, Filter, Plus, MoreHorizontal, RotateCcw,
  Pencil, PackagePlus, SlidersHorizontal, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ITEM_CATEGORIES, formatCategoryLabel,
} from '../../utils/inventory-helpers';
import type { CurrencyFormatFn, InventoryItem } from '../../types';

export function ItemsTab({
  items,
  itemsLoading,
  itemsError,
  itemSearch,
  setItemSearch,
  itemCategory,
  setItemCategory,
  onRetry,
  onAddItem,
  onEditItem,
  onCreateAssetFromItem,
  onAdjustStock,
  onDeleteItem,
  format,
  currency,
}: {
  items: InventoryItem[];
  itemsLoading: boolean;
  itemsError: string | null;
  itemSearch: string;
  setItemSearch: (v: string) => void;
  itemCategory: string;
  setItemCategory: (v: string) => void;
  onRetry: () => void;
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onCreateAssetFromItem: (item: InventoryItem) => void;
  onAdjustStock: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  format: CurrencyFormatFn;
  currency: string;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search by name, SKU, or barcode..."
                className="pl-9"
              />
            </div>
            <Select value={itemCategory} onValueChange={setItemCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="size-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ITEM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {itemsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : itemsError ? (
            <div className="p-10 text-center">
              <p className="text-sm text-red-600 mb-3">{itemsError}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw className="size-4 mr-1.5" /> Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <Package className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">No inventory items yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                {itemSearch || itemCategory !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Add your first item to start tracking stock.'}
              </p>
              <Button
                onClick={onAddItem}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="size-4 mr-1.5" /> Add Item
              </Button>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-28rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Name</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="text-right w-24">Total</TableHead>
                    <TableHead className="text-right w-24">Available</TableHead>
                    <TableHead className="text-right w-24">Reorder At</TableHead>
                    <TableHead className="text-right w-24">Cost</TableHead>
                    <TableHead className="text-right w-24">Sale</TableHead>
                    <TableHead className="w-36">Supplier</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isLow = item.reorderLevel > 0 && item.totalStock <= item.reorderLevel && item.totalStock > 0;
                    const isOut = item.totalStock === 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm truncate max-w-[16rem]" title={item.name}>
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.sku && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {item.sku}
                                </span>
                              )}
                              {isOut && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-red-300 text-red-700 dark:text-red-300">
                                  Out
                                </Badge>
                              )}
                              {isLow && (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-300 text-amber-700 dark:text-amber-300">
                                  Low
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatCategoryLabel(item.category)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {item.totalStock} <span className="text-xs text-muted-foreground">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {item.availableStock}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {item.reorderLevel || '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                          {format(item.costPrice, item.currency || currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                          {format(item.salePrice, item.currency || currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[8rem]">
                          {item.supplier?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={item.isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-muted text-muted-foreground'}
                          >
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => onEditItem(item)}>
                                <Pencil className="size-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onCreateAssetFromItem(item)}>
                                <PackagePlus className="size-3.5 mr-2 text-emerald-600" /> Create Trackable Asset (for Employee)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onAdjustStock(item)}>
                                <SlidersHorizontal className="size-3.5 mr-2" /> Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteItem(item)}
                                className="text-red-600 focus:text-red-700"
                              >
                                <Trash2 className="size-3.5 mr-2" /> Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
