'use client';

/**
 * CompleteJobDialog — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Self-contained dialog for marking a job as complete. The parent opens it by
 * passing `open` + `jobId`; the dialog owns:
 *   - the completion notes textarea
 *   - the validation fetch (parallel GETs to /photos, /signatures, /checklist
 *     to determine which proof items are missing)
 *   - the GPS check-out capture (best-effort navigator.geolocation)
 *   - the complete mutation (PUT /api/jobs/[id] for notes, then POST
 *     /api/employee/jobs/[id]/lifecycle with action='complete')
 *
 * Calls `onCompleted()` after the lifecycle POST succeeds so the parent can
 * re-fetch jobs + today's totals.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import type { CompletionValidation } from '@/features/employee-portal/types';
import { ValidationItem } from './validation-item';

export interface CompleteJobDialogProps {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onCompleted: (jobId: string, latitude?: number, longitude?: number) => void | Promise<void>;
}

export function CompleteJobDialog({
  open,
  jobId,
  onClose,
  onCompleted,
}: CompleteJobDialogProps) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [validation, setValidation] = useState<CompletionValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Reset + re-validate whenever the dialog opens for a fresh job.
  useEffect(() => {
    if (!open || !jobId) return;
    setCompletionNotes('');
    setValidation(null);
    setValidating(true);
    (async () => {
      try {
        // Fetch the latest proof data for this job
        const [photosRes, sigRes, checkRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}/photos`),
          fetch(`/api/jobs/${jobId}/signatures`),
          fetch(`/api/jobs/${jobId}/checklist`),
        ]);
        let before = false, after = false, signature = false, checklist = false;
        if (photosRes.ok) {
          const data = await photosRes.json();
          const photos = (data.photos || []) as Array<{ photoType: string }>;
          before = photos.some((p) => p.photoType === 'before');
          after = photos.some((p) => p.photoType === 'after');
        }
        if (sigRes.ok) {
          const data = await sigRes.json();
          const sigs = (data.signatures || []) as Array<{ signatoryType: string }>;
          signature = sigs.some((s) => s.signatoryType === 'customer');
        }
        if (checkRes.ok) {
          const data = await checkRes.json();
          checklist = data.checklist?.status === 'completed';
        }
        const missing: string[] = [];
        if (!before) missing.push('Before photo');
        if (!after) missing.push('After photo');
        if (!signature) missing.push('Customer signature');
        if (!checklist) missing.push('Completed checklist');
        setValidation({ missing, details: { before, after, signature, checklist } });
      } catch {
        // Allow proceeding even if validation fetch fails
      } finally {
        setValidating(false);
      }
    })();
  }, [open, jobId]);

  const handleComplete = async () => {
    if (!jobId) return;
    if (validation && validation.missing.length > 0) {
      toast.error('Cannot complete: ' + validation.missing.join(', '));
      return;
    }
    // Save completion notes to the job
    if (completionNotes.trim()) {
      try {
        await authFetch(`/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: jobId, notes: completionNotes }),
        });
      } catch {
        // Continue with completion even if notes fail
      }
    }
    // Capture GPS for check-out if available
    let lat: number | undefined;
    let lng: number | undefined;
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // ignore
      }
    }
    setCompleting(true);
    try {
      await onCompleted(jobId, lat, lng);
      onClose();
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5" />
            Complete Job
          </DialogTitle>
          <DialogDescription>
            Review the completion requirements and add any final notes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Validation status */}
          {validating ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-emerald-500" />
              <span className="ml-2 text-sm text-muted-foreground">Checking requirements...</span>
            </div>
          ) : validation ? (
            <div className={`rounded-lg border p-3 ${
              validation.missing.length === 0
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <p className={`text-sm font-semibold mb-2 ${
                validation.missing.length === 0
                  ? 'text-emerald-800'
                  : 'text-amber-800'
              }`}>
                {validation.missing.length === 0
                  ? '✓ All requirements met'
                  : `${validation.missing.length} requirement(s) missing`}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <ValidationItem ok={validation.details.before} label="Before Photo" />
                <ValidationItem ok={validation.details.after} label="After Photo" />
                <ValidationItem ok={validation.details.signature} label="Signature" />
                <ValidationItem ok={validation.details.checklist} label="Checklist" />
              </div>
              {validation.missing.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  Complete the missing items above before marking the job as complete.
                </p>
              )}
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Completion Notes</label>
            <Textarea
              placeholder="Enter any notes about the job completion, issues encountered, or follow-up needed..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleComplete}
            disabled={
              completing ||
              (validation ? validation.missing.length > 0 : false)
            }
          >
            {completing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            Complete Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
