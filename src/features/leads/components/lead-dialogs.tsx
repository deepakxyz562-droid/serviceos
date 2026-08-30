'use client';

/**
 * LeadConvertDialog + LeadDeleteDialog — Phase 4 extraction from leads-view.tsx.
 *
 * Replaces the inline `renderConvertDialog()` and `renderDeleteDialog()`
 * closures that used to live inside the parent LeadsView component.
 *
 *   • LeadConvertDialog  — confirmation dialog shown when the user clicks
 *     "Convert to Job" (legacy entry point — most callers now hand off
 *     directly to the Jobs view via the global store without showing this
 *     dialog). Shows a small Card with the lead's name/phone/value/service.
 *
 *   • LeadDeleteDialog   — confirmation dialog shown when the user clicks
 *     "Delete" (soft-delete: the lead is moved to History, not permanently
 *     removed).
 *
 * Both are pure presentational — all state lives in the parent LeadsView.
 *
 * Extracted from src/components/views/leads-view.tsx (Phase 4 refactor).
 */

import {
  Briefcase, AlertCircle, RefreshCw, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { getServiceTypeLabel } from '@/features/line-items';
import type { Lead } from '@/features/leads/types';

// ── Convert-to-Job dialog ───────────────────────────────────────────────────

export interface LeadConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lead being converted (null → dialog renders with a blank card). */
  lead: Lead | null;
  /** True while the convert request is in-flight. */
  converting: boolean;
  /** Confirm handler — kicks off POST /api/leads/convert. */
  onConfirm: () => void;
  /** Compact currency formatter (e.g. $1.2k). */
  formatCompact: (n: number) => string;
}

/**
 * Convert-to-Job confirmation dialog. Pure presentational — see props above.
 */
export function LeadConvertDialog({
  open,
  onOpenChange,
  lead,
  converting,
  onConfirm,
  formatCompact,
}: LeadConvertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5 text-emerald-600" />
            Convert to Job
          </DialogTitle>
          <DialogDescription>
            Convert &quot;{lead?.name}&quot; into an active job assignment?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {lead && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 space-y-1">
                <p className="font-medium text-sm">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.phone}</p>
                {lead.value > 0 && (
                  <p className="text-sm font-semibold text-emerald-700">{formatCompact(lead.value)}</p>
                )}
                {lead.serviceType && (
                  <p className="text-xs text-muted-foreground">{getServiceTypeLabel(lead.serviceType)}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onConfirm} disabled={converting}>
            {converting && <RefreshCw className="size-4 mr-1 animate-spin" />}
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete-confirmation dialog ──────────────────────────────────────────────

export interface LeadDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lead being deleted (null → dialog renders with a blank name). */
  lead: Lead | null;
  /** True while the delete request is in-flight. */
  deleting: boolean;
  /** Confirm handler — kicks off DELETE /api/leads/:id (soft-delete). */
  onConfirm: () => void;
}

/**
 * Delete-lead confirmation dialog. Pure presentational — see props above.
 */
export function LeadDeleteDialog({
  open,
  onOpenChange,
  lead,
  deleting,
  onConfirm,
}: LeadDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="size-5" />
            Delete Lead
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{lead?.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
