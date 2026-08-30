'use client';

/**
 * DealFormDialog — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * Bundles two dialogs:
 *   - <CreateDealDialog /> — "New Lead" form (name/phone/email/value/source).
 *     The parent owns the form state and the `handleCreate` submit handler.
 *   - <EditDealDialog /> — full edit form (title/value/currency/probability/
 *     assignee/customer/expected-close/source/loss-reason/note).
 *     The parent owns the form state and the `handleEditSave` submit handler.
 *
 * Pure presentational — all mutations live in the parent.
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type {
  Assignee, CreateFormState, EditFormState,
} from '@/features/pipeline/types';

const SOURCE_OPTIONS = [
  'manual', 'website', 'whatsapp', 'google', 'facebook', 'instagram', 'referral',
] as const;

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'AED'] as const;

// ─── Create Deal Dialog ─────────────────────────────────────────────────────

export interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createForm: CreateFormState;
  onFormChange: (form: CreateFormState) => void;
  symbol: string;
  saving: boolean;
  onCreate: () => void;
}

export function CreateDealDialog({
  open,
  onOpenChange,
  createForm,
  onFormChange,
  symbol,
  saving,
  onCreate,
}: CreateDealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>Create a new lead in your pipeline</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              placeholder="e.g., Jane Doe"
              value={createForm.name}
              onChange={(e) => onFormChange({ ...createForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input
              placeholder="+1 234 567 8900"
              value={createForm.phone}
              onChange={(e) => onFormChange({ ...createForm, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="jane@example.com"
              value={createForm.email}
              onChange={(e) => onFormChange({ ...createForm, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Value ({symbol})</Label>
            <Input
              type="number"
              placeholder="0"
              value={createForm.value}
              onChange={(e) => onFormChange({ ...createForm, value: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={createForm.source}
              onValueChange={(v) => onFormChange({ ...createForm, source: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onCreate}
            disabled={!createForm.name.trim() || !createForm.phone.trim() || saving}
          >
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Create Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Deal Dialog ───────────────────────────────────────────────────────

export interface EditDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: EditFormState;
  onFormChange: (form: EditFormState) => void;
  assignees: Assignee[];
  lostStageKey: string;
  saving: boolean;
  onSave: () => void;
}

export function EditDealDialog({
  open,
  onOpenChange,
  editForm,
  onFormChange,
  assignees,
  lostStageKey,
  saving,
  onSave,
}: EditDealDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
          <DialogDescription>Update deal details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Deal Title *</Label>
            <Input
              value={editForm.title}
              onChange={(e) => onFormChange({ ...editForm, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                value={editForm.value}
                onChange={(e) => onFormChange({ ...editForm, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={editForm.currency}
                onValueChange={(v) => onFormChange({ ...editForm, currency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={editForm.probability}
                onChange={(e) => onFormChange({ ...editForm, probability: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={editForm.assigneeId}
                onValueChange={(v) => onFormChange({ ...editForm, assigneeId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  {assignees.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={editForm.customerName}
                onChange={(e) => onFormChange({ ...editForm, customerName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input
                value={editForm.customerPhone}
                onChange={(e) => onFormChange({ ...editForm, customerPhone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Expected Close Date</Label>
            <Input
              type="date"
              value={editForm.expectedCloseDate}
              onChange={(e) => onFormChange({ ...editForm, expectedCloseDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={editForm.source}
              onValueChange={(v) => onFormChange({ ...editForm, source: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editForm.stage === lostStageKey && (
            <div className="space-y-2">
              <Label>Loss Reason</Label>
              <Input
                value={editForm.lossReason}
                onChange={(e) => onFormChange({ ...editForm, lossReason: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Add a note</Label>
            <Textarea
              rows={2}
              placeholder="Append a note to this deal…"
              value={editForm.notes}
              onChange={(e) => onFormChange({ ...editForm, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onSave}
            disabled={!editForm.title.trim() || saving}
          >
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
