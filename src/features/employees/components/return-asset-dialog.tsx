'use client';

/**
 * Return Asset dialog.
 *
 * Opens with a single asset (the row the user clicked "Return" on). The user
 * chooses a return status (returned / lost / damaged, default 'returned') and
 * optionally enters notes for the audit trail. Submits via POST
 * /api/inventory/assets/[id]/return with { status, notes }.
 *
 * On success: closes the dialog, invalidates the equipment query, shows a
 * success toast.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useState, useEffect } from 'react';
import { RotateCcw, QrCode, Package, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authFetch } from '@/lib/client-auth';
import type { InventoryAsset, PayrollError } from '../types';
import { apiUrl } from '../utils/employee-helpers';

export function ReturnAssetDialog({
  open,
  onOpenChange,
  asset,
  employeeName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: InventoryAsset | null;
  employeeName: string;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<'returned' | 'lost' | 'damaged'>('returned');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset on close so the next return action starts with the default status.
  useEffect(() => {
    if (!open) {
      setStatus('returned');
      setNotes('');
    }
  }, [open]);

  if (!asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl(`/api/inventory/assets/${asset.id}/return`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Return failed (HTTP ${res.status})`);
      }
      toast.success(`Asset returned from ${employeeName}`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Return failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-4 text-emerald-600" /> Return Asset — {asset.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mark this asset as returned, lost, or damaged. The employee&apos;s assignment will be closed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div className="text-xs font-medium text-foreground">{asset.name}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
              {asset.serialNumber && (
                <span className="flex items-center gap-1">
                  <QrCode className="size-2.5" /> {asset.serialNumber}
                </span>
              )}
              {asset.assetTag && (
                <span className="flex items-center gap-1">
                  <Package className="size-2.5" /> {asset.assetTag}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User className="size-2.5" /> {employeeName}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="return-status" className="text-xs font-medium">
              Return status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as 'returned' | 'lost' | 'damaged')}
              disabled={submitting}
            >
              <SelectTrigger id="return-status" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="returned">Returned (asset back in pool)</SelectItem>
                <SelectItem value="lost">Lost (asset unrecoverable)</SelectItem>
                <SelectItem value="damaged">Damaged (needs repair / write-off)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="return-notes" className="text-xs font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="return-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                status === 'returned'
                  ? 'e.g. handover condition verified'
                  : 'e.g. explain loss / damage for the audit trail'
              }
              rows={3}
              disabled={submitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" /> Confirming…
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5 mr-1" /> Confirm Return
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
