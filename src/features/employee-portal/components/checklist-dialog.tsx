'use client';

/**
 * ChecklistDialog — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Self-contained dialog for ticking through a job's checklist. The parent
 * opens it by passing `open` + `jobId`; the dialog owns:
 *   - the items state (fetched from /api/jobs/[id]/checklist on open, falling
 *     back to a sensible default list if the API returns nothing)
 *   - the toggle + save mutations (POST /api/jobs/[id]/checklist with status
 *     'in_progress' or 'completed')
 *
 * Calls `onSaved()` after a successful save so the parent can re-fetch jobs
 * to refresh the checklist status badge.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, ListChecks, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import type { ChecklistItem } from '@/features/employee-portal/types';

export interface ChecklistDialogProps {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'arrival', label: 'Arrived at the customer site', checked: false },
  { id: 'inspect', label: 'Inspected the issue / asset', checked: false },
  { id: 'quote', label: 'Quoted work to customer', checked: false },
  { id: 'perform', label: 'Performed the work', checked: false },
  { id: 'cleanup', label: 'Cleaned up the work area', checked: false },
  { id: 'review', label: 'Reviewed work with customer', checked: false },
];

export function ChecklistDialog({
  open,
  jobId,
  onClose,
  onSaved,
}: ChecklistDialogProps) {
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST_ITEMS);
  const [loading, setLoading] = useState(false);
  const [savingAction, setSavingAction] = useState<'save' | 'complete' | null>(null);

  // Fetch the current checklist whenever the dialog opens for a fresh job.
  useEffect(() => {
    if (!open || !jobId) return;
    setItems(DEFAULT_CHECKLIST_ITEMS);
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch(`/api/jobs/${jobId}/checklist`);
        if (res.ok) {
          const data = await res.json();
          if (data.checklist && data.checklist.itemsJson) {
            try {
              const parsed = JSON.parse(data.checklist.itemsJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setItems(parsed);
                return;
              }
            } catch {
              // fall through to default
            }
          }
        }
        setItems(DEFAULT_CHECKLIST_ITEMS);
      } catch {
        setItems(DEFAULT_CHECKLIST_ITEMS);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, jobId]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  };

  const save = async (markCompleted: boolean) => {
    if (!jobId) return;
    setSavingAction(markCompleted ? 'complete' : 'save');
    try {
      const allChecked = items.every((it) => it.checked);
      const status = markCompleted ? (allChecked ? 'completed' : 'completed') : 'in_progress';
      const res = await authFetch(`/api/jobs/${jobId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, status }),
      });
      if (res.ok) {
        toast.success(markCompleted ? 'Checklist completed' : 'Checklist saved');
        await onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to save checklist' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="size-5" />
            Job Checklist
          </DialogTitle>
          <DialogDescription>
            Tick each item as you complete it. All items must be checked to mark the checklist as complete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  item.checked
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`size-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    item.checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                  }`}
                >
                  {item.checked && <CheckCircle2 className="size-3 text-white" />}
                </div>
                <span className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </span>
              </button>
            ))
          )}
        </div>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => save(false)}
            disabled={savingAction === 'save'}
          >
            {savingAction === 'save' ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : null}
            Save Progress
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => save(true)}
            disabled={
              savingAction === 'complete' ||
              !items.every((it) => it.checked)
            }
          >
            {savingAction === 'complete' ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-1" />
            )}
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
