'use client';

/**
 * NoteEditDialog + NoteDeleteDialog — Phase 6B2 extraction from
 * customer-360-view.tsx.
 *
 * Two small dialogs that operate on a single customer timeline note:
 *
 *   • NoteEditDialog   — title + description editor. Calls back to the
 *     parent's `onSave` handler which PUTs to
 *     `/api/customers/[id]/timeline/[entryId]` and invalidates the 360°
 *     query.
 *
 *   • NoteDeleteDialog — confirmation only. Calls back to the parent's
 *     `onConfirm` handler which DELETEs the entry and invalidates the
 *     360° query.
 *
 * Both are pure presentational — all state (which note is being edited or
 * deleted, the edited title/description) lives in the parent view. The
 * parent owns the React Query invalidation.
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { NoteEditState } from '../types';

// ── Edit dialog ──────────────────────────────────────────────────────────────

interface NoteEditDialogProps {
  open: boolean;
  editingNote: NoteEditState | null;
  /** Update the in-flight edit draft (parent stores it in state). */
  onChange: (next: NoteEditState) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function NoteEditDialog({
  open,
  editingNote,
  onChange,
  onCancel,
  onSave,
}: NoteEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>
            Make changes to this note. The update timestamp will be recorded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={editingNote?.title || ''}
              onChange={(e) =>
                onChange(editingNote ? { ...editingNote, title: e.target.value } : { id: '', title: e.target.value, description: '' })
              }
              placeholder="Note title"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={editingNote?.description || ''}
              onChange={(e) =>
                onChange(editingNote ? { ...editingNote, description: e.target.value } : { id: '', title: '', description: e.target.value })
              }
              placeholder="Note details..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-foreground" onClick={onSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirmation ──────────────────────────────────────────────────────

interface NoteDeleteDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function NoteDeleteDialog({
  open,
  onCancel,
  onConfirm,
}: NoteDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Note?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The note will be permanently removed
            from the customer timeline.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
