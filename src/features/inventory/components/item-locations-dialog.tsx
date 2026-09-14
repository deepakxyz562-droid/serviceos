'use client';

/**
 * ItemLocationsDialog — displays real-time stock breakdown across all storage
 * units (Main Shop, Branch Warehouses, and Field Service Vans) for a specific SKU.
 */

import { useState, useEffect } from 'react';
import { Warehouse, Truck, MapPin, Store, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch, apiUrl } from '@/lib/api';
import type { InventoryItem, LocationStockBreakdown } from '../types';

export function ItemLocationsDialog({
  open,
  item,
  onClose,
  onInitiateTransfer,
}: {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onInitiateTransfer?: (item: InventoryItem) => void;
}) {
  const [locations, setLocations] = useState<LocationStockBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(apiUrl(`/api/inventory/items/${item.id}/locations`));
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load stock locations');
      }
      const data = await res.json();
      setLocations(data.locations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock locations');
      toast.error('Failed to load location stock breakdown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && item) {
      fetchLocations();
    } else {
      setLocations([]);
    }
  }, [open, item]);

  if (!item) return null;

  const totalCalculated = locations.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Store className="size-5 text-emerald-600" />
                Stock Locations & Van Breakdown
              </DialogTitle>
              <DialogDescription className="mt-1">
                {item.name} {item.sku ? `(${item.sku})` : ''}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLocations}
              disabled={loading}
              className="h-8 w-8 p-0"
              title="Refresh locations"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border text-center">
            <div>
              <div className="text-xs text-muted-foreground">Total SKU Stock</div>
              <div className="text-lg font-bold tabular-nums">
                {item.totalStock} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Available Stock</div>
              <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {item.availableStock}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tracked Locations</div>
              <div className="text-lg font-bold tabular-nums">
                {locations.length}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
              <AlertCircle className="size-5 mx-auto mb-2 text-red-500" />
              {error}
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={fetchLocations}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : locations.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 rounded-lg border">
              <Warehouse className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">All stock is currently in Main Inventory</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a Stock Transfer or adjust specific van stock to distribute items.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {locations.map((loc) => {
                const isVan = !!loc.employeeId || loc.warehouseType === 'vehicle';
                const isMain = loc.isDefault || loc.warehouseType === 'main';

                return (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-md ${isVan ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                        {isVan ? <Truck className="size-4" /> : <Warehouse className="size-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {loc.employeeName
                              ? `${loc.employeeName}'s Service Van`
                              : loc.warehouseName || 'Warehouse'}
                          </span>
                          {isMain && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">
                              Main Shop
                            </Badge>
                          )}
                          {isVan && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                              Service Van
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {loc.warehouseCode && (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                              {loc.warehouseCode}
                            </span>
                          )}
                          {(loc.aisle || loc.shelf || loc.bin) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 text-muted-foreground" />
                              {[
                                loc.aisle && `Aisle ${loc.aisle}`,
                                loc.shelf && `Shelf ${loc.shelf}`,
                                loc.bin && `Bin ${loc.bin}`,
                              ].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold tabular-nums">
                        {loc.quantity} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                      </div>
                      {loc.quantity <= (loc.minStock || 0) && (loc.minStock || 0) > 0 && (
                        <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Low (Min: {loc.minStock})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {locations.length > 0 && `Breakdown sum: ${totalCalculated} ${item.unit}`}
          </div>
          <div className="flex gap-2">
            {onInitiateTransfer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onInitiateTransfer(item);
                }}
              >
                Transfer Stock
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
