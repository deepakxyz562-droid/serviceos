'use client';

/**
 * TransferFormDialog — create a new stock transfer (warehouse/employee move).
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Owns its own form state (source/dest IDs, line items, status, notes) and
 * submission logic. Calls back to the parent via `onClose` (cancel) and
 * `onCreated` (success — parent re-fetches transfers + transactions).
 *
 * Source/destination can each be a warehouse OR an employee (at least one ID
 * per side is required). The dialog supports adding multiple line items with
 * per-line quantity editing.
 */

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/client-auth';
import { TRANSFER_STATUSES } from '../utils/inventory-helpers';
import type { InventoryItem, TransferItem } from '../types';

export function TransferFormDialog({
  open,
  items,
  onClose,
  onCreated,
}: {
  open: boolean;
  items: InventoryItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [fromEmployeeId, setFromEmployeeId] = useState('');
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFromWarehouseId('');
      setToWarehouseId('');
      setFromEmployeeId('');
      setToEmployeeId('');
      setSelectedItemId('');
      setTransferItems([]);
      setNotes('');
      setStatus('pending');
    }
  }, [open]);

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
    setTransferItems(transferItems.map((ti) => ti.inventoryItemId === id ? { ...ti, quantity: qty } : ti));
  };

  const handleSubmit = async () => {
    const hasSource = fromWarehouseId.trim() || fromEmployeeId.trim();
    const hasDest = toWarehouseId.trim() || toEmployeeId.trim();
    if (!hasSource || !hasDest) {
      toast.error('Both source and destination are required');
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
    setSubmitting(true);
    try {
      const res = await authFetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: fromWarehouseId.trim() || undefined,
          toWarehouseId: toWarehouseId.trim() || undefined,
          fromEmployeeId: fromEmployeeId.trim() || undefined,
          toEmployeeId: toEmployeeId.trim() || undefined,
          items: normalized,
          notes: notes.trim() || undefined,
          status,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create transfer');
      }
      toast.success('Stock transfer created');
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
          <DialogTitle>New Stock Transfer</DialogTitle>
          <DialogDescription>
            Move stock between warehouses or employees. Source and destination each require at least one ID.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="from-warehouse">From Warehouse ID</Label>
              <Input
                id="from-warehouse"
                placeholder="warehouse UUID"
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to-warehouse">To Warehouse ID</Label>
              <Input
                id="to-warehouse"
                placeholder="warehouse UUID"
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="from-employee">From Employee ID (optional)</Label>
              <Input
                id="from-employee"
                placeholder="employee UUID"
                value={fromEmployeeId}
                onChange={(e) => setFromEmployeeId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to-employee">To Employee ID (optional)</Label>
              <Input
                id="to-employee"
                placeholder="employee UUID"
                value={toEmployeeId}
                onChange={(e) => setToEmployeeId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfer-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="transfer-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSFER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Items to Transfer</Label>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select an item..." /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} {i.sku ? `(${i.sku})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={handleAddItem} disabled={!selectedItemId}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {transferItems.length > 0 && (
            <div className="rounded-lg border divide-y">
              {transferItems.map((ti) => (
                <div key={ti.inventoryItemId} className="flex items-center gap-3 p-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ti.name}</div>
                    {ti.sku && <div className="text-xs text-muted-foreground font-mono">{ti.sku}</div>}
                  </div>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={ti.quantity}
                    onChange={(e) => handleItemQtyChange(ti.inventoryItemId, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600"
                    onClick={() => handleRemoveItem(ti.inventoryItemId)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="transfer-notes">Notes</Label>
            <Textarea
              id="transfer-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Creating...' : 'Create Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
