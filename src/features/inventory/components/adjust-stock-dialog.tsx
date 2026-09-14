'use client';

/**
 * AdjustStockDialog — manual stock adjustment for one item with optional Warehouse / Van targeting.
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Store, Truck } from 'lucide-react';
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
import { ADJUST_TYPES } from '../utils/inventory-helpers';
import type { InventoryItem, Warehouse } from '../types';

export function AdjustStockDialog({
  open,
  item,
  onClose,
  onAdjusted,
}: {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<string>('adjustment');
  const [notes, setNotes] = useState('');
  const [locationKey, setLocationKey] = useState('default');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDirection('in');
      setQuantity('');
      setReason('');
      setType('adjustment');
      setNotes('');
      setLocationKey('default');

      authFetch(apiUrl('/api/inventory/warehouses'))
        .then((r) => (r.ok ? r.json() : { warehouses: [], employees: [] }))
        .then((d) => {
          setWarehouses(d.warehouses || []);
          setEmployees(d.employees || []);
        })
        .catch(() => {});
    }
  }, [open, item]);

  if (!item) return null;

  const qtyNum = parseInt(quantity) || 0;
  const signedQty = direction === 'in' ? Math.abs(qtyNum) : -Math.abs(qtyNum);
  const newTotal = item.totalStock + signedQty;

  const handleSubmit = async () => {
    if (!qtyNum || qtyNum <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (newTotal < 0) {
      toast.error(`Cannot reduce below zero (current: ${item.totalStock})`);
      return;
    }

    let warehouseId: string | undefined;
    let employeeId: string | undefined;

    if (locationKey.startsWith('wh:')) {
      warehouseId = locationKey.replace('wh:', '');
    } else if (locationKey.startsWith('emp:')) {
      employeeId = locationKey.replace('emp:', '');
    }

    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl(`/api/inventory/items/${item.id}/adjust`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: signedQty,
          reason: reason.trim(),
          type,
          notes: notes.trim() || undefined,
          warehouseId,
          employeeId,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to adjust stock');
      }
      toast.success(
        `Stock adjusted by ${signedQty > 0 ? '+' : ''}${signedQty} ${item.unit}`
      );
      onAdjusted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {item.name}</DialogTitle>
          <DialogDescription>
            Current total:{' '}
            <span className="font-medium">
              {item.totalStock} {item.unit}
            </span>
            {item.reservedStock > 0 && (
              <>
                {' '}
                · Reserved: {item.reservedStock} · Available: {item.availableStock}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === 'in' ? 'default' : 'outline'}
              className={
                direction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
              }
              onClick={() => setDirection('in')}
            >
              <TrendingUp className="size-4 mr-1.5" /> Add Stock
            </Button>
            <Button
              type="button"
              variant={direction === 'out' ? 'default' : 'outline'}
              className={
                direction === 'out' ? 'bg-red-600 hover:bg-red-700' : ''
              }
              onClick={() => setDirection('out')}
            >
              <TrendingDown className="size-4 mr-1.5" /> Remove Stock
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="adj-qty">Quantity ({item.unit})</Label>
              <Input
                id="adj-qty"
                type="number"
                min="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adj-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="adj-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUST_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location / Van Selector */}
          {(warehouses.length > 0 || employees.length > 0) && (
            <div className="grid gap-2">
              <Label htmlFor="adj-location">Storage Location / Van</Label>
              <Select value={locationKey} onValueChange={setLocationKey}>
                <SelectTrigger id="adj-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    🏢 Primary Shop / General Inventory
                  </SelectItem>
                  {warehouses.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Warehouses & Locations</SelectLabel>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={`wh:${w.id}`}>
                          {w.type === 'vehicle' ? '🚐 ' : '📦 '}
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {employees.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Technician Vans</SelectLabel>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={`emp:${e.id}`}>
                          🚐 {e.name}'s Van
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="adj-reason">Reason *</Label>
            <Input
              id="adj-reason"
              placeholder={
                direction === 'in'
                  ? 'e.g. Found misplaced stock, restocked'
                  : 'e.g. Damaged, used on unbilled task'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adj-notes">Notes (optional)</Label>
            <Textarea
              id="adj-notes"
              rows={2}
              placeholder="Additional context"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {qtyNum > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current stock:</span>
                <span className="font-medium">
                  {item.totalStock} {item.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change:</span>
                <span
                  className={`font-medium ${
                    signedQty > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {signedQty > 0 ? '+' : ''}
                  {signedQty}
                </span>
              </div>
              <div className="flex justify-between border-t mt-1 pt-1">
                <span className="text-muted-foreground">New stock:</span>
                <span className="font-bold">
                  {newTotal} {item.unit}
                </span>
              </div>
            </div>
          )}
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
            {submitting ? 'Adjusting...' : 'Apply Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
