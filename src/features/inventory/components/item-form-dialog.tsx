'use client';

/**
 * ItemFormDialog — create/edit an inventory item (SKU).
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Owns its own form state and submission logic. On the create path, optionally
 * also creates a trackable serialized asset for employee assignment. On the
 * edit path, totalStock is read-only (use AdjustStockDialog to change levels).
 *
 * Calls back to the parent via `onClose` (cancel) and `onSaved` (success —
 * parent re-fetches items + alerts).
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/client-auth';
import {
  ITEM_CATEGORIES, UNITS, EMPTY_ITEM_FORM, formatCategoryLabel,
} from '../utils/inventory-helpers';
import type { InventoryItem, ItemFormState, Supplier } from '../types';

export function ItemFormDialog({
  open,
  editing,
  suppliers,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: InventoryItem | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          sku: editing.sku || '',
          category: editing.category,
          unit: editing.unit,
          costPrice: String(editing.costPrice),
          salePrice: String(editing.salePrice),
          totalStock: String(editing.totalStock),
          reorderLevel: String(editing.reorderLevel),
          reorderQty: String(editing.reorderQty),
          supplierId: editing.supplierId || '',
          barcode: editing.barcode || '',
          description: editing.description || '',
          isActive: editing.isActive,
          createTrackableAsset: false,
        });
      } else {
        setForm(EMPTY_ITEM_FORM);
      }
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        unit: form.unit,
        costPrice: parseFloat(form.costPrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        totalStock: parseInt(form.totalStock) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
        reorderQty: parseInt(form.reorderQty) || 0,
        supplierId: form.supplierId || null,
        barcode: form.barcode.trim() || null,
        isActive: form.isActive,
      };

      const isEdit = !!editing;
      const url = isEdit
        ? `/api/inventory/items/${editing!.id}`
        : '/api/inventory/items';
      const method = isEdit ? 'PATCH' : 'POST';

      // On edit, totalStock should not be patched here — use Adjust Stock instead.
      const body = isEdit
        ? { ...payload, totalStock: undefined }
        : payload;

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed to ${isEdit ? 'update' : 'create'} item`);
      }
      const responseData = await res.json().catch(() => ({}));
      const createdItemId = responseData.item?.id || responseData.id;

      if (!isEdit && createdItemId && form.createTrackableAsset) {
        await authFetch('/api/inventory/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.name,
            inventoryItemId: createdItemId,
            serialNumber: payload.sku ? `${payload.sku}-001` : null,
            status: 'available',
            condition: 'good',
          }),
        }).catch(() => null);
      }

      toast.success(`Item "${payload.name}" ${isEdit ? 'updated' : 'created'}`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update item details. To change stock levels, use "Adjust Stock" from the table.'
              : 'Create a new stock-keeping unit (SKU). Opening stock creates a purchase transaction.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="item-name">Name *</Label>
            <Input
              id="item-name"
              placeholder="e.g. HVAC Air Filter 16x25"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                placeholder="e.g. AF-1625-1"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-barcode">Barcode</Label>
              <Input
                id="item-barcode"
                placeholder="UPC/EAN"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-category">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="item-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{formatCategoryLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-unit">Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger id="item-unit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-cost">Cost Price</Label>
              <Input
                id="item-cost"
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-sale">Sale Price</Label>
              <Input
                id="item-sale"
                type="number"
                step="0.01"
                min="0"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-stock">
                {editing ? 'Total Stock (read-only)' : 'Opening Stock'}
              </Label>
              <Input
                id="item-stock"
                type="number"
                min="0"
                disabled={!!editing}
                value={form.totalStock}
                onChange={(e) => setForm({ ...form, totalStock: e.target.value })}
              />
              {editing && (
                <p className="text-[10px] text-muted-foreground">Use Adjust Stock to change levels.</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-reorder">Reorder Level</Label>
              <Input
                id="item-reorder"
                type="number"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-reorder-qty">Reorder Qty</Label>
              <Input
                id="item-reorder-qty"
                type="number"
                min="0"
                value={form.reorderQty}
                onChange={(e) => setForm({ ...form, reorderQty: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-supplier">Supplier</Label>
            <Select
              value={form.supplierId || 'none'}
              onValueChange={(v) => setForm({ ...form, supplierId: v === 'none' ? '' : v })}
            >
              <SelectTrigger id="item-supplier"><SelectValue placeholder="No supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No supplier</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              rows={2}
              placeholder="Optional notes about this item"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {!editing && (
            <div className="flex items-center justify-between rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 p-3">
              <div className="space-y-0.5">
                <Label className="text-emerald-900 dark:text-emerald-200 font-semibold">Trackable Equipment Asset</Label>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Automatically register 1 available equipment asset to assign to employees
                </p>
              </div>
              <Switch
                checked={form.createTrackableAsset}
                onCheckedChange={(c) => setForm({ ...form, createTrackableAsset: c })}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive items are hidden from dropdowns</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: c })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
