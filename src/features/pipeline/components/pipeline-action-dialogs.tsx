'use client';

/**
 * PipelineActionDialogs — Phase 5C extraction from sales-pipeline-view.tsx.
 *
 * Bundles two action-prompt dialogs:
 *
 *   - <MarkLostDialog /> — confirms "Mark as Lost" + collects reason + notes.
 *     Shown when the user drags a card to the Lost column or clicks
 *     "Mark as Lost" in the deal Sheet footer.
 *
 *   - <DropActionDialog /> — contextual prompt for workflow-stage drops
 *     (Won / assessment_scheduled / assessment_completed / quote_draft /
 *     quote_awaiting_response). Shows stage-specific UI:
 *       * assessment_scheduled → date picker
 *       * quote_draft → "Create Quote" alt-action button (jumps to Quotes view)
 *       * quote_awaiting_response → "View Quote" alt-action button
 *
 * Both dialogs are pure presentational — the parent owns the state and
 * passes the submit handlers (`onConfirmMarkLost`, `onConfirmDropAction`,
 * `onCreateQuote`, `onViewQuote`).
 *
 * Extracted from src/components/views/sales-pipeline-view.tsx (Phase 5C).
 */

import {
  XCircle, Trophy, Calendar, AlertCircle, Briefcase, Mail, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Deal, DropAction } from '@/features/pipeline/types';

// ─── Mark as Lost Dialog ────────────────────────────────────────────────────

export interface MarkLostDialogProps {
  markLostDeal: Deal | null;
  onOpenChange: (open: boolean) => void;
  lostReason: string;
  onLostReasonChange: (reason: string) => void;
  lostNotes: string;
  onLostNotesChange: (notes: string) => void;
  lostReasons: string[];
  saving: boolean;
  onConfirm: () => void;
}

export function MarkLostDialog({
  markLostDeal,
  onOpenChange,
  lostReason,
  onLostReasonChange,
  lostNotes,
  onLostNotesChange,
  lostReasons,
  saving,
  onConfirm,
}: MarkLostDialogProps) {
  return (
    <Dialog open={!!markLostDeal} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-red-600" />
            Mark as Lost
          </DialogTitle>
          <DialogDescription>
            Mark <span className="font-medium">"{markLostDeal?.title}"</span> as lost. This will move
            the deal to the Lost column and stamp the close date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Lost Reason *</Label>
            <Select value={lostReason} onValueChange={onLostReasonChange}>
              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {lostReasons.length > 0 ? (
                  lostReasons.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="Price too high">Price too high</SelectItem>
                    <SelectItem value="Went with competitor">Went with competitor</SelectItem>
                    <SelectItem value="No response">No response</SelectItem>
                    <SelectItem value="Project cancelled">Project cancelled</SelectItem>
                    <SelectItem value="Not a fit">Not a fit</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={3}
              placeholder="Add any context about why this deal was lost…"
              value={lostNotes}
              onChange={(e) => onLostNotesChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            disabled={saving || !lostReason}
          >
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Drag-drop Action Prompt Dialog ─────────────────────────────────────────

export interface DropActionDialogProps {
  dropAction: DropAction | null;
  onOpenChange: (open: boolean) => void;
  dropActionDate: string;
  onDropActionDateChange: (date: string) => void;
  wonStageKey: string;
  onConfirm: () => void;
  onCreateQuote: () => Promise<void>;
  onViewQuote: () => void;
}

export function DropActionDialog({
  dropAction,
  onOpenChange,
  dropActionDate,
  onDropActionDateChange,
  wonStageKey,
  onConfirm,
  onCreateQuote,
  onViewQuote,
}: DropActionDialogProps) {
  return (
    <Dialog open={!!dropAction} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {dropAction?.newStageKey === wonStageKey && <Trophy className="size-5 text-emerald-600" />}
            {dropAction?.newStageKey === 'assessment_scheduled' && <Calendar className="size-5 text-cyan-600" />}
            {dropAction?.newStageKey === 'assessment_completed' && <AlertCircle className="size-5 text-teal-600" />}
            {dropAction?.newStageKey === 'quote_draft' && <Briefcase className="size-5 text-amber-600" />}
            {dropAction?.newStageKey === 'quote_awaiting_response' && <Mail className="size-5 text-orange-600" />}
            {dropAction?.newStageKey === wonStageKey && 'Mark as won?'}
            {dropAction?.newStageKey === 'assessment_scheduled' && 'Schedule assessment?'}
            {dropAction?.newStageKey === 'assessment_completed' && 'Mark assessment completed?'}
            {dropAction?.newStageKey === 'quote_draft' && 'Create a quote?'}
            {dropAction?.newStageKey === 'quote_awaiting_response' && 'Mark quote as sent?'}
          </DialogTitle>
          <DialogDescription>
            {dropAction?.newStageKey === wonStageKey && (
              <>Congratulations! Mark <span className="font-medium">"{dropAction?.deal.title}"</span> as won?</>
            )}
            {dropAction?.newStageKey === 'assessment_scheduled' && (
              <>Schedule an assessment for <span className="font-medium">"{dropAction?.deal.title}"</span>?</>
            )}
            {dropAction?.newStageKey === 'assessment_completed' && (
              <>Mark the assessment for <span className="font-medium">"{dropAction?.deal.title}"</span> as completed?</>
            )}
            {dropAction?.newStageKey === 'quote_draft' && (
              <>Create a quote from <span className="font-medium">"{dropAction?.deal.title}"</span>?</>
            )}
            {dropAction?.newStageKey === 'quote_awaiting_response' && (
              <>Mark the quote for <span className="font-medium">"{dropAction?.deal.title}"</span> as sent / awaiting response?</>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Extra UI per stage */}
        {dropAction?.newStageKey === 'assessment_scheduled' && (
          <div className="space-y-2 py-2">
            <Label>Assessment date</Label>
            <Input
              type="date"
              value={dropActionDate}
              onChange={(e) => onDropActionDateChange(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              For now this just moves the card and shows a confirmation toast. Actual
              scheduling is future work.
            </p>
          </div>
        )}
        {dropAction?.newStageKey === 'quote_draft' && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
            The deal will move to the Draft column and a draft Quote will be auto-created
            (linked via Quote.dealId). Use <strong>Create Quote</strong> to jump straight
            into editing it, or <strong>Move to Draft</strong> to stay on the pipeline.
          </div>
        )}
        {dropAction?.newStageKey === 'quote_awaiting_response' && (
          <div className="rounded-md bg-orange-50 border border-orange-200 p-2 text-xs text-orange-700">
            The deal will move to Awaiting Response. If a quote is linked, you can view
            it from the Quotes view.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {dropAction?.newStageKey === 'quote_draft' && (
            <Button
              variant="outline"
              onClick={onCreateQuote}
            >
              Create Quote
            </Button>
          )}
          {dropAction?.newStageKey === 'quote_awaiting_response' && (
            <Button
              variant="outline"
              onClick={onViewQuote}
            >
              View Quote
            </Button>
          )}
          <Button
            className={cn(
              dropAction?.newStageKey === wonStageKey
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-primary',
            )}
            onClick={onConfirm}
          >
            {dropAction?.newStageKey === wonStageKey && 'Mark as Won'}
            {dropAction?.newStageKey === 'assessment_scheduled' && (dropActionDate ? 'Schedule' : 'Move Anyway')}
            {dropAction?.newStageKey === 'assessment_completed' && 'Mark Completed'}
            {dropAction?.newStageKey === 'quote_draft' && 'Move to Draft'}
            {dropAction?.newStageKey === 'quote_awaiting_response' && 'Mark as Sent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
