'use client';

/**
 * SupplierFormDialog — create a supplier (vendor) record.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Owns its own form state and submission logic. Calls back to the parent via
 * `onClose` (cancel) and `onSaved` (success — parent re-fetches suppliers).
 *
 * The dialog seeds the currency field from the company's currency (passed in
 * as `currency` prop). The user can override it per-supplier.
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/client-auth';
import { EMPTY_SUPPLIER_FORM } from '../utils/inventory-helpers';
import type { SupplierFormState } from '../types';

export function SupplierFormDialog({
  open,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SupplierFormState>(EMPTY_SUPPLIER_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_SUPPLIER_FORM, currency });
    }
  }, [open, currency]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        website: form.website.trim() || null,
        paymentTerms: form.paymentTerms.trim() || null,
        currency: form.currency,
        notes: form.notes.trim() || null,
      };
      const res = await authFetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create supplier');
      }
      toast.success(`Supplier "${payload.name}" created`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
          <DialogDescription>
            Vendor details used when creating purchase orders.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="sup-name">Name *</Label>
            <Input
              id="sup-name"
              placeholder="e.g. Acme Parts Co."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sup-contact">Contact Name</Label>
              <Input
                id="sup-contact"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input
                id="sup-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-website">Website</Label>
              <Input
                id="sup-website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sup-terms">Payment Terms</Label>
              <Input
                id="sup-terms"
                placeholder="e.g. Net 30"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-currency">Currency</Label>
              <Input
                id="sup-currency"
                maxLength={8}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sup-address">Address</Label>
            <Textarea
              id="sup-address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? 'Saving...' : 'Create Supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
