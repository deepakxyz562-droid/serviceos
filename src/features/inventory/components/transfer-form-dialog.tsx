'use client';

/**
 * TransferFormDialog — create a new stock transfer between Warehouses, Shops, or Service Vans.
 */

import { useState, useEffect } from 'react';
import { Plus, X, ArrowRight, Truck, Store, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authFetch, apiUrl } from '@/lib/api';
import { TRANSFER_STATUSES } from '../utils/inventory-helpers';
import type { InventoryItem, TransferItem, Warehouse } from '../types';

interface LocationOption {
  id: string; // prefixed with "wh:" or "emp:"
  rawId: string;
  name: string;
  type: 'warehouse' | 'employee';
  subText?: string;
}

export function TransferFormDialog({
  open,
  items,
  initialItemId,
  onClose,
  onCreated,
}: {
  open: boolean;
  items: InventoryItem[];
  initialItemId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [fromLocationKey, setFromLocationKey] = useState('');
  const [toLocationKey, setToLocationKey] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [submitting, setSubmitting] = useState(false);

  // Fetch available warehouses & employees
  useEffect(() => {
    if (!open) return;

    async function loadLocations() {
      setLoadingLocations(true);
      try {
        const res = await authFetch(apiUrl('/api/inventory/warehouses'));
        if (!res.ok) throw new Error('Failed to load locations');
        const data = await res.json();
        const whs: Warehouse[] = data.warehouses || [];
        const emps: { id: string; name: string }[] = data.employees || [];

        const options: LocationOption[] = [];

        // 1. Warehouses (Shops & Depots)
        whs.forEach((w) => {
          const isVan = w.type === 'vehicle' || !!w.employeeId;
          options.push({
            id: `wh:${w.id}`,
            rawId: w.id,
            name: w.name,
            type: 'warehouse',
            subText: isVan
              ? `Van (${w.employee?.name || 'Assigned'})`
              : w.isDefault
              ? 'Primary Shop'
              : 'Warehouse',
          });
        });

        // 2. Direct Technicians / Vans
        emps.forEach((e) => {
          // If already mapped to a vehicle warehouse, skip or include as direct employee
          const alreadyLinked = whs.some((w) => w.employeeId === e.id);
          if (!alreadyLinked) {
            options.push({
              id: `emp:${e.id}`,
              rawId: e.id,
              name: `${e.name}'s Van`,
              type: 'employee',
              subText: 'Technician Vehicle',
            });
          }
        });

        setLocationOptions(options);

        // Auto-select default main shop as 'from' if available
        const defaultWh = whs.find((w) => w.isDefault);
        if (defaultWh) {
          setFromLocationKey(`wh:${defaultWh.id}`);
        } else if (options.length > 0) {
          setFromLocationKey(options[0].id);
        }
      } catch {
        toast.error('Failed to load storage locations');
      } finally {
        setLoadingLocations(false);
      }
    }

    loadLocations();
  }, [open]);

  useEffect(() => {
    if (open) {
      setToLocationKey('');
      setSelectedItemId(initialItemId || '');
      if (initialItemId) {
        const it = items.find((i) => i.id === initialItemId);
        if (it) {
          setTransferItems([{ inventoryItemId: it.id, name: it.name, sku: it.sku, quantity: '1' }]);
        } else {
          setTransferItems([]);
        }
      } else {
        setTransferItems([]);
      }
      setNotes('');
      setStatus('pending');
    }
  }, [open, initialItemId, items]);

  const handleAddItem = () => {
    if (!selectedItemId) return;
    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;
    if (transferItems.some((ti) => ti.inventoryItemId === selectedItemId)) {
      toast.error('Item already added');
      return;
    }
    setTransferItems([
      ...transferItems,
      { inventoryItemId: item.id, name: item.name, sku: item.sku, quantity: '1' },
    ]);
    setSelectedItemId('');
  };

  const handleRemoveItem = (id: string) => {
    setTransferItems(transferItems.filter((ti) => ti.inventoryItemId !== id));
  };

  const handleItemQtyChange = (id: string, qty: string) => {
    setTransferItems(
      transferItems.map((ti) =>
        ti.inventoryItemId === id ? { ...ti, quantity: qty } : ti
      )
    );
  };

  const handleSubmit = async () => {
    if (!fromLocationKey) {
      toast.error('Source location is required');
      return;
    }
    if (!toLocationKey) {
      toast.error('Destination location is required');
      return;
    }
    if (fromLocationKey === toLocationKey) {
      toast.error('Source and destination cannot be the same location');
      return;
    }
    if (transferItems.length === 0) {
      toast.error('Add at least one item to transfer');
      return;
    }

    const normalized = transferItems.map((ti) => {
      const q = parseInt(ti.quantity);
      if (!q || q <= 0) throw new Error(`Invalid quantity for ${ti.name}`);
      return { inventoryItemId: ti.inventoryItemId, name: ti.name, quantity: q };
    });

    const [fromType, fromId] = fromLocationKey.split(':');
    const [toType, toId] = toLocationKey.split(':');

    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl('/api/inventory/transfers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: fromType === 'wh' ? fromId : undefined,
          toWarehouseId: toType === 'wh' ? toId : undefined,
          fromEmployeeId: fromType === 'emp' ? fromId : undefined,
          toEmployeeId: toType === 'emp' ? toId : undefined,
          items: normalized,
          notes: notes.trim() || undefined,
          status,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create transfer');
      }

      toast.success('Stock transfer order created');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5 text-emerald-600" />
            Create Stock Transfer
          </DialogTitle>
          <DialogDescription>
            Move inventory between main shops, warehouses, or technician service vans.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Location Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-muted/30 rounded-xl border">
            <div className="grid gap-2">
              <Label htmlFor="from-location" className="flex items-center gap-1.5 font-medium">
                <Store className="size-4 text-emerald-600" />
                From Location (Source)
              </Label>
              <Select
                value={fromLocationKey}
                onValueChange={setFromLocationKey}
                disabled={loadingLocations}
              >
                <SelectTrigger id="from-location">
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Storage Locations & Vans</SelectLabel>
                    {locationOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name} {opt.subText ? `(${opt.subText})` : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="to-location" className="flex items-center gap-1.5 font-medium">
                <Truck className="size-4 text-blue-600" />
                To Location (Destination)
              </Label>
              <Select
                value={toLocationKey}
                onValueChange={setToLocationKey}
                disabled={loadingLocations}
              >
                <SelectTrigger id="to-location">
                  <SelectValue placeholder="Select destination..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Storage Locations & Vans</SelectLabel>
                    {locationOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name} {opt.subText ? `(${opt.subText})` : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfer-status">Transfer Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="transfer-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSFER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tip: Transfers set to <strong>"Received"</strong> will automatically update physical stock levels.
            </p>
          </div>

          {/* Line items */}
          <div className="grid gap-2">
            <Label>Items to Transfer</Label>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select an item to add..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} {i.sku ? `(${i.sku})` : ''} — On hand: {i.totalStock} {i.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddItem}
                disabled={!selectedItemId}
              >
                <Plus className="size-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {transferItems.length > 0 && (
            <div className="rounded-lg border divide-y">
              {transferItems.map((ti) => (
                <div key={ti.inventoryItemId} className="flex items-center gap-3 p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ti.name}</div>
                    {ti.sku && (
                      <div className="text-xs text-muted-foreground font-mono">{ti.sku}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Qty:</span>
                    <Input
                      type="number"
                      min="1"
                      className="w-20 text-center font-bold"
                      value={ti.quantity}
                      onChange={(e) => handleItemQtyChange(ti.inventoryItemId, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveItem(ti.inventoryItemId)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="transfer-notes">Notes / Dispatch Instructions</Label>
            <Textarea
              id="transfer-notes"
              rows={2}
              placeholder="e.g. Job #4910 restock, driver pickup scheduled"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? 'Creating...' : 'Create Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
